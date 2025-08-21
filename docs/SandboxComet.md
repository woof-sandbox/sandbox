# Solidity API

## SandboxComet

An efficient monolithic money comet protocol

### factoryInit

```solidity
function factoryInit(address _configController, address _ext) external
```

can be legally deployed only via the factory which provides correct config controller address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _configController | address | legal address of the config controller which triggered the factory |
| _ext | address | extension deployed by the same factory |

### initialize

```solidity
function initialize(struct IConfigController.CometConfig cometConfig, struct IConfigController.CometGlobalParamsConfig globalConfig) external
```

can be called only from Config Controller, as factoryInit prevents any other callers

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| cometConfig | struct IConfigController.CometConfig | Base token, interest rate curve, collaterals |
| globalConfig | struct IConfigController.CometGlobalParamsConfig | Global Comet reserve parameters |

### nonReentrant

```solidity
modifier nonReentrant()
```

_Prevents marked functions from being reentered
Note: this restrict contracts from calling comet functions in their hooks.
Doing so will cause the transaction to revert._

### nonReentrantBefore

```solidity
function nonReentrantBefore() internal
```

_Checks that the reentrancy flag is not set and then sets the flag_

### nonReentrantAfter

```solidity
function nonReentrantAfter() internal
```

_Unsets the reentrancy flag_

### getAssetInfo

```solidity
function getAssetInfo(uint8 i) public view returns (struct ICometStructures.CollateralAsset)
```

Get the i-th asset info, according to the order they were passed in originally

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| i | uint8 | The index of the asset info to get |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ICometStructures.CollateralAsset | The asset info object |

### getAssetInfoByAddress

```solidity
function getAssetInfoByAddress(address asset) public view returns (struct ICometStructures.CollateralAsset, uint8 index)
```

_Determine index of asset that matches given address_

### getNowInternal

