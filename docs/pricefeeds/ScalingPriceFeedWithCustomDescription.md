# Solidity API

## ScalingPriceFeedWithCustomDescription

A custom price feed that scales up or down the price received from an underlying price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

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

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### underlyingToken

```solidity
address underlyingToken
```

The underlying token

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint8 decimals_, string description_, address underlyingToken_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |
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
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

