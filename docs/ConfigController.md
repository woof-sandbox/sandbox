# Solidity API

## ConfigController

Manages protocol configuration, comet creation, and curator governance

_This contract handles the core configuration of the protocol, including:
- Comet creation and management
- Curator role management
- Revenue distribution
- Proposal system for comet configuration changes
- Comet transfer proposals_

### FEE_DIVISOR

```solidity
uint32 FEE_DIVISOR
```

### owner

```solidity
address owner
```

The address of the protocol owner

### curator

```solidity
address curator
```

The address of the protocol curator

### guardian

```solidity
address guardian
```

The address of the protocol guardian

### sandboxController

```solidity
address sandboxController
```

The address of the SandboxController contract

### cometFactory

```solidity
address cometFactory
```

The address of the cometFactory contract

### cometId

```solidity
mapping(address => uint256) cometId
```

The mapping of comet address => comet Id

_This is a more gas efficient way to store the all comets and check if the comet address is inside the array._

### comets

```solidity
address[] comets
```

Array of all comets created by this controller

### curatorFee

```solidity
uint32 curatorFee
```

The curator fee in basis points (1% = 100)

### name

```solidity
string name
```

The name of this controller

### proposedCurator

```solidity
address proposedCurator
```

The address of the proposed curator

### curatorProposalExpiry

```solidity
uint64 curatorProposalExpiry
```

The timestamp when the curator proposal expires

### curatorProposalDuration

```solidity
uint40 curatorProposalDuration
```

The duration of curator proposals in seconds

### proposalDuration

```solidity
uint40 proposalDuration
```

The duration of comet proposals in seconds

### configControllerFactory

```solidity
address configControllerFactory
```

The address of the ConfigControllerFactory contract

### cometFeeEnabled

```solidity
mapping(address => bool) cometFeeEnabled
```

Controller fee from the Comet's profit

### onlyOwner

```solidity
modifier onlyOwner()
```

Modifier to restrict access to owner only

### onlyOwnerOrCurator

```solidity
modifier onlyOwnerOrCurator()
```

Modifier to restrict access to owner or curator

### onlyGuardian

```solidity
modifier onlyGuardian()
```

Modifier to restrict access to guardian only

### initialize

```solidity
function initialize(address _owner, address _curator, address _guardian, address _cometFactory, uint32 _curatorFee, string _name, uint40 _curatorProposalDuration, uint40 _proposalDuration) public
```

Initializes the ConfigController contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner |
| _curator | address |  |
| _guardian | address | The address of the protocol guardian |
| _cometFactory | address | The address of the cometFactory contract |
| _curatorFee | uint32 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint40 | Duration of curator proposals in seconds |
| _proposalDuration | uint40 | Duration of comet proposals in seconds |

### createComet

```solidity
function createComet(struct IConfigController.CometConfig _cometConfig) external returns (address)
```

Creates a new comet with the specified configuration

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cometConfig | struct IConfigController.CometConfig | The configuration parameters for the new comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created comet |

### cometsLength

```solidity
function cometsLength() public view returns (uint256)
```

The number of comets created by this controller

### setCometFee

```solidity
function setCometFee(address comet, bool feeEnabled) external
```

Disables/Enables the controller fee for a specific comet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | Comet which should be registered in Controller |
| feeEnabled | bool | Flag for fees enabling (true -> fees are enabled) |

### setRewards

```solidity
function setRewards(address _comet, address _rewards) external
```

Sets the rewards contract for a specific comet

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _comet | address | Comet which should be registered in Controller |
| _rewards | address | The address of the rewards contract |

### extractFees

```solidity
function extractFees(address comet, address asset) external
```

Extracts fees to a self and distributes it

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | Comet which should be registered in Controller |
| asset | address | Asset (collateral or base asset) to extract |

### grantOwnership

```solidity
function grantOwnership(address _newOwner) external
```

Transfers ownership of the protocol to a new address

_Only callable by the current owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newOwner | address | The address of the new owner |

### proposeCurator

```solidity
function proposeCurator(address _proposedCurator) external
```

Proposes a new curator

_Only callable by the owner. Emits a CuratorProposed event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposedCurator | address | The address of the proposed curator |

### _proposeCurator

```solidity
function _proposeCurator(address _proposedCurator) internal
```

Proposes a new curator

_Only callable by the owner. Emits a CuratorProposed event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposedCurator | address | The address of the proposed curator |

### acceptCuratorRole

```solidity
function acceptCuratorRole() external
```

Accepts the curator role proposal

_Only callable by the proposed curator. Emits a CuratorAccepted event_

### cancelCuratorProposal

```solidity
function cancelCuratorProposal() external
```

Cancels the curator role proposal

_Only callable by the owner. Emits a CuratorProposalCancelled event_

### removeCurator

```solidity
function removeCurator() external
```

Removes the current curator

_Only callable by the owner_

### setGuardian

```solidity
function setGuardian(address _newGuardian) external
```

Sets a new guardian address

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newGuardian | address | The address of the new guardian |

### setProposalDurations

```solidity
function setProposalDurations(uint40 _curatorProposalDuration, uint40 _proposalDuration) external
```

Sets the duration for curator and comet configuration proposals

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curatorProposalDuration | uint40 | New duration for curator proposals in seconds |
| _proposalDuration | uint40 | New duration for comet configuration proposals in seconds |

### _validateCollateralTokenConfig

```solidity
function _validateCollateralTokenConfig(struct IConfigController.CollateralTokenConfig collateralTokenConfig) internal view
```

Validates comet collateral token configuration

_Internal function to validate collateral token parameters_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateralTokenConfig | struct IConfigController.CollateralTokenConfig | The collateral token configuration to validate |

### _isCometOwned

```solidity
function _isCometOwned(address comet) internal view returns (bool)
```

Internal function to check if a comet is owned by this controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | The address of the comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the comet is owned by this controller |

