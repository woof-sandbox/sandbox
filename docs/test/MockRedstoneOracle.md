# Solidity API

## MockRedstoneOracle

Mock oracle to test the scaling price feed with updated update time

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying Chainlink price feed where prices are fetched from

### lastPrice

```solidity
uint256 lastPrice
```

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint256 lastPrice_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| lastPrice_ | uint256 |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Current timestamp |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

