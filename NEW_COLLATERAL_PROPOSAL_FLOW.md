# New Collateral Token Proposal Flow

## Overview
This diagram shows the complete flow for proposing and accepting a new collateral token in the ConfigController system.

## Flow Diagram

```mermaid
graph TD
    A[Owner Creates Proposal] --> B[createProposal Function]
    B --> C{Validation Checks}
    
    C -->|Invalid| D[Revert with Error]
    C -->|Valid| E[Proposal Created]
    
    E --> F[Proposal State: Active]
    F --> G[expirationTime = now + 2 weeks]
    F --> H[maturityTime = now + 1 week]
    F --> I[timelock = 0]
    
    G --> J[Wait for Maturity]
    H --> J
    I --> J
    
    J --> K{Time Checks}
    K -->|Before Maturity| L[Revert: ProposalNotMatured]
    K -->|After Expiration| M[Revert: ProposalExpired]
    K -->|Valid Time Window| N[Owner Calls acceptProposal]
    
    N --> O{Pre-Execution Validation}
    O -->|Invalid| P[Revert: Various Errors]
    O -->|Valid| Q[Execute Proposal]
    
    Q --> R[Call SandboxController.addCollateralAsset]
    R --> S{Add Collateral Validation}
    
    S -->|Token Already Exists| T[Revert: TokenAlreadyExists]
    S -->|MAX_ASSETS Reached| U[Revert: TooManyAssets]
    S -->|Invalid Config| V[Revert: InvalidConfig]
    S -->|Success| W[Collateral Token Added]
    
    W --> X[Proposal State: Executed]
    X --> Y[Emit ProposalExecuted Event]
    Y --> Z[Proposal Complete]

    style A fill:#e1f5fe
    style Z fill:#c8e6c9
    style D fill:#ffcdd2
    style L fill:#ffcdd2
    style M fill:#ffcdd2
    style P fill:#ffcdd2
    style T fill:#ffcdd2
    style U fill:#ffcdd2
    style V fill:#ffcdd2
```

## Detailed Steps

### 1. Proposal Creation
- **Function**: `createProposal2(calldata, cometAddress, proposalType)`
- **Caller**: Owner only
- **Validation**: 
  - Only owner can create proposals
  - Valid comet address
  - Valid proposal type

### 2. Proposal State
- **Status**: Active
- **Timeline**:
  - `maturityTime`: Current time + 1 week (can't execute before)
  - `expirationTime`: Current time + 2 weeks (can't execute after)
  - `timelock`: 0 (no additional delay)

### 3. Proposal Acceptance
- **Function**: `acceptProposal(proposalId)`
- **Caller**: Owner only
- **Validation**:
  - Proposal exists and is active
  - Current time >= maturityTime
  - Current time <= expirationTime
  - Timelock period passed

### 4. Execution
- **Target**: SandboxController.addCollateralAsset()
- **Parameters**: CollateralTokenConfigStruct
- **Validation**:
  - Token not already added
  - Under MAX_ASSETS limit (24)
  - Valid configuration parameters

### 5. Success
- Collateral token added to comet
- Proposal marked as executed
- Event emitted

## Error Handling

### Common Revert Reasons:
1. **NoActiveProposal**: Proposal doesn't exist
2. **ProposalExpired**: Past expiration time
3. **ProposalNotMatured**: Before maturity time
4. **TokenAlreadyExists**: Token already in comet
5. **TooManyAssets**: MAX_ASSETS limit reached
6. **InvalidConfig**: Invalid configuration parameters

## Gas Optimization

### Key Considerations:
- **Library Usage**: Constants stored in libraries for reuse
- **Batch Operations**: Multiple proposals can be created efficiently
- **State Management**: Proper cleanup after execution
- **Event Optimization**: Minimal event data for gas efficiency

## Security Features

### Access Control:
- Only owner can create/accept proposals
- Time-based restrictions prevent immediate execution
- Validation at multiple levels

### Validation Layers:
1. **Proposal Level**: Time and state validation
2. **Execution Level**: Business logic validation
3. **Contract Level**: Solidity safety checks 