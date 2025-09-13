# Solidity API

## SimplePriceFeed

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

### roundId

```solidity
uint80 roundId
```

### answer

```solidity
int256 answer
```

### startedAt

```solidity
uint256 startedAt
```

### updatedAt

```solidity
uint256 updatedAt
```

### answeredInRound

```solidity
uint80 answeredInRound
```

### underlyingToken

```solidity
address underlyingToken
```

### constructor

```solidity
constructor(int256 answer_, uint8 decimals_, address underlyingToken_) public
```

### setRoundData

```solidity
function setRoundData(uint80 roundId_, int256 answer_, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) public
```

### getRoundData

```solidity
function getRoundData(uint80 roundId_) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

