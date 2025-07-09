// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface ISandboxErrors {
    error ZeroAddress();
    error IncorrectSetting();

    error BaseTokenAlreadyWhitelisted();
    error CollateralTokenAlreadyWhitelisted();
    error BaseTokenNotWhitelisted();

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

    error CollateralRemovalInProgress(address removalAsset, uint40 startTime, uint40 endTime);
}
