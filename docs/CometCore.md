# Solidity API

## CometCore

### hasPermission

```solidity
function hasPermission(address owner, address manager, address asset, uint256 amount) public view returns (bool)
```

Determine if the manager has permission to act on behalf of the owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner account |
| manager | address | The manager account |
| asset | address | The address of the asset being checked |
| amount | uint256 | The amount of the asset being checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the manager has permission |

### hasPermissionAll

```solidity
function hasPermissionAll(address owner, address manager) public view returns (bool)
```

Determine if the manager has permission to act on behalf of the owner for the whole balance
The function gives an atomic one-spend permission, which will be discarded
works for the base asset only

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner account |
| manager | address | The manager account |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the manager has permission |

### spendAllowance

```solidity
function spendAllowance(address owner, address manager, address asset, uint256 amount) internal
```

Spend the allowance of an asset for a spender on behalf of an owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner account |
| manager | address | The spender account |
| asset | address | The asset being spent |
| amount | uint256 | The amount to spend |

### spendAllowanceAll

```solidity
function spendAllowanceAll(address owner, address manager) internal
```

Spend the allowance of an asset for a spender on behalf of an owner
works for the base asset only

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner account |
| manager | address | The spender account |

### allowInternal

```solidity
function allowInternal(address owner, address manager, address asset, uint256 amount) internal
```

_Allows a manager to spend an owner's allowance on a specific asset_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner of the assets |
| manager | address | The manager account |
| asset | address | The asset being spent |
| amount | uint256 | The amount to spend |

### allowAllInternal

```solidity
function allowAllInternal(address owner, address manager, bool approved) internal
```

works for the base asset only

_Allows a manager to spend an owner's allowance on a specific asset_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner of the assets |
| manager | address | The manager account |
| approved | bool | Flag to set |

### presentValue

```solidity
function presentValue(int104 principalValue_) internal view returns (int256)
```

_The positive present supply balance if positive or the negative borrow balance if negative_

### presentValueSupply

```solidity
function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256)
```

_The principal amount projected forward by the supply index_

### presentValueBorrow

```solidity
function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256)
```

_The principal amount projected forward by the borrow index_

### principalValue

```solidity
function principalValue(int256 presentValue_) internal view returns (int104)
```

_The positive principal if positive or the negative principal if negative_

### principalValueSupply

```solidity
function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104)
```

_The present value projected backward by the supply index (rounded down)
 Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals._

### principalValueBorrow

```solidity
function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104)
```

_The present value projected backward by the borrow index (rounded up)
 Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals._

