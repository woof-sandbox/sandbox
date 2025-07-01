// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ISandboxController.sol";

abstract contract IConfigController {
    /// @notice Comet transfer proposal
    struct CometTransferProposal {
        address comet;
        address newController;
        uint256 expiration;
    }
    
    struct CometConfigProposal {
        address comet;
        address proposer;
        uint256 revertTime;
        IConfigController.CollateralTokenConfig[] collateralTokens;
    }

    struct CometBaseTokenCurveProposal {
        address proposer;
        address comet;
        uint256 curveId;
        uint256 revertTime;
    }
    
    struct CometConfig {
        address baseToken;
        uint baseTokenCurveId;
        CometOptions options;
        CollateralTokenConfig[] collateralTokens;
    }

    struct CometOptions {
        uint64 baseTrackingSupplySpeed;
        uint64 baseTrackingBorrowSpeed;
        uint64 trackingIndexScale;
        uint64 baseMinForRewards;
    }

    struct CollateralTokenConfig {
        address collateralToken;
        address priceFeed;
        uint128 supplyCap;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint64 scale;
    }

    error AlreadyInitialized();
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
    error ProposalDurationTooLong();
    error TokenNotRevenue();
    error CometAlreadyAdded();
    error NonConfigController();
    error CometNotOwned();
    error InvalidCurveId();
    error SameCurve();
    error ProposalNotRevertable();
    error BadMinimum();

    
    event CometBaseTokenCurveProposed(
        address indexed comet,
        address indexed proposer,
        uint256 revertTime,
        uint256 curveId
    );

    event CometBaseTokenCurveProposalExecuted(
        address indexed comet,
        address indexed executedBy
    );

    event CometBaseTokenCurveProposalCancelled(
        address indexed comet,
        address indexed cancelledBy
    );

    event CometCreated(
        address comet,
        address baseToken,
        address priceFeed,
        uint cometId,
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
    event CometConfigProposed(
        address indexed comet,
        address indexed proposer,
        uint256 revertTime
    );
    event CometConfigProposalCancelled(
        address indexed comet,
        address indexed cancelledBy
    );
    event CometConfigProposalExecuted(
        address indexed comet,
        address indexed executedBy
    );
    event ProposalDurationsUpdated(
        uint oldCuratorDuration,
        uint newCuratorDuration,
        uint oldProposalDuration,
        uint newProposalDuration
    );
    
    /// @notice Events for comet transfer proposal system
    event CometTransferProposed(
        address indexed comet,
        address indexed newController,
        uint256 expiration
    );
    event CometTransferProposalCancelled(
        address indexed comet,
        address indexed cancelledBy
    );
    event CometTransferProposalAccepted(
        address indexed comet,
        address indexed oldController,
        address indexed newController
    );

    function setBaseTrackingSpeeds(
        address _comet,
        uint64 _baseTrackingSupplySpeed,
        uint64 _baseTrackingBorrowSpeed
    ) virtual external;

    /// @notice Returns the current curator fee in basis points (1% = 100)
    /// @return The curator fee value
    function curatorFee() virtual external view returns (uint);

    function curator() virtual external view returns (address);
    function owner() virtual external view returns (address);
    function guardian() virtual external view returns (address);
    function sandboxController() virtual external view returns (address);
    function cometFactory() virtual external view returns (address);
    function comets(uint) virtual external view returns (address);
    function cometsLength() virtual external view returns (uint);
    function proposedCurator() virtual external view returns (address);
    function curatorProposalExpiry() virtual external view returns (uint);
    function name() virtual external view returns (string memory);
    
    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() virtual external;

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) virtual external;

    /// @notice Creates a new comet with the specified configuration
    /// @dev Only callable by the owner
    /// @param _cometConfig The configuration parameters for the new comet
    /// @return The address of the newly created comet
    function createComet(CometConfig memory _cometConfig) virtual external returns(address);
    
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
    ) external virtual;

    /// @notice Returns the address of the ConfigControllerFactory
    /// @return The address of the ConfigControllerFactory
    function configControllerFactory() external view virtual returns (address);
}