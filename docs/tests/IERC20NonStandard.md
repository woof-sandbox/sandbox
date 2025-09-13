# Solidity API

## IERC20NonStandard

_Version of ERC20 with no return values for `approve`, `transfer`, and `transferFrom`
 See https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

### name

```solidity
function name() external view returns (string)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### approve

```solidity
function approve(address spender, uint256 amount) external
```

Approve `spender` to transfer up to `amount` from `src`

_This will overwrite the approval amount for `spender`
 and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| amount | uint256 | The number of tokens that are approved (-1 means infinite) |

### transfer

```solidity
function transfer(address to, uint256 value) external
```

Transfer `value` tokens from `msg.sender` to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address of the destination account |
| value | uint256 | The number of tokens to transfer |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 value) external
```

Transfer `value` tokens from `from` to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address of the source account |
| to | address | The address of the destination account |
| value | uint256 | The number of tokens to transfer |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

Gets the balance of the specified address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address from which the balance will be retrieved |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

Gets the allowance of the specified address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address of the account which owns the tokens |
| spender | address | The address of the account which may transfer tokens |

