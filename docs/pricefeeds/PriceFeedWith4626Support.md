# Solidity API

## PriceFeedWith4626Support

A custom price feed that calculates the price for an ERC4626 asset

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### VERSION

```solidity
uint256 VERSION
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

### rateProviderDecimals

```solidity
uint8 rateProviderDecimals
```

Number of decimals for the 4626 rate provider

### underlyingDecimals

```solidity
uint8 underlyingDecimals
```

Number of decimals for the underlying asset

### rateProvider

```solidity
address rateProvider
```

4626 rate provider

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Chainlink oracle for the underlying asset

### underlyingToken

```solidity
address underlyingToken
```

The underlying token

### combinedScale

```solidity
int256 combinedScale
```

Combined scale of the two underlying price feeds

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### constructor

```solidity
constructor(address rateProvider_, address underlyingPriceFeed_, uint8 decimals_, string description_, address underlyingToken_) public
```

Construct a new 4626 price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rateProvider_ | address | The address of the 4626 rate provider |
| underlyingPriceFeed_ | address | The address of the underlying asset price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |
| underlyingToken_ | address | The address of the underlying token |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Get the latest price for the underlying asset

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from the underlying asset price feed |
| [1] | int256 | answer Latest price for the underlying asset |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from the underlying asset price feed |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from the underlying asset price feed |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from the underlying asset price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

