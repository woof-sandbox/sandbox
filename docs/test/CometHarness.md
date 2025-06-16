# Solidity API

## CometHarness

### nowOverride

```solidity
uint256 nowOverride
```

### constructor

```solidity
constructor() public
```

### getNowInternal

```solidity
function getNowInternal() internal view returns (uint40)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | The current timestamp |

### getNow

```solidity
function getNow() public view returns (uint40)
```

### setNow

```solidity
function setNow(uint256 now_) external
```

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view returns (uint256)
```

### setTotalsBasic

```solidity
function setTotalsBasic(struct CometStorage.TotalsBasic totals) external
```

### setTotalsCollateral

```solidity
function setTotalsCollateral(address asset, uint256 totals) external
```

### setBasePrincipal

```solidity
function setBasePrincipal(address account, int104 principal) external
```

### setCollateralBalance

```solidity
function setCollateralBalance(address account, address asset, uint256 balance) external
```

### totalsBasic

```solidity
function totalsBasic() public view returns (struct CometStorage.TotalsBasic)
```

### getAssetList

```solidity
function getAssetList(address account) external view returns (address[] result)
```

### updateAssetsInExternal

```solidity
function updateAssetsInExternal(address account, address asset, uint128 initialUserBalance, uint128 finalUserBalance) external
```

### accrue

```solidity
function accrue() external
```

