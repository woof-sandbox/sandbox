# Solidity API

## ISandboxComet

An efficient monolithic money market protocol

### Absurd

```solidity
error Absurd()
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### BadAsset

```solidity
error BadAsset()
```

### BadDecimals

```solidity
error BadDecimals()
```

### BadDiscount

```solidity
error BadDiscount()
```

### BadPrice

```solidity
error BadPrice()
```

### BorrowTooSmall

```solidity
error BorrowTooSmall()
```

### BorrowCFTooLarge

```solidity
error BorrowCFTooLarge()
```

### IncorrectInitialization

```solidity
error IncorrectInitialization()
```

### InsufficientReserves

```solidity
error InsufficientReserves()
```

### LiquidateCFTooLarge

```solidity
error LiquidateCFTooLarge()
```

### NoSelfTransfer

```solidity
error NoSelfTransfer()
```

### NotCollateralized

```solidity
error NotCollateralized()
```

### NotForSale

```solidity
error NotForSale()
```

### NotLiquidatable

```solidity
error NotLiquidatable()
```

### Paused

```solidity
error Paused()
```

### ReentrantCallBlocked

```solidity
error ReentrantCallBlocked()
```

### SupplyCapExceeded

```solidity
error SupplyCapExceeded()
```

### TimestampTooLarge

```solidity
error TimestampTooLarge()
```

### TooManyAssets

```solidity
error TooManyAssets()
```

### TooMuchSlippage

```solidity
error TooMuchSlippage()
```

### TransferInFailed

```solidity
error TransferInFailed()
```

### TransferOutFailed

```solidity
error TransferOutFailed()
```

### Unauthorized

```solidity
error Unauthorized()
```

### Locked

```solidity
error Locked(uint256 currrentTimestamp, uint256 unlockTimestamp)
```

### Supply

```solidity
event Supply(address from, address dst, uint256 amount)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 amount)
```

### Withdraw

```solidity
event Withdraw(address src, address to, uint256 amount)
```

### SupplyCollateral

```solidity
event SupplyCollateral(address from, address dst, address asset, uint256 amount)
```

### TransferCollateral

```solidity
event TransferCollateral(address from, address to, address asset, uint256 amount)
```

### WithdrawCollateral

```solidity
event WithdrawCollateral(address src, address to, address asset, uint256 amount)
```

### AbsorbDebt

```solidity
event AbsorbDebt(address absorber, address borrower, uint256 basePaidOut, uint256 usdValue)
```

Event emitted when a borrow position is absorbed by the protocol

### AbsorbCollateral

```solidity
event AbsorbCollateral(address absorber, address borrower, address asset, uint256 collateralAbsorbed, uint256 usdValue)
```

Event emitted when a user's collateral is absorbed by the protocol

### BuyCollateral

```solidity
event BuyCollateral(address buyer, address asset, uint256 baseAmount, uint256 collateralAmount)
```

Event emitted when a collateral asset is purchased from the protocol

### PauseAction

```solidity
event PauseAction(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused)
```

Event emitted when an action is paused/unpaused

### WithdrawReserves

```solidity
event WithdrawReserves(address to, uint256 amount)
```

Event emitted when reserves are withdrawn by the governor

### SpeedsChanged

```solidity
event SpeedsChanged(uint256 baseTrackingSupplySpeed, uint256 baseTrackingBorrowSpeed, bool dao_)
```

### supply

```solidity
function supply(address asset, uint256 amount) external virtual
```

### supplyTo

```solidity
function supplyTo(address dst, address asset, uint256 amount) external virtual
```

### supplyFrom

```solidity
function supplyFrom(address from, address dst, address asset, uint256 amount) external virtual
```

### transfer

```solidity
function transfer(address dst, uint256 amount) external virtual returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) external virtual returns (bool)
```

### transferAsset

```solidity
function transferAsset(address dst, address asset, uint256 amount) external virtual
```

### transferAssetFrom

```solidity
function transferAssetFrom(address src, address dst, address asset, uint256 amount) external virtual
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external virtual
```

### withdrawTo

```solidity
function withdrawTo(address to, address asset, uint256 amount) external virtual
```

### withdrawFrom

```solidity
function withdrawFrom(address src, address to, address asset, uint256 amount) external virtual
```

### factoryInit

```solidity
function factoryInit(address, address) external virtual
```

### initialize

```solidity
function initialize(struct IConfigController.CometConfig market, struct ISandboxController.SandboxControllerConfiguration config, address sandboxController_, uint256 baseBorrowMin_) external virtual
```

### absorb

```solidity
function absorb(address absorber, address[] accounts) external virtual
```

### buyCollateral

```solidity
function buyCollateral(address asset, uint256 minAmount, uint256 baseAmount, address recipient) external virtual
```

### quoteCollateral

```solidity
function quoteCollateral(address asset, uint256 baseAmount) public view virtual returns (uint256)
```

### getCollateralReserves

```solidity
function getCollateralReserves(address asset) public view virtual returns (uint256)
```

### getReserves

```solidity
function getReserves() public view virtual returns (int256)
```

### getPrice

```solidity
function getPrice(address priceFeed) public view virtual returns (uint256)
```

### isBorrowCollateralized

```solidity
function isBorrowCollateralized(address account) public view virtual returns (bool)
```

### isLiquidatable

```solidity
function isLiquidatable(address account) public view virtual returns (bool)
```

### totalSupply

```solidity
function totalSupply() external view virtual returns (uint256)
```

### totalBorrow

```solidity
function totalBorrow() external view virtual returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address owner) public view virtual returns (uint256)
```

### borrowBalanceOf

```solidity
function borrowBalanceOf(address account) public view virtual returns (uint256)
```

### pause

```solidity
function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external virtual
```

### isSupplyPaused

```solidity
function isSupplyPaused() public view virtual returns (bool)
```

### isTransferPaused

```solidity
function isTransferPaused() public view virtual returns (bool)
```

### isWithdrawPaused

```solidity
function isWithdrawPaused() public view virtual returns (bool)
```

### isAbsorbPaused

```solidity
function isAbsorbPaused() public view virtual returns (bool)
```

### isBuyPaused

```solidity
function isBuyPaused() public view virtual returns (bool)
```

### accrueAccount

```solidity
function accrueAccount(address account) external virtual
```

### getSupplyRate

```solidity
function getSupplyRate(uint256 utilization) public view virtual returns (uint64)
```

### getBorrowRate

```solidity
function getBorrowRate(uint256 utilization) public view virtual returns (uint64)
```

### getUtilization

```solidity
function getUtilization() public view virtual returns (uint256)
```

### targetReserves

```solidity
function targetReserves() external view virtual returns (uint256)
```

