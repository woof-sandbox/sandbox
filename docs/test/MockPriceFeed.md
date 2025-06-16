# Solidity API

## MockPriceFeed

### description

```solidity
string description
```

### version

```solidity
uint256 version
```

### decimals

```solidity
uint8 decimals
```

### underlyingToken

```solidity
address underlyingToken
```

### priceFeed

```solidity
address priceFeed
```

### constructor

```solidity
constructor(uint8 decimals_, address underlyingToken_, address priceFeed_) public
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

