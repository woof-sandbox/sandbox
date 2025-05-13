// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IMarket.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../interfaces/IConfigController.sol";
import "../interfaces/ISandboxController.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MarketMock is IMarket, Initializable {
    // Individual market config variables
    address public override baseToken;
    address public override priceFeed;
    uint public override baseTokenCurveId;
    IConfigController.CollateralTokenConfig[] public collateralTokens;
    uint public override collateralTokensCount;
    address public sandboxControllerAddress;
    
    address public configControllerAddress;
    BaseCurveParams public baseCurveParams;
    
    error Unauthorized();
    error ZeroAddress();
    
    modifier onlyConfigController() {
        if (msg.sender != configControllerAddress) revert Unauthorized();
        _;
    }
    
    function initialize(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory _config,
        address _configControllerAddress,
        address _sandboxControllerAddress,
        uint256 baseBorrowMin_
    ) initializer external override {
        configControllerAddress = _configControllerAddress;
        sandboxControllerAddress = _sandboxControllerAddress;
        // Set individual variables from market config
        baseToken = _marketConfig.baseToken;
        priceFeed = _marketConfig.priceFeed;
        baseTokenCurveId = _marketConfig.baseTokenCurveId;
        collateralTokens = _marketConfig.collateralTokens;
        collateralTokensCount = _marketConfig.collateralTokens.length;
        IConfigController _configController = IConfigController(_configControllerAddress);
        ISandboxController.BaseAssetConfiguration memory baseAssetConfig = ISandboxController(_configController.sandboxController()).baseAssets(_marketConfig.baseToken);

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

    function transferOwnership(address _newConfigController) external override onlyConfigController {
        configControllerAddress = _newConfigController;
        IConfigController(_newConfigController).addMarket(address(this));
    }

    function accumulateRevenue(address _token, uint _amount) external {
        IERC20(_token).approve(configControllerAddress, _amount);
        IConfigController(configControllerAddress).accumulateRevenue(_token, _amount);
    }

    function getCollateralTokenConfig(uint _collateralTokenId) external view override returns (IConfigController.CollateralTokenConfig memory) {
        return collateralTokens[_collateralTokenId];
    }

    function getBaseCurveParams() external view override returns (BaseCurveParams memory) {
        return baseCurveParams;
    }

    function setBaseCurveParams(uint _curveId) external {
        ISandboxController.BaseAssetCurve memory baseAssetConfig = ISandboxController(sandboxControllerAddress).baseAssets(baseToken).baseAssetCurves[_curveId];
        
        baseCurveParams = BaseCurveParams({
            supplyKink: baseAssetConfig.supplyKink,
            supplyPerYearInterestRateSlopeLow: baseAssetConfig.supplyPerYearInterestRateSlopeLow,
            supplyPerYearInterestRateSlopeHigh: baseAssetConfig.supplyPerYearInterestRateSlopeHigh,
            supplyPerYearInterestRateBase: baseAssetConfig.supplyPerYearInterestRateBase,
            borrowKink: baseAssetConfig.borrowKink,
            borrowPerYearInterestRateSlopeLow: baseAssetConfig.borrowPerYearInterestRateSlopeLow,
            borrowPerYearInterestRateSlopeHigh: baseAssetConfig.borrowPerYearInterestRateSlopeHigh,
            borrowPerYearInterestRateBase: baseAssetConfig.borrowPerYearInterestRateBase
        });
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