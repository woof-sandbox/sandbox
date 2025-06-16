# Solidity API

## WBTCPriceFeed

A custom price feed that calculates the price for WBTC / USD

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

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

### WBTCToBTCPriceFeed

```solidity
address WBTCToBTCPriceFeed
```

Chainlink WBTC / BTC price feed

### BTCToUSDPriceFeed

```solidity
address BTCToUSDPriceFeed
```

Chainlink BTC / USD price feed

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
constructor(address WBTCToBTCPriceFeed_, address BTCToUSDPriceFeed_, uint8 decimals_, address underlyingToken_) public
```

Construct a new WBTC / USD price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| WBTCToBTCPriceFeed_ | address | The address of the WBTC / BTC price feed to fetch prices from |
| BTCToUSDPriceFeed_ | address | The address of the BTC / USD price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| underlyingToken_ | address | The address of the underlying token |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

WBTC price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from the BTC / USD price feed |
| [1] | int256 | answer Latest price for WBTC / USD |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from the BTC / USD price feed |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from the BTC / USD price feed |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from the BTC / USD price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

