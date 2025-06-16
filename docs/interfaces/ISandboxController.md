# Solidity API

## ISandboxController

### MarketState

```solidity
enum MarketState {
  Low,
  Medium,
  High
}
```

### BaseAssetCurve

```solidity
struct BaseAssetCurve {
  uint64 supplyKink;
  uint64 supplyPerYearInterestRateBase;
  uint64 supplyPerYearInterestRateSlopeLow;
  uint64 supplyPerYearInterestRateSlopeHigh;
  uint64 borrowKink;
  uint64 borrowPerYearInterestRateBase;
  uint64 borrowPerYearInterestRateSlopeLow;
  uint64 borrowPerYearInterestRateSlopeHigh;
}
```

### BaseAssetConfiguration

```solidity
struct BaseAssetConfiguration {
  address priceFeed;
  uint8 decimals;
  uint256 minBorrow;
  struct ISandboxController.BaseAssetCurve[] baseAssetCurves;
}
```

### CollateralAssetConfiguration

```solidity
struct CollateralAssetConfiguration {
  address collateralToken;
  address priceFeed;
  uint8 decimals;
  uint64 maxBorrowCollateralFactor;
  uint64 minBorrowCollateralFactor;
  uint64 minLiquidateCollateralFactor;
  uint64 maxLiquidateCollateralFactor;
  uint64 minLiquidationFactor;
  uint64 maxLiquidationFactor;
}
```

### SandboxControllerConfiguration

```solidity
struct SandboxControllerConfiguration {
  uint256 targetPercent;
  uint256 storeFrontPriceFactor;
  uint256 minUpdateTime;
  uint256 maxUpdateTime;
  uint256 suggestedAmountOfSeedReserves;
  uint256 suggestedLockTimeOfSeedReserves;
}
```

### BaseAssetWhitelisted

```solidity
event BaseAssetWhitelisted(address token, address priceFeed, uint8 decimals, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow, uint256 baseAssetCount, uint256 curveIndex)
```

### BaseAssetCurveAdded

```solidity
event BaseAssetCurveAdded(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 curveIndex)
```

### BaseAssetCurveChanged

```solidity
event BaseAssetCurveChanged(address token, struct ISandboxController.BaseAssetCurve oldCurve, struct ISandboxController.BaseAssetCurve newCurve, uint256 curveIndex)
```

### CollateralAssetWhitelisted

```solidity
event CollateralAssetWhitelisted(address token, address priceFeed, uint256 decimals, uint64 maxBorrowCollateralFactor, uint64 minBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor)
```

### ThresholdChanged

```solidity
event ThresholdChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### ReserveCommissionChanged

```solidity
event ReserveCommissionChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### ProtocolCommissionChanged

```solidity
event ProtocolCommissionChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### TreasuryChanged

```solidity
event TreasuryChanged(address oldTreasury, address newTreasury)
```

### ConfigurationChanged

```solidity
event ConfigurationChanged(struct ISandboxController.SandboxControllerConfiguration oldConfig, struct ISandboxController.SandboxControllerConfiguration newConfig)
```

### FeeEnabledSet

```solidity
event FeeEnabledSet(bool feeEnabled)
```

### OwnerTransferred

```solidity
event OwnerTransferred(address oldOwner, address newOwner)
```

### DaoTransferred

```solidity
event DaoTransferred(address oldDao, address newDao)
```

### protocolFactorBorrow

```solidity
function protocolFactorBorrow() external view virtual returns (uint256)
```

### reserveFactorBorrow

```solidity
function reserveFactorBorrow() external view virtual returns (uint256)
```

### protocolFactorLiquidation

```solidity
function protocolFactorLiquidation() external view virtual returns (uint256)
```

### reserveFactorLiquidation

```solidity
function reserveFactorLiquidation() external view virtual returns (uint256)
```

### getBaseAssetLength

```solidity
function getBaseAssetLength() external view virtual returns (uint256)
```

### getCollateralAssetLength

```solidity
function getCollateralAssetLength() external view virtual returns (uint256)
```

### treasury

```solidity
function treasury() external view virtual returns (address)
```

### owner

```solidity
function owner() external view virtual returns (address)
```

### dao

```solidity
function dao() external view virtual returns (address)
```

### feeEnabled

```solidity
function feeEnabled() external view virtual returns (bool)
```

### controllerConfiguration

```solidity
function controllerConfiguration() external view virtual returns (struct ISandboxController.SandboxControllerConfiguration)
```

### proposalBoundaries

```solidity
function proposalBoundaries() external view virtual returns (uint256, uint256)
```

### baseAssetTokens

```solidity
function baseAssetTokens(uint256) external view virtual returns (address)
```

### collateralAssetTokens

```solidity
function collateralAssetTokens(uint256) external view virtual returns (address)
```

### tokenToPriceFeed

```solidity
function tokenToPriceFeed(address) external view virtual returns (address)
```

### reserveCommission

```solidity
function reserveCommission(enum ISandboxController.MarketState) external view virtual returns (uint256)
```

### protocolCommission

```solidity
function protocolCommission(enum ISandboxController.MarketState) external view virtual returns (uint256)
```

### whitelistBaseAsset

```solidity
function whitelistBaseAsset(address token, address priceFeed, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow) external virtual
```

### whitelistCollateralAsset

```solidity
function whitelistCollateralAsset(address token, address priceFeed, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor) external virtual
```

### addBaseAssetCurve

```solidity
function addBaseAssetCurve(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve) external virtual
```

### changeBaseAssetCurve

```solidity
function changeBaseAssetCurve(address token, uint256 curveIndex, struct ISandboxController.BaseAssetCurve newCurve) external virtual
```

### setReserveCommissions

```solidity
function setReserveCommissions(uint256[3] reserveCommissions) external virtual
```

### setProtocolCommissions

```solidity
function setProtocolCommissions(uint256[3] protocolCommissions) external virtual
```

### setTreasury

```solidity
function setTreasury(address _treasury) external virtual
```

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external virtual
```

### setFeeEnabled

```solidity
function setFeeEnabled(bool _feeEnabled) external virtual
```

### transferOwner

```solidity
function transferOwner(address newOwner) external virtual
```

### transferDao

```solidity
function transferDao(address newDao) external virtual
```

### isBaseTokenWhitelisted

```solidity
function isBaseTokenWhitelisted(address token) external view virtual returns (bool)
```

### isCollateralTokenWhitelisted

```solidity
function isCollateralTokenWhitelisted(address token) external view virtual returns (bool)
```

### isCurveConfigurationValid

```solidity
function isCurveConfigurationValid(struct ISandboxController.BaseAssetCurve curve) external pure virtual returns (bool)
```

### baseAssets

```solidity
function baseAssets(address token) external view virtual returns (struct ISandboxController.BaseAssetConfiguration)
```

### collateralAssets

```solidity
function collateralAssets(address token) external view virtual returns (struct ISandboxController.CollateralAssetConfiguration)
```

### curves

```solidity
function curves(address token) external view virtual returns (struct ISandboxController.BaseAssetCurve[])
```

### config

```solidity
function config() external view virtual returns (struct ISandboxController.SandboxControllerConfiguration)
```

