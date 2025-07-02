# Solidity API

## IClaimable

_Interface for claiming rewards from the CometRewards contract_

### claim

```solidity
function claim(address comet, address src, bool shouldAccrue) external
```

### claimTo

```solidity
function claimTo(address comet, address src, address to, bool shouldAccrue) external
```

## BaseBulker

Executes multiple Comet-related actions in a single transaction

_Note: Only intended to be used on EVM chains that have a native token and wrapped native token that implements the IWETH interface_

### AdminTransferred

```solidity
event AdminTransferred(address oldAdmin, address newAdmin)
```

Custom events *

### admin

```solidity
address admin
```

The admin of the Bulker contract

### wrappedNativeToken

```solidity
address payable wrappedNativeToken
```

The address of the wrapped representation of the chain's native asset

### ACTION_SUPPLY_ASSET

```solidity
bytes32 ACTION_SUPPLY_ASSET
```

The action for supplying an asset to Comet

### ACTION_SUPPLY_NATIVE_TOKEN

```solidity
bytes32 ACTION_SUPPLY_NATIVE_TOKEN
```

The action for supplying a native asset (e.g. ETH on Ethereum mainnet) to Comet

### ACTION_TRANSFER_ASSET

```solidity
bytes32 ACTION_TRANSFER_ASSET
```

The action for transferring an asset within Comet

### ACTION_WITHDRAW_ASSET

```solidity
bytes32 ACTION_WITHDRAW_ASSET
```

The action for withdrawing an asset from Comet

### ACTION_WITHDRAW_NATIVE_TOKEN

```solidity
bytes32 ACTION_WITHDRAW_NATIVE_TOKEN
```

The action for withdrawing a native asset from Comet

### ACTION_CLAIM_REWARD

```solidity
bytes32 ACTION_CLAIM_REWARD
```

The action for claiming rewards from the Comet rewards contract

### InvalidAddress

```solidity
error InvalidAddress()
```

Custom errors *

### InvalidArgument

```solidity
error InvalidArgument()
```

### FailedToSendNativeToken

```solidity
error FailedToSendNativeToken()
```

### TransferInFailed

```solidity
error TransferInFailed()
```

### TransferOutFailed

```solidity
error TransferOutFailed()
```

### Unauthorized

```solidity
error Unauthorized()
```

### UnhandledAction

```solidity
error UnhandledAction()
```

### constructor

```solidity
constructor(address admin_, address payable wrappedNativeToken_) public
```

Construct a new BaseBulker instance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin_ | address | The admin of the Bulker contract |
| wrappedNativeToken_ | address payable | The address of the wrapped representation of the chain's native asset |

### receive

```solidity
receive() external payable
```

Fallback for receiving native token. Needed for ACTION_WITHDRAW_NATIVE_TOKEN

### sweepToken

```solidity
function sweepToken(address recipient, address asset) external
```

A public function to sweep accidental ERC-20 transfers to this contract

_Note: Make sure to check that the asset being swept out is not malicious_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address that will receive the swept funds |
| asset | address | The address of the ERC-20 token to sweep |

### sweepNativeToken

```solidity
function sweepNativeToken(address recipient) external
```

A public function to sweep accidental native token transfers to this contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address that will receive the swept funds |

### transferAdmin

```solidity
function transferAdmin(address newAdmin) external
```

Transfers the admin rights to a new address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin | address | The address that will become the new admin |

### invoke

```solidity
function invoke(bytes32[] actions, bytes[] data) external payable
```

Executes a list of actions in order

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| actions | bytes32[] | The list of actions to execute in order |
| data | bytes[] | The list of calldata to use for each action |

### handleAction

```solidity
function handleAction(bytes32 action, bytes data) internal virtual
```

Handles any actions not handled by the BaseBulker implementation

_Note: Meant to be overridden by contracts that extend BaseBulker and want to support more actions_

### supplyTo

```solidity
function supplyTo(address comet, address to, address asset, uint256 amount) internal
```

Supplies an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### supplyNativeTokenTo

```solidity
function supplyNativeTokenTo(address comet, address to, uint256 amount) internal returns (uint256)
```

Wraps the native token and supplies wrapped native token to a user in Comet

_Note: Supports `amount` of `uint256.max` implies max only for base asset_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of the native token wrapped and supplied to Comet |

### transferTo

```solidity
function transferTo(address comet, address to, address asset, uint256 amount) internal
```

Transfers an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### withdrawTo

```solidity
function withdrawTo(address comet, address to, address asset, uint256 amount) internal
```

Withdraws an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### withdrawNativeTokenTo

```solidity
function withdrawNativeTokenTo(address comet, address to, uint256 amount) internal
```

Withdraws wrapped native token from Comet, unwraps it to the native token, and transfers it to a user

_Note: This contract must have permission to manage msg.sender's Comet account
Note: Supports `amount` of `uint256.max` only for the base asset. Should revert for a collateral asset_

### claimReward

```solidity
function claimReward(address comet, address rewards, address src, bool shouldAccrue) internal
```

Claims rewards for a user

### doTransferIn

```solidity
function doTransferIn(address asset, address from, uint256 amount) internal
```

Similar to ERC-20 transfer, except it properly handles `transferFrom` from non-standard ERC-20 tokens

_Note: This does not check that the amount transferred in is actually equals to the amount specified
(e.g. fee tokens will not revert)
Note: This wrapper safely handles non-standard ERC-20 tokens that do not return a value.
See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The ERC-20 token to transfer in |
| from | address | The address to transfer from |
| amount | uint256 | The amount of the token to transfer |

### doTransferOut

```solidity
function doTransferOut(address asset, address to, uint256 amount) internal
```

Similar to ERC-20 transfer, except it properly handles `transfer` from non-standard ERC-20 tokens

_Note: This wrapper safely handles non-standard ERC-20 tokens that do not return a value.
See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The ERC-20 token to transfer out |
| to | address | The recipient of the token transfer |
| amount | uint256 | The amount of the token to transfer |

