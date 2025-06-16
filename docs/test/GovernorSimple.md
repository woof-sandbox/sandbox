# Solidity API

## TimelockInterface

### queuedTransactions

```solidity
function queuedTransactions(bytes32 hash) external view returns (bool)
```

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data) external returns (bytes32)
```

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data) external
```

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data) external payable returns (bytes)
```

### executeTransactions

```solidity
function executeTransactions(address[] targets, uint256[] values, string[] signatures, bytes[] data) external payable
```

## GovernorSimple

GovSimple:
 - A system similar to Compound's Governor{Alpha, Bravo, Charlie} but just for test-net.
 - Instead of allowing voting by tokens, the system is run by a set of admins with unlimited power. Anyone in this set should be able to add or remove other admins (it's test-net).
 - There is no voting - everything passes by will of any admin.
 - The ABI for proposing, queueing, executing should be identical to main-net. The execution should, similarly, go through a simple test-net Timelock.
 - ABI:
   - function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) public returns (uint)
   - function queue(uint proposalId) public
   - function execute(uint proposalId) public payable

### ProposalCreated

```solidity
event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, string description)
```

An event emitted when a new proposal is created

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 id)
```

An event emitted when a proposal has been canceled

### ProposalQueued

```solidity
event ProposalQueued(uint256 id)
```

An event emitted when a proposal has been queued in the Timelock

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 id)
```

An event emitted when a proposal has been executed in the Timelock

### proposalMaxOperations

```solidity
uint256 proposalMaxOperations
```

The maximum number of actions that can be included in a proposal

### timelock

```solidity
contract TimelockInterface timelock
```

The timelock

### admins

```solidity
address[] admins
```

The list of admins that can propose, cancel, queue, and execute proposals

### proposalCount

```solidity
uint256 proposalCount
```

The total number of proposals

### proposals

```solidity
mapping(uint256 => struct GovernorSimple.Proposal) proposals
```

The official record of all proposals ever proposed

### Proposal

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  address[] targets;
  uint256[] values;
  string[] signatures;
  bytes[] calldatas;
  uint256 startBlock;
  bool canceled;
  bool queued;
  bool executed;
}
```

### ProposalState

Possible states that a proposal may be in

```solidity
enum ProposalState {
  Active,
  Canceled,
  Queued,
  Executed
}
```

### initialize

```solidity
function initialize(address timelock_, address[] admins_) external
```

Initialize the initial contract storage

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timelock_ | address | The address of the Timelock |
| admins_ | address[] | The admins of governor |

### propose

```solidity
function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description) public returns (uint256)
```

Function used to propose a new proposal. Sender must be a governor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targets | address[] | Target addresses for proposal calls |
| values | uint256[] | Eth values for proposal calls |
| signatures | string[] | Function signatures for proposal calls |
| calldatas | bytes[] | Calldatas for proposal calls |
| description | string | String description of the proposal |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Proposal id of new proposal |

### queue

```solidity
function queue(uint256 proposalId) external
```

Queues a proposal of state active

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to queue |

### queueOrRevertInternal

```solidity
function queueOrRevertInternal(address target, uint256 value, string signature, bytes data) internal
```

### execute

```solidity
function execute(uint256 proposalId) external payable
```

Executes a queued proposal if eta has passed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to execute |

### cancel

```solidity
function cancel(uint256 proposalId) external
```

Cancels a proposal only if sender is a governor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to cancel |

### getActions

```solidity
function getActions(uint256 proposalId) external view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)
```

Gets actions of a proposal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | the id of the proposal |

### state

```solidity
function state(uint256 proposalId) public view returns (enum GovernorSimple.ProposalState)
```

Gets the state of a proposal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum GovernorSimple.ProposalState | Proposal state |

### isAdmin

```solidity
function isAdmin(address account) public view returns (bool)
```

Checks whether an account is a governor or not

### addAdmin

```solidity
function addAdmin(address newAdminAddress) external
```

Add new admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdminAddress | address | Address of admin to add |

### removeAdmin

```solidity
function removeAdmin(address adminAddress) external
```

Remove admin from admin array

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| adminAddress | address | Address of admin to remove |

