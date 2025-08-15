# Solidity API

## CometMath

_Pure math functions_

### InvalidUInt64

```solidity
error InvalidUInt64()
```

Custom errors *

### InvalidUInt104

```solidity
error InvalidUInt104()
```

### InvalidInt104

```solidity
error InvalidInt104()
```

### InvalidInt256

```solidity
error InvalidInt256()
```

### NegativeNumber

```solidity
error NegativeNumber()
```

### safe64

```solidity
function safe64(uint256 n) internal pure returns (uint64)
```

### safe104

```solidity
function safe104(uint256 n) internal pure returns (uint104)
```

### signed104

```solidity
function signed104(uint104 n) internal pure returns (int104)
```

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### unsigned104

```solidity
function unsigned104(int104 n) internal pure returns (uint104)
```

### unsigned256

```solidity
function unsigned256(int256 n) internal pure returns (uint256)
```

### toUInt8

```solidity
function toUInt8(bool x) internal pure returns (uint8)
```

### toBool

```solidity
function toBool(uint8 x) internal pure returns (bool)
```