```solidity
function getNowInternal() internal view virtual returns (uint40)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | The current timestamp |

### accruedInterestIndices

```solidity
function accruedInterestIndices(uint40 timeElapsed) internal view returns (uint64, uint64)
```

_Calculate accrued interest indices for base token supply and borrows_

### accrueInternal

```solidity
function accrueInternal() internal
```

<<<<<<< HEAD
=======
_Accrue interest (and rewards) in base token supply and borrows_

>>>>>>> origin4/feat/close-market
### interpolateValue

```solidity
function interpolateValue(uint256 startValue, uint256 targetValue, uint256 currentValue, uint40 elapsed, uint40 duration) internal pure returns (uint64)
```

Linearly interpolates a curve parameter value during a transition period.
@dev
This function is used to smoothly update protocol curve parameters (such as supplyKink, interest rate slopes, etc.)
from a starting value to a target value over a specified duration. It ensures that the parameter changes
at a constant rate, providing a predictable and gradual transition rather than an abrupt jump.

The algorithm works for both increasing and decreasing transitions. At any point during the transition,
the value is calculated as a function of the elapsed time since the start of the transition.

The formula used in this implementation is:
  if (targetValue > startValue):
      interpolated = currentValue + (((targetValue - startValue) * elapsed / duration) - (currentValue - startValue))
  else:
      interpolated = currentValue - (((startValue - targetValue) * elapsed / duration) - (startValue - currentValue))

This means:
- At the start (elapsed = 0):      interpolated = startValue
- At the end (elapsed = duration): interpolated = targetValue
- In between:                      interpolated is proportionally between startValue and targetValue

Example 1: Increasing transition
  Suppose we want to transition supplyKink from 200 to 800 over 10 seconds.
  - startValue = 200
  - targetValue = 800
  - duration = 10

  At elapsed = 0, currentValue = 200:
    interpolated = 200 + ((800 - 200) * 0 / 10 - (200 - 200))
                 = 200 + (0 - 0)
                 = 200

  At elapsed = 5, currentValue = 500:
    interpolated = 500 + ((800 - 200) * 5 / 10 - (500 - 200))
                 = 500 + (300 - 300)
                 = 500

  At elapsed = 10, currentValue = 800:
    interpolated = 800 + ((800 - 200) * 10 / 10 - (800 - 200))
                 = 800 + (600 - 600)
                 = 800

Example 2: Decreasing transition
  Suppose we want to transition supplyKink from 900 to 300 over 10 seconds.
  - startValue = 900
  - targetValue = 300
  - duration = 10

  At elapsed = 0, currentValue = 900:
    interpolated = 900 - ((900 - 300) * 0 / 10 - (900 - 900))
                 = 900 - (0 - 0)
                 = 900

  At elapsed = 4, currentValue = 660:
    interpolated = 660 - ((900 - 300) * 4 / 10 - (900 - 660))
                 = 660 - (240 - 240)
                 = 660

  At elapsed = 10, currentValue = 300:
    interpolated = 300 - ((900 - 300) * 10 / 10 - (900 - 300))
                 = 300 - (600 - 600)
                 = 300

Example 3: No change
  If startValue = targetValue = 500, duration = 10, any elapsed, currentValue = 500:
    interpolated = 500 + ((500 - 500) * elapsed / 10 - (500 - 500))
                 = 500 + (0 - 0)
                 = 500

Usage:
  This function is called internally by the protocol during a curve transition, typically in a function like
  `progressTransition(now_)`, to update each curve parameter to its correct value for the current time.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| startValue | uint256 | The value of the parameter at the start of the transition. |
| targetValue | uint256 | The value of the parameter at the end of the transition. |
| currentValue | uint256 | The current value of the parameter (used for incremental calculation). |
| elapsed | uint40 | The time elapsed since the start of the transition, in seconds. |
| duration | uint40 | The total duration of the transition, in seconds. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The interpolated value as a uint64, representing the parameter's value at the current elapsed time. |

<<<<<<< HEAD
### initiateCollateralRemoval

```solidity
function initiateCollateralRemoval(address removalAsset) external
```

Initiates the collateral removal process for a given collateral asset.
@dev
This function begins a controlled and gradual removal process of a collateral asset from the protocol.
It is intended to allow safe offboarding of an asset without causing sudden liquidations or collateral shortfalls.

---
Access Control:
- Only the `configController` is authorized to call this method.
- Unauthorized calls will revert with `Unauthorized()`.

---
Process Constraints:
- Only one collateral removal process can be active at a time.
- If a removal is already in progress, the function will revert with `CollateralRemovalInProgress(...)`,
  providing:
    - The currently offboarding token address.
    - The start time of the active removal process.
    - The scheduled end time.

---
On Initialization:
- Retrieves the collateral asset metadata via `getAssetInfoByAddress(...)`.
- Stores the current state in `_collateralRemovalState`:
    - `collateralToken`: Address of the token being removed.
    - `startBorrowCollateralFactor` / `startLiquidateCollateralFactor`: Initial values before removal.
    - `startTime`: Current timestamp.
    - `duration`: Offboarding period, retrieved from `SandboxController`.
    - `collateralAssetIndex`: Index in the active collateral array.
    - `removalInProgress`: Flag set to `true`.
- Sets the collateral’s `supplyCap` to zero to block new supply immediately.

---
Safety and User Experience:
- Borrow and liquidation collateral factors are **reduced linearly** over time using `interpolateValue(...)`.
- This design prevents abrupt liquidations at the start of removal, even if the removed asset represented
  a large share of the user's borrowing power.
- The progressive decline gives users the opportunity to:
    - Withdraw the soon-to-be-removed collateral voluntarily.
    - Avoid opening new borrow positions against this collateral.
- Once the removal period ends, collateral factors reach 0%, and the asset is fully offboarded.

---
Post-Removal Behavior:
- If a user did not withdraw the collateral before the process ended:
    - They can **still withdraw it** without restrictions.
    - As long as their borrow position remains solvent, they will **not be liquidated** solely due to
      the collateral becoming inactive.
    - If the asset was not supporting an active borrow, it remains withdrawable regardless.

---
Lifecycle Summary:
1. Initiation via this method.
2. Progressive factor decay handled by `_prepareCollateralRemoval()` during internal state updates.
3. Finalization via `_finalizeCollateralRemoval()` once the duration elapses.
4. The asset is removed from active listings and added to the `removedCollateralAssets` array.
5. `removalInProgress` is set to `false`. The rest of the `_collateralRemovalState` remains in storage
   for gas efficiency and will be overwritten on the next removal.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalAsset | address | The address of the collateral asset to begin removing from the market. Emits a {CollateralRemovalInitiated} event including: - The index of the collateral in the active array. - The token address. - The start and end timestamps of the removal window. Reverts if: - The caller is not the config controller. - A removal process is already in progress. |

### _prepareCollateralRemoval

```solidity
function _prepareCollateralRemoval() internal
```

Prepares the collateral removal process by updating the collateral asset factors.
@dev
This internal function manages the gradual removal of a collateral asset from the market.
- If the removal period has ended (current time >= endTime), it sets the borrow and liquidate collateral factors
  to their target values and finalizes the removal by calling `_finalizeCollateralRemoval`.
- If the removal period is still ongoing, it linearly interpolates the borrow and liquidate collateral factors
  between their starting and target values based on the elapsed time, and updates the collateral asset in storage.
- This function is intended to be called during interest accrual or other internal state updates to ensure
  that the collateral removal process progresses smoothly over time.

### _finalizeCollateralRemoval

```solidity
function _finalizeCollateralRemoval(struct ICometStructures.CollateralAsset collateralAsset, struct ICometStructures.CollateralRemovalState collateralRemovalState) internal
```

Finalizes the removal of a collateral asset from the market.
@dev
- Appends the removed collateral asset to the `removedCollateralAssets` array and updates the corresponding index mapping.
- Increments the `numRemovedAssets` counter.
- Removes the asset from the active `collateralAssets` array by replacing it with the last element and popping the array.
- Decrements the `numAssets` counter and deletes the asset's index from the active mapping.
- Marks the end of the collateral removal process by setting the `removalInProgress` flag to false.
- Emits a {CollateralAssetRemoved} event with the asset index and token address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateralAsset | struct ICometStructures.CollateralAsset | The CollateralAsset struct containing the parameters of the removed collateral. |
| collateralRemovalState | struct ICometStructures.CollateralRemovalState | The CollateralRemovalState struct containing the state of the removal process. |

### isCollateralRemovalInProgress

```solidity
function isCollateralRemovalInProgress() public view returns (bool)
```

Check whether a collateral removal process is in progress

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether a collateral removal process is currently ongoing |

=======
>>>>>>> origin4/feat/close-market
### accrueAccount

```solidity
function accrueAccount(address account) external
```

Accrue interest and rewards for an account

### getSupplyRate

```solidity
function getSupplyRate(uint256 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint256 | The utilization to check the supply rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second supply rate at `utilization` |

### getBorrowRate

```solidity
function getBorrowRate(uint256 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint256 | The utilization to check the borrow rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second borrow rate at `utilization` |

### getUtilization

```solidity
function getUtilization() public view returns (uint256)
```

_Note: Does not accrue interest first_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The utilization rate of the base asset |

### getPrice

```solidity
function getPrice(address priceFeed) public view returns (uint256)
```

Get the current price from a feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | The address of a price feed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The price, scaled by price feed decimals |

### getCollateralReserves

```solidity
function getCollateralReserves(address asset) public view returns (uint256)
```

Gets the total balance of protocol collateral reserves for an asset (with planned fees deducted)

_Note: Reverts if collateral reserves are somehow negative, which should not be possible_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The collateral asset |

### getReserves

```solidity
function getReserves() public view returns (int256)
```

Gets the total amount of protocol reserves of the base asset

### isBorrowCollateralized

```solidity
function isBorrowCollateralized(address account) public view returns (bool)
```

Check whether an account has enough collateral to borrow

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the account is minimally collateralized enough to borrow |

### isLiquidatable

```solidity
function isLiquidatable(address account) public view returns (bool)
```

Check whether an account has enough collateral to not be liquidated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the account is minimally collateralized enough to not be liquidated |

### repayAndSupplyAmount

```solidity
function repayAndSupplyAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104)
```

_The change in principal broken into repay and supply amounts_

### withdrawAndBorrowAmount

```solidity
function withdrawAndBorrowAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104)
```

_The change in principal broken into withdraw and borrow amounts_

### pause

```solidity
function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external
```

Pauses different actions within Comet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| supplyPaused | bool | Boolean for pausing supply actions |
| transferPaused | bool | Boolean for pausing transfer actions |
| withdrawPaused | bool | Boolean for pausing withdraw actions |
| absorbPaused | bool | Boolean for pausing absorb actions |
| buyPaused | bool | Boolean for pausing buy actions |

### extractFees

```solidity
function extractFees(address asset) external
```

Extracts all accumulated fees to a respective caller

_access control check is within the function and restricts it to dao and controller only_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | Asset (collateral or base) to extract |

### isSupplyPaused

```solidity
function isSupplyPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not supply actions are paused |

