// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

/**
 * @title Sandbox Comet data strucutures
 */
interface ICometStructures {
    /**
     * @notice User account data for base token positions and reward tracking
     * @param principal The user's base token principal amount.
     *              Positive values represent supply positions,
     *              negative values represent borrow positions.
     * @param assetsIn Bit vector indicating which collateral assets
     *              the user has a non-zero balance in.
     */
    struct UserBasic {
        int104 principal;
        uint24 assetsIn;
    }

    struct CollateralAsset {
        // 1st slot 28 bytes occupied and 4 bytes free
        address collateralToken; //20
        uint64 scale; //8
        // 2nd slot 28 bytes occupied and 4 bytes free
        address priceFeed; //20
        uint64 borrowCollateralFactor; //8
        // 3rd slot 32 bytes occupied and 0 bytes free
        uint128 supplyCap; //16
        uint64 liquidateCollateralFactor; //8
        uint64 liquidationFactor; //8
    }

    struct CollateralRemovalState {
        address collateralToken;
        uint64 startBorrowCollateralFactor;
        uint64 startLiquidateCollateralFactor;
        uint40 startTime;
        uint40 duration;
        uint8 collateralAssetIndex;
    }

    struct Curve {
        uint64 supplyKink;
        uint64 supplyPerSecondInterestRateSlopeLow;
        uint64 supplyPerSecondInterestRateSlopeHigh;
        uint64 supplyPerSecondInterestRateBase;
        uint64 borrowKink;
        uint64 borrowPerSecondInterestRateSlopeLow;
        uint64 borrowPerSecondInterestRateSlopeHigh;
        uint64 borrowPerSecondInterestRateBase;
    }

    struct Transition {
        uint40 startTime;
        uint40 endTime;
        uint40 lastUpdateTime;
        Curve startCurveParams;
        Curve targetCurveParams;
    }

    enum DeprecationStatus {
        NotStarted,
        InProgress,
        Finalized
    }
}
