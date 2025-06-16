# Solidity API

## ConstantPriceFeed

A custom price feed that always returns a constant price

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### constantPrice

```solidity
int256 constantPrice
```

The constant price

### underlyingToken

```solidity
address underlyingToken
```

The underlying token

### constructor

```solidity
constructor(uint8 decimals_, int256 constantPrice_, address underlyingToken_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| decimals_ | uint8 | The number of decimals for the returned prices |
| constantPrice_ | int256 | The constant price |
| underlyingToken_ | address | The address of the underlying token |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset (will always be a constant price) |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

