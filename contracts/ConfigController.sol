// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IConfigController.sol";
import "./interfaces/IConfigControllerErrors.sol";
import "./interfaces/IConfigControllerEvents.sol";

import "./interfaces/IConfigControllerFactory.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/ISandboxCometConfig.sol";
import "./interfaces/ISandboxCometFactory.sol";

import "hardhat/console.sol";

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
    uint32 public constant FEE_DIVISOR = 1e4;

    /// @notice The lifetime of the new collateral proposal
    /// @dev The maximum value is 3 months. 3 month in seconds is 7776000. The max value of uint32 is 4294967295.
    uint40 public constant PRPOPOSE_NEW_COLLATERAL_LIFETIME = 2 weeks;
    /// @notice The maturity time of the new collateral proposal
    uint40 public constant PROPOSE_NEW_COLLATERAL_MATURITY = 1 weeks;
    /// @notice The timelock of the new collateral proposal
    uint40 public constant PROPOSE_NEW_COLLATERAL_TIMELOCK = 0;
    /// @notice The lifetime of the collateral removal proposal
    uint40 public constant PROPOSE_COLLATERAL_REMOVAL_LIFETIME = 1 weeks; 
    /// @notice The maturity time of the collateral removal proposal
    uint40 public constant PROPOSE_COLLATERAL_REMOVAL_MATURITY = 0;
    /// @notice The timelock of the collateral removal proposal
    uint40 public constant PROPOSE_COLLATERAL_REMOVAL_TIMELOCK = 0;
    /// @notice The lifetime of the curator proposal
    uint40 public constant PROPOSE_CURATOR_LIFETIME = 1 weeks;
    /// @notice The maturity time of the curator proposal
    uint40 public constant PROPOSE_CURATOR_MATURITY = 0;
    /// @notice The timelock of the curator proposal
    uint40 public constant PROPOSE_CURATOR_TIMELOCK = 0;

    /// @notice The address of the protocol owner
    address dpublic override owner;

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
    uint32 public override curatorFee;

    /// @notice The name of this controller
    string public override name;

    /// @notice The address of the ConfigControllerFactory contract
    address public override configControllerFactory;

    /// @notice Counter for unique proposal IDs
    uint256 public proposalCounter;

    /// @notice Controller fee from the Comet's profit
    mapping(address => bool) public override cometFeeEnabled;

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
        uint32 _curatorFee,
        string memory _name,
        uint40 _curatorProposalDuration,
        uint40 _proposalDuration
    ) public override {
        if (configControllerFactory != address(0)) revert AlreadyInitialized();
        /// it is assumed that controller can be initialized only via factory - atomically after the deployment
        configControllerFactory = msg.sender;

        /// back-link to ensure that correct sandboxController is used and to bind it with factory - thus avoiding foreign deployments
        // aderyn-fp-next-line(reentrancy-state-change)
        sandboxController = IConfigControllerFactory(configControllerFactory).sandboxController();

        /// Addresses of owner, curator, guardian, sandbox controller and factory are validated in the factory
        /// and it is guaranteed that initialization follows deployment in the same transaction.
        /// So duplicating checks are omitted (as function relies on checks in the factory)
        unchecked {
            if (_curatorFee > FEE_DIVISOR) revert InvalidFeePercentage();

            // aderyn-fp-next-line(reentrancy-state-change)
            (uint40 minUpdateTime, uint40 maxUpdateTime) = ISandboxController(sandboxController).proposalBoundaries();
            if (_curatorProposalDuration < minUpdateTime || _proposalDuration < minUpdateTime) revert ProposalDurationTooShort();
            if (_curatorProposalDuration > maxUpdateTime || _proposalDuration > maxUpdateTime) revert ProposalDurationTooLong();
        }

        /// Zero address is checked in Controller Factory
        owner = _owner; // aderyn-fp(state-no-address-check)
        guardian = _guardian; // aderyn-fp(state-no-address-check)

        cometFactory = _cometFactory; // aderyn-fp(state-no-address-check)
        curatorFee = _curatorFee;
        name = _name;
        _proposeCurator(abi.encode(_curator), proposalCounter);
    }

    struct Proposal {
        address proposer;
        ProposalType proposalType;
        uint40 expirationTime;
        uint40 maturityTime;
        uint40 timelock;
        address comet;
        bytes call;
    }

    mapping(uint256 => Proposal) public proposals;

    enum ProposalType {
        ProposeCurator,
        ProposeNewCollateralToken,
        ProposeCollateralRemoval
    }

    function _proposeCurator(bytes memory _calldata, uint256 _proposalId) internal {
        // Decode the proposed curator address from calldata
        address proposedCuratorAddress = abi.decode(_calldata, (address));
        /**
         *  --- Before creating the proposal checks ---
         * - Check if the curator is the same as the c urrent curator.
         * - Check if the curator is the same as the owner.
         * - Check if the curator is the same as the guardian.      
         */ 
        if (proposedCuratorAddress == curator) revert InvalidCurator();
        if (proposedCuratorAddress == owner) revert InvalidCurator();
        if (proposedCuratorAddress == guardian) revert InvalidCurator();

        // Create the proposal
        proposals[_proposalId] = Proposal({
            proposer: msg.sender,
            proposalType: ProposalType.ProposeCurator,
            expirationTime: block.timestamp + PROPOSE_CURATOR_LIFETIME,
            maturityTime: block.timestamp + PROPOSE_CURATOR_MATURITY,
            timelock: block.timestamp + PROPOSE_CURATOR_TIMELOCK, 
            comet: address(0),
            call: _calldata
        });
    
        emit CuratorProposed(_proposalId, curator, proposedCuratorAddress, block.timestamp + PROPOSE_CURATOR_LIFETIME);
    }

    // Hardcoded selector for addCollateralToken function
    bytes4 constant ADD_COLLATERAL_SELECTOR = 0xfad67aaa;
    bytes4 constant REMOVE_COLLATERAL_SELECTOR = 0x42966c68;

    /**
     * @notice Creates a new proposal
     * @param _calldata The calldata of the proposal
     * @param _proposalType The type of the proposal
     * @return The id of the proposal
     * 
     * Types of proposals:
     * - ProposeCurator (0)
     *   For this type, the calldata is the proposed curator address.
     *   Maturity time is 0.
     *  
     *   Proposal lifecycle:
     * - Proposed by owner.
     * - Without maturity time. 
     *   Since there is no maturity time, Guardian can't revert this type of proposal.
     * - Accepted by the new curator.
     * 
     * - ProposeNewCollateralToken (1)
     *   For this type, the calldata is the collateral token configuration.
     *   Maturity time is 0.
     *   Proposal lifecycle:
     * - Proposed by owner.
     * - Without maturity time. 
     *   Since there is no maturity time, Guardian can't revert this type of proposal.
     * - Accepted by the new curator.
     */
    function createProposal(
        bytes calldata _calldata,
        address _comet,
        uint8 _proposalType
    ) external returns (uint256) {
        // Check if proposal type is valid
        if (_proposalType >= uint8(ProposalType.ProposeNewCollateralToken) + 1) revert InvalidProposalType();
        if (_proposalType != uint8(ProposalType.ProposeCurator) && !_isCometOwned(_comet)) revert UnknownComet(); 
        // Increment proposal counter
        proposalCounter++;
        uint256 proposalId = proposalCounter;
        
        if (_proposalType == uint8(ProposalType.ProposeNewCollateralToken)) {
            if (msg.sender != owner) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the selector is valid.
             * - Decode the collateral token configuration from calldata.
             * - We can't add the same collateral token twice. 
             * - We can't add the baseToken as collateral token.
             * - Validate the collateral token configuration using internal function.
             * - We can't add more than MAX_ASSETS collateral tokens.
             */
            bytes4 selector = bytes4(_calldata);
            if (selector != ADD_COLLATERAL_SELECTOR) revert InvalidSelector();

            CollateralTokenConfig memory collateralConfig = abi.decode(_calldata[4:], (CollateralTokenConfig));

            try ISandboxCometConfig(_comet).getAssetInfoByAddress(collateralConfig.collateralToken) {
                revert CollateralTokenAlreadyAdded();
            }
            catch {
                // Do nothing.
            }
            ISandboxCometConfig comet = ISandboxCometConfig(_comet);
            if (comet.baseToken() == collateralConfig.collateralToken) revert WrongCollateralTokenSettings();
            
            _validateCollateralTokenConfig(collateralConfig);

            if (comet.numAssets() >= comet.MAX_ASSETS()) revert MaxCollateralTokensReached();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeNewCollateralToken,
                maturityTime: block.timestamp + PROPOSE_NEW_COLLATERAL_MATURITY,
                expirationTime: block.timestamp + PRPOPOSE_NEW_COLLATERAL_LIFETIME,
                timelock: block.timestamp + PROPOSE_NEW_COLLATERAL_TIMELOCK,
                comet: _comet,
                call: _calldata
            });
            emit ProposeNewCollateralToken(proposalId, msg.sender, collateralConfig);
        /// Propose curator.
        } else if (_proposalType == uint8(ProposalType.ProposeCurator)) {
            if (msg.sender != owner) revert Unauthorized();
            _proposeCurator(_calldata, proposalId);
        /// Propose collateral removal.
        } else if (_proposalType == uint8(ProposalType.ProposeCollateralRemoval)) {
            if (msg.sender != owner) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the selector is valid.
             * - Check if the collateral is the part of the comet collateral list.
             */
            bytes4 selector = bytes4(_calldata);
            if (selector != REMOVE_COLLATERAL_SELECTOR) revert InvalidSelector();

            /// Inside the comet, the function getAssetInfoByAddress will revert if the collateral token is not added.
            try comet.getAssetInfoByAddress(collateralConfig.collateralToken) {
                revert CollateralTokenAlreadyAdded();
            }
            catch {
                // Do nothing.
            }
        }
        
        return proposalId;
    }

    /// @notice Accepts a proposal
    /// Types of proposals:
    /// - ProposeCurator
    /// - ProposeNewCollateralToken
    function acceptProposal(uint256 _proposalId) external {
        Proposal memory _proposal = proposals[_proposalId]; /// Cache the proposal, because we will read it several times.
        /**
         * --- Before working with the proposal checks ---
         * - Check if the proposal is active.
         * - Check if the proposal is expired.
         * - Check if the maturity time is reached.
         * - Check if the timelock is reached.
         */
        if (_proposal.expirationTime == 0) revert NoActiveProposal();
        if (block.timestamp > _proposal.expirationTime) revert ProposalExpired();
        if (block.timestamp < _proposal.maturityTime) revert ProposalNotMatured();
        if (block.timestamp < _proposal.timelock) revert ProposalNotTimelocked();

        /// Accept the curator role proposal.
        if (_proposal.proposalType == ProposalType.ProposeCurator) {
            address proposedCuratorAddress = abi.decode(_proposal.call, (address));
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.           
             * - Check if the sender is the proposed curator.
             */
            if (msg.sender != proposedCuratorAddress) revert Unauthorized();

            /** 
             * --- Before executing the proposal checks ---
             * Since can be a several proposals with the same type, we need to perform a few checks:
             * - Check if the proposedCurator is not the same as the current curator.
             * - Check if the proposedCurator is not the same as the owner.
             * - Check if the proposedCurator is not the same as the guardian.
             */
            if (curator == proposedCuratorAddress) revert InvalidCurator();
            if (owner == proposedCuratorAddress) revert InvalidCurator();
            if (guardian == proposedCuratorAddress) revert InvalidCurator();           
            /// We emit the event before the storage update to avoid to save the old curator in the event logs.
            emit CuratorAccepted(_proposalId, curator, proposedCuratorAddress);
            
            curator = proposedCuratorAddress;

            /**
             * --- After executing the proposal ---
             * - We must mark the proposal as not active.
             * - No additional checks are needed, since the only the ConfigController is evolved.
             */
            _proposal.expirationTime = 0;
            
        /// Accept the new collateral token proposal.
        } else if (_proposal.proposalType == ProposalType.ProposeNewCollateralToken) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner. Only owner can add the collateral token params.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be 
             *   transferred to the another ConfigController.
             */
            if (msg.sender != owner) revert Unauthorized();
            if (!_isCometOwned(_proposal.comet)) revert UnknownComet();
            
            /**
             * --- Before executing the proposal checks ---
             * - Check if the selector is valid.
             * - Validate the collateral token configuration. The collateral token configuration limits can be changed while the proposal is active.
             * - We can't add the same collateral token twice. 
             * - We can't add more than MAX_ASSETS collateral tokens.
            */
            // Extract selector and parameters
            bytes4 selector = bytes4(_proposal.call);
            if (selector != ADD_COLLATERAL_SELECTOR) revert InvalidSelector();
            
            // Create a new bytes array for parameters (skip first 4 bytes)
            bytes memory params = new bytes(_proposal.call.length - 4);
            for (uint i = 4; i < _proposal.call.length; i++) {
                params[i - 4] = _proposal.call[i];
            }
            CollateralTokenConfig memory collateralConfig = abi.decode(params, (CollateralTokenConfig));
            _validateCollateralTokenConfig(collateralConfig);

            ISandboxCometConfig comet = ISandboxCometConfig(_proposal.comet);
            /// Inside the comet, the function getAssetInfoByAddress will revert if the collateral token is not added.
            try comet.getAssetInfoByAddress(collateralConfig.collateralToken) {
                revert CollateralTokenAlreadyAdded();
            }
            catch {
                // Do nothing.
            }

            if (comet.numAssets() >= comet.MAX_ASSETS()) revert MaxCollateralTokensReached();
            
            /// Add the collateral token to the comet.
            (bool success, bytes memory result) = _proposal.comet.call(_proposal.call);
            if (!success) revert CometCallFailed();
            /**
             * --- After executing the proposal ---
             * - We must mark the proposal as not active.
             * - No additional checks are needed, since the only the ConfigController is evolved.
             */
            _proposal.expirationTime = 0;   
            
            
            emit ProposeNewCollateralTokenAccepted(_proposalId, msg.sender, collateralConfig);
        }

        proposals[_proposalId] = _proposal;
    }

    /// @notice Cancels a proposal
    /// @param _proposalId The id of the proposal
    function cancelProposal(uint256 _proposalId) external {
        Proposal memory _proposal = proposals[_proposalId];
        /**
         * --- Cancel proposal checks ---
         * - If the proposal is not active, it can't be cancelled.
         * - If the proposal is expired, it can't be cancelled.
         * - If the proposal is in the maturity period, it can be cancelled by the guardian or the owner.
         * - If the proposal is after the maturity period, it can be cancelled by the proposer or the owner.
         */
        if (_proposal.expirationTime == 0) revert NoActiveProposal();
        if (block.timestamp > _proposal.expirationTime) revert ProposalExpired();
        
        // Check authorization based on proposal state
        bool canCancel = false;
        
        if (_proposal.maturityTime > 0) {
            // Proposal has maturity period
            if (block.timestamp < _proposal.maturityTime) {
                // During maturity period: only guardian or owner can cancel
                canCancel = (msg.sender == guardian || msg.sender == owner);
            } else {
                // After the maturity time the curator can cancel if the curator is proposer or owner can cancel
                canCancel = ((msg.sender == _proposal.proposer && msg.sender == curator) || msg.sender == owner);
            }
        } else {
            // No maturity period: the curator can cancel if the curator is proposer or owner can cancel.
            canCancel = ((msg.sender == _proposal.proposer && msg.sender == curator) || msg.sender == owner);
        }
        
        if (!canCancel) revert Unauthorized();
        
        // Cancel the proposal
        _proposal.expirationTime = 0;
        proposals[_proposalId] = _proposal;

        // Emit event
        emit ProposalCanceled(_proposalId, msg.sender);
    }

    /// @notice Creates a new comet with the specified configuration
    /// @dev Only callable by the owner
    /// @param _cometConfig The configuration parameters for the new comet
    /// @return The address of the newly created comet
    function createComet(CometConfig memory _cometConfig) external override onlyOwner returns (address) {
        /// Check base token
        ///
        if (_cometConfig.baseToken == address(0)) revert ZeroAddress();
        // aderyn-fp-next-line(reentrancy-state-change)
        if (!ISandboxController(sandboxController).isBaseTokenWhitelisted(_cometConfig.baseToken)) revert BaseTokenNotWhitelisted();
        /// Token decimals and price feed decimal are validated on the Comet, as it may be an individual setting

        /// Check interest curve
        ///
        // aderyn-fp-next-line(reentrancy-state-change)
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = ISandboxController(sandboxController).baseAssets(
            _cometConfig.baseToken
        );

        if (baseAssetConfig.baseAssetCurves.length == 0) revert NoCurveRegistered();
        if (_cometConfig.baseTokenCurveId >= baseAssetConfig.baseAssetCurves.length) revert InvalidCurveId();

        /// Check collaterals
        ///
        uint256 _length = _cometConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        address[] memory addedCollateralTokens = new address[](_length);

        /// Upper boundary for collateral tokens number is checked in Comet, as different Comets may be supported
        if (_length == 0) revert ZeroCollateralAssets();
        // aderyn-fp-next-line(require-revert-in-loop)
        for (uint8 i; i < _length; ) {
            collateralTokenConfig = _cometConfig.collateralTokens[i];
            address _collateralToken = collateralTokenConfig.collateralToken;

            /// Quick checks first
            if (_collateralToken == address(0)) revert ZeroAddress();
            if (_collateralToken == _cometConfig.baseToken) revert WrongCollateralTokenSettings();

            for (uint8 j = 0; j < i; ) {
                if (addedCollateralTokens[j] == _collateralToken) revert CollateralTokenAlreadyAdded();
                unchecked {
                    ++j;
                }
            }
            addedCollateralTokens[i] = _collateralToken;

            /// Check alignment with settings from SandboxController
            _validateCollateralTokenConfig(collateralTokenConfig);
            unchecked {
                ++i;
            }
        }

        // aderyn-fp-next-line(reentrancy-state-change)
        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
        CometGlobalParamsConfig memory _globalConfig = CometGlobalParamsConfig(
            _sandboxConfig.targetPercent,
            _sandboxConfig.storeFrontPriceFactor,
            _sandboxConfig.suggestedLockTimeOfSeedReserves,
            _sandboxConfig.suggestedAmountOfSeedReserves
        );

        address comet = ISandboxCometFactory(cometFactory).createComet(_cometConfig.name); // aderyn-fp(reentrancy-state-change)
        ISandboxCometConfig(comet).initialize(_cometConfig, _globalConfig); // aderyn-fp(reentrancy-state-change)

        uint256 cometsNum = comets.length;
        comets.push(comet);
        cometId[comet] = cometsNum;

        /// TODO: seed reserves logic will be adjusted
        if (_sandboxConfig.suggestedAmountOfSeedReserves > 0) {
            IERC20(_cometConfig.baseToken).safeTransferFrom(msg.sender, comet, _sandboxConfig.suggestedAmountOfSeedReserves);
        }

        emit CometCreated(comet, _cometConfig.baseToken, baseAssetConfig.priceFeed, cometsNum + 1, _cometConfig.baseTokenCurveId);

        return comet;
    }

    /// @notice The number of comets created by this controller
    function cometsLength() public view override returns (uint256) {
        return comets.length;
    }

    /// @notice Disables/Enables the controller fee for a specific comet
    /// @param comet Comet which should be registered in Controller
    /// @param feeEnabled Flag for fees enabling (true -> fees are enabled)
    function setCometFee(address comet, bool feeEnabled) external onlyOwner {
        if (comet == address(0)) revert ZeroAddress();
        if (!_isCometOwned(comet)) revert UnknownComet();
        if (cometFeeEnabled[comet] == feeEnabled) revert IncorrectValue();

        cometFeeEnabled[comet] = feeEnabled;
        emit CometFeeEnabled(address(this), comet, feeEnabled);
    }

    /// @notice Extracts fees to a self and distributes it
    /// @param comet Comet which should be registered in Controller
    /// @param asset Asset (collateral or base asset) to extract
    function extractFees(address comet, address asset) external onlyOwner {
        if (comet == address(0)) revert ZeroAddress();
        if (!_isCometOwned(comet)) revert UnknownComet();

        ISandboxCometConfig(comet).extractFees(asset);
        /// Note: Comet emits the respective event

        /// TODO: extend method once fee distribution is finished
    }

    /// @notice Transfers ownership of the protocol to a new address
    /// @dev Only callable by the current owner
    /// @param _newOwner The address of the new owner
    function grantOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = _newOwner;

        emit OwnershipGranted(oldOwner, _newOwner);
    }

    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() external override onlyOwner {
        address oldCurator = curator;
        curator = address(0);
        emit CuratorCanceled(oldCurator);
    }

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) external override onlyOwner {
        /// Note: guardian can be set to address(0) which interpets into "no guardian" state
        address oldGuardian = guardian;
        guardian = _newGuardian; // aderyn-fp(state-no-address-check)

        emit GuardianUpdated(oldGuardian, _newGuardian);
    }

    /// @notice Validates comet collateral token configuration
    /// @dev Internal function to validate collateral token parameters
    /// @param collateralTokenConfig The collateral token configuration to validate
    function _validateCollateralTokenConfig(IConfigController.CollateralTokenConfig memory collateralTokenConfig) internal view {
        if (!ISandboxController(sandboxController).isCollateralTokenWhitelisted(collateralTokenConfig.collateralToken))
            revert CollateralTokenNotWhitelisted();

        ISandboxController.CollateralAssetConfiguration memory collateralAssetLimitations = ISandboxController(sandboxController)
            .collateralAssets(collateralTokenConfig.collateralToken);
        /// supplyCap;
        if (collateralTokenConfig.supplyCap == 0) revert SupplyCapCantBeZero();
        /// in general supply cap is not regulated and is purely config controller owner's responsibility

        /// factors order: collaterization <= liquidation factor <= liquidation penalty
        if (
            collateralTokenConfig.borrowCollateralFactor > collateralTokenConfig.liquidateCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor > collateralTokenConfig.liquidationFactor
        ) revert WrongCollateralTokenSettings();

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
        if (collateralTokenConfig.liquidationFactor > collateralAssetLimitations.maxLiquidationFactor) revert LiquidationFactorTooHigh();
        else if (collateralTokenConfig.liquidationFactor < collateralAssetLimitations.minLiquidationFactor)
            revert LiquidationFactorTooLow();
    }

    /// @notice Internal function to check if a comet is owned by this controller
    /// @param comet The address of the comet
    /// @return True if the comet is owned by this controller
    function _isCometOwned(address comet) public view returns (bool) {
        if (cometsLength() == 0) return false;
        return comets[cometId[comet]] == comet;
    }
}
