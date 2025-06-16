# Solidity API

## NonStandardFeeToken

_Implementation of the basic standard token.
 See https://github.com/ethereum/EIPs/issues/20
With USDT fee token mechanism
Note: `transfer` and `transferFrom` do not return a boolean_

### name

```solidity
string name
```

### symbol

```solidity
string symbol
```

### decimals

```solidity
uint8 decimals
```

### owner

```solidity
address owner
```

### totalSupply

```solidity
uint256 totalSupply
```

### allowance

```solidity
mapping(address => mapping(address => uint256)) allowance
```

Gets the allowance of the specified address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

### balanceOf

```solidity
mapping(address => uint256) balanceOf
```

Gets the balance of the specified address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

### Params

```solidity
event Params(uint256 feeBasisPoints, uint256 maxFee)
```

### basisPointsRate

```solidity
uint256 basisPointsRate
```

### maximumFee

```solidity
uint256 maximumFee
```

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### transfer

```solidity
function transfer(address dst, uint256 amount) external virtual
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) external virtual
```

### approve

```solidity
function approve(address _spender, uint256 amount) external
```

### setParams

```solidity
function setParams(uint256 newBasisPoints, uint256 newMaxFee) public
```

## NonStandardFaucetFeeToken

A simple test token that lets anyone get more of it.

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### allocateTo

```solidity
function allocateTo(address _owner, uint256 value) public
```

