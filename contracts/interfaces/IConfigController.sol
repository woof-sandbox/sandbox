// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;
import "./ISandboxController.sol";
import "./ISandboxErrors.sol";

abstract contract IConfigController is ISandboxErrors {
    /// @notice Market configuration proposal
    enum ProposalType {
        Collateral,
        BaseAsset
    }

    struct MarketConfigProposal {
        address market;
        address proposer;
        ProposalType proposalType;
        bytes callData;
        uint expiration;
        bool isActive;
    }

    struct MarketConfig {
        address baseToken;
        BaseTokenConfig config;
        CollateralToken[] collateralTokens;
        MarketOptions options;
    }

    struct BaseTokenConfig {
        address priceFeed;
        uint256 decimals;
        ISandboxController.BaseAssetCurve curve;
    }

    struct CollateralToken {
        address collateralToken;
        CollateralTokenConfig config;
    }

    struct MarketOptions {
        uint256 baseTrackingSupplySpeed;
        uint256 baseTrackingBorrowSpeed;
        uint256 trackingIndexScale;
        uint256 baseMinForRewards;
    }

    struct CollateralTokenConfig {
        address priceFeed;
        uint8 decimals;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    event MarketConfigurationCreated(
        address market,
        address baseToken,
        address priceFeed,
        uint baseTokenId
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
    event RevenueAccumulated(address token, uint amount);
    event RevenueClaimed(address token, address recipient, uint amount);
    event CuratorProposed(
        address indexed currentCurator,
        address indexed proposedCurator,
        uint expiry
    );
    event CuratorAccepted(
        address indexed oldCurator,
        address indexed newCurator
    );
    event CuratorCanceled(address indexed oldCurator);
    event CuratorProposalCancelled(address indexed proposedCurator);
    event GuardianUpdated(
        address indexed oldGuardian,
        address indexed newGuardian
    );

    /// @notice Events for proposal system
    event MarketConfigProposed(
        address indexed market,
        address indexed proposer,
        uint256 expiration
    );
    event MarketConfigProposalCancelled(
        address indexed market,
        address indexed cancelledBy
    );
    event MarketConfigProposalExecuted(
        address indexed market,
        address indexed executedBy
    );

    event Withdrawn(
        address indexed baseToken,
        address indexed sender,
        uint256 amount
    );

    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    /// @notice Returns the current curator fee in basis points (1% = 100)
    /// @return The curator fee value
    function curatorFee() external view virtual returns (uint);

    /// @notice Sets a new curator fee
    /// @dev Only callable by the owner
    /// @param _curatorFee New curator fee in basis points (1% = 100). Must not exceed 10000 (100%)
    function setCuratorFee(uint _curatorFee) external virtual;

    /// @notice Accumulates revenue in the contract
    /// @dev Anyone can call this function to add revenue
    /// @param token The ERC20 token address to accumulate
    /// @param amount The amount of tokens to accumulate
    function accumulateRevenue(address token, uint amount) external virtual;

    /// @notice Claims accumulated revenue for the caller
    /// @dev Can be called by owner or curator to claim their share
    /// @param token The ERC20 token address to claim
    function claimRevenue(address token) external virtual;

    /// @notice Returns the unclaimed revenue balance for a specific token and address
    /// @param token The ERC20 token address
    /// @param account The address to check balance for
    /// @return The unclaimed balance
    function getUnclaimedRevenue(
        address token,
        address account
    ) external view virtual returns (uint);

    function curator() external view virtual returns (address);

    function owner() external view virtual returns (address);

    function guardian() external view virtual returns (address);

    function sandboxController() external view virtual returns (address);

    function marketFactory() external view virtual returns (address);

    function markets(uint) external view virtual returns (address);

    function marketsLength() external view virtual returns (uint);

    function proposedCurator() external view virtual returns (address);

    function curatorProposalExpiry() external view virtual returns (uint);

    function name() external view virtual returns (string memory);

    function getAssetConfig(
        address market,
        uint256 index
    ) external view virtual returns (CollateralToken memory);

    function getAssetConfigByAddress(
        address market,
        address asset
    ) external view virtual returns (CollateralToken memory, uint8 index);

    function marketProposals(
        address market
    ) external view virtual returns (MarketConfigProposal memory);

    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() external virtual;

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) external virtual;

    /// @notice Creates a new market with the specified configuration
    /// @dev Only callable by the owner
    /// @param _marketConfig The configuration parameters for the new market
    /// @return The address of the newly created market
    function createMarket(
        MarketConfig memory _marketConfig
    ) external virtual returns (address);

    function withdraw(address market, uint256 amount) external virtual;
}