### isTransferPaused

```solidity
function isTransferPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not transfer actions are paused |

### isWithdrawPaused

```solidity
function isWithdrawPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not withdraw actions are paused |

### isAbsorbPaused

```solidity
function isAbsorbPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not absorb actions are paused |

### isBuyPaused

```solidity
function isBuyPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not buy actions are paused |

### mulFactor

```solidity
function mulFactor(uint256 n, uint256 factor) internal pure returns (uint256)
```

_Multiply a number by a factor_

### divBaseWei

```solidity
function divBaseWei(uint256 n, uint256 baseWei) internal view returns (uint256)
```

_Divide a number by an amount of base_

### mulPrice

```solidity
function mulPrice(uint256 n, uint256 price, uint64 fromScale) internal pure returns (uint256)
```

_Multiply a `fromScale` quantity by a price, returning a common price quantity_

### signedMulPrice

```solidity
function signedMulPrice(int256 n, uint256 price, uint64 fromScale) internal pure returns (int256)
```

_Multiply a signed `fromScale` quantity by a price, returning a common price quantity_

### divPrice

```solidity
function divPrice(uint256 n, uint256 price, uint64 toScale) internal pure returns (uint256)
```

_Divide a common price quantity by a price, returning a `toScale` quantity_

### isInAsset

