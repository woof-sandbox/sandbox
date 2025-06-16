# Solidity API

## IConfigControllerFactory

Interface for the ConfigControllerFactory contract

_This interface defines the functions and events for creating and managing ConfigController instances_

### ConfigControllerCreated

```solidity
event ConfigControllerCreated(address controller, address owner, address curator, address guardian, address marketFactory, uint256 curatorFee, string name, uint256 curatorProposalDuration, uint256 proposalDuration, uint256 controllerId)
```

Event emitted when a new ConfigController is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| controller | address | The address of the newly created controller |
| owner | address | The address of the controller owner |
| curator | address | The address of the controller curator |
| guardian | address | The address of the controller guardian |
| marketFactory | address | The address of the market factory |
| curatorFee | uint256 | The curator fee in basis points |
| name | string | The name of the controller |
| curatorProposalDuration | uint256 | The duration of curator proposals in seconds |
| proposalDuration | uint256 | The duration of market proposals in seconds |
| controllerId | uint256 |  |

### InvalidAddress

```solidity
error InvalidAddress()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### InvalidFactory

```solidity
error InvalidFactory()
```

### configControllerImplementation

```solidity
function configControllerImplementation() external view virtual returns (address)
```

Returns the implementation address used for cloning

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the implementation contract |

### sandboxController

```solidity
function sandboxController() external view virtual returns (address)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the Sandbox Controller - to verify the factory |

### controllerIds

```solidity
function controllerIds(address configController) external view virtual returns (uint256)
```

Returns the controller ID for a given config controller address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| configController | address | The address of the config controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The ID of the controller |

### controllerAddresses

```solidity
function controllerAddresses(uint256 index) external view virtual returns (address)
```

Returns the controller address at a given index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the controller |

### getLastControllerLength

```solidity
function getLastControllerLength() external view virtual returns (uint256)
```

Returns the last controller ID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The ID of the last controller |

### createConfigController

```solidity
function createConfigController(address _curator, address _guardian, address _marketFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration) external virtual returns (address)
```

Creates a new ConfigController instance with unique configuration

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curator | address |  |
| _guardian | address | The address of the protocol guardian |
| _marketFactory | address | The address of the MarketFactory contract |
| _curatorFee | uint256 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint256 | Duration of curator proposals in seconds |
| _proposalDuration | uint256 | Duration of market proposals in seconds |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created ConfigController |

### isController

```solidity
function isController(address _controller) external view virtual returns (bool)
```

Checks if an address is a valid controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controller | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the address is a valid controller |

