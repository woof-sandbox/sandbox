# Solidity API

## ConfigControllerFactory

_Factory contract for creating new ConfigController instances with unique configurations_

### configControllerImplementation

```solidity
address configControllerImplementation
```

The implementation address used for cloning

### sandboxController

```solidity
address sandboxController
```

The implementation address used for cloning

### controllerIds

```solidity
mapping(address => uint256) controllerIds
```

The array of controller addresses

### controllerAddresses

```solidity
address[] controllerAddresses
```

The array of controller addresses

### constructor

```solidity
constructor(address _sandboxController, address _configControllerImplementation) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sandboxController | address |  |
| _configControllerImplementation | address | The address of the ConfigController implementation |

### createConfigController

```solidity
function createConfigController(address _curator, address _guardian, address _marketFactory, uint32 _curatorFee, string _name, uint40 _curatorProposalDuration, uint40 _proposalDuration) external returns (address)
```

Creates a new ConfigController instance with unique configuration
Sets msg.sender as an owner of the newly created Config Controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curator | address | The address of the protocol curator |
| _guardian | address | The address of the protocol guardian |
| _marketFactory | address | The address of the MarketFactory contract |
| _curatorFee | uint32 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint40 | Duration of curator proposals in seconds |
| _proposalDuration | uint40 | Duration of market proposals in seconds |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created ConfigController |

### getLastControllerLength

```solidity
function getLastControllerLength() external view returns (uint256)
```

Returns the last controller ID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The last controller ID |

### isController

```solidity
function isController(address _controller) external view returns (bool)
```

Returns true if the address is a controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controller | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the address is a controller, false otherwise |

