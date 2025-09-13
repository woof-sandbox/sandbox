# Solidity API

## EvilToken

_FaucetToken that attempts reentrancy attacks_

### AttackType

```solidity
enum AttackType {
  TRANSFER_FROM,
  WITHDRAW_FROM,
  SUPPLY_FROM,
  BUY_COLLATERAL
}
```

### ReentryAttack

```solidity
struct ReentryAttack {
  enum EvilToken.AttackType attackType;
  address source;
  address destination;
  address asset;
  uint256 amount;
  uint256 maxCalls;
}
```

### attack

```solidity
struct EvilToken.ReentryAttack attack
```

### numberOfCalls

```solidity
uint256 numberOfCalls
```

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### getAttack

```solidity
function getAttack() external view returns (struct EvilToken.ReentryAttack)
```

### setAttack

```solidity
function setAttack(struct EvilToken.ReentryAttack attack_) external
```

### transfer

```solidity
function transfer(address dst, uint256 amount) public returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) public returns (bool)
```

### performAttack

```solidity
function performAttack(address src, address dst, uint256 amount) internal returns (bool)
```

