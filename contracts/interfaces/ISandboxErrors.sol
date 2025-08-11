// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

interface ISandboxErrors {
    error ZeroAddress();
    error IncorrectSetting();

    error BaseTokenAlreadyWhitelisted();
    error CollateralTokenAlreadyWhitelisted();
    error BaseTokenNotWhitelisted();

    /**
     * @notice Thrown when trying to delist a collateral token that is already delisted or not whitelisted at all.
     */
    error CollateralTokenNotWhitelisted();

    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error DifferentPriceFeedAlreadyUsedForToken();
    error WrongPriceFeedUnderlying();
    error InvalidFactors();
    error InvalidCommissions();
    error IncorrectIndex();

    error Unauthorized();
    error NotOwner(address caller);
    error NotDao(address caller);
}
