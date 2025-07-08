# Solidity API

## CometExtension

### version

```solidity
string version
```

The major version of this contract

### DOMAIN_TYPEHASH

```solidity
bytes32 DOMAIN_TYPEHASH
```

_The EIP-712 typehash for the contract's domain_

### AUTHORIZATION_TYPEHASH

```solidity
bytes32 AUTHORIZATION_TYPEHASH
```

_The EIP-712 typehash for allowBySig Authorization_

### MAX_VALID_ECDSA_S

```solidity
uint256 MAX_VALID_ECDSA_S
```

_The highest valid value for s in an ECDSA signature pair (0 < s < secp256k1n ÷ 2 + 1)
 See https://ethereum.github.io/yellowpaper/paper.pdf #307)_

### NAME_LENGTH

```solidity
uint8 NAME_LENGTH
```

### name32

```solidity
bytes32 name32
```

_The ERC20 name for wrapped base token_

### symbol32

```solidity
bytes32 symbol32
```

_The ERC20 symbol for wrapped base token_

### constructor

```solidity
constructor(bytes32 _name32, bytes32 _symbol32) public
```

Construct a new protocol instance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name32 | bytes32 | The ERC20 name for wrapped base token |
| _symbol32 | bytes32 |  |

### baseAccrualScale

```solidity
function baseAccrualScale() external pure returns (uint64)
```

External getters for internal constants *

### baseIndexScale

```solidity
function baseIndexScale() external pure returns (uint64)
```

### factorScale

```solidity
function factorScale() external pure returns (uint64)
```

### maxAssets

```solidity
function maxAssets() external pure returns (uint8)
```

### totalsBasic

```solidity
function totalsBasic() public view returns (struct CometStorage.TotalsBasic)
```

Aggregate variables tracked for the entire market

### name

```solidity
function name() public view returns (string)
```

Get the ERC20 name for wrapped base token

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The name as a string |

### symbol

```solidity
function symbol() external view returns (string)
```

Get the ERC20 symbol for wrapped base token

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The symbol as a string |

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view returns (uint256)
```

Query the current collateral balance of an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |
| asset | address | The collateral asset to check the balance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The collateral balance of the account |

### baseTrackingAccrued

```solidity
function baseTrackingAccrued(address account) external view returns (uint64)
```

Query the total accrued base rewards for an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The accrued rewards, scaled by `BASE_ACCRUAL_SCALE` |

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

Approve or disallow `spender` to transfer on sender's behalf

_Note: this binary approval is unlike most other ERC20 tokens
Note: this grants full approval for spender to manage *all* the owner's assets_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| amount | uint256 | Either uint.max (to allow) or zero (to disallow) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the approval change succeeded |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

Get the current allowance from `owner` for `spender`

_Note: this binary allowance is unlike most other ERC20 tokens
Note: this allowance allows spender to manage *all* the owner's assets_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address of the account which owns the tokens to be spent |
| spender | address | The address of the account which may transfer tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Either uint.max (spender is allowed) or zero (spender is disallowed) |

### allowInternal

```solidity
function allowInternal(address owner, address manager, bool isAllowed_) internal
```

_Stores the flag marking whether the manager is allowed to act on behalf of owner_

### allowBySig

```solidity
function allowBySig(address owner, address manager, bool isAllowed_, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

Sets authorization status for a manager via signature from signatory

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address that signed the signature |
| manager | address | The address to authorize (or rescind authorization from) |
| isAllowed_ | bool | Whether to authorize or rescind authorization from manager |
| nonce | uint256 | The next expected nonce value for the signatory |
| expiry | uint256 | Expiration time for the signature |
| v | uint8 | The recovery byte of the signature |
| r | bytes32 | Half of the ECDSA signature pair |
| s | bytes32 | Half of the ECDSA signature pair |

### getConfiguration

```solidity
function getConfiguration() external view returns (struct ICometExtension.Configuration)
```

Returns the current configuration of the market

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ICometExtension.Configuration | Configuration struct containing all market parameters |

