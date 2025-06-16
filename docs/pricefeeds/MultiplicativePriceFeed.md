# Solidity API

## MultiplicativePriceFeed

A custom price feed that multiplies the prices from two price feeds and returns the result

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

### priceFeedA

```solidity
address priceFeedA
```

Chainlink price feed A

### priceFeedB

```solidity
address priceFeedB
```

Chainlink price feed B

### combinedScale

```solidity
int256 combinedScale
```

Combined scale of the two underlying Chainlink price feeds

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### underlyingToken

```solidity
address underlyingToken
```

The underlying token

### constructor

```solidity
constructor(address priceFeedA_, address priceFeedB_, uint8 decimals_, string description_, address underlyingToken_) public
```

Construct a new multiplicative price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeedA_ | address | The address of the first price feed to fetch prices from |
| priceFeedB_ | address | The address of the second price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |
| underlyingToken_ | address | The address of the underlying token |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Calculates the latest round data using data from the two price feeds

_Note: Only the `answer` really matters for downstream contracts that use this price feed (e.g. Comet)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from price feed B |
| [1] | int256 | answer Latest price |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from price feed B |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from price feed B |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from price feed B |

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

