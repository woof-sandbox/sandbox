# Solidity API

## WstETHPriceFeed

A custom price feed that calculates the price for wstETH / ETH

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

### stETHtoETHPriceFeed

```solidity
address stETHtoETHPriceFeed
```

Chainlink stETH / ETH price feed

### stETHToETHPriceFeedDecimals

```solidity
uint256 stETHToETHPriceFeedDecimals
```

Number of decimals for the stETH / ETH price feed

### wstETH

```solidity
address wstETH
```

WstETH contract address

### wstETHScale

```solidity
int256 wstETHScale
```

Scale for WstETH contract

### underlyingToken

```solidity
address underlyingToken
```

The underlying token

### constructor

```solidity
constructor(address stETHtoETHPriceFeed_, address wstETH_, uint8 decimals_, address underlyingToken_) public
```

Construct a new wstETH price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stETHtoETHPriceFeed_ | address | The address of the stETH / ETH price feed |
| wstETH_ | address | The address of the wstETH contract |
| decimals_ | uint8 | The number of decimals for the returned prices |
| underlyingToken_ | address | The address of the underlying token |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

WstETH price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the stETH price feed |
| answer | int256 | Latest price for wstETH / USD |
| startedAt | uint256 | Timestamp when the round was started; passed on from stETH price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from stETH price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from stETH price feed |

