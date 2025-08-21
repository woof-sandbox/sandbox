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

### MIN_LOCK_TIME

```solidity
uint40 MIN_LOCK_TIME
```

### MARKET_STATES

```solidity
uint8 MARKET_STATES
```

### MAX_SUPPLY_CAP_PERCENT

```solidity
uint64 MAX_SUPPLY_CAP_PERCENT
```

### treasury

```solidity
address treasury
```

treasury address. This is the address that will receive the fees.

### dao

```solidity
address dao
```

20 bytes
dao address. This is the address that will be able to call the functions that require the dao role.

### contractor

```solidity
address contractor
```

20 bytes
The address of the contractor that will support role to change existing curve params on assets or adding new ones.

### proposedDao

```solidity
address proposedDao
```

20 bytes
proposedDao address. This is the address that will be able to accept the dao role.

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

### tokenToPriceFeed

```solidity
mapping(address => address) tokenToPriceFeed
```

32 bytes
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
supplyCap
priceFeed,
decimals,
maxBorrowCollateralFactor,
minBorrowCollateralFactor,
minLiquidateCollateralFactor,
maxLiquidateCollateralFactor,
minLiquidationFactor, maxLiquidationFactor

### suggestedAmountOfSeedReserves

```solidity
mapping(address => uint256) suggestedAmountOfSeedReserves
```

Suggested amount of seed reserves for each base asset - in USD.

### suggestedLockTimeOfSeedReserves

```solidity
mapping(address => uint40) suggestedLockTimeOfSeedReserves
```

Suggested lock time of seed reserves for each base asset.

### onlyDao

```solidity
modifier onlyDao()
```

_Modifier to check if the caller is the DAO._

### onlyAuthorized

```solidity
modifier onlyAuthorized()
```

_Both contractor and dao are considered "authorized."_

### constructor

```solidity
constructor(address _treasury, bool _feeEnabled, struct ISandboxController.SandboxControllerConfiguration _config, uint64[3] _reserveCommissions, uint64[3] _protocolCommissions) public
```

_Set all global parameters (including owner and DAO) at deployment.

The length of the `_reserveCommissions` and `_protocolCommissions` arrays must be 3.
Deployer becomes the DAO._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | The address of the treasury. |
| _feeEnabled | bool | Global fee flag for the entire protocol. |
| _config | struct ISandboxController.SandboxControllerConfiguration | SanboxController config: _targetPercent, < 0.5 (50%) _storeFrontPriceFactor, < 1e18 _minUpdateTime, > 0 _maxUpdateTime, reasonable time for the proposal duration |
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
function getCommissions(uint256 _currentReserves, uint256 _targetReserves, address _baseToken) external view returns (uint64 _reserveCommission, uint64 _protocolCommission)
```

Returns profit fee distribution based on the reserves

_The function expects same denomination units (in USD) for both reserves parameters_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currentReserves | uint256 | Current Comet reserves |
| _targetReserves | uint256 | Expected target for the Comet |
| _baseToken | address | The address of the base asset of the Comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _reserveCommission | uint64 | Part of profit to be left in reserves |
| _protocolCommission | uint64 | Part of profit for the DAO |

### whitelistBaseAsset

```solidity
function whitelistBaseAsset(address token, address priceFeed, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow, uint256 amountOfSeedReserves, uint40 lockTimeOfSeedReserves) external
```

Whitelists a new base asset with its price feed and curve configuration.

_The `amountOfSeedReserves` must be greater than 0.
The `lockTimeOfSeedReserves` must be greater than or equal to the minimum lock time._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |
| priceFeed | address | The associated price feed contract address. |
| baseAssetCurve | struct ISandboxController.BaseAssetCurve | The initial interest rate curve configuration. |
| minBorrow | uint256 | The minimal borrow amount for this asset. |
| amountOfSeedReserves | uint256 | The suggested amount of seed reserves in $. Decimals are 6. |
| lockTimeOfSeedReserves | uint40 | The suggested lock time of seed reserves in seconds. |

### whitelistCollateralAsset

```solidity
function whitelistCollateralAsset(address token, address priceFeed, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor, uint256 supplyCap) external
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
| supplyCap | uint256 | The supply cap for the collateral asset. |

### updateWhitelistedCollateralAsset

```solidity
function updateWhitelistedCollateralAsset(address token, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor, uint256 supplyCap) external
```

Updates the parameters of an already whitelisted collateral asset.

_Validates that all collateral factor parameters are within allowed ranges and maintain logical relationships:
     - 10% <= minBorrowCollateralFactor <= minLiquidateCollateralFactor <= minLiquidationFactor <= 100%
     - maxBorrowCollateralFactor <= maxLiquidateCollateralFactor <= maxLiquidationFactor <= 100%
     - min <= max for each factor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral asset to update. |
| minBorrowCollateralFactor | uint64 | The new minimum borrow collateral factor (scaled by 1e18). |
| maxBorrowCollateralFactor | uint64 | The new maximum borrow collateral factor (scaled by 1e18). |
| minLiquidateCollateralFactor | uint64 | The new minimum liquidate collateral factor (scaled by 1e18). |
| maxLiquidateCollateralFactor | uint64 | The new maximum liquidate collateral factor (scaled by 1e18). |
| minLiquidationFactor | uint64 | The new minimum liquidation factor (scaled by 1e18). |
| maxLiquidationFactor | uint64 | The new maximum liquidation factor (scaled by 1e18). |
| supplyCap | uint256 | The new supply cap for the collateral asset. |

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
| curve | struct ISandboxController.BaseAssetCurve | The interest rate curve configuration to validate. Contains parameters in per year units |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if valid, false otherwise. |

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external
```

_Configuration setter_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

### _validateConfig

```solidity
function _validateConfig(struct ISandboxController.SandboxControllerConfiguration _config) internal pure
```

_Validates global config and reverts on incorrect values_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

### setSeedReserves

```solidity
function setSeedReserves(address _baseToken, uint256 _amount, uint40 _lockTime) external
```

_Seed reserves parameters setter. Dao only._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _baseToken | address | Base asset changes are applied to |
| _amount | uint256 | Seed reserves suggested amount (in USD) |
| _lockTime | uint40 | Seed reserves suggested lock time on the Comet |

### _validateSeedReserves

```solidity
function _validateSeedReserves(uint256 _amount, uint40 _lockTime) internal pure
```

_Validates seed reserves parameters and revers on incorrect values_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | Suggested seed reserves amount |
| _lockTime | uint40 | Suggested seed reserves lock time on the Comet |

### proposeDao

```solidity
function proposeDao(address _proposedDao) external
```

Proposes a new DAO address.
Allows zero address to be set as proposed dao in case previous proposal should be dismissed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposedDao | address | The address of the proposed new DAO. |

### acceptDao

```solidity
function acceptDao() external
```

Accepts the DAO privileges by the proposed DAO address.

_This function can only be called by the proposed DAO address._

### grantContractorRole

```solidity
function grantContractorRole(address _newContractor) external
```

Grants the contractor role to a new address.
Contractor can be set to zero address.

_This function can only be called by the DAO._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newContractor | address | The address of the new contractor. |

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

### baseTokenSuggestedSeedReserves

```solidity
function baseTokenSuggestedSeedReserves(address token) external view returns (uint256, uint40)
```

Returns the suggested amount of seed reserves and lock time for a base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the whitelisted base asset token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The suggested amount of seed reserves and lock time for the base asset. |
| [1] | uint40 |  |

