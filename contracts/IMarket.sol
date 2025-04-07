// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IConfigController.sol";

interface IMarket {
    struct BaseCurveParams {
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 supplyPerYearInterestRateBase;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
        uint64 borrowPerYearInterestRateBase;
    }

    function initialize(
        IConfigController.MarketConfig memory _marketConfig,
        address _configControllerAddress
    ) external;
    
    // Individual market config getters
    function baseToken() virtual external view returns (address);
    function priceFeed() virtual external view returns (address);
    function baseTokenCurveId() virtual external view returns (uint);
    function collateralTokensCount() virtual external view returns (uint);
    function configControllerAddress() virtual external view returns (address);
    function getCollateralTokenConfig(uint _collateralTokenId) external view returns (IConfigController.CollateralTokenConfig memory);
    
    // Base curve params
    function getBaseCurveParams() external view returns (BaseCurveParams memory);
    
    // Market config setters
    function setBaseCurveParams(BaseCurveParams memory _params) external;
    function setCollateralTokens(IConfigController.CollateralTokenConfig[] memory _collateralTokens) external;
    function setCollateralTokenConfig(uint _index, IConfigController.CollateralTokenConfig memory _config) external;
    function setCollateralTokenSupplyCap(uint _index, uint128 _supplyCap) external;
    function setCollateralTokenBorrowCollateralFactor(uint _index, uint64 _borrowCF) external;
    function setCollateralTokenLiquidateCollateralFactor(uint _index, uint64 _liquidateCF) external;
    function setCollateralTokenLiquidationFactor(uint _index, uint64 _liquidationFactor) external;
    function getAllCollateralTokenConfigs() virtual external view returns (IConfigController.CollateralTokenConfig[] memory);
}