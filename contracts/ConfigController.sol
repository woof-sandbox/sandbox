// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IConfigController.sol";
import "./interfaces/IConfigControllerErrors.sol";
import "./interfaces/IConfigControllerFactory.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/ISandboxComet.sol";
import "./interfaces/ISandboxCometFactory.sol";


/**
 * @title ConfigController
 * @author WOOF Software
 * @notice Manages protocol configuration, comet creation, and curator governance
 * @dev This contract handles the core configuration of the protocol, including:
 * - Comet creation and management
 * - Curator role management
 * - Revenue distribution
 * - Proposal system for comet configuration changes
 * - Comet transfer proposals
 */
contract ConfigController is IConfigController, IConfigControllerErrors {
    using SafeERC20 for IERC20Metadata;
    uint256 public constant FEE_DIVISOR = 10_000;
    address public constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    /// @notice The address of the protocol owner
    address public override owner;

    /// @notice The address of the protocol curator
    address public override curator;

    /// @notice The address of the protocol guardian
    address public override guardian;

    /// @notice The address of the SandboxController contract
    address public override sandboxController;

    /// @notice The address of the cometFactory contract
    address public override cometFactory;

    /// @dev This is a more gas efficient way to store the all comets and check if the comet address is inside the array.
    /// @notice The mapping of comet address => comet Id
    mapping(address => uint) public cometId;

    /// @notice Array of all comets created by this controller
    address[] public override comets;

    /// @notice The curator fee in basis points (1% = 100)
    uint public override curatorFee;

    /// @notice The name of this controller
    string public override name;

    /// @notice The address of the proposed curator
    address public override proposedCurator;

    /// @notice The timestamp when the curator proposal expires
    uint public override curatorProposalExpiry;

    /// @notice The duration of curator proposals in seconds
    uint public curatorProposalDuration;

    /// @notice The duration of comet proposals in seconds
    uint public proposalDuration;

    /// @notice The address of the ConfigControllerFactory contract
    address public override configControllerFactory;

    /// @notice Modifier to restrict access to owner only
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @notice Modifier to restrict access to owner or curator
    modifier onlyOwnerOrCurator() {
        if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
        _;
    }

    /// @notice Modifier to restrict access to guardian only
    modifier onlyGuardian() {
        if (msg.sender != guardian) revert Unauthorized();
        _;
    }

    /// @notice Initializes the ConfigController contract
    /// @param _owner The address of the protocol owner
    /// @param _guardian The address of the protocol guardian
    /// @param _cometFactory The address of the cometFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of comet proposals in seconds
    function initialize(
        address _owner,
        address _curator,
        address _guardian,
        address _cometFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) public override {
        if (configControllerFactory != address(0)) revert AlreadyInitialized();
        /// it is assumed that controller can be initialized only via factory - atomically after the deployment
        configControllerFactory = msg.sender;

        /// back-link to ensure that correct sandboxController is used and to bind it with factory - thus avoiding foreign deployments
        sandboxController = IConfigControllerFactory(configControllerFactory).sandboxController();

        /// Addresses of owner, curator, guardian, sandbox controller and factory are validated in the factory
        /// and it is guaranteed that initialization follows deployment in the same transaction.
        /// So duplicating checks are omitted (as function relies on checks in the factory)
        unchecked {
            if (_curatorFee > FEE_DIVISOR) revert InvalidFeePercentage();

            (uint minUpdateTime, uint maxUpdateTime) = ISandboxController(sandboxController).proposalBoundaries();
            if (_curatorProposalDuration < minUpdateTime || _proposalDuration < minUpdateTime) revert ProposalDurationTooShort();
            if (_curatorProposalDuration > maxUpdateTime || _proposalDuration > maxUpdateTime) revert ProposalDurationTooLong();
        }

        owner = _owner;
        guardian = _guardian;
        
        cometFactory = _cometFactory;
        curatorFee = _curatorFee;
        name = _name;
        curatorProposalDuration = _curatorProposalDuration;
        proposalDuration = _proposalDuration;
        
        _proposeCurator(_curator);
    }

    /// @notice Creates a new comet with the specified configuration
    /// @dev Only callable by the owner
    /// @param _cometConfig The configuration parameters for the new comet
    /// @return The address of the newly created comet
    function createComet(CometConfig memory _cometConfig) external override onlyOwner returns (address) {
        /// Check base token
        ///
        if (_cometConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        if (!ISandboxController(sandboxController).isBaseTokenWhitelisted(_cometConfig.baseToken)) revert BaseTokenNotWhitelisted();
        /// Token decimals and price feed decimal are validated on the Comet, as it may be an individual setting

        /// Check interest curve
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = ISandboxController(sandboxController).baseAssets(_cometConfig.baseToken);

        if (baseAssetConfig.baseAssetCurves.length == 0) revert NoCurveRegistered();
        if (_cometConfig.baseTokenCurveId >= baseAssetConfig.baseAssetCurves.length) revert InvalidCurveId();
        
        /// Check collaterals
        ///
        uint length = _cometConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralAssetConfiguration memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);

        /// Upper boundary for collateral tokens number is checked in Comet, as different Comets may be supported
        if (length == 0) revert ZeroCollateralAssets();
        for (uint i; i < length; ) {
            unchecked {
                collateralTokenConfig = _cometConfig.collateralTokens[i];

                if (!ISandboxController(sandboxController).isCollateralTokenWhitelisted(_cometConfig.baseToken)) revert CollateralTokenNotWhitelisted();

                collateralAssetLimitations = ISandboxController(sandboxController).collateralAssets(collateralTokenConfig.collateralToken);

                if (collateralTokenConfig.collateralToken == _cometConfig.baseToken) revert WrongCollateralTokenSettings();
                
                _validateCollateralTokenConfig(
                    collateralTokenConfig,
                    collateralAssetLimitations,
                    addedCollateralTokens
                );

                addedCollateralTokens[i] = collateralTokenConfig
                    .collateralToken;
                i++;
            }
        }
        
        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
            
        address comet = ISandboxCometFactory(cometFactory).createComet();

        ISandboxComet(comet).initialize(_cometConfig, _sandboxConfig);

        uint256 cometsNum = comets.length;
        comets.push(comet);
        cometId[comet] = cometsNum;
        
        IERC20Metadata(_cometConfig.baseToken).safeTransferFrom(
            msg.sender,
            comet,
            _sandboxConfig.suggestedAmountOfSeedReserves
        );
        
        emit CometCreated(
            comet,
            _cometConfig.baseToken,
            baseAssetConfig.priceFeed,
            cometsNum + 1,
            _cometConfig.baseTokenCurveId
        );

        return comet;
    }

    /// @notice The number of comets created by this controller
    function cometsLength() public view override returns (uint) {
        return comets.length;
    }

    /// @notice Transfers ownership of the protocol to a new address
    /// @dev Only callable by the current owner
    /// @param _newOwner The address of the new owner
    function grantOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == ZERO_ADDRESS) revert ZeroAddress();
        owner = _newOwner;
    }

    /// @notice Proposes a new curator
    /// @dev Only callable by the owner. Emits a CuratorProposed event
    /// @param _proposedCurator The address of the proposed curator
    function proposeCurator(address _proposedCurator) public onlyOwner {
        _proposeCurator(_proposedCurator);
    }

    /// @notice Proposes a new curator
    /// @dev Only callable by the owner. Emits a CuratorProposed event
    /// @param _proposedCurator The address of the proposed curator
    function _proposeCurator(address _proposedCurator) internal {
        if (_proposedCurator == ZERO_ADDRESS) revert ZeroAddress();
        if (_proposedCurator == curator) revert InvalidCurator();

        proposedCurator = _proposedCurator;
        curatorProposalExpiry = block.timestamp + curatorProposalDuration;

        emit CuratorProposed(curator, _proposedCurator, curatorProposalExpiry);
    }

    /// @notice Accepts the curator role proposal
    /// @dev Only callable by the proposed curator. Emits a CuratorAccepted event
    function acceptCuratorRole() external {
        if (msg.sender != proposedCurator) revert Unauthorized();
        if (block.timestamp > curatorProposalExpiry) revert ProposalExpired();

        address oldCurator = curator;
        curator = proposedCurator;
        proposedCurator = ZERO_ADDRESS;
        curatorProposalExpiry = 0;

        emit CuratorAccepted(oldCurator, curator);
    }

    /// @notice Cancels the curator role proposal
    /// @dev Only callable by the owner. Emits a CuratorProposalCancelled event
    function cancelCuratorProposal() external onlyOwner {
        if (proposedCurator == ZERO_ADDRESS) revert NoActiveProposal();

        address cancelledProposal = proposedCurator;
        proposedCurator = ZERO_ADDRESS;
        curatorProposalExpiry = 0;

        emit CuratorProposalCancelled(cancelledProposal);
    }

    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() external override onlyOwner {
        address oldCurator = curator;
        curator = ZERO_ADDRESS;
        emit CuratorCanceled(oldCurator);
    }

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) external override onlyOwner {
        address oldGuardian = guardian;
        guardian = _newGuardian;

        emit GuardianUpdated(oldGuardian, _newGuardian);
    }

    /// @notice Sets the duration for curator and comet configuration proposals
    /// @dev Only callable by the owner
    /// @param _curatorProposalDuration New duration for curator proposals in seconds
    /// @param _proposalDuration New duration for comet configuration proposals in seconds
    function setProposalDurations(
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external onlyOwner {
        uint256 minUpdateTime = ISandboxController(sandboxController).controllerConfiguration().minUpdateTime;
        if (_curatorProposalDuration < minUpdateTime || _proposalDuration < minUpdateTime) revert ProposalDurationTooShort();

        uint oldCuratorDuration = curatorProposalDuration;
        uint oldProposalDuration = proposalDuration;

        curatorProposalDuration = _curatorProposalDuration;
        proposalDuration = _proposalDuration;

        emit ProposalDurationsUpdated(
            oldCuratorDuration,
            _curatorProposalDuration,
            oldProposalDuration,
            _proposalDuration
        );
    }

    /// @notice Validates comet collateral token configuration
    /// @dev Internal function to validate collateral token parameters
    /// @param collateralTokenConfig The collateral token configuration to validate
    /// @param collateralAssetLimitations The limitations from sandbox controller
    /// @param addedCollateralTokens Array of already added collateral tokens
    function _validateCollateralTokenConfig(
        IConfigController.CollateralTokenConfig memory collateralTokenConfig,
        ISandboxController.CollateralAssetConfiguration memory collateralAssetLimitations,
        address[] memory addedCollateralTokens
    ) internal view {
        if (collateralTokenConfig.collateralToken == ZERO_ADDRESS) revert ZeroAddress();
        if (ISandboxController(sandboxController)
        .collateralAssets(collateralTokenConfig.collateralToken).priceFeed == ZERO_ADDRESS) revert CollateralTokenNotWhitelisted();

        for (uint j; j < addedCollateralTokens.length; j++) {
            if (addedCollateralTokens[j] == collateralTokenConfig.collateralToken) revert CollateralTokenAlreadyAdded();
        }

        if (
            collateralTokenConfig.supplyCap == 0 ||
            collateralTokenConfig.borrowCollateralFactor == 0 ||
            collateralTokenConfig.liquidateCollateralFactor == 0 ||
            collateralTokenConfig.liquidationFactor == 0 ||
            collateralTokenConfig.borrowCollateralFactor <
            collateralAssetLimitations.minBorrowCollateralFactor ||
            collateralTokenConfig.borrowCollateralFactor >
            collateralAssetLimitations.maxBorrowCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor <
            collateralTokenConfig.borrowCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor >
            collateralAssetLimitations.maxLiquidateCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor <
            collateralAssetLimitations.minLiquidateCollateralFactor ||
            collateralTokenConfig.liquidationFactor >
            collateralAssetLimitations.maxLiquidationFactor ||
            collateralTokenConfig.liquidationFactor <
            collateralAssetLimitations.minLiquidationFactor
        ) revert WrongCollateralTokenSettings();
    }

    /// @notice Internal function to check if a comet is owned by this controller
    /// @param comet The address of the comet
    /// @return True if the comet is owned by this controller
    function _isCometOwned(address comet) internal view returns (bool) {
        if (cometsLength() == 0) return false;
        return comets[cometId[comet]] != comet;
    }
}