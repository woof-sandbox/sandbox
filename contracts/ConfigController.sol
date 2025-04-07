// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxController.sol";
import "./IMarket.sol";
import "hardhat/console.sol";
import "./IMarketFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfigController is IConfigController {
    /// @notice The admin of the protocol
    address public override owner;
    address public override curator;
    address public override guardian;
    address public override sandboxController;
    IMarketFactory public override marketFactory;
    address[] public override markets;
    uint public override marketsLength;
    uint public override curatorFee;
    string public override name;
    
    /// @notice Mapping of token => address => unclaimed revenue
    mapping(address => mapping(address => uint)) public unclaimedRevenue;
    
    /// @notice Proposed curator address
    address public override proposedCurator;
    /// @notice Timestamp when the curator proposal expires
    uint public override curatorProposalExpiry;
    /// @notice Duration of curator proposal validity (in seconds)
    uint public constant CURATOR_PROPOSAL_DURATION = 7 days;

    /// @notice Duration of proposal validity (in seconds)
    uint public constant PROPOSAL_DURATION = 7 days;

    /// @notice Mapping of market => active proposal
    mapping(address => MarketConfigProposal) public _marketProposals;

    /// @notice Returns the market configuration proposal for a given market
    /// @param market The address of the market
    /// @return The market configuration proposal
    function marketProposals(address market) external view override returns (MarketConfigProposal memory) {
        return _marketProposals[market];
    }

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

    /// @notice Modifier to check if proposal exists and is active
    modifier proposalExists(address market) {
        if (!_marketProposals[market].isActive) revert NoActiveProposal();
        if (block.timestamp > _marketProposals[market].expiration) revert ProposalExpired();
        _;
    }

    /// @notice Modifier to check if caller can cancel proposal
    modifier canCancelProposal(address market) {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (msg.sender != owner && 
            msg.sender != guardian && 
            (msg.sender != curator || proposal.proposer != curator)) {
            revert Unauthorized();
        }
        _;
    }
    
    /// @notice Initializes the ConfigController contract
    /// @param owner_ The address of the protocol owner
    /// @param curator_ The address of the protocol curator
    /// @param guardian_ The address of the protocol guardian
    /// @param _sandboxController The address of the SandboxController contract
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    constructor(
        address owner_,
        address curator_,
        address guardian_,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name
    ) {
        unchecked {
            if (owner_ == ZERO_ADDRESS) revert ZeroAddress();
            if (_curatorFee > 10000) revert InvalidFeePercentage();
        }
        curator = curator_;
        owner = owner_;
        guardian = guardian_;
        sandboxController = _sandboxController;
        marketFactory = IMarketFactory(_marketFactory);
        curatorFee = _curatorFee;
        name = _name;
    }

    /// @notice Validates market collateral token configuration
    /// @dev Internal function to validate collateral token parameters
    /// @param collateralTokenConfig The collateral token configuration to validate
    /// @param collateralAssetLimitations The limitations from sandbox controller
    /// @param addedCollateralTokens Array of already added collateral tokens
    function _validateCollateralTokenConfig(
        IConfigController.CollateralTokenConfig memory collateralTokenConfig,
        ISandboxController.CollateralTokenConfig memory collateralAssetLimitations,
        address[] memory addedCollateralTokens
    ) internal view {
        // Default checks
        if (collateralTokenConfig.collateralToken == ZERO_ADDRESS) revert ZeroAddress();
        if (ISandboxController(sandboxController).getCollateralAssetByAddress(collateralTokenConfig.collateralToken).priceFeed == ZERO_ADDRESS) revert CollateralTokenNotWhitelisted();
        if (!ISandboxController(sandboxController).isPriceFeedWhitelisted(collateralTokenConfig.priceFeed)) revert WrongPriceFeed();
        
        for (uint j; j < addedCollateralTokens.length; j++) {
            if (addedCollateralTokens[j] == collateralTokenConfig.collateralToken) revert CollateralTokenAlreadyAdded();
        }
        
        if (collateralTokenConfig.supplyCap == 0 ||
            collateralTokenConfig.borrowCollateralFactor == 0 ||
            collateralTokenConfig.liquidateCollateralFactor == 0 ||
            collateralTokenConfig.liquidationFactor == 0 ||
            collateralTokenConfig.borrowCollateralFactor < collateralAssetLimitations.minBorrowCollateralFactor ||
            collateralTokenConfig.borrowCollateralFactor > collateralAssetLimitations.maxBorrowCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor < collateralTokenConfig.borrowCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor > collateralAssetLimitations.maxLiquidateCollateralFactor ||
            collateralTokenConfig.liquidateCollateralFactor < collateralAssetLimitations.minLiquidateCollateralFactor ||
            collateralTokenConfig.liquidationFactor > collateralAssetLimitations.maxLiquidationFactor ||
            collateralTokenConfig.liquidationFactor < collateralAssetLimitations.minLiquidationFactor
        ) revert WrongCollateralTokenSettings();
    }

    // External/Public functions
    /// @notice Sets a new curator fee
    /// @dev Only callable by the owner. Emits a CuratorFeeUpdated event
    /// @param _curatorFee New curator fee in basis points (1% = 100). Must not exceed 10000 (100%)
    function setCuratorFee(uint _curatorFee) external override onlyOwner {
        if (_curatorFee > 10000) revert InvalidFeePercentage();
        
        uint oldFee = curatorFee;
        curatorFee = _curatorFee;
        
        emit CuratorFeeUpdated(oldFee, _curatorFee);
    }

    /// @notice Accumulates revenue in the contract
    /// @dev Anyone can call this function to add revenue
    /// @param token The ERC20 token address to accumulate
    /// @param amount The amount of tokens to accumulate
    function accumulateRevenue(address token, uint amount) external override {
        if (token == ZERO_ADDRESS) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // If curator fee is 0, all revenue goes to the owner
        if (curatorFee == 0) {
            unclaimedRevenue[token][owner] += amount;
            emit RevenueAccumulated(token, amount);
            return;
        }
        
        uint curatorAmount = (amount * curatorFee) / 10000;
        uint ownerAmount = amount - curatorAmount;
        
        if (curatorAmount > 0) {
            unclaimedRevenue[token][curator] += curatorAmount;
        }
        if (ownerAmount > 0) {
            unclaimedRevenue[token][owner] += ownerAmount;
        }
        
        emit RevenueAccumulated(token, amount);
    }

    /// @notice Claims accumulated revenue for the caller
    /// @dev Can be called by anyone to claim their share
    /// @param token The ERC20 token address to claim
    function claimRevenue(address token) external override {
        if (token == ZERO_ADDRESS) revert ZeroAddress();
        
        uint amount = unclaimedRevenue[token][msg.sender];
        if (amount == 0) revert InsufficientBalance();
        
        unclaimedRevenue[token][msg.sender] = 0;
        IERC20(token).transfer(msg.sender, amount);
        
        emit RevenueClaimed(token, msg.sender, amount);
    }

    /// @notice Returns the unclaimed revenue balance for a specific token and address
    /// @param token The ERC20 token address
    /// @param account The address to check balance for
    /// @return The unclaimed balance
    function getUnclaimedRevenue(address token, address account) external view override returns (uint) {
        return unclaimedRevenue[token][account];
    }

    /// @notice Creates a new market with the specified configuration
    /// @dev Only callable by the owner
    /// @param _marketConfig The configuration parameters for the new market
    /// @return The address of the newly created market
    function createMarket(
        MarketConfig memory _marketConfig
    ) override external onlyOwner returns(address) {
        if (_marketConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = ISandboxController(sandboxController).getBaseAssetByAddress(_marketConfig.baseToken);
        if (baseAssetConfig.priceFeed == ZERO_ADDRESS) revert BaseTokenNotWhitelisted();

        if (!ISandboxController(sandboxController).isPriceFeedWhitelisted(_marketConfig.priceFeed)) revert WrongPriceFeed();
        if (_marketConfig.collateraTokens.length == 0) revert ZeroCollateralAssets();
        
        // Validate baseTokenCurveId
        if (_marketConfig.baseTokenCurveId >= baseAssetConfig.baseAssetCurves.length) revert WrongCurveParams();
        
        // Gas saving
        uint length = _marketConfig.collateraTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralTokenConfig memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        
        for (uint i; i < length;) {
            unchecked {
                collateralTokenConfig = _marketConfig.collateraTokens[i]; 
                collateralAssetLimitations = ISandboxController(sandboxController).getCollateralAssetByAddress(collateralTokenConfig.collateralToken);
                
                // Default checks
                if (collateralTokenConfig.collateralToken == _marketConfig.baseToken) revert WrongCollateralTokenSettings(); 
                _validateCollateralTokenConfig(
                    collateralTokenConfig, 
                    collateralAssetLimitations, 
                    addedCollateralTokens
                );
                
                addedCollateralTokens[i] = collateralTokenConfig.collateralToken;
                i++;
            }
        }
        unchecked {
            marketsLength++;
        }
        markets.push(marketFactory.createMarket(_marketConfig));
        emit MarketConfigurationCreated(
            markets[marketsLength - 1],
            _marketConfig.baseToken,
            _marketConfig.priceFeed,
            marketsLength
        );
        return markets[markets.length - 1];
    }

    /// @notice Transfers ownership of the protocol to a new address
    /// @dev Only callable by the current owner
    /// @param _newOwner The address of the new owner
    function grantOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    /// @notice Proposes a new curator
    /// @dev Only callable by the owner. Emits a CuratorProposed event
    /// @param _proposedCurator The address of the proposed curator
    function proposeCurator(address _proposedCurator) external onlyOwner {
        if (_proposedCurator == ZERO_ADDRESS) revert ZeroAddress();
        if (_proposedCurator == curator) revert InvalidCurator();
        
        proposedCurator = _proposedCurator;
        curatorProposalExpiry = block.timestamp + CURATOR_PROPOSAL_DURATION;
        
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

    /// @notice Proposes new collateral tokens configuration for a market
    /// @dev Only callable by owner or curator
    /// @param market The address of the market
    /// @param _collateralTokens The new collateral tokens configuration
    function proposeMarketCollateralTokens(
        address market, 
        IConfigController.CollateralTokenConfig[] memory _collateralTokens
    ) external {

        if (market == ZERO_ADDRESS) revert ZeroAddress();
        if (_collateralTokens.length == 0) revert ZeroCollateralAssets();
        if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
        if (_marketProposals[market].isActive) revert ProposalExists();

        // Gas saving
        uint length = _collateralTokens.length;
        IConfigController.CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralTokenConfig memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        for (uint i; i < length;) {
            unchecked {
                collateralTokenConfig = _collateralTokens[i];
                collateralAssetLimitations = ISandboxController(sandboxController).getCollateralAssetByAddress(collateralTokenConfig.collateralToken);
                
                _validateCollateralTokenConfig(
                    collateralTokenConfig, 
                    collateralAssetLimitations, 
                    addedCollateralTokens
                );
                
                addedCollateralTokens[i] = collateralTokenConfig.collateralToken;
                i++;
            }
        }

        _marketProposals[market] = MarketConfigProposal({
            market: market,
            collateralTokens: _collateralTokens,
            expiration: block.timestamp + PROPOSAL_DURATION,
            proposer: msg.sender,
            isActive: true
        });
        console.log(_marketProposals[market].expiration);
        emit MarketConfigProposed(
            market, 
            msg.sender, 
            block.timestamp + PROPOSAL_DURATION
        );
    }

    /// @notice Cancels an active proposal
    /// @dev Can be called by owner, guardian, or curator (only their own proposals)
    /// @param market The address of the market
    function cancelMarketConfigProposal(address market) external proposalExists(market) canCancelProposal(market) {
        delete _marketProposals[market];
        emit MarketConfigProposalCancelled(market, msg.sender);
    }

    /// @notice Executes an active proposal
    /// @dev Can be called by anyone after proposal period
    /// @param market The address of the market
    function executeMarketConfigProposal(address market) external proposalExists(market) {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (block.timestamp <= proposal.expiration) revert ProposalNotExpired();

        IMarket(market).setCollateralTokens(proposal.collateralTokens);
        delete _marketProposals[market];
        emit MarketConfigProposalExecuted(market, msg.sender);
    }
}
