# Solidity API

## IStableSwap

_Interface for interacting with Curve pools
Note Not a comprehensive interface_

### coins

```solidity
function coins(uint256 i) external view returns (address)
```

### exchange

```solidity
function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy) external payable returns (uint256)
```

