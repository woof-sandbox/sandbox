# Solidity API

## ISandboxCometFactory

### InvalidAddress

```solidity
error InvalidAddress()
```

### Unauthorized

```solidity
error Unauthorized()
```

### CometCreated

```solidity
event CometCreated(address comet, address ext, address configController)
```

Emitted when a new comet is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | The address of the new comet |
| ext | address | The address of the extension |
| configController | address | The address of the controller responsible for the market |

### cometImplementation

```solidity
function cometImplementation() external view virtual returns (address)
```

Returns the address of the comet implementation

### configControllerFactory

```solidity
function configControllerFactory() external view virtual returns (address)
```

Returns the address of the config controller factory

### comets

```solidity
function comets(uint256 index) external view virtual returns (address)
```

Returns the address of a comet by its index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the comet |

### getCometsLength

```solidity
function getCometsLength() external view virtual returns (uint256)
```

Returns the number of comets created

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of comets |

### createComet

```solidity
function createComet() external virtual returns (address)
```

Creates a new comet and its extension

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created comet |

