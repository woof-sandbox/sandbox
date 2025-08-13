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
function initialize(struct IConfigController.CometConfig comet, struct IConfigController.CometGlobalParamsConfig config) external
```

can be called only from Config Controller, as factoryInit prevents any other callers

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | struct IConfigController.CometConfig | Base token, interest rate curve, collaterals |
| config | struct IConfigController.CometGlobalParamsConfig | Global Comet reserve parameters |

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

### accrueAccount

```solidity
function accrueAccount(address account) external
```

Accrue interest and rewards for an account

### getSupplyRate

```solidity
function getSupplyRate(uint64 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint64 | The utilization to check the supply rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second supply rate at `utilization` |

### getBorrowRate

```solidity
function getBorrowRate(uint64 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint64 | The utilization to check the borrow rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second borrow rate at `utilization` |

### getUtilization

```solidity
function getUtilization() public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | _ The utilization rate of the base asset. 1e18 corresponds to 100% utilization. Return type is shortened to uint64 (approx 18 * 1e18) with 1800% as max possible value which is unlikely to be reached. |

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

### updateBasePrincipal

```solidity
function updateBasePrincipal(address account, struct ICometStructures.UserBasic basic, int104 principalNew) internal
```

_Write updated principal to store and tracking participation_

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

### fallback

```solidity
fallback() external payable
```

Fallback to calling the extension delegate for everything else

### receive

```solidity
receive() external payable
```

