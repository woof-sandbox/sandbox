// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;


abstract contract IConfigController {
    struct MarketConfig {
        address baseToken;
        address priceFeed;
        CollateralTokenConfig[] collateraTokens;
    }

    struct CollateralTokenConfig {
        address collateralToken;
        address priceFeed;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    error ZeroAddress();
    error Unauthorized();
    error WrongPriceFeed();
    error WrongCurveParams();
    error ZeroCollateralAssets();
    error SupplyCapCantBeZero();
    error WrongCollateralTokenSettings();
    error LiquidateCollateralFactorTooLow();
    error LiquidateCollateralFactorTooHigh();
    error LiquidationFactorTooLow();
    error LiquidationFactorTooHigh();
    error BorrowCollateralFactorTooLow();
    error BorrowCollateralFactorTooHigh();
    error BaseTokenNotWhitelisted();
    error CollateralTokenNotWhitelisted();
    error CollateralTokenAlreadyAdded();
    
    event MarketConfigurationCreated(
        address market,
        address baseToken,
        address priceFeed,
        uint baseTokenId
    );
    event AddedCollateralTokenConfig(
        address asset,
        address priceFeed,
        uint8 decimals,
        uint64 borrowCollateralFactor,
        uint64 liquidateCollateralFactor,
        uint64 liquidationFactor,
        uint128 supplyCap
    );

    event AddedBaseTokenConfig(
        uint64 supplyKink,
        uint64 supplyPerSecondInterestRateSlopeLow,
        uint64 supplyPerSecondInterestRateSlopeHigh,
        uint64 supplyPerSecondInterestRateBase,
        uint64 borrowKink,
        uint64 borrowPerSecondInterestRateSlopeLow,
        uint64 borrowPerSecondInterestRateSlopeHigh,
        uint64 borrowPerSecondInterestRateBase,
        uint64 storeFrontPriceFactor    
    );
    
    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    // function curator() virtual external view returns (address);
    // function onwer() virtual external view returns (address);
    // function guardian() virtual external view returns (address);

}