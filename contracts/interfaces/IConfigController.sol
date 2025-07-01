// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface IConfigControllerStructs {
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
        uint baseTokenCurveId;
        CollateralTokenConfig[] collateralTokens;
    }

    struct CometGlobalParamsConfig {
        uint256 targetPercent;
        uint256 storeFrontPriceFactor;
        uint256 suggestedAmountOfSeedReserves;
        uint256 suggestedLockTimeOfSeedReserves;
    }

    struct CometRewardOptions {
        uint256 baseTrackingSupplySpeed;
        uint256 baseTrackingBorrowSpeed;
        uint256 trackingIndexScale;
        uint256 baseMinForRewards;
    }
}

interface IConfigController is IConfigControllerStructs {

    /// @notice Returns the current curator fee in basis points (1% = 100)
    /// @return The curator fee value
    function curatorFee() external view returns (uint);

    function curator() external view returns (address);
    function owner() external view returns (address);
    function guardian() external view returns (address);
    function sandboxController() external view returns (address);
    function cometFactory() external view returns (address);
    function comets(uint) external view returns (address);
    function cometsLength() external view returns (uint);
    function name() external view returns (string memory);
    
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
    function createComet(CometConfig memory _cometConfig) external returns(address);
    
    /// @notice Creates a new proposal
    /// @dev Only callable by the owner
    /// @param _calldata The calldata of the proposal
    /// @param _proposalType The type of the proposal
    /// @return The id of the newly created proposal
    function createProposal(bytes memory _calldata, uint8 _proposalType) external returns (uint256);
    
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
    ) external;

    /// @notice Returns the address of the ConfigControllerFactory
    /// @return The address of the ConfigControllerFactory
    function configControllerFactory() external view returns (address);
}