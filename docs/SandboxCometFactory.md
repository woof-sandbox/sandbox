# Solidity API

## SandboxCometFactory

Factory contract for creating new comet instances using the clone pattern

_This contract uses OpenZeppelin's Clones library to create gas-efficient comet instances_

### cometImplementation

```solidity
address cometImplementation
```

The implementation address used for cloning new comets

### configControllerFactory

```solidity
address configControllerFactory
```

The address of the config controller factory

### comets

```solidity
address[] comets
```

Array of all created comet addresses

### constructor

```solidity
constructor(address _cometImplementation, address _configControllerFactory) public
```

Constructs a new SandboxCometFactory

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cometImplementation | address | The address of the comet implementation contract to be cloned |
| _configControllerFactory | address | The address of the config controller factory |

### createComet

```solidity
function createComet() external returns (address)
```

Creates a new comet with the specified configuration

_Uses OpenZeppelin's Clones library to create a new comet instance_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created comet |

### getCometsLength

```solidity
function getCometsLength() external view returns (uint256)
```

Returns the number of comets created

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of comets |

