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

### AUTHORIZATION_ALL_TYPEHASH

```solidity
bytes32 AUTHORIZATION_ALL_TYPEHASH
```

_The EIP-712 typehash for allowAllBySig Authorization_

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

_The name of the SandboxComet_

### constructor

```solidity
constructor(bytes32 _name32) public
```

Construct a new protocol instance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name32 | bytes32 | The name of the SandboxComet |

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

<<<<<<< HEAD
### targetBorrowCollateralFactor

```solidity
function targetBorrowCollateralFactor() external pure returns (uint64)
=======
### deprecationDuration

```solidity
function deprecationDuration() external pure returns (uint64)
```

### targetLiquidateFactor

```solidity
function targetLiquidateFactor() external pure returns (uint64)
>>>>>>> origin4/feat/close-market
```

### targetLiquidateCollateralFactor

```solidity
function targetLiquidateCollateralFactor() external pure returns (uint64)
```

### totalsBasic

```solidity
function totalsBasic() public view returns (struct ICometExtension.TotalsBasic)
```

Aggregate variables tracked for the entire market

### name

```solidity
function name() public view returns (string)
```

Get the name of the SandboxComet

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The name as a string |

### approve

```solidity
function approve(address spender, address asset, uint256 amount) external
```

Approve or disallow `spender` to transfer on sender's behalf

_Note: this binary approval is unlike most other ERC20 tokens
Note: this grants full approval for spender to manage *all* the owner's assets_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| asset | address | The address of the asset being approved |
| amount | uint256 | The amount of the asset that the spender is allowed to manage |

### approveAllTokens

```solidity
function approveAllTokens(address spender, uint256 baseTokenAmount, uint256[] amounts) external
```

Approve a spender to transfer multiple amounts of assets on behalf of the sender

_The length of `amounts` must match the number of collateral assets
Collateral assets are ordered by their index in the `collateralAssets` array_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| baseTokenAmount | uint256 | The amount of the base token that the spender is allowed to manage |
| amounts | uint256[] | The amounts of each collateral asset that the spender is allowed to manage |

### approveAll

```solidity
function approveAll(address spender, bool approved) external
```

Approve or revoke the ability for a spender to transfer all base tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer all base tokens |
| approved | bool | Whether the spender is approved or revoked |

### allowBySig

```solidity
function allowBySig(address owner, address manager, address asset, uint256 amount, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

Sets authorization status for a manager via signature from signatory

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address that signed the signature |
| manager | address | The address to authorize (or rescind authorization from) |
| asset | address | The asset for which the authorization applies (must be baseToken or a collateral asset) |
| amount | uint256 | The amount of the asset that the manager is allowed to manage |
| nonce | uint256 | The next expected nonce value for the signatory |
| expiry | uint256 | Expiration time for the signature |
| v | uint8 | The recovery byte of the signature |
| r | bytes32 | Half of the ECDSA signature pair |
| s | bytes32 | Half of the ECDSA signature pair |

### allowAllBySig

```solidity
function allowAllBySig(address owner, address manager, bool approved, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

Sets authorization status for a manager via signature from signatory

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address that signed the signature |
| manager | address | The address to authorize (or rescind authorization from) |
| approved | bool | Whether the manager is approved or revoked |
| nonce | uint256 | The next expected nonce value for the signatory |
| expiry | uint256 | Expiration time for the signature |
| v | uint8 | The recovery byte of the signature |
| r | bytes32 | Half of the ECDSA signature pair |
| s | bytes32 | Half of the ECDSA signature pair |

### setRewards

```solidity
function setRewards(address _rewards) external
```

Sets the rewards contract for a comet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _rewards | address | The address of the rewards contract to set |

### getConfiguration

```solidity
function getConfiguration() external view returns (struct ICometExtension.Configuration)
```

Returns the current configuration of the market

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ICometExtension.Configuration | Configuration struct containing all market parameters |

