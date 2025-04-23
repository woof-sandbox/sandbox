// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./interfaces/IConfigController.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/ISandboxMarket.sol";
import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/IERC20NonStandard.sol";
import "./interfaces/ISandboxComet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./lib/SandboxUtils.sol";

contract ConfigController is IConfigController {
    using SandboxUtils for address;

    /// @notice The admin of the protocol
    address public override owner;
    address public override curator;
    address public override guardian;
    address public override sandboxController;
    address public override marketFactory;
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
    mapping(address => MarketConfig) public _marketConfigs;

    /// @notice Returns the market configuration proposal for a given market
    /// @param market The address of the market
    /// @return The market configuration proposal
    function marketProposals(
        address market
    ) external view override returns (MarketConfigProposal memory) {
        return _marketProposals[market];
    }

    /// @notice Modifier to restrict access to owner only
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @notice Modifier to check if proposal exists and is active
    modifier proposalExists(address market) {
        if (!_marketProposals[market].isActive) revert NoActiveProposal();
        _;
    }

    /// @notice Modifier to check if caller can cancel proposal
    modifier canCancelProposal(address market) {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (
            msg.sender != owner &&
            msg.sender != guardian &&
            (msg.sender != curator || proposal.proposer != curator)
        ) {
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
        address _cometImplementation,
        address _marketFactory,
        uint _curatorFee,
        string memory _name
    ) {
        unchecked {
            if (owner_ == ZERO_ADDRESS) revert ZeroAddress();
            if (_curatorFee > 10000) revert InvalidFeePercentage();
        }
        ISandboxCometFactory(_marketFactory).initialize(_cometImplementation);
        curator = curator_;
        owner = owner_;
        guardian = guardian_;
        sandboxController = _sandboxController;
        marketFactory = _marketFactory;
        curatorFee = _curatorFee;
        name = _name;
    }

    function setSpeeds(
        address market_,
        uint64 baseTrackingSupplySpeed_,
        uint64 baseTrackingBorrowSpeed_
    ) external onlyOwner {
        ISandboxComet(market_).setSpeeds(
            baseTrackingSupplySpeed_,
            baseTrackingBorrowSpeed_,
            false
        );
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

        _validateBaseTokenConfig(_marketConfig.config, _marketConfig.baseToken);

        if (_marketConfig.collateralTokens.length == 0)
            revert ZeroCollateralAssets();

        uint length = _marketConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);

        for (uint i; i < length; ) {
            unchecked {
                collateralTokenConfig = _marketConfig
                    .collateralTokens[i]
                    .config;
                address collateralToken = _marketConfig
                    .collateralTokens[i]
                    .collateralToken;
                collateralAssetLimitations = ISandboxController(
                    sandboxController
                ).collateralAssets(collateralToken);

                if (collateralToken == _marketConfig.baseToken)
                    revert InvalidFactors();
                _validateCollateralTokenConfig(
                    _marketConfig.collateralTokens[i],
                    collateralAssetLimitations,
                    addedCollateralTokens
                );

                addedCollateralTokens[i] = collateralToken;
                i++;
            }
        }
        unchecked {
            marketsLength++;
        }

        ISandboxController.SandboxControllerConfiguration
            memory config = ISandboxController(sandboxController).config();

        IERC20NonStandard(_marketConfig.baseToken).transferFrom(
            msg.sender,
            address(this),
            config.suggestedAmountOfSeedReserves
        );

        address market = ISandboxCometFactory(marketFactory).createMarket(
            _marketConfig,
            config,
            owner,
            ISandboxController(sandboxController).dao(),
            guardian,
            ISandboxController(sandboxController).borrowMin(
                _marketConfig.baseToken
            )
        );

        _marketConfigs[market] = _marketConfig;

        markets.push(market);

        IERC20NonStandard(_marketConfig.baseToken).transfer(
            market,
            config.suggestedAmountOfSeedReserves
        );

        emit MarketConfigurationCreated(
            markets[marketsLength - 1],
            _marketConfig.baseToken,
            _marketConfig.config.priceFeed,
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
        IConfigController.CollateralToken[] memory _collateralTokens
    ) external {
        if (market == ZERO_ADDRESS) revert ZeroAddress();
        if (_collateralTokens.length == 0) revert ZeroCollateralAssets();
        if (msg.sender != owner && msg.sender != curator) revert Unauthorized();
        if (_marketProposals[market].isActive) revert ProposalExists();

        // Gas saving
        uint length = _collateralTokens.length;
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        for (uint i; i < length; ) {
            unchecked {
                collateralAssetLimitations = ISandboxController(
                    sandboxController
                ).collateralAssets(_collateralTokens[i].collateralToken);

                _validateCollateralTokenConfig(
                    _collateralTokens[i],
                    collateralAssetLimitations,
                    addedCollateralTokens
                );

                addedCollateralTokens[i] = _collateralTokens[i].collateralToken;
                i++;
            }
        }

        bytes memory callData = abi.encodeWithSelector(
            ISandboxMarket.setCollateralTokens.selector,
            _collateralTokens
        );

        _marketProposals[market] = MarketConfigProposal({
            market: market,
            proposer: msg.sender,
            proposalType: ProposalType.Collateral,
            callData: callData,
            expiration: block.timestamp + PROPOSAL_DURATION,
            isActive: true
        });

        emit MarketConfigProposed(
            market,
            msg.sender,
            block.timestamp + PROPOSAL_DURATION
        );
    }

    /// @notice Cancels an active proposal
    /// @dev Can be called by owner, guardian, or curator (only their own proposals)
    /// @param market The address of the market
    function cancelMarketConfigProposal(
        address market
    ) external proposalExists(market) canCancelProposal(market) {
        if (block.timestamp > _marketProposals[market].expiration)
            revert ProposalExpired();
        delete _marketProposals[market];
        emit MarketConfigProposalCancelled(market, msg.sender);
    }

    /// @notice Executes a market configuration proposal
    /// @dev Can be called by anyone after the proposal expiration
    /// @param market The address of the market
    function executeMarketConfigProposal(
        address market
    ) external proposalExists(market) {
        MarketConfigProposal memory proposal = _marketProposals[market];
        if (block.timestamp <= proposal.expiration) revert ProposalNotExpired();

        (bool success, bytes memory data) = proposal.market.call(
            proposal.callData
        );

        if (data.length > 0) {
            assembly {
                let err := mload(add(data, 0x20))
                revert(err, 0)
            }
        }

        if (!success) revert ExecutionFailed();

        delete _marketProposals[market];
        emit MarketConfigProposalExecuted(market, msg.sender);
    }

    function getAssetConfig(
        address market,
        uint256 index
    ) external view override returns (CollateralToken memory) {
        return _marketConfigs[market].collateralTokens[index];
    }

    function getAssetConfigByAddress(
        address market,
        address asset
    ) external view override returns (CollateralToken memory) {
        CollateralToken memory config;
        for (uint i; i < _marketConfigs[market].collateralTokens.length; ) {
            if (
                _marketConfigs[market].collateralTokens[i].collateralToken ==
                asset
            ) {
                config = _marketConfigs[market].collateralTokens[i];
                break;
            }
            unchecked {
                i++;
            }
        }
        return config;
    }

    /// @notice Validates base token configuration
    /// @dev Internal function to validate base token parameters
    /// @param baseTokenConfig The base token configuration to validate
    /// @param baseToken The address of the base token
    function _validateBaseTokenConfig(
        IConfigController.BaseTokenConfig memory baseTokenConfig,
        address baseToken
    ) internal view {
        if (baseToken == ZERO_ADDRESS) revert ZeroAddress();
        if (
            !ISandboxController(sandboxController)
                .isCurveConfigurationWhitelisted(
                    baseToken.encodeCurve(baseTokenConfig.curve)
                )
        ) revert BaseTokenNotWhitelisted();
        if (
            !ISandboxController(sandboxController).isPriceFeedWhitelisted(
                baseTokenConfig.priceFeed
            )
        ) revert InvalidPriceFeed();
    }

    /// @notice Validates market collateral token configuration
    /// @dev Internal function to validate collateral token parameters
    /// @param collateralToken The collateral token configuration to validate
    /// @param collateralAssetLimitations The limitations from sandbox controller
    /// @param addedCollateralTokens Array of already added collateral tokens
    function _validateCollateralTokenConfig(
        IConfigController.CollateralToken memory collateralToken,
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations,
        address[] memory addedCollateralTokens
    ) internal view {
        if (collateralToken.collateralToken == ZERO_ADDRESS)
            revert ZeroAddress();
        if (
            !ISandboxController(sandboxController).isCollateralTokenWhitelisted(
                collateralToken.collateralToken
            )
        ) revert CollateralTokenNotWhitelisted();

        CollateralTokenConfig memory config = collateralToken.config;

        if (
            !ISandboxController(sandboxController).isPriceFeedWhitelisted(
                config.priceFeed
            )
        ) revert InvalidPriceFeed();

        for (uint j; j < addedCollateralTokens.length; j++) {
            if (addedCollateralTokens[j] == collateralToken.collateralToken)
                revert CollateralTokenAlreadyAdded();
        }

        if (
            config.supplyCap == 0 ||
            config.borrowCollateralFactor == 0 ||
            config.liquidateCollateralFactor == 0 ||
            config.liquidationFactor == 0 ||
            config.borrowCollateralFactor <
            collateralAssetLimitations.minBorrowCollateralFactor ||
            config.borrowCollateralFactor >
            collateralAssetLimitations.maxBorrowCollateralFactor ||
            config.liquidateCollateralFactor < config.borrowCollateralFactor ||
            config.liquidateCollateralFactor >
            collateralAssetLimitations.maxLiquidateCollateralFactor ||
            config.liquidateCollateralFactor <
            collateralAssetLimitations.minLiquidateCollateralFactor ||
            config.liquidationFactor >
            collateralAssetLimitations.maxLiquidationFactor ||
            config.liquidationFactor <
            collateralAssetLimitations.minLiquidationFactor
        ) revert InvalidFactors();
    }
}