```solidity
function isInAsset(uint24 assetsIn, uint8 assetOffset) internal pure returns (bool)
```

_Whether user has a non-zero balance of an asset, given assetsIn flags_

### updateAssetsIn

```solidity
function updateAssetsIn(address account, uint8 index, uint256 initialUserBalance, uint256 finalUserBalance) internal
```

_Update assetsIn bit vector if user has entered or exited an asset_

### updateUserRewards

```solidity
function updateUserRewards(address account) internal
```

_Encapsulation of user's rewards update_

### doTransferIn

```solidity
function doTransferIn(address asset, address from, uint256 amount) internal returns (uint256)
```

_Safe ERC20 transfer in and returns the final amount transferred (taking into account any fees)
Note: Safely handles non-standard ERC-20 tokens that do not return a value.
See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

### supply

```solidity
function supply(address asset, uint256 amount) external
```

Supply an amount of asset to the protocol

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### supplyTo

```solidity
function supplyTo(address dst, address asset, uint256 amount) external
```

Supply an amount of asset to dst

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dst | address | The address which will hold the balance |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### supplyFrom

```solidity
function supplyFrom(address from, address dst, address asset, uint256 amount) external
```

Supply an amount of asset from `from` to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The supplier address |
| dst | address | The address which will hold the balance |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### repayAllFrom

```solidity
function repayAllFrom(address from, address dst) external
```

Repay the whole debt in base asset to the protocol from `from` to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The supplier address |
| dst | address | The address which will hold the balance (can be the same from address) |

### supplyInternal

```solidity
function supplyInternal(address from, address dst, address asset, uint256 amount, bool isAll) internal
```

_Supply either collateral or base asset, depending on the asset, if operator is allowed_

### supplyBase

```solidity
function supplyBase(address from, address dst, uint256 amount) internal
```

_Supply an amount of base asset from `from` to dst_

### supplyCollateral

```solidity
function supplyCollateral(address from, address dst, address asset, uint256 amount) internal
```

_Supply an amount of collateral asset from `from` to dst_

### transfer

```solidity
function transfer(address dst, uint256 amount) external returns (bool)
```

ERC20 transfer an amount of base token to dst

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dst | address | The recipient address |
| amount | uint256 | The quantity to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true |

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) external returns (bool)
```

ERC20 transfer an amount of base token from src to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| dst | address | The recipient address |
| amount | uint256 | The quantity to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true |

### transferAllFrom

```solidity
function transferAllFrom(address src, address dst) external
```

ERC20 transfer the whole base token balance from src to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| dst | address | The recipient address |

### transferAssetFrom

```solidity
function transferAssetFrom(address src, address dst, address asset, uint256 amount) external
```

Transfer an amount of asset from src to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| dst | address | The recipient address |
| asset | address | The asset to transfer |
| amount | uint256 | The quantity to transfer |

### transferInternal

```solidity
function transferInternal(address operator, address src, address dst, address asset, uint256 amount, bool isAll) internal
```

_Transfer either collateral or base asset, depending on the asset, if operator is allowed_

### transferBase

```solidity
function transferBase(address src, address dst, uint256 amount) internal
```

_Transfer an amount of base asset from src to dst, borrowing if possible/necessary_

### transferCollateral

```solidity
function transferCollateral(address src, address dst, address asset, uint256 amount) internal
```

_Transfer an amount of collateral asset from src to dst_

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external
```

