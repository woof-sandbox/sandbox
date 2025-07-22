# Solidity API

## SandboxController

_Manages base asset configurations and interest rate baseAssetCurves._

### PARAMETERS_SCALE

```solidity
uint64 PARAMETERS_SCALE
```

### MAX_TARGET_PERCENT

```solidity
uint64 MAX_TARGET_PERCENT
```

### MAX_COMMISSIONS

```solidity
uint64 MAX_COMMISSIONS
```

### MIN_FACTOR

```solidity
uint64 MIN_FACTOR
```

### MARKET_STATES

```solidity
uint8 MARKET_STATES
```

### treasury

```solidity
address treasury
```

treasury address. This is the address that will receive the fees.

### owner

```solidity
address owner
```

20 bytes
owner address. This is the address that will be able to call the functions that require the owner role.

### dao

```solidity
address dao
```

20 bytes
dao address. This is the address that will be able to call the functions that require the dao role.

### feeEnabled

```solidity
bool feeEnabled
```

20 bytes
feeEnabled flag. This is the flag that will be used to enable/disable the fees for all markets.

### _controllerConfiguration

```solidity
struct ISandboxController.SandboxControllerConfiguration _controllerConfiguration
```

1 byte
controller configuration.
Holds:
targetPercent,
storeFrontPriceFactor,
minUpdateTime,
maxUpdateTime,
suggestedAmountOfSeedReserves,
suggestedLockTimeOfSeedReserves.

### baseAssetTokens

```solidity
address[] baseAssetTokens
```

32 bytes
base asset tokens. Whitelisted base asset tokens.

### collateralAssetTokens

```solidity
address[] collateralAssetTokens
```

collateral asset tokens. Whitelisted collateral asset tokens.

### tokenToPriceFeed

```solidity
mapping(address => address) tokenToPriceFeed
```

token to price feed.

### reserveCommission

```solidity
uint64[3] reserveCommission
```

% of the Comet's profit left in the comet as a reserve

### protocolCommission

```solidity
uint64[3] protocolCommission
```

% of the Comet's profit extracted from reserves for the DAO

### _baseAssets

```solidity
mapping(address => struct ISandboxController.BaseAssetConfiguration) _baseAssets
```

base asset configurations. This is the mapping of the base asset token to the base asset configuration.

### _collateralAssets

```solidity
mapping(address => struct ISandboxController.CollateralAssetConfiguration) _collateralAssets
```

collateral asset configurations.
Holds:
priceFeed,
decimals,
maxBorrowCollateralFactor,
minBorrowCollateralFactor,
minLiquidateCollateralFactor,
maxLiquidateCollateralFactor,
minLiquidationFactor, maxLiquidationFactor

### onlyOwner

```solidity
modifier onlyOwner()
```

_Modifier to check if the caller is the owner._

### onlyDao

```solidity
modifier onlyDao()
```

_Modifier to check if the caller is the DAO._

### onlyAuthorized

```solidity
modifier onlyAuthorized()
```

_Both owner and dao are considered "authorized."
     If you want them to have separate powers, use onlyOwner or onlyDao
     in the relevant functions. For shared powers, use onlyAuthorized._

### constructor

```solidity
constructor(address _owner, address _dao, address _treasury, bool _feeEnabled, struct ISandboxController.SandboxControllerConfiguration _config, uint64[3] _reserveCommissions, uint64[3] _protocolCommissions) public
```

_Set all global parameters (including owner and DAO) at deployment.

The `_suggestedAmountOfSeedReserves` and `_suggestedLockTimeOfSeedReserves` must be greater than 0.
The length of the `_reserveCommissions` and `_protocolCommissions` arrays must be 3._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner. |
| _dao | address | The address of the DAO (governance). |
| _treasury | address | The address of the treasury. |
| _feeEnabled | bool | Global fee flag for the entire protocol. |
| _config | struct ISandboxController.SandboxControllerConfiguration | SanboxController config: _targetPercent, < 0.5 (50%) _storeFrontPriceFactor, < 1e18 _minUpdateTime, > 0 _maxUpdateTime, reasonable time for the proposal duration _suggestedAmountOfSeedReserves The suggested amount of seed reserves in $. Decimals are 6. _suggestedLockTimeOfSeedReserves The suggested lock time of seed reserves in seconds. |
| _reserveCommissions | uint64[3] | The reserve commission factors for each market state. |
| _protocolCommissions | uint64[3] | The protocol commission factors for each market state. |

### setMarketStateCommissions

```solidity
function setMarketStateCommissions(uint8 _index, uint64 _reserveCommission, uint64 _protocolCommission) external
```

Sets commission factors for the chosen market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _index | uint8 | Market state index |
| _reserveCommission | uint64 | The new reserve commission factor, scaled by 1e18 (100%). |
| _protocolCommission | uint64 | The new protocol commission factor, scaled by 1e18 (100%). |

### setTreasury

```solidity
function setTreasury(address _treasury) external
```

Sets the treasury address.

_This function is only callable by the owner.
The `treasury` address can`t be zero address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | The address of the treasury. |

### setFeeEnabled

```solidity
function setFeeEnabled(bool _feeEnabled) external
```

Sets the global feeEnabled flag for the entire protocol.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeEnabled | bool | True to enable fees, false to disable. |

### getCommissions

```solidity
function getCommissions(uint256 _currentReserves, uint256 _seedReserves, uint256 _targetReserves) external view returns (uint64 _reserveCommission, uint64 _protocolCommission)
```

Returns profit fee distribution based on the reserves

_The function expects same denomination units for all 3 reserves parameters_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currentReserves | uint256 | Current Comet reserves |
| _seedReserves | uint256 | Amount of reserves transferred to the Comet during the initialization |
| _targetReserves | uint256 | Expected target for the Comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _reserveCommission | uint64 | Part of profit to be left in reserves |
| _protocolCommission | uint64 | Part of profit for the DAO |

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

_Validates that all collateral factor parameters are within allowed ranges and maintain logical relationships:
     - 10% <= minBorrowCollateralFactor <= minLiquidateCollateralFactor <= minLiquidationFactor <= 100%
     - maxBorrowCollateralFactor <= maxLiquidateCollateralFactor <= maxLiquidationFactor <= 100%
     - min <= max for each factor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral asset to whitelist. |
| priceFeed | address | The address of the price feed contract for the collateral asset. |
| minBorrowCollateralFactor | uint64 | The minimum borrow collateral factor (scaled by 1e18, e.g., 10% = 1e17). |
| maxBorrowCollateralFactor | uint64 | The maximum borrow collateral factor (scaled by 1e18). |
| minLiquidateCollateralFactor | uint64 | The minimum liquidate collateral factor (scaled by 1e18). |
| maxLiquidateCollateralFactor | uint64 | The maximum liquidate collateral factor (scaled by 1e18). |
| minLiquidationFactor | uint64 | The minimum liquidation factor (scaled by 1e18). |
| maxLiquidationFactor | uint64 | The maximum liquidation factor (scaled by 1e18). |

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

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external
```

_Emitted when a base asset is whitelisted._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

### _validateConfig

```solidity
function _validateConfig(struct ISandboxController.SandboxControllerConfiguration _config) internal
```

_Validates global config and reverts on incorrect values_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

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

### proposalBoundaries

```solidity
function proposalBoundaries() external view returns (uint40, uint40)
```

Returns the proposal boundaries of the sandbox controller.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | The proposal boundaries. |
| [1] | uint40 |  |

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

