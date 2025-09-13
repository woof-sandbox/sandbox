# Solidity API

## Fauceteer

### lastReceived

```solidity
mapping(address => mapping(address => uint256)) lastReceived
```

Mapping of user address -> asset address -> last time the user
received that asset

### BalanceTooLow

```solidity
error BalanceTooLow()
```

### RequestedTooFrequently

```solidity
error RequestedTooFrequently()
```

### TransferFailed

```solidity
error TransferFailed()
```

### drip

```solidity
function drip(address token) public
```

