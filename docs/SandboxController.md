# Solidity API

## SandboxController

_Manages base asset configurations and interest rate baseAssetCurves._

### protocolFactorBorrow

```solidity
uint256 protocolFactorBorrow
```

### reserveFactorBorrow

```solidity
uint256 reserveFactorBorrow
```

### protocolFactorLiquidation

```solidity
uint256 protocolFactorLiquidation
```

### reserveFactorLiquidation

```solidity
uint256 reserveFactorLiquidation
```

### treasury

```solidity
address treasury
```

### owner

```solidity
address owner
```

### dao

```solidity
address dao
```

### feeEnabled

```solidity
bool feeEnabled
```

### _controllerConfiguration

```solidity
struct ISandboxController.SandboxControllerConfiguration _controllerConfiguration
```

### baseAssetTokens

```solidity
address[] baseAssetTokens
```

### collateralAssetTokens

```solidity
address[] collateralAssetTokens
```

### tokenToPriceFeed

```solidity
mapping(address => address) tokenToPriceFeed
```

### reserveCommission

```solidity
mapping(enum ISandboxController.MarketState => uint256) reserveCommission
```

### protocolCommission

```solidity
mapping(enum ISandboxController.MarketState => uint256) protocolCommission
```

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlyDao

```solidity
modifier onlyDao()
```

### onlyAuthorized

```solidity
modifier onlyAuthorized()
```

_Both owner and dao are considered "authorized."
     If you want them to have separate powers, use onlyOwner or onlyDao
     in the relevant functions. For shared powers, use onlyAuthorized._

### constructor

```solidity
constructor(address _owner, address _dao, bool _feeEnabled, uint256 _protocolFactorBorrow, uint256 _reserveFactorBorrow, uint256 _protocolFactorLiquidation, uint256 _reserveFactorLiquidation, uint256 _targetPercent, uint256 _storeFrontPriceFactor, uint256 _minUpdateTime, uint256 _maxUpdateTime, uint256 _suggestedAmountOfSeedReserves, uint256 _suggestedLockTimeOfSeedReserves) public
```

_Set all global parameters (including owner and DAO) at deployment._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner. |
| _dao | address | The address of the DAO (governance). |
| _feeEnabled | bool | Global fee flag for the entire protocol. |
| _protocolFactorBorrow | uint256 | Nonzero. Will combine with reserveFactorBorrow. |
| _reserveFactorBorrow | uint256 | Nonzero. Sum with _protocolFactorBorrow <= 1e18. |
| _protocolFactorLiquidation | uint256 | Nonzero. Sum with _reserveFactorLiquidation <= 1e18. |
| _reserveFactorLiquidation | uint256 | Nonzero. |
| _targetPercent | uint256 | < 0.5 (50%) |
| _storeFrontPriceFactor | uint256 | < 1e18 |
| _minUpdateTime | uint256 | > 0 |
| _maxUpdateTime | uint256 | reasonable time for the proposal duration |
| _suggestedAmountOfSeedReserves | uint256 | > 0 |
| _suggestedLockTimeOfSeedReserves | uint256 | > 0 |

### setReserveCommissions

```solidity
function setReserveCommissions(uint256[3] reserveCommissions) external
```

Sets the reserve commission factors for each market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| reserveCommissions | uint256[3] | The new reserve commission factors, scaled by 1e18. |

### setProtocolCommissions

```solidity
function setProtocolCommissions(uint256[3] protocolCommissions) external
```

Sets the protocol commission factors for each market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolCommissions | uint256[3] | The new protocol commission factors, scaled by 1e18. |

### setTreasury

```solidity
function setTreasury(address _treasury) external
```

Sets the treasury address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | The address of the treasury. |

### whitelistBaseAsset

```solidity
function whitelistBaseAsset(address token, address priceFeed, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow) external
```

Whitelists a new base asset with its price feed and curve configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |
| priceFeed | address | The associated price feed contract address. |
| baseAssetCurve | struct ISandboxController.BaseAssetCurve | The initial interest rate curve configuration. |
| minBorrow | uint256 | The minimal borrow amount for this asset. |

### getBaseAssetLength

```solidity
function getBaseAssetLength() external view returns (uint256)
```

Returns the length of the baseAssetTokens array.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The length of the baseAssetTokens array. |

### whitelistCollateralAsset

