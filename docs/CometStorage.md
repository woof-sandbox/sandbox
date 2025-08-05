# Solidity API

## CometStorage

_Versions can enforce append-only storage slots via inheritance._

### UserBasic

User account data for base token positions and reward tracking

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct UserBasic {
  int104 principal;
  uint24 assetsIn;
}
```

### CollateralAsset

```solidity
struct CollateralAsset {
  address collateralToken;
  address priceFeed;
  uint128 supplyCap;
  uint64 borrowCollateralFactor;
  uint64 liquidateCollateralFactor;
  uint64 liquidationFactor;
  uint64 scale;
}
```

### MAX_ASSETS

```solidity
uint8 MAX_ASSETS
```

_The max number of assets this contract is hardcoded to support
 Do not change this variable without updating all the fields throughout the contract,_

### MAX_BASE_DECIMALS

```solidity
uint8 MAX_BASE_DECIMALS
```

_The max number of decimals base token can have
 Note this cannot just be increased arbitrarily._

### PAUSE_SUPPLY_OFFSET

```solidity
uint8 PAUSE_SUPPLY_OFFSET
```

_Offsets for specific actions in the pause flag bit array_

### PAUSE_TRANSFER_OFFSET

```solidity
uint8 PAUSE_TRANSFER_OFFSET
```

### PAUSE_WITHDRAW_OFFSET

```solidity
uint8 PAUSE_WITHDRAW_OFFSET
```

### PAUSE_ABSORB_OFFSET

```solidity
uint8 PAUSE_ABSORB_OFFSET
```

### PAUSE_BUY_OFFSET

```solidity
uint8 PAUSE_BUY_OFFSET
```

### PRICE_FEED_DECIMALS

```solidity
uint8 PRICE_FEED_DECIMALS
```

_The decimals required for a price feed_

### SECONDS_PER_YEAR

```solidity
uint64 SECONDS_PER_YEAR
```

_365 days * 24 hours * 60 minutes * 60 seconds_

### BASE_ACCRUAL_SCALE

```solidity
uint64 BASE_ACCRUAL_SCALE
```

_The scale for base tracking accrual_

### BASE_INDEX_SCALE

```solidity
uint64 BASE_INDEX_SCALE
```

_The scale for base index (depends on time/rate scales, not base token)_

### FACTOR_SCALE

```solidity
uint64 FACTOR_SCALE
```

_The scale for factors_

### REENTRANCY_GUARD_FLAG_SLOT

```solidity
bytes32 REENTRANCY_GUARD_FLAG_SLOT
```

_The storage slot for reentrancy guard flags_

### REENTRANCY_GUARD_NOT_ENTERED

```solidity
uint256 REENTRANCY_GUARD_NOT_ENTERED
```

_The reentrancy guard statuses_

### REENTRANCY_GUARD_ENTERED

```solidity
uint256 REENTRANCY_GUARD_ENTERED
```

### configController

```solidity
address configController
```

Config Controller address

### sandboxController

```solidity
address sandboxController
```

Sandbox Controller address

### extension

```solidity
address extension
```

The address of the extension contract

### rewardAddress

```solidity
address rewardAddress
```

The address of the reward contract

### baseToken

```solidity
address baseToken
```

The address of the base token contract

### factory

```solidity
address factory
```

The address of the comet factory contract

### baseTokenPriceFeed

```solidity
address baseTokenPriceFeed
```

The address of the price feed for the base token

### supplyKink

```solidity
uint64 supplyKink
```

The point in the supply rates separating the low interest rate slope and the high interest rate slope (factor)

_uint64_

### supplyPerSecondInterestRateSlopeLow

```solidity
uint64 supplyPerSecondInterestRateSlopeLow
```

Per second supply interest rate slope applied when utilization is below kink (factor)

_uint64_

### supplyPerSecondInterestRateSlopeHigh

```solidity
uint64 supplyPerSecondInterestRateSlopeHigh
```

Per secollateralTokenscond supply interest rate slope applied when utilization is above kink (factor)

_uint64_

### supplyPerSecondInterestRateBase

```solidity
uint64 supplyPerSecondInterestRateBase
```

Per second supply base interest rate (factor)

_uint64_

### borrowKink

```solidity
uint64 borrowKink
```

The point in the borrow rate separating the low interest rate slope and the high interest rate slope (factor)

_uint64_

### borrowPerSecondInterestRateSlopeLow

```solidity
uint64 borrowPerSecondInterestRateSlopeLow
```

Per second borrow interest rate slope applied when utilization is below kink (factor)

_uint64_

### borrowPerSecondInterestRateSlopeHigh

```solidity
uint64 borrowPerSecondInterestRateSlopeHigh
```

Per second borrow interest rate slope applied when utilization is above kink (factor)

_uint64_

### borrowPerSecondInterestRateBase

```solidity
uint64 borrowPerSecondInterestRateBase
```

Per second borrow base interest rate (factor)

_uint64_

### storeFrontPriceFactor

```solidity
uint64 storeFrontPriceFactor
```

The fraction of the liquidation penalty that goes to buyers of collateral instead of the protocol

### baseScale

```solidity
uint64 baseScale
```

The scale for base token (must be less than 18 decimals)

### baseBorrowMin

```solidity
uint256 baseBorrowMin
```

The minimum base amount required to initiate a borrow

### targetPercent

```solidity
uint64 targetPercent
```

The minimum base token reserves which must be held before collateral is hodled

### seedReserves

```solidity
uint256 seedReserves
```

Seed reserves, initialized during the Comet creation

### unlockTimestamp

```solidity
uint64 unlockTimestamp
```

Unlock timestamp

### suggestedReserves

```solidity
uint256 suggestedReserves
```

Suggested reserves

### baseSupplyIndex

```solidity
uint64 baseSupplyIndex
```

_Aggregate variables tracked for the entire market_

### baseBorrowIndex

```solidity
uint64 baseBorrowIndex
```

### totalSupplyBase

```solidity
uint104 totalSupplyBase
```

### totalBorrowBase

```solidity
uint104 totalBorrowBase
```

### lastAccrualTime

```solidity
uint40 lastAccrualTime
```

### pauseFlags

```solidity
uint8 pauseFlags
```

### numAssets

```solidity
uint8 numAssets
```

The number of assets this contract actually supports

### controllerFeeDisabled

```solidity
bool controllerFeeDisabled
```

Marker that controller fees are disabled

### totalsCollateral

```solidity
mapping(address => uint256) totalsCollateral
```

Aggregate variables tracked for each collateral asset

### assetFeesController

```solidity
mapping(address => uint256) assetFeesController
```

Fees aggregation for the controller

### assetFeesDAO

```solidity
mapping(address => uint256) assetFeesDAO
```

Fees aggregation for the DAO

### allowance

```solidity
mapping(address => mapping(address => mapping(address => uint256))) allowance
```

Mapping of users to accounts which may be permitted to manage the user account
user => spender => asset (base or collateral) => amount

### allowanceAll

```solidity
mapping(address => mapping(address => bool)) allowanceAll
```

user => spender => true or false (for baseAsset only)
allowance for all is expected to be atomic - for ...All() operations only

### userNonce

```solidity
mapping(address => uint256) userNonce
```

The next expected nonce for an address, for validating authorizations via signature

### userBasic

```solidity
mapping(address => struct ICometStructures.UserBasic) userBasic
```

Mapping of users to base principal and other basic data

### userCollateral

```solidity
mapping(address => mapping(address => uint256)) userCollateral
```

Mapping of users to collateral data per collateral asset

### collateralAssetIndex

```solidity
mapping(address => uint8) collateralAssetIndex
```

### collateralAssets

```solidity
struct ICometStructures.CollateralAsset[] collateralAssets
```

