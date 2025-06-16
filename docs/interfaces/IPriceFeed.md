# Solidity API

## IPriceFeed

_Interface for price feeds used by Comet
Note This is Chainlink's AggregatorV3Interface, but without the `getRoundData` function._

### underlyingToken

```solidity
function underlyingToken() external view returns (address)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

