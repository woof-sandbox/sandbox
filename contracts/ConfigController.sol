// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";


contract ConfigController is IConfigController {
    /// @notice The admin of the protocol
    address public owner;
    address public curator;
    address public guardian;
    address public sandboxController;
    address[] markets;
    uint lastMarket;
    
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

    constructor(
        address _owner,
        address _curator,
        address _guardian,
        address _sandboxController
        ) {
        unchecked {
            if (_owner == ZERO_ADDRESS) revert ZeroAddress();
        }
        curator = _curator;
        owner = _owner;
        guardian = _guardian;
        sandboxController = _sandboxController;
    }

    function createMarket(
        MarketConfig memory _marketConfig
    ) external {
        if (msg.sender != owner) revert Unauthorized();
        // Gas savings.
        MarketConfig memory marketConfig = _marketConfig;

        if (marketConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        if (marketConfig.priceFeed == ZERO_ADDRESS) revert WrongPriceFeed();
        if (marketConfig.collateraTokens.length == 0) revert ZeroCollateralAssets();

        uint length = marketConfig.collateraTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        for (uint i; i < length;) {
            collateralTokenConfig = marketConfig.collateraTokens[i]; 
            if (collateralTokenConfig.supplyCap == 0) revert SupplyCapCantBeZero();
            if (collateralTokenConfig.borrowCollateralFactor == 0) revert WrongCollateralTokenSettings();
            if (collateralTokenConfig.liquidateCollateralFactor == 0) revert WrongCollateralTokenSettings();
            if (collateralTokenConfig.liquidationFactor == 0) revert WrongCollateralTokenSettings();
            
            unchecked {
                i++;
            }
        }
        // emit AddedBaseTokenConfig(
        //     _marketConfig.supplyKink,
        //     _marketConfig.supplyPerSecondInterestRateSlopeLow,
        //     _marketConfig.supplyPerSecondInterestRateSlopeHigh,
        //     _marketConfig.supplyPerSecondInterestRateBase,
        //     _marketConfig.borrowKink,
        //     _marketConfig.borrowPerSecondInterestRateSlopeLow,
        //     _marketConfig.borrowPerSecondInterestRateSlopeHigh,
        //     _marketConfig.borrowPerSecondInterestRateBase,
        //     _marketConfig.storeFrontPriceFactor
        // );
    }

}