Withdraw an amount of asset from the protocol

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawTo

```solidity
function withdrawTo(address to, address asset, uint256 amount) external
```

Withdraw an amount of asset to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient address |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawFrom

```solidity
function withdrawFrom(address src, address to, address asset, uint256 amount) external
```

Withdraw an amount of asset from src to `to`, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| to | address | The recipient address |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawAllFrom

```solidity
function withdrawAllFrom(address src, address to) external
```

Withdraw the whole asset balance from src to `to`, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address (can be msg.sender) |
| to | address | The recepient address (can be msg.sender) |

### withdrawInternal

```solidity
function withdrawInternal(address operator, address src, address to, address asset, uint256 amount, bool isAll) internal
```

_Withdraw either collateral or base asset, depending on the asset, if operator is allowed_

### withdrawBase

```solidity
function withdrawBase(address src, address to, uint256 amount) internal
```

_Withdraw an amount of base asset from src to `to`, borrowing if possible/necessary_

### withdrawCollateral

```solidity
function withdrawCollateral(address src, address to, address asset, uint256 amount) internal
```

_Withdraw an amount of collateral asset from src to `to`_

### spendAllowanceInternal

```solidity
function spendAllowanceInternal(address src, address operator, address asset, uint256 amount, bool isAll) internal
```

_Spend allowance for an asset, either all for base asset or a specific amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The address of the account that is spending the allowance |
| operator | address | The address of the operator spending the allowance |
| asset | address | The asset for which the allowance is being spent |
| amount | uint256 | The amount of the asset to be spent, or 0 for all |
| isAll | bool | Whether to spend all of the allowance for the base asset |

### withdrawFreeSeedReserves

```solidity
function withdrawFreeSeedReserves(uint256 amount) external
```

Withdraw free seed reserves from the protocol

_Only the config controller can withdraw free reserves. Withdrawal is allowed only if the market
     is closed or the unlock timestamp has been reached. The amount withdrawn is limited to the
     current seed reserves or total reserves, whichever is smaller. If insufficient free reserves
     are available, the available amount will be returned if it's non-zero. Remaining reserves can
     be withdrawn over time as they accumulate. Reserves cannot be withdrawn from user balances._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of free seed reserves to withdraw |

### withdrawSurplusSeedReserves

```solidity
function withdrawSurplusSeedReserves() external
```

Withdraw surplus seed reserves from the protocol above the seed reserves threshold

_Only the DAO can withdraw surplus reserves when the market is deprecated and no active supply exists.
     Surplus reserves are defined as total reserves minus seed reserves. If total reserves are less than
     or equal to seed reserves, no surplus exists and the transaction will revert. This function ensures
     that surplus reserves can only be extracted after market deprecation and all supply positions are closed.
     The withdrawn amount is sent to the protocol treasury._

### withdrawSurplusCollateralReserves

```solidity
function withdrawSurplusCollateralReserves(address[] assets) external
```

Withdraw surplus collateral reserves from the protocol for a specific asset

_Only the DAO can withdraw surplus collateral reserves when the market is deprecated
     and no active collateral positions exist for the asset. Surplus reserves are defined
     as total collateral reserves minus any fees and user balances. This function allows
     recovery of excess collateral that remains after market deprecation._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | address[] | The addresses of the collateral assets to withdraw surplus reserves for |

### absorb

```solidity
function absorb(address absorber, address[] accounts) external
```

Absorb a list of underwater accounts onto the protocol balance sheet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| absorber | address | The recipient of the incentive paid to the caller of absorb |
| accounts | address[] | The list of underwater accounts to absorb |

### absorbInternal

```solidity
function absorbInternal(address absorber, address account) internal
```

_Transfer user's collateral and debt to the protocol itself._

### _absorbCollateralPartial

```solidity
function _absorbCollateralPartial(address absorber, address account, uint24 assetsIn, int256 oldBalance, uint256 basePrice) internal returns (uint256 deltaValue)
```

_Absorb collateral with partial seizure (when market is finalized)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| absorber | address | The absorber address |
| account | address | The account to absorb |
| assetsIn | uint24 | The assets bitmap |
| oldBalance | int256 | The old balance of the account |
| basePrice | uint256 | The base token price |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| deltaValue | uint256 | The total value absorbed |

