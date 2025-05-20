// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./interfaces/IConfigController.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/ISandboxComet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./ConfigControllerFactory.sol";
import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/IERC20NonStandard.sol";


/**
 * @title ConfigController
 * @author WOOF Software
 * @notice Manages protocol configuration, market creation, and curator governance
 * @dev This contract handles the core configuration of the protocol, including:
 * - Market creation and management
 * - Curator role management
 * - Revenue distribution
 * - Proposal system for market configuration changes
 * - Market transfer proposals
 */
contract ConfigController is IConfigController, Initializable {
    /// @notice The address of the protocol owner
    address public override owner;

    /// @notice The address of the protocol curator
    address public override curator;

    /// @notice The address of the protocol guardian
    address public override guardian;

    /// @notice The address of the SandboxController contract
    address public override sandboxController;

    /// @notice The address of the MarketFactory contract
    address public override marketFactory;

    /// @dev This is a more gas efficient way to store the all markets and check if the market address is inside the array.
    /// @notice The mapping of market address => market Id
    mapping(address => uint) public marketId;

    /// @notice Array of all markets created by this controller
    address[] public override markets;

    /// @notice The number of markets created by this controller
    uint public override marketsLength;

    /// @notice The curator fee in basis points (1% = 100)
    uint public override curatorFee;

    /// @notice The name of this controller
    string public override name;

    /// @notice Mapping of token => address => unclaimed revenue
    mapping(address => mapping(address => uint)) public unclaimedRevenue;

    /// @notice Mapping of market address => base token curve Id.
    mapping(address => uint) public override marketBaseTokenCurveId;

    /// @notice Mapping of market address => proposed base asset curve.
    mapping(address => MarketBaseTokenCurveProposal)
        public proposedBaseAssetCurve;

    /// @notice The list of revenue tokens
    address[] public override revenueTokens;

    /// @notice The mapping of revenue token => index
    mapping(address => uint) public revenueTokenIndex;

    /// @notice The address of the proposed curator
    address public override proposedCurator;

    /// @notice The timestamp when the curator proposal expires
    uint public override curatorProposalExpiry;

    /// @notice The duration of curator proposals in seconds
    uint public curatorProposalDuration;

    /// @notice The duration of market proposals in seconds
    uint public proposalDuration;

    /// @notice The address of the ConfigControllerFactory contract
    address public override configControllerFactory;

    /// @notice Mapping of market => active market configuration proposal
    mapping(address => MarketConfigProposal) public _marketProposals;

    /// @notice Mapping of market => active market transfer proposal
    mapping(address => MarketTransferProposal) public _marketTransferProposals;

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
        if (_marketProposals[market].revertTime == 0) revert NoActiveProposal();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the ConfigController contract
    /// @param _owner The address of the protocol owner
    /// @param _guardian The address of the protocol guardian
    /// @param _sandboxController The address of the SandboxController contract
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of market proposals in seconds
    function initialize(
        address _owner,
        address _curator,
        address _guardian,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration,
        address _configControllerFactory
    ) public override initializer {
        unchecked {
            if (_owner == ZERO_ADDRESS) revert ZeroAddress();
            if (_sandboxController == ZERO_ADDRESS) revert ZeroAddress();
            if (_marketFactory == ZERO_ADDRESS) revert ZeroAddress();
            if (_curatorFee > 10000) revert InvalidFeePercentage();
            if (_configControllerFactory == ZERO_ADDRESS) revert ZeroAddress();
            uint minUpdateTime = ISandboxController(_sandboxController)
                .controllerConfiguration()
                .minUpdateTime;
            if (
                _curatorProposalDuration < minUpdateTime ||
                _proposalDuration < minUpdateTime
            ) revert ProposalDurationTooShort();
        }
        owner = _owner;
        guardian = _guardian;
        sandboxController = _sandboxController;
        marketFactory = _marketFactory;
        curatorFee = _curatorFee;
        name = _name;
        curatorProposalDuration = _curatorProposalDuration;
        proposalDuration = _proposalDuration;
        configControllerFactory = _configControllerFactory;
        proposeCurator(_curator);
    }

    /// @notice Returns the proposed base token curve for a market
    /// @param market The address of the market
    /// @return The proposed base token curve
    function baseAssetsCurvesProposals(
        address market
    ) external view override returns (MarketBaseTokenCurveProposal memory) {
        return proposedBaseAssetCurve[market];
    }

    /// @notice Proposes a new base token curve for a market
    /// @dev Only callable by owner or curator
    /// @param market The address of the market
    /// @param curveId The index of the new base token curve
    function proposeUpdateBaseTokenCurve(
        address market,
        uint256 curveId
    ) external override onlyOwnerOrCurator {
        if (!_isMarketOwned(market)) revert MarketNotOwned();
        ISandboxComet marketContract = ISandboxComet(market);
        if (
            curveId >=
            ISandboxController(sandboxController)
                .curves(marketContract.baseToken())
                .length
        ) revert InvalidCurveId();

        proposedBaseAssetCurve[market] = MarketBaseTokenCurveProposal({
            market: market,
            curveId: curveId,
            revertTime: block.timestamp + proposalDuration,
            proposer: msg.sender
        });

        emit MarketBaseTokenCurveProposed(
            market,
            msg.sender,
            block.timestamp + proposalDuration,
            curveId
        );
    }

    /// @notice Executes the base token curve proposal for a market
    /// @param market The address of the market
    function executeBaseTokenCurveProposal(address market) external override {
        if (proposedBaseAssetCurve[market].revertTime == 0)
            revert NoActiveProposal();

        if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
        if (block.timestamp < proposedBaseAssetCurve[market].revertTime)
            revert ProposalNotReady();

        marketBaseTokenCurveId[market] = proposedBaseAssetCurve[market].curveId;

        delete proposedBaseAssetCurve[market];
        emit MarketBaseTokenCurveProposalExecuted(market, msg.sender);
    }

    /// @notice Cancels the base token curve proposal for a market
    /// @param market The address of the market
    function cancelBaseTokenCurveProposal(address market) external override {
        if (proposedBaseAssetCurve[market].revertTime == 0)
            revert NoActiveProposal();
        if (msg.sender == guardian) {
            if (block.timestamp > proposedBaseAssetCurve[market].revertTime)
                revert ProposalNotRevertable();
        } else {
            if (
                msg.sender != owner &&
                (msg.sender != curator &&
                    msg.sender != proposedBaseAssetCurve[market].proposer)
            ) revert Unauthorized();
        }

        delete proposedBaseAssetCurve[market];
        emit MarketBaseTokenCurveProposalCancelled(market, msg.sender);
    }

    /// @notice Returns the market configuration proposal for a given market
    /// @param market The address of the market
    /// @return The market configuration proposal
    function marketProposals(
        address market
    ) external view override returns (MarketConfigProposal memory) {
        return _marketProposals[market];
    }

    /// @notice Returns the market transfer proposal for a given market
    /// @param market The address of the market
    /// @return The market transfer proposal
    function marketTransferProposals(
        address market
    ) external view returns (MarketTransferProposal memory) {
        return _marketTransferProposals[market];
    }

    /// @notice Sets a new curator fee
    /// @dev Only callable by the owner. Emits a CuratorFeeUpdated event
    /// @param _curatorFee New curator fee in basis points (1% = 100). Must not exceed 10000 (100%)
    function setCuratorFee(uint _curatorFee) external override onlyOwner {
        if (_curatorFee > 10000) revert InvalidFeePercentage();

        uint oldFee = curatorFee;
        curatorFee = _curatorFee;

        emit CuratorFeeUpdated(oldFee, _curatorFee);
    }

    /// @notice Returns the number of revenue tokens
    /// @return The number of revenue tokens
    function revenueTokensLength() external view override returns (uint) {
        return revenueTokens.length;
    }

    /// @notice Accumulates revenue in the contract
    /// @dev Anyone can call this function to add revenue
    /// @param token The ERC20 token address to accumulate
    /// @param amount The amount of tokens to accumulate
    function accumulateRevenue(address token, uint amount) external override {
        if (marketId[msg.sender] == 0) revert Unauthorized();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).transferFrom(msg.sender, address(this), amount);

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

    /// @notice Claims accumulated revenue for all tokens for the caller
    /// @dev Can be called by anyone to claim their share of all revenue tokens
    function claimAllRevenue() external override {
        uint length = revenueTokens.length;

        for (uint i; i < length; ) {
            address token = revenueTokens[i];
            uint amount = unclaimedRevenue[token][msg.sender];
            if (amount > 0) {
                unclaimedRevenue[token][msg.sender] = 0;

                IERC20(token).transfer(msg.sender, amount);
                emit RevenueClaimed(token, msg.sender, amount);
            }
            unchecked {
                ++i;
            }
        }
    }

    function removeClaimRevenueToken(
        address token
    ) external override onlyOwner {
        if (revenueTokenIndex[token] == 0) revert TokenNotRevenue();
        delete revenueTokens[revenueTokenIndex[token]];
        delete revenueTokenIndex[token];
    }

    /// @notice Returns the unclaimed revenue balance for a specific token and address
    /// @param token The ERC20 token address
    /// @param account The address to check balance for
    /// @return The unclaimed balance
    function getUnclaimedRevenue(
        address token,
        address account
    ) external view override returns (uint) {
        return unclaimedRevenue[token][account];
    }

    /// @notice Creates a new market with the specified configuration
    /// @dev Only callable by the owner
    /// @param _marketConfig The configuration parameters for the new market
    /// @return The address of the newly created market
    function createMarket(
        MarketConfig memory _marketConfig
    ) external override onlyOwner returns (address) {
        if (_marketConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        ISandboxController.BaseAssetConfiguration
            memory baseAssetConfig = ISandboxController(sandboxController)
                .baseAssets(_marketConfig.baseToken);
        if (baseAssetConfig.priceFeed == ZERO_ADDRESS)
            revert BaseTokenNotWhitelisted();
        if (
            !ISandboxController(sandboxController).isPriceFeedWhitelisted(
                _marketConfig.priceFeed
            )
        ) revert WrongPriceFeed();
        if (_marketConfig.collateralTokens.length == 0)
            revert ZeroCollateralAssets();

        if (
            _marketConfig.baseTokenCurveId >=
            baseAssetConfig.baseAssetCurves.length
        ) revert WrongCurveParams();
        uint length = _marketConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        
        for (uint i; i < length; ) {
            unchecked {
                collateralTokenConfig = _marketConfig.collateralTokens[i];
                collateralAssetLimitations = ISandboxController(
                    sandboxController
                ).collateralAssets(collateralTokenConfig.collateralToken);

                if (
                    collateralTokenConfig.collateralToken ==
                    _marketConfig.baseToken
                ) revert WrongCollateralTokenSettings();
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
        unchecked {
            marketsLength++;
        }
        
        ISandboxController.SandboxControllerConfiguration
            memory config = ISandboxController(sandboxController).config();
            
        address market = ISandboxCometFactory(marketFactory).createMarket(
            _marketConfig,
            config
        );
        markets.push(market);
        marketId[market] = marketsLength - 1;

        IERC20NonStandard(_marketConfig.baseToken).transferFrom(
            msg.sender,
            address(this),
            config.suggestedAmountOfSeedReserves
        );
        
        IERC20NonStandard(_marketConfig.baseToken).transfer(
            market,
            config.suggestedAmountOfSeedReserves
        );
        
        ISandboxComet(market).initializeStorage();
        
        if (revenueTokenIndex[_marketConfig.baseToken] == 0) {
            revenueTokens.push(_marketConfig.baseToken);
            revenueTokenIndex[_marketConfig.baseToken] = revenueTokens.length;
        }

        marketBaseTokenCurveId[markets[marketsLength - 1]] = _marketConfig
            .baseTokenCurveId;

        emit MarketCreated(
            market,
            _marketConfig.baseToken,
            _marketConfig.priceFeed,
            marketsLength,
            _marketConfig.baseTokenCurveId
        );

        return markets[marketsLength - 1];
    }

    /// @notice Withdraws base tokens from the market
    /// @dev Only callable by the owner
    /// @param market The address of the market
    /// @param amount The amount of base tokens to withdraw
    function withdraw(address market, uint256 amount) external override {
        if (market == ZERO_ADDRESS) revert ZeroAddress();
        if (msg.sender != owner) revert Unauthorized();
        ISandboxComet comet = ISandboxComet(market);
        address baseToken = comet.baseToken();
        comet.withdraw(baseToken, amount);
        IERC20(baseToken).transfer(msg.sender, amount);
        emit Withdrawn(baseToken, msg.sender, amount);
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
    function proposeCurator(address _proposedCurator) public {
        if (!_isInitializing()) {
            if (msg.sender != owner) revert Unauthorized();
        }
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
        if (_marketProposals[market].revertTime > 0) revert ProposalExists();

        uint length = _collateralTokens.length;
        IConfigController.CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        for (uint i; i < length; ) {
            unchecked {
                collateralTokenConfig = _collateralTokens[i];
                collateralAssetLimitations = ISandboxController(
                    sandboxController
                ).collateralAssets(collateralTokenConfig.collateralToken);

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

        _marketProposals[market] = MarketConfigProposal({
            market: market,
            collateralTokens: _collateralTokens,
            revertTime: block.timestamp + proposalDuration,
            proposer: msg.sender
        });
        emit MarketConfigProposed(
            market,
            msg.sender,
            block.timestamp + proposalDuration
        );
    }

    /// @notice Cancels an active proposal
    /// @dev Can be called by owner, guardian, or curator (only their own proposals)
    /// @param market The address of the market
    function cancelMarketConfigProposal(
        address market
    ) external proposalExists(market) {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (proposal.revertTime == 0) revert NoActiveProposal();
        if (msg.sender == guardian) {
            if (block.timestamp > proposal.revertTime)
                revert ProposalNotRevertable();
        } else {
            if (
                msg.sender != owner ||
                (msg.sender != curator && msg.sender != proposal.proposer)
            ) revert Unauthorized();
        }

        delete _marketProposals[market];
        emit MarketConfigProposalCancelled(market, msg.sender);
    }

    /// @notice Executes an active proposal
    /// @dev Can be called by anyone after proposal period
    /// @param market The address of the market
    function executeMarketConfigProposal(
        address market
    ) external proposalExists(market) onlyOwnerOrCurator {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (block.timestamp <= proposal.revertTime) revert ProposalNotReady();

        ISandboxComet(market).setCollateralTokens(proposal.collateralTokens);
        delete _marketProposals[market];
        emit MarketConfigProposalExecuted(market, msg.sender);
    }

    /// @notice Sets the duration for curator and market configuration proposals
    /// @dev Only callable by the owner
    /// @param _curatorProposalDuration New duration for curator proposals in seconds
    /// @param _proposalDuration New duration for market configuration proposals in seconds
    function setProposalDurations(
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external onlyOwner {
        uint256 minUpdateTime = ISandboxController(sandboxController)
            .controllerConfiguration()
            .minUpdateTime;
        if (
            _curatorProposalDuration < minUpdateTime ||
            _proposalDuration < minUpdateTime
        ) revert ProposalDurationTooShort();

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

    /// @notice Proposes to transfer a market to a new controller
    /// @dev Only callable by the owner
    /// @param market The address of the market to transfer
    /// @param newController The address of the new controller
    function proposeMarketTransfer(
        address market,
        address newController
    ) external onlyOwner {
        if (market == ZERO_ADDRESS) revert ZeroAddress();
        if (
            !ConfigControllerFactory(configControllerFactory).isController(
                newController
            )
        ) revert NonConfigController();
        if (_marketTransferProposals[market].expiration > 0)
            revert ProposalExists();
        if (!_isMarketOwned(market)) revert MarketNotOwned();

        _marketTransferProposals[market] = MarketTransferProposal({
            market: market,
            newController: newController,
            expiration: block.timestamp + proposalDuration
        });

        emit MarketTransferProposed(
            market,
            newController,
            block.timestamp + proposalDuration
        );
    }

    /// @notice Cancels an active market transfer proposal
    /// @dev Only callable by the owner
    /// @param market The address of the market
    function cancelMarketTransferProposal(address market) external onlyOwner {
        if (_marketTransferProposals[market].expiration == 0)
            revert NoActiveProposal();

        delete _marketTransferProposals[market];
        emit MarketTransferProposalCancelled(market, msg.sender);
    }

    /// @notice Accepts a market transfer proposal
    /// @dev Only callable by the new controller
    /// @param market The address of the market
    function acceptMarketTransferProposal(address market) external {
        MarketTransferProposal memory proposal = _marketTransferProposals[
            market
        ];
        if (proposal.newController == ZERO_ADDRESS) revert NoActiveProposal();
        if (msg.sender != IConfigController(proposal.newController).owner())
            revert Unauthorized();
        if (block.timestamp > proposal.expiration) revert ProposalExpired();

        _removeMarket(market);
        ISandboxComet(market).transferOwnership(proposal.newController);

        delete _marketTransferProposals[market];
        emit MarketTransferProposalAccepted(
            market,
            address(this),
            proposal.newController
        );
    }

    function addMarket(address market) external override {
        if (marketId[market] != 0) revert MarketAlreadyAdded();

        markets.push(market);
        marketId[market] = markets.length;
        marketsLength++;
    }

    /// @notice Validates market collateral token configuration
    /// @dev Internal function to validate collateral token parameters
    /// @param collateralTokenConfig The collateral token configuration to validate
    /// @param collateralAssetLimitations The limitations from sandbox controller
    /// @param addedCollateralTokens Array of already added collateral tokens
    function _validateCollateralTokenConfig(
        IConfigController.CollateralTokenConfig memory collateralTokenConfig,
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations,
        address[] memory addedCollateralTokens
    ) internal view {
        if (collateralTokenConfig.collateralToken == ZERO_ADDRESS)
            revert ZeroAddress();
        if (
            ISandboxController(sandboxController)
                .collateralAssets(collateralTokenConfig.collateralToken)
                .priceFeed == ZERO_ADDRESS
        ) revert CollateralTokenNotWhitelisted();
        if (
            !ISandboxController(sandboxController).isPriceFeedWhitelisted(
                collateralTokenConfig.priceFeed
            )
        ) revert WrongPriceFeed();

        for (uint j; j < addedCollateralTokens.length; j++) {
            if (
                addedCollateralTokens[j] ==
                collateralTokenConfig.collateralToken
            ) revert CollateralTokenAlreadyAdded();
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

    /// @notice Internal function to check if a market is owned by this controller
    /// @param market The address of the market
    /// @return True if the market is owned by this controller
    function _isMarketOwned(address market) internal view returns (bool) {
        return marketId[market] != 0;
    }

    /// @notice Internal function to remove a market from the controller
    /// @param market The address of the market to remove
    function _removeMarket(address market) internal {
        uint id = marketId[market];
        markets[id] = markets[marketsLength];
        marketId[markets[id]] = id;
        markets.pop();
        marketsLength--;
    }
}
