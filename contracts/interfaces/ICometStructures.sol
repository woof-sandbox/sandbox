// SPDX-License-Identifier: GPL-2.0-or-later
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
        int104 principal;
        uint64 baseTrackingIndex;
        uint64 baseTrackingAccrued;
        uint24 assetsIn;
    }

    struct CollateralAsset {
        address collateralToken;
        address priceFeed;
        uint128 supplyCap;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint64 scale;
    }
}
