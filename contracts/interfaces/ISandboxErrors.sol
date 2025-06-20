// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface ISandboxErrors {
    error ZeroAddress();
    error ZeroAmount();
    error ZeroCollateralAssets();
    error IncorrectSetting();

    error BaseTokenAlreadyWhitelisted();
    error CollateralTokenAlreadyWhitelisted();
    error BaseTokenNotWhitelisted();
    error CollateralTokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();

    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error DifferentPriceFeedAlreadyUsedForToken();
    error WrongPriceFeedUnderlying();
    error InvalidFactors();

    error LiquidateCollateralFactorTooLow();
    error LiquidateCollateralFactorTooHigh();
    error LiquidationFactorTooLow();
    error LiquidationFactorTooHigh();
    error BorrowCollateralFactorTooLow();
    error BorrowCollateralFactorTooHigh();

    error Unauthorized();
    error NotOwner(address caller);
    error NotDao(address caller);

    error CollateralTokenAlreadyAdded();
    error InvalidFeePercentage();

    error InsufficientBalance();
    error InvalidCurator();
    error ProposalExpired();
    error NoActiveProposal();
    error ProposalExists();
    error ProposalNotExpired();
    error ExecutionFailed();

    error MarketFactoryNotInitialized();
}
