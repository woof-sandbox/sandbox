# Solidity API

## IVault

_Interfaces for interacting with Balancer Vaults
Note Not comprehensive_

### SwapKind

```solidity
enum SwapKind {
  GIVEN_IN,
  GIVEN_OUT
}
```

### BatchSwapStep

```solidity
struct BatchSwapStep {
  bytes32 poolId;
  uint256 assetInIndex;
  uint256 assetOutIndex;
  uint256 amount;
  bytes userData;
}
```

### FundManagement

```solidity
struct FundManagement {
  address sender;
  bool fromInternalBalance;
  address payable recipient;
  bool toInternalBalance;
}
```

### batchSwap

```solidity
function batchSwap(enum IVault.SwapKind kind, struct IVault.BatchSwapStep[] swaps, contract IAsset[] assets, struct IVault.FundManagement funds, int256[] limits, uint256 deadline) external payable returns (int256[])
```

## IAsset

