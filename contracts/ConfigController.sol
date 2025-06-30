// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IConfigController.sol";
import "./interfaces/IConfigControllerErrors.sol";
import "./interfaces/IConfigControllerEvents.sol";

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
contract ConfigController is IConfigController, IConfigControllerErrors, IConfigControllerEvents {
    using SafeERC20 for IERC20;
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

    /// @notice Counter for unique proposal IDs
    uint256 public proposalCounter;

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

    struct Proposal {
        address proposer;
        ProposalType proposalType;
        uint40 expirationTime;
        uint40 maturityTime;
        bytes call;
    }

    mapping(uint256 => Proposal) public proposals;

    enum ProposalType {
        ProposeCurator,
        ProposeNewCollateralToken
    }

    function _proposeCurator(bytes memory _calldata) internal {
        // Decode the proposed curator address from calldata
        address proposedCuratorAddress = abi.decode(_calldata, (address));
        
        // Validate the proposed curator
        /// Check if the curator is the same as the current curator.
        if (proposedCuratorAddress == curator) revert InvalidCurator();
        /// Check if the curator is the same as the proposed curator.
        if (proposedCuratorAddress == proposedCurator) revert InvalidCurator();
        /// Check if the curator is the same as the owner.
        if (proposedCuratorAddress == owner) revert InvalidCurator();
        /// Check if the curator is the same as the guardian.
        if (proposedCuratorAddress == guardian) revert InvalidCurator();
        
        // Create the proposal
        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            proposalType: ProposalType(_proposalType),
            expirationTime: uint40(block.timestamp + curatorProposalDuration),
            maturityTime: uint40(block.timestamp + curatorProposalDuration),
            call: _calldata
        });
    
        emit ProposalCreated(_proposalType, msg.sender, block.timestamp + curatorProposalDuration, _calldata);
    }

    function createProposal(
        bytes memory _calldata,
        uint8 _proposalType
    ) external returns (uint256) {
        // Check if proposal type is valid
        if (_proposalType >= uint8(ProposalType.ProposeNewCollateralToken) + 1) revert InvalidProposalType();
        
        // Increment proposal counter
        proposalCounter++;
        uint256 proposalId = proposalCounter;
        
        if (_proposalType == uint8(ProposalType.ProposeNewCollateralToken)) {
            if (msg.sender != owner) revert Unauthorized();
            // Decode the collateral token configuration from calldata
            CollateralTokenConfig memory collateralConfig = abi.decode(_calldata, (CollateralTokenConfig));
            
            // Validate the collateral token configuration using internal function
            _validateCollateralTokenConfig(collateralConfig);
            
            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType(_proposalType),
                expirationTime: uint40(block.timestamp + proposalDuration),
                maturityTime: uint40(block.timestamp + proposalDuration),
                call: _calldata
            });
            
            emit ProposalCreated(_proposalType, msg.sender, block.timestamp + proposalDuration, _calldata);
        /// Propose curator.
        } else if (_proposalType == uint8(ProposalType.ProposeCurator)) {
            if (msg.sender != owner) revert Unauthorized();
            _proposeCurator(_calldata);
        }
        
        return proposalId;
    }

    /// @notice Accepts a proposal
    /// Types of proposals:
    /// - ProposeCurator
    /// - ProposeNewCollateralToken
    function acceptProposal(uint256 _proposalId) external {
        Proposal memory _proposal = proposals[_proposalId];
        /// If there is no active proposal, we can't accept it.
        if (_proposal.expirationTime == 0) revert NoActiveProposal();
        
        /// Accept the curator role proposal.
        if (_proposal.proposalType == ProposalType.ProposeCurator) {
            /// Check if the proposal has expired.
            if (block.timestamp > _proposal.expirationTime) revert ProposalExpired();
            
            /// Decode the proposed curator address from the proposal call data
            /// Note: In a real implementation, you would need to store the actual calldata
            /// For now, we'll use the hash to identify the proposal
            
            /// Set the proposed curator and expiry
            proposedCurator = address(uint160(uint256(_proposal.call))); // This is a simplified approach
            curatorProposalExpiry = _proposal.expirationTime;
            
            /// Clear the proposal
            delete proposals[_proposalId];
            
            emit ProposalAccepted(uint8(_proposal.proposalType), msg.sender, _proposal.call);
        }
        
        /// Accept the new collateral token proposal.
        if (_proposal.proposalType == ProposalType.ProposeNewCollateralToken) {
            if (msg.sender != abi.decode(_proposal.call, (address))) revert Unauthorized();
            /// Check if the proposal has expired.
            if (block.timestamp > _proposal.expirationTime) revert ProposalExpired();
            
            /// Decode the collateral token configuration from the proposal data
            /// Note: In a real implementation, you would need to store the proposal data
            /// For now, we'll just clear the proposal
            delete proposals[_proposalId];
            
            emit ProposalAccepted(uint8(_proposal.proposalType), msg.sender, _proposal.call);
        }
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
        ///
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = 
            ISandboxController(sandboxController).baseAssets(_cometConfig.baseToken);

        if (baseAssetConfig.baseAssetCurves.length == 0) revert NoCurveRegistered();
        if (_cometConfig.baseTokenCurveId >= baseAssetConfig.baseAssetCurves.length) revert InvalidCurveId();
        
        /// Check collaterals
        ///
        uint _length = _cometConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        address[] memory addedCollateralTokens = new address[](_length);

        /// Upper boundary for collateral tokens number is checked in Comet, as different Comets may be supported
        if (_length == 0) revert ZeroCollateralAssets();
        for (uint i; i < _length; ++i) {
            unchecked {
                collateralTokenConfig = _cometConfig.collateralTokens[i];
                address _collateralToken = collateralTokenConfig.collateralToken;

                /// Quick checks first
                if (_collateralToken == ZERO_ADDRESS) revert ZeroAddress();
                if (_collateralToken == _cometConfig.baseToken) revert WrongCollateralTokenSettings();

                for (uint j; j < i; j++) {
                    if (addedCollateralTokens[j] == _collateralToken) revert CollateralTokenAlreadyAdded();
                }
                addedCollateralTokens[i] = _collateralToken;

                /// Check alignment with settings from SandboxController
                _validateCollateralTokenConfig(collateralTokenConfig);
            }
        }
        
        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
        CometGlobalParamsConfig memory _globalConfig = CometGlobalParamsConfig(
            _sandboxConfig.targetPercent,
            _sandboxConfig.storeFrontPriceFactor,
            _sandboxConfig.suggestedAmountOfSeedReserves,
            _sandboxConfig.suggestedLockTimeOfSeedReserves
        );
            
        address comet = ISandboxCometFactory(cometFactory).createComet();
        ISandboxComet(comet).initialize(_cometConfig, _globalConfig);

        uint256 cometsNum = comets.length;
        comets.push(comet);
        cometId[comet] = cometsNum;
        
        if (_sandboxConfig.suggestedAmountOfSeedReserves > 0) {
            IERC20(_cometConfig.baseToken).safeTransferFrom(msg.sender, comet, _sandboxConfig.suggestedAmountOfSeedReserves);
        }
        
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
        (uint minUpdateTime, uint maxUpdateTime) = ISandboxController(sandboxController).proposalBoundaries();
        if (_curatorProposalDuration < minUpdateTime || _proposalDuration < minUpdateTime) revert ProposalDurationTooShort();
        if (_curatorProposalDuration > maxUpdateTime || _proposalDuration > maxUpdateTime) revert ProposalDurationTooLong();

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
    function _validateCollateralTokenConfig(
        IConfigController.CollateralTokenConfig memory collateralTokenConfig
    ) internal view {
        if (!ISandboxController(sandboxController).isCollateralTokenWhitelisted(collateralTokenConfig.collateralToken))
            revert CollateralTokenNotWhitelisted();

        ISandboxController.CollateralAssetConfiguration memory collateralAssetLimitations =
            ISandboxController(sandboxController).collateralAssets(collateralTokenConfig.collateralToken);
        /// supplyCap;
        if (collateralTokenConfig.supplyCap == 0) revert SupplyCapCantBeZero();
        /// in general supply cap is not regulated and is purely config controller owner's responsibility

        /// factors order: collaterization <= liquidation factor <= liquidation penalty
        if (collateralTokenConfig.borrowCollateralFactor > collateralTokenConfig.liquidateCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor > collateralTokenConfig.liquidationFactor)
            revert WrongCollateralTokenSettings();

        /// borrowCollateralFactor
        /// we rely on SandboxController validatation of limits against 0 and each other
        if (collateralTokenConfig.borrowCollateralFactor > collateralAssetLimitations.maxBorrowCollateralFactor)
            revert BorrowCollateralFactorTooHigh();
        else if (collateralTokenConfig.borrowCollateralFactor < collateralAssetLimitations.minBorrowCollateralFactor)
            revert BorrowCollateralFactorTooLow();

        /// liquidateCollateralFactor;
        if (collateralTokenConfig.liquidateCollateralFactor > collateralAssetLimitations.maxLiquidateCollateralFactor)
            revert LiquidateCollateralFactorTooHigh();
        else if (collateralTokenConfig.liquidateCollateralFactor < collateralAssetLimitations.minLiquidateCollateralFactor)
            revert LiquidateCollateralFactorTooLow();

        /// liquidationFactor;
        if (collateralTokenConfig.liquidationFactor > collateralAssetLimitations.maxLiquidationFactor)
            revert LiquidationFactorTooHigh();
        else if (collateralTokenConfig.liquidationFactor < collateralAssetLimitations.minLiquidationFactor)
            revert LiquidationFactorTooLow();
    }

    /// @notice Internal function to check if a comet is owned by this controller
    /// @param comet The address of the comet
    /// @return True if the comet is owned by this controller
    function _isCometOwned(address comet) internal view returns (bool) {
        if (cometsLength() == 0) return false;
        return comets[cometId[comet]] != comet;
    }
}