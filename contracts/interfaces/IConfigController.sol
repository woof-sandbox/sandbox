// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ISandboxController.sol";

abstract contract IConfigController {
    /// @notice Market transfer proposal
    struct MarketTransferProposal {
        address market;
        address newController;
        uint256 expiration;
    }
    
    struct MarketConfigProposal {
        address market;
        IConfigController.CollateralTokenConfig[] collateralTokens;
        uint256 revertTime;
        address proposer;
    }

    struct MarketBaseTokenCurveProposal {
        address market;
        uint curveId;
        uint256 revertTime;
        address proposer;
    }
    
    struct MarketConfig {
        address baseToken;
        address priceFeed;
        CollateralTokenConfig[] collateralTokens;
        uint baseTokenCurveId;
        MarketOptions options;
    }

    struct MarketOptions {
        uint256 baseTrackingSupplySpeed;
        uint256 baseTrackingBorrowSpeed;
        uint256 trackingIndexScale;
        uint256 baseMinForRewards;
    }

    struct CollateralTokenConfig {
        address collateralToken;
        address priceFeed;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    error ZeroAddress();
    error Unauthorized();
    error WrongPriceFeed();
    error WrongCurveParams();
    error ZeroCollateralAssets();
    error SupplyCapCantBeZero();
    error WrongCollateralTokenSettings();
    error LiquidateCollateralFactorTooLow();
    error LiquidateCollateralFactorTooHigh();
    error LiquidationFactorTooLow();
    error LiquidationFactorTooHigh();
    error BorrowCollateralFactorTooLow();
    error BorrowCollateralFactorTooHigh();
    error BaseTokenNotWhitelisted();
    error CollateralTokenNotWhitelisted();
    error CollateralTokenAlreadyAdded();
    error InvalidFeePercentage();
    error ZeroAmount();
    error InsufficientBalance();
    error InvalidCurator();
    error ProposalExpired();
    error NoActiveProposal();
    error ProposalExists();
    error ProposalNotReady();
    error ProposalDurationTooShort();
    error TokenNotRevenue();
    error MarketAlreadyAdded();
    error NonConfigController();
    error MarketNotOwned();
    error InvalidCurveId();
    error SameCurve();
    error ProposalNotRevertable();

    event MarketBaseTokenCurveProposed(
        address indexed market,
        address indexed proposer,
        uint256 revertTime,
        uint256 curveId
    );

    event MarketBaseTokenCurveProposalExecuted(
        address indexed market,
        address indexed executedBy
    );

    event MarketBaseTokenCurveProposalCancelled(
        address indexed market,
        address indexed cancelledBy
    );

    event MarketCreated(
        address market,
        address baseToken,
        address priceFeed,
        uint marketId,
        uint baseTokenCurveId
    );
    event AddedCollateralTokenConfig(
        address asset,
        address priceFeed,
        uint8 decimals,
        uint64 borrowCollateralFactor,
        uint64 liquidateCollateralFactor,
        uint64 liquidationFactor,
        uint128 supplyCap
    );

    event AddedBaseTokenConfig(
        uint64 supplyKink,
        uint64 supplyPerSecondInterestRateSlopeLow,
        uint64 supplyPerSecondInterestRateSlopeHigh,
        uint64 supplyPerSecondInterestRateBase,
        uint64 borrowKink,
        uint64 borrowPerSecondInterestRateSlopeLow,
        uint64 borrowPerSecondInterestRateSlopeHigh,
        uint64 borrowPerSecondInterestRateBase,
        uint64 storeFrontPriceFactor    
    );

    event CuratorFeeUpdated(uint oldFee, uint newFee);
    event RevenueDistributed(
        address token,
        uint curatorAmount,
        uint ownerAmount
    );
    event RevenueAccumulated(
        address token,
        uint amount
    );
    event RevenueClaimed(
        address token,
        address recipient,
        uint amount
    );
    event CuratorProposed(address indexed currentCurator, address indexed proposedCurator, uint expiry);
    event CuratorAccepted(address indexed oldCurator, address indexed newCurator);
    event CuratorCanceled(address indexed oldCurator);
    event CuratorProposalCancelled(address indexed proposedCurator);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    
    /// @notice Events for proposal system
    event MarketConfigProposed(
        address indexed market,
        address indexed proposer,
        uint256 revertTime
    );
    event MarketConfigProposalCancelled(
        address indexed market,
        address indexed cancelledBy
    );
    event MarketConfigProposalExecuted(
        address indexed market,
        address indexed executedBy
    );
    event ProposalDurationsUpdated(
        uint oldCuratorDuration,
        uint newCuratorDuration,
        uint oldProposalDuration,
        uint newProposalDuration
    );
    
    /// @notice Events for market transfer proposal system
    event MarketTransferProposed(
        address indexed market,
        address indexed newController,
        uint256 expiration
    );
    event MarketTransferProposalCancelled(
        address indexed market,
        address indexed cancelledBy
    );
    event MarketTransferProposalAccepted(
        address indexed market,
        address indexed oldController,
        address indexed newController
    );

    event Withdrawn(
        address indexed baseToken,
        address indexed sender,
        uint256 amount
    );
    
    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    /// @notice Executes the base token curve proposal for a market
    /// @param market The address of the market
    function executeBaseTokenCurveProposal(address market) virtual external;

    /// @notice Cancels the base token curve proposal for a market
    /// @param market The address of the market
    function cancelBaseTokenCurveProposal(address market) virtual external;

    /// @notice Proposes an update to the base token curve for a market
    /// @param market The address of the market
    /// @param curveId The id of the new base token curve
    function proposeUpdateBaseTokenCurve(address market, uint256 curveId) virtual external;
    
    /// @notice Returns the proposed base token curve for a market
    /// @param market The address of the market
    /// @return The proposed base token curve
    function baseAssetsCurvesProposals(address market) virtual external view returns (MarketBaseTokenCurveProposal memory);

    /// @notice Returns the base token curve id for a given market
    /// @param market The address of the market
    /// @return The base token curve id
    function marketBaseTokenCurveId(address market) virtual external view returns (uint);

    /// @notice Returns the address of a revenue token by its index
    function revenueTokens(uint) virtual external view returns (address);
    /// @notice Returns the number of revenue tokens
    function revenueTokensLength() virtual external view returns (uint);

    /// @notice Returns the current curator fee in basis points (1% = 100)
    /// @return The curator fee value
    function curatorFee() virtual external view returns (uint);

    /// @notice Sets a new curator fee
    /// @dev Only callable by the owner
    /// @param _curatorFee New curator fee in basis points (1% = 100). Must not exceed 10000 (100%)
    function setCuratorFee(uint _curatorFee) virtual external;
    /// @notice Accumulates revenue in the contract
    /// @dev Anyone can call this function to add revenue
    /// @param token The ERC20 token address to accumulate
    /// @param amount The amount of tokens to accumulate
    function accumulateRevenue(address token, uint amount) virtual external;

    /// @notice Claims accumulated revenue for the caller
    /// @dev Can be called by owner or curator to claim their share
    /// @param token The ERC20 token address to claim
    function claimRevenue(address token) virtual external;

    /// @notice Claims accumulated revenue for all tokens for the caller
    /// @dev Can be called by anyone to claim their share of all revenue tokens
    function claimAllRevenue() virtual external;

    /// @notice Removes a revenue token from the list of revenue tokens
    /// @dev Only callable by the owner
    /// @param token The ERC20 token address to remove
    function removeClaimRevenueToken(address token) virtual external;

    /// @notice Returns the unclaimed revenue balance for a specific token and address
    /// @param token The ERC20 token address
    /// @param account The address to check balance for
    /// @return The unclaimed balance
    function getUnclaimedRevenue(address token, address account) virtual external view returns (uint);

    function curator() virtual external view returns (address);
    function owner() virtual external view returns (address);
    function guardian() virtual external view returns (address);
    function sandboxController() virtual external view returns (address);
    function marketFactory() virtual external view returns (address);
    function markets(uint) virtual external view returns (address);
    function marketsLength() virtual external view returns (uint);
    function proposedCurator() virtual external view returns (address);
    function curatorProposalExpiry() virtual external view returns (uint);
    function name() virtual external view returns (string memory);
    
    /// @notice Returns the market configuration proposal for a given market
    /// @param market The address of the market
    /// @return The market configuration proposal
    function marketProposals(address market) virtual external view returns (MarketConfigProposal memory);
    
    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() virtual external;

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) virtual external;

    /// @notice Creates a new market with the specified configuration
    /// @dev Only callable by the owner
    /// @param _marketConfig The configuration parameters for the new market
    /// @return The address of the newly created market
    function createMarket(MarketConfig memory _marketConfig) virtual external returns(address);
    
    /// @notice Withdraws base tokens from the market
    /// @dev Only callable by the owner
    /// @param market The address of the market
    /// @param amount The amount of base tokens to withdraw
    function withdraw(address market, uint256 amount) virtual external;


    /// @notice Initializes the ConfigController contract
    /// @param owner_ The address of the protocol owner
    /// @param guardian_ The address of the protocol guardian
    /// @param _sandboxController The address of the SandboxController contract
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of market proposals in seconds
    /// @param _configControllerFactory The address of the ConfigControllerFactory contract
    function initialize(
        address owner_,
        address _curator,
        address guardian_,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration,
        address _configControllerFactory
    ) external virtual;

    /// @notice Returns the address of the ConfigControllerFactory
    /// @return The address of the ConfigControllerFactory
    function configControllerFactory() external view virtual returns (address);

    function addMarket(address market) external virtual;
}