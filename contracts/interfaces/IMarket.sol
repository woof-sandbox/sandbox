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

    // Individual market config variables
    function baseToken() external view returns (address);
    function priceFeed() external view returns (address);
    function baseTokenCurveId() external view returns (uint);
    function collateralTokensCount() external view returns (uint);

    // Base curve parameters
    function getBaseCurveParams() external view returns (BaseCurveParams memory);
    function setBaseCurveParams(uint _curveId) external;

    // Collateral token configuration
    function transferOwnership(address _newConfigController) external;
    function getCollateralTokenConfig(uint _collateralTokenId) external view returns (IConfigController.CollateralTokenConfig memory);
    function getAllCollateralTokenConfigs() external view returns (IConfigController.CollateralTokenConfig[] memory);
    function setCollateralTokens(IConfigController.CollateralTokenConfig[] memory _collateralTokens) external;
    function setCollateralTokenConfig(uint _index, IConfigController.CollateralTokenConfig memory _config) external;
    function setCollateralTokenSupplyCap(uint _index, uint128 _supplyCap) external;
    function setCollateralTokenBorrowCollateralFactor(uint _index, uint64 _borrowCF) external;
    function setCollateralTokenLiquidateCollateralFactor(uint _index, uint64 _liquidateCF) external;
    function setCollateralTokenLiquidationFactor(uint _index, uint64 _liquidationFactor) external;

    // Initialization
    function initialize(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory config,
        address _configControllerAddress,
        address _sandboxControllerAddress,
        uint256 baseBorrowMin_
    ) external;
}