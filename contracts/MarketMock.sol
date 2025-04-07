// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IMarket.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IConfigController.sol";
import "./ISandboxController.sol";
import "hardhat/console.sol";

contract MarketMock is IMarket, Initializable {
    // Individual market config variables
    address public override baseToken;
    address public override priceFeed;
    uint public override baseTokenCurveId;
    IConfigController.CollateralTokenConfig[] public collateralTokens;
    uint public override collateralTokensCount;
    
    address public configControllerAddress;
    BaseCurveParams public baseCurveParams;
    
    error Unauthorized();
    error ZeroAddress();
    
    modifier onlyConfigController() {
        if (msg.sender != configControllerAddress) revert Unauthorized();
        _;
    }
    
    // constructor() {}

    function initialize(
        IConfigController.MarketConfig memory _marketConfig,
        address _configControllerAddress
    ) initializer external override {
        
        // Set individual variables from market config
        baseToken = _marketConfig.baseToken;
        priceFeed = _marketConfig.priceFeed;
        baseTokenCurveId = _marketConfig.baseTokenCurveId;
        collateralTokens = _marketConfig.collateraTokens;
        collateralTokensCount = _marketConfig.collateraTokens.length;
        IConfigController _configController = IConfigController(_configControllerAddress);
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = ISandboxController(_configController.sandboxController()).getBaseAssetByAddress(_marketConfig.baseToken);

        ISandboxController.BaseAssetCurve memory curve = baseAssetConfig.baseAssetCurves[_marketConfig.baseTokenCurveId];
        baseCurveParams = BaseCurveParams({
            supplyKink: curve.supplyKink,
            supplyPerYearInterestRateSlopeLow: curve.supplyPerYearInterestRateSlopeLow,
            supplyPerYearInterestRateSlopeHigh: curve.supplyPerYearInterestRateSlopeHigh,
            supplyPerYearInterestRateBase: curve.supplyPerYearInterestRateBase,
            borrowKink: curve.borrowKink,
            borrowPerYearInterestRateSlopeLow: curve.borrowPerYearInterestRateSlopeLow,
            borrowPerYearInterestRateSlopeHigh: curve.borrowPerYearInterestRateSlopeHigh,
            borrowPerYearInterestRateBase: curve.borrowPerYearInterestRateBase
        });
    }

    function getCollateralTokenConfig(uint _collateralTokenId) external view override returns (IConfigController.CollateralTokenConfig memory) {
        return collateralTokens[_collateralTokenId];
    }

    function getBaseCurveParams() external view override returns (BaseCurveParams memory) {
        return baseCurveParams;
    }

    function setBaseCurveParams(BaseCurveParams memory _params) external override onlyConfigController {
        baseCurveParams = _params;
    }

    function setCollateralTokens(IConfigController.CollateralTokenConfig[] memory _collateralTokens) external override onlyConfigController {
        collateralTokens = _collateralTokens;
        collateralTokensCount = _collateralTokens.length;
    }

    function setCollateralTokenConfig(uint _index, IConfigController.CollateralTokenConfig memory _config) external override onlyConfigController {
        collateralTokens[_index] = _config;
    }

    function setCollateralTokenSupplyCap(uint _index, uint128 _supplyCap) external override onlyConfigController {
        collateralTokens[_index].supplyCap = _supplyCap;
    }

    function setCollateralTokenBorrowCollateralFactor(uint _index, uint64 _borrowCF) external override onlyConfigController {
        collateralTokens[_index].borrowCollateralFactor = _borrowCF;
    }

    function setCollateralTokenLiquidateCollateralFactor(uint _index, uint64 _liquidateCF) external override onlyConfigController {
        collateralTokens[_index].liquidateCollateralFactor = _liquidateCF;
    }

    function setCollateralTokenLiquidationFactor(uint _index, uint64 _liquidationFactor) external override onlyConfigController {
        collateralTokens[_index].liquidationFactor = _liquidationFactor;
    }

    function getAllCollateralTokenConfigs() external override view returns (IConfigController.CollateralTokenConfig[] memory) {
        return collateralTokens;
    }
} 