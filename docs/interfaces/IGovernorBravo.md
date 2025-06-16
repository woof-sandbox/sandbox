# Solidity API

## IGovernorBravo

_Interface for interacting with Governor bravo.
Note Not a comprehensive interface_

### ProposalState

```solidity
enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}
```

### Proposal

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  uint256 eta;
  uint256 startBlock;
  uint256 endBlock;
  uint256 forVotes;
  uint256 againstVotes;
  uint256 abstainVotes;
  bool canceled;
  bool executed;
}
```

### ProposalCreated

```solidity
event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
```

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 proposalId)
```

### ProposalQueued

```solidity
event ProposalQueued(uint256 proposalId, uint256 eta)
```

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 proposalId)
```

### MIN_VOTING_PERIOD

```solidity
function MIN_VOTING_PERIOD() external view returns (uint256)
```

### MIN_VOTING_DELAY

```solidity
function MIN_VOTING_DELAY() external view returns (uint256)
```

### MIN_PROPOSAL_THRESHOLD

```solidity
function MIN_PROPOSAL_THRESHOLD() external view returns (uint256)
```

### token

```solidity
function token() external view returns (address)
```

### proposalEta

```solidity
function proposalEta(uint256) external view returns (uint256)
```

### proposalCount

```solidity
function proposalCount() external view returns (uint256)
```

### proposals

```solidity
function proposals(uint256 proposalId) external view returns (struct IGovernorBravo.Proposal)
```

### votingDelay

```solidity
function votingDelay() external view returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() external view returns (uint256)
```

### state

```solidity
function state(uint256 proposalId) external view returns (enum IGovernorBravo.ProposalState)
```

### propose

```solidity
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256 proposalId)
```

### queue

```solidity
function queue(uint256 proposalId) external
```

### execute

```solidity
function execute(uint256 proposalId) external
```

### castVote

```solidity
function castVote(uint256 proposalId, uint8 support) external returns (uint256 balance)
```

### getActions

```solidity
function getActions(uint256 proposalId) external view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)
```

