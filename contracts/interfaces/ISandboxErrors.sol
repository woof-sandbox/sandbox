// SPDX-License-Identifier: GPL-2.0-or-later
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
    error InvalidAmountOfSeedReserves();
    error InvalidLockTimeOfSeedReserves();
    error SupplyCapCantBeZero();
    error SupplyCapTooHigh();
    error CollateralTokenNotWhitelisted();

    error Unauthorized();
    error NotOwner(address caller);
    error NotDao(address caller);
}
