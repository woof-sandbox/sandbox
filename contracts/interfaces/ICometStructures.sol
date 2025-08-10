// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

/**
 * @title Sandbox Comet data strucutures
 */
interface ICometStructures {
    // 512 bits total = 2 slots
    struct TotalsBasic {
        // 1st slot
        uint64 baseSupplyIndex; // aderyn-fp(local-variable-shadowing)
        uint64 baseBorrowIndex; // aderyn-fp(local-variable-shadowing)
        uint64 trackingSupplyIndex; // aderyn-fp(local-variable-shadowing)
        uint64 trackingBorrowIndex; // aderyn-fp(local-variable-shadowing)
        // 2nd slot
        uint104 totalSupplyBase; // aderyn-fp(local-variable-shadowing)
        uint104 totalBorrowBase; // aderyn-fp(local-variable-shadowing)
        uint40 lastAccrualTime; // aderyn-fp(local-variable-shadowing)
        uint8 pauseFlags; // aderyn-fp(local-variable-shadowing)
    }

    struct UserBasic {
        // 1st slot 32 bytes occupied and 0 bytes free
        int104 principal; //16
        uint64 baseTrackingIndex; //8
        uint64 baseTrackingAccrued; //8
        // 2nd slot 3 bytes occupied and 29 bytes free
        uint24 assetsIn; //3
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
}
