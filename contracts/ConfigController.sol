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
    /// @dev the max value of the uint24 is 16_777_215 seconds and 6.5 months or 194 days.
    uint24 public constant PRPOPOSE_NEW_COLLATERAL_LIFETIME = 2 weeks;
    /// @notice The maturity time of the new collateral proposal
    uint24 public constant PROPOSE_NEW_COLLATERAL_MATURITY = 1 weeks;
    /// @notice The lifetime of the collateral removal proposal
    uint24 public constant PROPOSE_COLLATERAL_REMOVAL_LIFETIME = 2 weeks; 
    /// @notice The maturity time of the collateral removal proposal
    uint24 public constant PROPOSE_COLLATERAL_REMOVAL_MATURITY = 1 weeks;
    /// @notice The timelock of the collateral removal proposal
    uint24 public constant PROPOSE_COLLATERAL_REMOVAL_TIMELOCK = 1 weeks;
    /// @notice The lifetime of the curator proposal
    uint24 public constant PROPOSE_CURATOR_LIFETIME = 1 weeks;
    /// @notice The lifetime of the curve transition proposal
    uint24 public constant PROPOSE_CURVE_TRANSITION_LIFETIME = 2 weeks;
    /// @notice The maturity time of the curve transition proposal
    uint24 public constant PROPOSE_CURVE_TRANSITION_MATURITY = 1 weeks;
    /// @notice The lifetime of the market deprecation proposal
    uint24 public constant PROPOSE_MARKET_DEPRECATION_LIFETIME = 5 weeks;
    /// @notice The maturity time of the market deprecation proposal
    uint24 public constant PROPOSE_MARKET_DEPRECATION_MATURITY = 1 weeks;
    /// @notice The timelock of the market deprecation proposal
    uint24 public constant PROPOSE_MARKET_DEPRECATION_TIMELOCK = 3 weeks;
    /// @notice The lifetime of the market transfer proposal
    uint24 public constant PROPOSE_MARKET_TRANSFER_LIFETIME = 2 weeks;
    /// @notice The timelock of the market transfer proposal
    uint24 public constant PROPOSE_MARKET_TRANSFER_TIMELOCK = 1 weeks;
    /// @notice The lifetime of the transfer ownership proposal
    uint24 public constant PROPOSE_TRANSFER_OWNERSHIP_LIFETIME = 2 weeks;

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
    function initialize(
        address _owner,
        address _curator,
        address _guardian,
        address _cometFactory,
        uint32 _curatorFee,
        string memory _name
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
        }
        // Cant be zero because it is the msg.sender
        owner = _owner; // aderyn-fp(state-no-address-check)
        // Can be zero.
        guardian = _guardian; // aderyn-fp(state-no-address-check)

        cometFactory = _cometFactory; // aderyn-fp(state-no-address-check)
        curatorFee = _curatorFee;
        name = _name;
        if (_curator == address(0)) revert InvalidCurator();
        bytes memory call = abi.encode(_curator);
        // Create the proposal
        proposals[0] = Proposal({
            proposer: owner,
            proposalType: ProposalType.ProposeCurator,
            expirationTime: uint40(block.timestamp + PROPOSE_CURATOR_LIFETIME),
            maturityTime: 0,
            timelock: 0, 
            comet: address(0),
            call: call // Curator can be zero address.
        });
        emit CuratorProposed(0, address(0), _curator, block.timestamp + PROPOSE_CURATOR_LIFETIME);
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
        ProposeCollateralRemoval,
        ProposeCurveTransition,
        ProposeMarketDeprecation,
        ProposeMarketTransfer,
        ProposeTransferOwnership
    }

    // Hardcoded selector for addCollateralToken function
    bytes4 constant ADD_COLLATERAL_SELECTOR = 0xfad67aaa;
    bytes4 constant REMOVE_COLLATERAL_SELECTOR = 0x58b77c0e;
    bytes4 constant CURVE_TRANSITION_SELECTOR = 0x27c05186;
    bytes4 constant MARKET_DEPRECATION_SELECTOR = 0xc32b0b15;

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
        if (_proposalType > uint8(ProposalType.ProposeTransferOwnership)) revert InvalidProposalType();
        if (_proposalType != uint8(ProposalType.ProposeCurator) && _proposalType != uint8(ProposalType.ProposeTransferOwnership) && !isCometOwned(_comet)) revert UnknownComet(); 
        // Increment proposal counter
        proposalCounter++;
        uint256 proposalId = proposalCounter;
        
        if (_proposalType == uint8(ProposalType.ProposeNewCollateralToken)) {
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
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

            ISandboxCometConfig comet = ISandboxCometConfig(_comet);
            try comet.getAssetInfoByAddress(collateralConfig.collateralToken) {
                revert CollateralTokenAlreadyAdded();
            }
            catch {
                // Do nothing.
            }
            if (comet.baseToken() == collateralConfig.collateralToken) revert WrongCollateralTokenSettings();
            
            _validateCollateralTokenConfig(collateralConfig);

            if (comet.numAssets() >= comet.MAX_ASSETS()) revert MaxCollateralTokensReached();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeNewCollateralToken,
                maturityTime: uint40(block.timestamp + PROPOSE_NEW_COLLATERAL_MATURITY),
                expirationTime: uint40(block.timestamp + PRPOPOSE_NEW_COLLATERAL_LIFETIME),
                timelock: 0,
                comet: _comet,
                call: _calldata
            });
            emit ProposeNewCollateralToken(proposalId, msg.sender);
        /// Propose curator.
        } else if (_proposalType == uint8(ProposalType.ProposeCurator)) {
            if (msg.sender != owner) revert Unauthorized();
            // Decode the proposed curator address from calldata
            address proposedCuratorAddress = abi.decode(_calldata, (address));
            /**
            *  --- Before creating the proposal checks ---
            * - Check if the proposed curator is not the zero address.
            * - Check if the curator is the same as the c urrent curator.
            * - Check if the curator is the same as the owner.
            * - Check if the curator is the same as the guardian.      
            */ 
            if (proposedCuratorAddress == address(0)) revert InvalidCurator();
            if (proposedCuratorAddress == curator) revert InvalidCurator();
            if (proposedCuratorAddress == owner) revert InvalidCurator();
            if (proposedCuratorAddress == guardian) revert InvalidCurator();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeCurator,
                expirationTime: uint40(block.timestamp + PROPOSE_CURATOR_LIFETIME),
                maturityTime: 0,
                timelock: 0, 
                comet: address(0),
                call: _calldata
            });
        
            emit CuratorProposed(proposalId, curator, proposedCuratorAddress, block.timestamp + PROPOSE_CURATOR_LIFETIME);
        /// Propose collateral removal.
        } else if (_proposalType == uint8(ProposalType.ProposeCollateralRemoval)) {
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the selector is valid.
             * - Check if the collateral is the part of the comet collateral list.
             * Note: We don't check if the removal is already initiated, because it can be ended before the proposal is accepted.
             */
            bytes4 selector = bytes4(_calldata);
            if (selector != REMOVE_COLLATERAL_SELECTOR) revert InvalidSelector();

            address collateralToken = abi.decode(_calldata[4:], (address));
            /// Inside the comet, the function getAssetInfoByAddress will revert if the collateral token is not added.
            try ISandboxCometConfig(_comet).getAssetInfoByAddress(collateralToken) {
            }
            catch {
                revert CollateralTokenNotAdded();
            }

            // Create the proposal   
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeCollateralRemoval,
                maturityTime: uint40(block.timestamp + PROPOSE_COLLATERAL_REMOVAL_MATURITY),
                expirationTime: uint40(block.timestamp + PROPOSE_COLLATERAL_REMOVAL_LIFETIME),
                timelock: 0,
                comet: _comet,
                call: _calldata
            });
            emit ProposeCollateralRemoval(proposalId, msg.sender, collateralToken);
        } else if (_proposalType == uint8(ProposalType.ProposeCurveTransition)) {
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the selector is valid.
             * - Check if the curveId is valid.
             */
            bytes4 selector = bytes4(_calldata);
            if (selector != CURVE_TRANSITION_SELECTOR) revert InvalidSelector();

            uint8 curveId = abi.decode(_calldata[4:], (uint8));
            ISandboxCometConfig comet = ISandboxCometConfig(_comet);
            if (curveId >= ISandboxController(sandboxController).baseAssets(comet.baseToken()).baseAssetCurves.length) revert InvalidCurveId();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeCurveTransition,
                maturityTime: uint40(block.timestamp + PROPOSE_CURVE_TRANSITION_MATURITY),
                expirationTime: uint40(block.timestamp + PROPOSE_CURVE_TRANSITION_LIFETIME),
                timelock: 0,
                comet: _comet,
                call: _calldata
            });
            emit ProposeCurveTransition(proposalId, msg.sender, curveId);
        } else if (_proposalType == uint8(ProposalType.ProposeMarketDeprecation)) {
            if (msg.sender != owner) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the selector is valid.
             * - Check if the market in the close process.
             * - Check if the market is already closed.
             */
            bytes4 selector = bytes4(_calldata);
            if (selector != MARKET_DEPRECATION_SELECTOR) revert InvalidSelector();

            // Check if the market is already deprecated
            if (ISandboxCometConfig(_comet).isDeprecated()) revert MarketAlreadyDeprecated();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeMarketDeprecation,
                expirationTime: uint40(block.timestamp + PROPOSE_MARKET_DEPRECATION_LIFETIME),
                maturityTime: uint40(block.timestamp + PROPOSE_MARKET_DEPRECATION_MATURITY),
                timelock: 0,
                comet: _comet,
                call: _calldata
            });
            emit ProposeMarketDeprecation(proposalId, msg.sender);
        } else if (_proposalType == uint8(ProposalType.ProposeMarketTransfer)) {
            if (msg.sender != owner) revert Unauthorized();
            /**
             * --- Before creating the proposal checks ---
             * - Check if the _configController is address.
             */
            address _configController = abi.decode(_calldata, (address));
            if (_configController == address(0)) revert InvalidConfigController();
            if (_configController == address(this)) revert InvalidConfigController();
            if (!IConfigControllerFactory(configControllerFactory).isController(_configController)) revert InvalidConfigController();
            
            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeMarketTransfer,
                maturityTime: 0,
                expirationTime: uint40(block.timestamp + PROPOSE_MARKET_TRANSFER_LIFETIME),
                timelock: 0,
                comet: _comet,
                call: _calldata
            });
            emit ProposeMarketTransfer(proposalId, msg.sender, _configController);
        } else if (_proposalType == uint8(ProposalType.ProposeTransferOwnership)) {
            if (msg.sender != owner) revert Unauthorized();
            address _newOwner = abi.decode(_calldata, (address));
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check if the new owner is not the zero address.
             * - Check if the new owner is not the same as the current owner.
             * - Check if the new owner is not the same as the current curator.
             * - Check if the new owner is not the same as the current guardian.
             */
            if (_newOwner == address(0)) revert InvalidOwner();
            if (_newOwner == owner) revert InvalidOwner();
            if (_newOwner == curator) revert InvalidOwner();
            if (_newOwner == guardian) revert InvalidOwner();

            // Create the proposal
            proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType.ProposeTransferOwnership,
                maturityTime: 0,
                expirationTime: uint40(block.timestamp + PROPOSE_TRANSFER_OWNERSHIP_LIFETIME),
                timelock: 0,
                comet: address(0),
                call: _calldata
            });
            emit ProposeTransferOwnership(proposalId, msg.sender, _newOwner);
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
        // Check if the proposal has the timelock timestamp. 
        // If the timelock is 0, the proposal doesn't have the timelock. And we can check the proposal as usual.
        // If the timelock is greater than 0, the proposal has the timelock. And we don't need to check the expiration time and the maturity time.
        // They already passed.
        if (_proposal.timelock == 0) {
            if (block.timestamp > _proposal.expirationTime) revert ProposalExpired();
            if (block.timestamp < _proposal.maturityTime) revert ProposalNotMatured();
        } else {
            if (block.timestamp < _proposal.timelock) revert ProposalNotTimelocked();
        }

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
            
            /**
            * --- After executing the proposal ---
            * - We must mark the proposal as not active.
            * - No additional checks are needed, since the only the ConfigController is evolved.
            */
            _proposal.expirationTime = 0;
            curator = proposedCuratorAddress;
        /// Accept the new collateral token proposal.
        } else if (_proposal.proposalType == ProposalType.ProposeNewCollateralToken) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner. Only owner can add the collateral token params.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be 
             *   transferred to the another ConfigController.
             */
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
            if (!isCometOwned(_proposal.comet)) revert UnknownComet();
            
            /**
             * --- Before executing the proposal checks ---
             * - Check if the selector is valid.
             * - Validate the collateral token configuration. The collateral token configuration limits can be changed while the proposal is active.
             * - We can't add the same collateral token twice. 
             * - We can't add more than MAX_ASSETS collateral tokens.
            */
            bytes4 selector = bytes4(_proposal.call);
            if (selector != ADD_COLLATERAL_SELECTOR) revert InvalidSelector();
            
            // Copy the parameters (skip the first 4 bytes which is the selector)
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
            (bool success, ) = _proposal.comet.call(_proposal.call);
            if (!success) revert CometCallFailed();
            /**
             * --- After executing the proposal ---
             * - We must mark the proposal as not active.
             * - No additional checks are needed, since the only the ConfigController is evolved.
             */
            _proposal.expirationTime = 0;   
            
            
            emit ProposeNewCollateralTokenAccepted(_proposalId, msg.sender);
        } else if (_proposal.proposalType == ProposalType.ProposeCollateralRemoval) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner or curator.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be 
             *   transferred to the another ConfigController.
             * - Check if the collateral removal is already initiated.
             */
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
            if (!isCometOwned(_proposal.comet)) revert UnknownComet();
            if (ISandboxCometConfig(_proposal.comet).removalInProgress()) revert CollateralRemovalInProgress();

            if (_proposal.timelock == 0) {
                _proposal.timelock = uint40(block.timestamp + PROPOSE_COLLATERAL_REMOVAL_TIMELOCK);

                emit ProposalTimelockSetted(_proposalId, msg.sender, _proposal.timelock);
            } else {
                /**
                * --- Before executing the proposal checks ---
                * - Check if the collateral token is stil the part of the comet collateral list.
                */
                
                // Copy the parameters (skip the first 4 bytes which is the selector)
                bytes memory collateralTokenBytes = new bytes(_proposal.call.length - 4);
                for (uint i = 4; i < _proposal.call.length; i++) {
                    collateralTokenBytes[i - 4] = _proposal.call[i];
                }            
                address collateralToken = abi.decode(collateralTokenBytes, (address));

                /// Inside the comet, the function getAssetInfoByAddress will revert if the collateral token is not added.
                try ISandboxCometConfig(_proposal.comet).getAssetInfoByAddress(collateralToken) {
                    // Collateral token is still part of the comet collateral list
                }
                catch {
                    revert CollateralTokenNotAdded();
                }
                
                /// Execute the collateral removal
                (bool success, ) = _proposal.comet.call(_proposal.call);
                if (!success) revert CometCallFailed();
                /**
                * --- After executing the proposal ---
                * - We must mark the proposal as not active.
                * - No additional checks are needed, since the only the ConfigController is evolved.
                */
                _proposal.expirationTime = 0;
                emit ProposeCollateralRemovalAccepted(_proposalId, msg.sender, collateralToken);
            }            
        } else if (_proposal.proposalType == ProposalType.ProposeCurveTransition) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner or curator.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be
             *   transferred to the another ConfigController.
             * - Check if the transition is already active.
             */
            if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
            if (!isCometOwned(_proposal.comet)) revert UnknownComet();
            if (ISandboxCometConfig(_proposal.comet).isTransitionActive()) revert CurveTransitionAlreadyInitiated();
            
            // Copy the parameters (skip the first 4 bytes which is the selector)
            bytes memory curveIdBytes = new bytes(_proposal.call.length - 4);
            for (uint i = 4; i < _proposal.call.length; i++) {
                curveIdBytes[i - 4] = _proposal.call[i];
            }
            uint8 curveId = abi.decode(curveIdBytes, (uint8));
            
            /// Execute the curve transition
            (bool success, ) = _proposal.comet.call(_proposal.call);
            if (!success) revert CometCallFailed();
            /**
             * --- After executing the proposal ---
             * - We must mark the proposal as not active.
             * - No additional checks are needed, since the only the ConfigController is evolved.
             */
            _proposal.expirationTime = 0;

            emit ProposeCurveTransitionAccepted(_proposalId, msg.sender, curveId);
        } else if (_proposal.proposalType == ProposalType.ProposeMarketDeprecation) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be
             *   transferred to the another ConfigController.
             * - Check if the market is already deprecated.
             */
            if (msg.sender != owner) revert Unauthorized();
            if (!isCometOwned(_proposal.comet)) revert UnknownComet();
            if (ISandboxCometConfig(_proposal.comet).isDeprecated()) revert MarketAlreadyDeprecated();
            
            // The proposal is not timelocked. Buy we must have the timelock period.
            if (_proposal.timelock == 0) {
                _proposal.timelock = uint40(block.timestamp + PROPOSE_MARKET_DEPRECATION_TIMELOCK);

                emit ProposalTimelockSetted(_proposalId, msg.sender, _proposal.timelock);
            } else { 
                /// Execute the market deprecation
                (bool success, ) = _proposal.comet.call(_proposal.call);
                if (!success) revert CometCallFailed();
                /**
                * --- After executing the proposal ---
                * - We must mark the proposal as not active.
                * - No additional checks are needed, since the only the ConfigController is evolved.
                */
                _proposal.expirationTime = 0;

                emit ProposeMarketDeprecationAccepted(_proposalId, msg.sender, _proposal.comet);
            }
        } else if (_proposal.proposalType == ProposalType.ProposeMarketTransfer) {
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is owner.         
             * - Check if the comet is owned by the ConfigController. Before the proposal is executed the comet can be
             *   transferred to the another ConfigController.
             */
            address _configController = abi.decode(_proposal.call, (address));
            IConfigController _configControllerContract = IConfigController(_configController);
            if (msg.sender != _configControllerContract.owner()) revert Unauthorized();
            if (!isCometOwned(_proposal.comet)) revert UnknownComet();
            if (!IConfigControllerFactory(configControllerFactory).isController(_configController)) revert InvalidConfigController();
        
            if (_proposal.timelock == 0) {
                _proposal.timelock = uint40(block.timestamp + PROPOSE_MARKET_TRANSFER_TIMELOCK);

                emit ProposalTimelockSetted(_proposalId, msg.sender, _proposal.timelock);
            } else {
                /// Remove the comet from the current controller
                uint256 _cometId = cometId[_proposal.comet];
                uint256 _lastIndex = comets.length - 1;
                
                // Only reorder if not the last element
                if (_cometId != _lastIndex) {
                    address _lastComet = comets[_lastIndex];
                    comets[_cometId] = _lastComet;
                    cometId[_lastComet] = _cometId;
                }
                
                comets.pop();
                cometId[_proposal.comet] = 0;
                _configControllerContract.acceptComet(_proposal.comet);
                
                _proposal.expirationTime = 0;
                
                emit ProposeMarketTransferAccepted(_proposalId, msg.sender, _configController); 
            }
        } else if (_proposal.proposalType == ProposalType.ProposeTransferOwnership) {
            address _newOwner = abi.decode(_proposal.call, (address));
            /**
             * --- Significant checks ---
             * The most significant checks. If they fail, the proposal can't be executed. Since that we performed them earlier.  
             * - Check that the msg.sender is the new owner.
             * - Check if the new owner is not the same as the current owner.
             * - Check if the new owner is not the same as the current curator.
             * - Check if the new owner is not the same as the current guardian.
             */
            if (msg.sender != _newOwner) revert Unauthorized();
            if (_newOwner == owner) revert InvalidOwner();
            if (_newOwner == curator) revert InvalidOwner();
            if (_newOwner == guardian) revert InvalidOwner();

            _proposal.expirationTime = 0;
            owner = _newOwner;
            emit ProposeTransferOwnershipAccepted(_proposalId, msg.sender, _newOwner);
        }
        proposals[_proposalId] = _proposal;
    }

    /// @notice Accepts a comet
    /// @dev Only callable by the ConfigControllerFactory
    /// @param _comet The address of the comet to accept
    function acceptComet(address _comet) external {
        if (!IConfigControllerFactory(configControllerFactory).isController(msg.sender)) revert Unauthorized();
        comets.push(_comet);
        cometId[_comet] = comets.length - 1;

        emit CometAccepted(_comet);
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
        bool canCancel;
        
        // Proposal has maturity period
        if (block.timestamp < _proposal.maturityTime) {
            // During maturity period: only guardian or owner can cancel
            canCancel = (msg.sender == guardian || (msg.sender == _proposal.proposer && msg.sender == curator) || msg.sender == owner);
        } else {
            // After the maturity time the curator can cancel if the curator is proposer or owner can cancel
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
            _sandboxConfig.suggestedAmountOfSeedReserves,
            _sandboxConfig.suggestedLockTimeOfSeedReserves,
            _sandboxConfig.transitionDuration
        );

        address comet = ISandboxCometFactory(cometFactory).createComet(_cometConfig.name); // aderyn-fp(reentrancy-state-change)
        ISandboxCometConfig(comet).initialize(_cometConfig, _globalConfig); // aderyn-fp(reentrancy-state-change)

        uint256 cometsNum = comets.length;
        comets.push(comet);
        cometId[comet] = cometsNum;

        if (_cometConfig.amountOfSeedReserves > 0) {
            IERC20(_cometConfig.baseToken).safeTransferFrom(msg.sender, comet, _cometConfig.amountOfSeedReserves);
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
        if (!isCometOwned(comet)) revert UnknownComet();
        if (cometFeeEnabled[comet] == feeEnabled) revert IncorrectValue();

        cometFeeEnabled[comet] = feeEnabled;
        emit CometFeeEnabled(address(this), comet, feeEnabled);
    }

    /// @notice Extracts fees to a self and distributes it
    /// @param comet Comet which should be registered in Controller
    /// @param asset Asset (collateral or base asset) to extract
    function extractFees(address comet, address asset) external onlyOwner {
        if (comet == address(0)) revert ZeroAddress();
        if (!isCometOwned(comet)) revert UnknownComet();

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
    function isCometOwned(address comet) public view returns (bool) {
        if (cometsLength() == 0) return false;
        return comets[cometId[comet]] == comet;
    }

    /// @notice Pauses specific operations in a comet market
    /// @dev Only callable by the owner. The comet must be owned by this controller
    /// @param comet The address of the comet to pause operations in
    /// @param supplyPaused Boolean to pause/unpause supply actions
    /// @param transferPaused Boolean to pause/unpause transfer actions
    /// @param withdrawPaused Boolean to pause/unpause withdraw actions
    /// @param absorbPaused Boolean to pause/unpause absorb actions
    /// @param buyPaused Boolean to pause/unpause buy actions
    function pauseMarket(
        address comet,
        bool supplyPaused,
        bool transferPaused,
        bool withdrawPaused,
        bool absorbPaused,
        bool buyPaused
    ) external override onlyOwner {
        if (comet == address(0)) revert ZeroAddress();
        if (!isCometOwned(comet)) revert UnknownComet();

        ISandboxCometConfig(comet).pause(supplyPaused, transferPaused, withdrawPaused, absorbPaused, buyPaused);
        /// Note: Comet emits the respective event
    }

    /// @notice Withdraws free seed reserves from a comet market
    /// @dev Only callable by the owner. The comet must be owned by this controller.
    ///      Withdrawal is allowed only if the market is deprecated or unlock timestamp has been reached.
    ///      The specified amount will be withdrawn if sufficient free reserves are available.
    /// @param comet The address of the comet to withdraw free reserves from
    /// @param amount The amount of free seed reserves to withdraw
    function withdrawFreeSeedReservesFrom(address comet, uint256 amount) external override onlyOwner {
        if (comet == address(0)) revert ZeroAddress();
        if (!isCometOwned(comet)) revert UnknownComet();

        ISandboxCometConfig(comet).withdrawFreeSeedReserves(amount);
        /// Note: Comet emits the respective event
    }
}
