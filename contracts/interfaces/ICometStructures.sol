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
        address collateralToken;
        address priceFeed;
        uint128 supplyCap;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint64 scale;
    }

    enum DeprecationStatus {
        NotStarted,
        InProgress,
        Finalized
    }
}
