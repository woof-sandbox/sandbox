# Solidity API

## IWETH9

### name

```solidity
function name() external view returns (string)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```

### allowance

```solidity
function allowance(address, address) external view returns (uint256)
```

### receive

```solidity
receive() external payable
```

### deposit

```solidity
function deposit() external payable
```

### withdraw

```solidity
function withdraw(uint256 wad) external
```

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### approve

```solidity
function approve(address guy, uint256 wad) external returns (bool)
```

### transfer

```solidity
function transfer(address dst, uint256 wad) external returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 wad) external returns (bool)
```

