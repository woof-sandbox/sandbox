// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface IConfigController {
    /// @notice Comet transfer proposal
    struct CometTransferProposal {
        address comet;
        address newController;
        uint256 expiration;
    }

    struct CollateralTokenConfig {
        address collateralToken;
        uint128 supplyCap;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
    }

    struct CometConfig {
        address baseToken;
        uint8 baseTokenCurveId;
        CollateralTokenConfig[] collateralTokens;
        string name;
        uint256 amountOfSeedReserves;
    }

    struct CometGlobalParamsConfig {
        uint64 targetPercent;
        uint64 storeFrontPriceFactor;
        uint40 suggestedLockTimeOfSeedReserves;
        uint256 suggestedAmountOfSeedReserves;
    }

    struct CometRewardOptions {
        uint256 baseTrackingSupplySpeed;
        uint256 baseTrackingBorrowSpeed;
        uint256 trackingIndexScale;
        uint256 baseMinForRewards;
    }

    /// @notice Returns the current curator fee in basis points (1% = 100)
    /// @return The curator fee value
    function curatorFee() external view returns (uint32);

    function curator() external view returns (address);

    function owner() external view returns (address);

    function guardian() external view returns (address);

    function sandboxController() external view returns (address);

    function cometFactory() external view returns (address);

    function comets(uint256) external view returns (address);

    function cometsLength() external view returns (uint256);

    function proposedCurator() external view returns (address);

    function curatorProposalExpiry() external view returns (uint64);

    function name() external view returns (string memory);

    function cometFeeEnabled(address) external view returns (bool);

    /// @notice Removes the current curator
    /// @dev Only callable by the owner
    function removeCurator() external;

    /// @notice Sets a new guardian address
    /// @dev Only callable by the owner
    /// @param _newGuardian The address of the new guardian
    function setGuardian(address _newGuardian) external;

    /// @notice Creates a new comet with the specified configuration
    /// @dev Only callable by the owner
    /// @param _cometConfig The configuration parameters for the new comet
    /// @return The address of the newly created comet
    function createComet(CometConfig memory _cometConfig) external returns (address);

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
    ) external;

    /// @notice Returns the address of the ConfigControllerFactory
    /// @return The address of the ConfigControllerFactory
    function configControllerFactory() external view returns (address);

    function pauseMarket(
        address comet,
        bool supplyPaused,
        bool transferPaused,
        bool withdrawPaused,
        bool absorbPaused,
        bool buyPaused
    ) external;

    /// @notice Closes the specified market
    /// @param comet The address of the comet to close
    function closeMarket(address comet) external;

    /// @notice Withdraws free reserves from the specified comet
    /// @param comet The address of the comet to withdraw free reserves from
    function withdrawFreeReservesFrom(address comet) external;
}