```solidity
function whitelistCollateralAsset(address token, address priceFeed, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor) external
```

Whitelists a new collateral asset with specified collateral factor parameters.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral asset to whitelist. |
| priceFeed | address |  |
| minBorrowCollateralFactor | uint64 | The minimum borrow collateral factor (scaled by 1e18, e.g., 10% = 1e17). |
| maxBorrowCollateralFactor | uint64 | The maximum borrow collateral factor (scaled by 1e18). |
| minLiquidateCollateralFactor | uint64 | The minimum liquidate collateral factor (scaled by 1e18). |
| maxLiquidateCollateralFactor | uint64 | The maximum liquidate collateral factor (scaled by 1e18). |
| minLiquidationFactor | uint64 | The minimum liquidation factor (scaled by 1e18). |
| maxLiquidationFactor | uint64 | The maximum liquidation factor (scaled by 1e18). |

### getCollateralAssetLength

```solidity
function getCollateralAssetLength() external view returns (uint256)
```

Returns the length of the collateralAssetTokens array.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The length of the collateralAssetTokens array. |

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external
```

_Emitted when a base asset is whitelisted._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

### setFeeEnabled

```solidity
function setFeeEnabled(bool _feeEnabled) external
```

Sets the global feeEnabled flag for the entire protocol.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeEnabled | bool | True to enable fees, false to disable. |

### addBaseAssetCurve

```solidity
function addBaseAssetCurve(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve) external
```

Adds a new interest rate curve for an existing base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset. |
| baseAssetCurve | struct ISandboxController.BaseAssetCurve | The new interest rate curve configuration. |

### changeBaseAssetCurve

```solidity
function changeBaseAssetCurve(address token, uint256 curveIndex, struct ISandboxController.BaseAssetCurve newCurve) external
```

Updates an existing interest rate curve for a base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset. |
| curveIndex | uint256 | The index of the curve to update. |
| newCurve | struct ISandboxController.BaseAssetCurve | The updated interest rate curve. |

### transferOwner

```solidity
function transferOwner(address newOwner) external
```

Transfers the owner privileges to a new address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOwner | address | The address of the new owner. |

### transferDao

```solidity
function transferDao(address newDao) external
```

Transfers the DAO privileges to a new address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newDao | address | The address of the new DAO. |

### isBaseTokenWhitelisted

```solidity
function isBaseTokenWhitelisted(address token) public view returns (bool)
```

Checks if a token is whitelisted as a base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the token is whitelisted, otherwise false. |

### isCollateralTokenWhitelisted

```solidity
function isCollateralTokenWhitelisted(address token) public view returns (bool)
```

Checks if a token is whitelisted as a collateral asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the token is whitelisted, otherwise false. |

### isCurveConfigurationValid

```solidity
function isCurveConfigurationValid(struct ISandboxController.BaseAssetCurve curve) public pure returns (bool)
```

Validates an interest rate curve configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| curve | struct ISandboxController.BaseAssetCurve | The interest rate curve configuration to validate. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if valid, false otherwise. |

### baseAssets

```solidity
function baseAssets(address token) external view returns (struct ISandboxController.BaseAssetConfiguration)
```

Returns base asset configuration for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token.  @return The base asset configuration. |

### collateralAssets

```solidity
function collateralAssets(address token) external view returns (struct ISandboxController.CollateralAssetConfiguration)
```

Returns collateral asset configuration for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral asset token.  @return The collateral asset configuration. |

### curves

```solidity
function curves(address token) external view returns (struct ISandboxController.BaseAssetCurve[])
```

Returns base asset baseAssetCurves for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ISandboxController.BaseAssetCurve[] | The base asset baseAssetCurves. |

### controllerConfiguration

```solidity
function controllerConfiguration() external view returns (struct ISandboxController.SandboxControllerConfiguration)
```

### proposalBoundaries

```solidity
function proposalBoundaries() external view returns (uint256, uint256)
```

### borrowMin

```solidity
function borrowMin(address token) external view returns (uint256)
```

Returns the minimum borrow amount for a given base asset token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The minimum borrow amount. |

### config

```solidity
function config() external view returns (struct ISandboxController.SandboxControllerConfiguration)
```

Returns the configuration of the sandbox controller.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ISandboxController.SandboxControllerConfiguration | The sandbox controller configuration. |

