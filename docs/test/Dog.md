# Solidity API

## Dog

### initialized

```solidity
bool initialized
```

### name

```solidity
string name
```

### father

```solidity
contract Dog father
```

### pups

```solidity
contract Dog[] pups
```

### Puppers

```solidity
struct Puppers {
  uint256 index;
  contract Dog pup;
}
```

### initializeDog

```solidity
function initializeDog(string name_, contract Dog father_, contract Dog[] pups_) public
```

### constructor

```solidity
constructor(string name_, contract Dog father_, contract Dog[] pups_) public
```

### addPup

```solidity
function addPup(contract Dog pup) public
```

### puppers

```solidity
function puppers() public returns (struct Dog.Puppers[])
```