### _absorbCollateralFull

```solidity
function _absorbCollateralFull(address absorber, address account, uint24 assetsIn) internal returns (uint256 deltaValue)
```

_Absorb collateral with full seizure (normal liquidation)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| absorber | address | The absorber address |
| account | address | The account to absorb |
| assetsIn | uint24 | The assets bitmap |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| deltaValue | uint256 | The total value absorbed |

### _processAbsorption

```solidity
function _processAbsorption(address absorber, address account, struct ICometStructures.UserBasic accountUser, int104 oldPrincipal, int256 oldBalance, uint256 deltaValue, uint256 basePrice) internal
```

_Process the final steps of absorption_

### buyCollateral

```solidity
function buyCollateral(address asset, uint256 minAmount, uint256 baseAmount, address recipient) external
```

Buy collateral from the protocol using base tokens, increasing protocol reserves
       A minimum collateral amount should be specified to indicate the maximum slippage acceptable for the buyer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to buy |
| minAmount | uint256 | The minimum amount of collateral tokens that should be received by the buyer |
| baseAmount | uint256 | The amount of base tokens used to buy the collateral |
| recipient | address | The recipient address |

### quoteCollateral

```solidity
function quoteCollateral(address asset, uint256 baseAmount) public view returns (uint256 amountOut, uint256 feeReserve, uint256 feeProtocol, uint256 feeController)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The collateral asset to get the quote for |
| baseAmount | uint256 | The amount of the base asset to get the quote for |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Get the total number of tokens in circulation

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The supply of tokens |

### totalBorrow

```solidity
function totalBorrow() public view returns (uint256)
```

Get the total amount of debt

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of debt |

### targetReserves

```solidity
function targetReserves() public view returns (uint256)
```

Get the target reserves of the protocol

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The target reserves |

### balanceOf

```solidity
function balanceOf(address account) public view returns (uint256)
```

Query the current positive base balance of an account or zero

_Note: uses updated interest indices to calculate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The present day base balance magnitude of the account, if positive |

### borrowBalanceOf

```solidity
function borrowBalanceOf(address account) public view returns (uint256)
```

Query the current negative base balance of an account or zero

_Note: uses updated interest indices to calculate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The present day base balance magnitude of the account, if negative |

### _distributeProfit

```solidity
function _distributeProfit(uint256 profitAmount) internal view returns (uint256 _reserveFee, uint256 _daoFee, uint256 _controllerFee)
```

Calculates fees distribution (reserves % and dao fees %)

_Internal function for calculation over the liquidation profit or interest profit_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| profitAmount | uint256 | The amount to calculate fees from - it is expected to be denominated in USD already |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _reserveFee | uint256 | Profit accumulated in Comet's reserves |
| _daoFee | uint256 | Fee on profit in favour of DAO |
| _controllerFee | uint256 | Fee on profit in favour of Config Controller |

### initiateDeprecation

```solidity
function initiateDeprecation() external
```

Initiate the gradual deprecation of collateral assets to prepare for market closure

_Only the config controller can initiate deprecation. Once started, collateral factors will
     gradually decrease over the deprecation period until they reach target values and the market
     is permanently deprecated. All pause flags are cleared when deprecation begins.
     During deprecation:
     - Collateral liquidation factors gradually decrease to target values over time
     - Users cannot transfer assets or supply new collateral
     - Users can still supply base asset to close existing debt positions
     - Once deprecation completes, the market becomes permanently deprecated_

### _prepareDeprecation

```solidity
function _prepareDeprecation() internal
```

This internal function is called during interest accrual to gradually reduce collateral factors
        over the deprecation period. If the deprecation duration has elapsed, it finalizes the deprecation.
        During the deprecation period, collateral factors are linearly interpolated from their starting
        values to target values, making positions easier to liquidate over time.

_Progress the deprecation process by updating collateral factors or finalizing if duration is complete_

### _finalizeDeprecation

```solidity
function _finalizeDeprecation() internal
```

This internal function finalizes the market deprecation by setting all collateral liquidation
        factors to their target values and permanently deprecating the market. Once finalized:
        - All collateral assets have minimum liquidation factors for maximum liquidation efficiency
        - The market is permanently deprecated and cannot be reopened
        - Users can only close positions and withdraw assets with no debt

_Complete the deprecation process by setting final collateral factors and marking the market as deprecated_

### fallback

```solidity
fallback() external payable
```

Fallback to calling the extension delegate for everything else

