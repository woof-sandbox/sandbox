# Solidity API

## IConfigController

### CometTransferProposal

Comet transfer proposal

```solidity
struct CometTransferProposal {
  address comet;
  address newController;
  uint256 expiration;
}
```

### CometConfigProposal

```solidity
struct CometConfigProposal {
  address comet;
  address proposer;
  uint256 revertTime;
  struct IConfigController.CollateralTokenConfig[] collateralTokens;
}
```

### CometBaseTokenCurveProposal

```solidity
struct CometBaseTokenCurveProposal {
  address proposer;
  address comet;
  uint256 curveId;
  uint256 revertTime;
}
```

### CometConfig

```solidity
struct CometConfig {
  address baseToken;
  uint256 baseTokenCurveId;
  struct IConfigController.CometOptions options;
  struct IConfigController.CollateralTokenConfig[] collateralTokens;
}
```

### CometOptions

```solidity
struct CometOptions {
  uint256 baseTrackingSupplySpeed;
  uint256 baseTrackingBorrowSpeed;
  uint256 trackingIndexScale;
  uint256 baseMinForRewards;
}
```

### CollateralTokenConfig

```solidity
struct CollateralTokenConfig {
  address collateralToken;
  address priceFeed;
  uint128 supplyCap;
  uint64 borrowCollateralFactor;
  uint64 liquidateCollateralFactor;
  uint64 liquidationFactor;
  uint64 scale;
}
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### Unauthorized

```solidity
error Unauthorized()
```

### WrongPriceFeed

```solidity
error WrongPriceFeed()
```

### WrongCurveParams

```solidity
error WrongCurveParams()
```

### ZeroCollateralAssets

```solidity
error ZeroCollateralAssets()
```

### SupplyCapCantBeZero

```solidity
error SupplyCapCantBeZero()
```

### WrongCollateralTokenSettings

```solidity
error WrongCollateralTokenSettings()
```

### LiquidateCollateralFactorTooLow

```solidity
error LiquidateCollateralFactorTooLow()
```

### LiquidateCollateralFactorTooHigh

```solidity
error LiquidateCollateralFactorTooHigh()
```

### LiquidationFactorTooLow

```solidity
error LiquidationFactorTooLow()
```

### LiquidationFactorTooHigh

```solidity
error LiquidationFactorTooHigh()
```

### BorrowCollateralFactorTooLow

```solidity
error BorrowCollateralFactorTooLow()
```

### BorrowCollateralFactorTooHigh

```solidity
error BorrowCollateralFactorTooHigh()
```

### BaseTokenNotWhitelisted

```solidity
error BaseTokenNotWhitelisted()
```

### CollateralTokenNotWhitelisted

```solidity
error CollateralTokenNotWhitelisted()
```

### CollateralTokenAlreadyAdded

```solidity
error CollateralTokenAlreadyAdded()
```

### InvalidFeePercentage

```solidity
error InvalidFeePercentage()
```

### ZeroAmount

```solidity
error ZeroAmount()
```

### InsufficientBalance

```solidity
error InsufficientBalance()
```

### InvalidCurator

```solidity
error InvalidCurator()
```

### ProposalExpired

```solidity
error ProposalExpired()
```

### NoActiveProposal

```solidity
error NoActiveProposal()
```

### ProposalExists

```solidity
error ProposalExists()
```

### ProposalNotReady

```solidity
error ProposalNotReady()
```

### ProposalDurationTooShort

```solidity
error ProposalDurationTooShort()
```

### ProposalDurationTooLong

```solidity
error ProposalDurationTooLong()
```

### TokenNotRevenue

```solidity
error TokenNotRevenue()
```

### CometAlreadyAdded

```solidity
error CometAlreadyAdded()
```

### NonConfigController

```solidity
error NonConfigController()
```

### CometNotOwned

```solidity
error CometNotOwned()
```

### InvalidCurveId

```solidity
error InvalidCurveId()
```

### SameCurve

```solidity
error SameCurve()
```

### ProposalNotRevertable

```solidity
error ProposalNotRevertable()
```

### CometBaseTokenCurveProposed

```solidity
event CometBaseTokenCurveProposed(address comet, address proposer, uint256 revertTime, uint256 curveId)
```

### CometBaseTokenCurveProposalExecuted

```solidity
event CometBaseTokenCurveProposalExecuted(address comet, address executedBy)
```

### CometBaseTokenCurveProposalCancelled

```solidity
event CometBaseTokenCurveProposalCancelled(address comet, address cancelledBy)
```

### CometCreated

```solidity
event CometCreated(address comet, address baseToken, address priceFeed, uint256 cometId, uint256 baseTokenCurveId)
```

### AddedCollateralTokenConfig

```solidity
event AddedCollateralTokenConfig(address asset, address priceFeed, uint8 decimals, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap)
```

### AddedBaseTokenConfig

```solidity
event AddedBaseTokenConfig(uint64 supplyKink, uint64 supplyPerSecondInterestRateSlopeLow, uint64 supplyPerSecondInterestRateSlopeHigh, uint64 supplyPerSecondInterestRateBase, uint64 borrowKink, uint64 borrowPerSecondInterestRateSlopeLow, uint64 borrowPerSecondInterestRateSlopeHigh, uint64 borrowPerSecondInterestRateBase, uint64 storeFrontPriceFactor)
```

### CuratorFeeUpdated

```solidity
event CuratorFeeUpdated(uint256 oldFee, uint256 newFee)
```

### RevenueDistributed

```solidity
event RevenueDistributed(address token, uint256 curatorAmount, uint256 ownerAmount)
```

### RevenueAccumulated

```solidity
event RevenueAccumulated(address token, uint256 amount)
```

### RevenueClaimed

```solidity
event RevenueClaimed(address token, address recipient, uint256 amount)
```

### CuratorProposed

```solidity
event CuratorProposed(address currentCurator, address proposedCurator, uint256 expiry)
```

### CuratorAccepted

```solidity
event CuratorAccepted(address oldCurator, address newCurator)
```

### CuratorCanceled

```solidity
event CuratorCanceled(address oldCurator)
```

### CuratorProposalCancelled

```solidity
event CuratorProposalCancelled(address proposedCurator)
```

### GuardianUpdated

```solidity
event GuardianUpdated(address oldGuardian, address newGuardian)
```

### CometConfigProposed

```solidity
event CometConfigProposed(address comet, address proposer, uint256 revertTime)
```

Events for proposal system

### CometConfigProposalCancelled

```solidity
event CometConfigProposalCancelled(address comet, address cancelledBy)
```

### CometConfigProposalExecuted

```solidity
event CometConfigProposalExecuted(address comet, address executedBy)
```

### ProposalDurationsUpdated

```solidity
event ProposalDurationsUpdated(uint256 oldCuratorDuration, uint256 newCuratorDuration, uint256 oldProposalDuration, uint256 newProposalDuration)
```

### CometTransferProposed

```solidity
event CometTransferProposed(address comet, address newController, uint256 expiration)
```

Events for comet transfer proposal system

### CometTransferProposalCancelled

```solidity
event CometTransferProposalCancelled(address comet, address cancelledBy)
```

### CometTransferProposalAccepted

```solidity
event CometTransferProposalAccepted(address comet, address oldController, address newController)
```

### curatorFee

```solidity
function curatorFee() external view virtual returns (uint256)
```

Returns the current curator fee in basis points (1% = 100)

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The curator fee value |

### curator

```solidity
function curator() external view virtual returns (address)
```

### owner

```solidity
function owner() external view virtual returns (address)
```

### guardian

```solidity
function guardian() external view virtual returns (address)
```

### sandboxController

```solidity
function sandboxController() external view virtual returns (address)
```

### cometFactory

```solidity
function cometFactory() external view virtual returns (address)
```

### comets

```solidity
function comets(uint256) external view virtual returns (address)
```

### cometsLength

```solidity
function cometsLength() external view virtual returns (uint256)
```

### proposedCurator

```solidity
function proposedCurator() external view virtual returns (address)
```

### curatorProposalExpiry

```solidity
function curatorProposalExpiry() external view virtual returns (uint256)
```

### name

```solidity
function name() external view virtual returns (string)
```

### removeCurator

```solidity
function removeCurator() external virtual
```

Removes the current curator

_Only callable by the owner_

### setGuardian

```solidity
function setGuardian(address _newGuardian) external virtual
```

Sets a new guardian address

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newGuardian | address | The address of the new guardian |

### createComet

```solidity
function createComet(struct IConfigController.CometConfig _cometConfig) external virtual returns (address)
```

Creates a new comet with the specified configuration

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cometConfig | struct IConfigController.CometConfig | The configuration parameters for the new comet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created comet |

### initialize

```solidity
function initialize(address _owner, address _curator, address _guardian, address _cometFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration) external virtual
```

Initializes the ConfigController contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner |
| _curator | address |  |
| _guardian | address | The address of the protocol guardian |
| _cometFactory | address | The address of the cometFactory contract |
| _curatorFee | uint256 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint256 | Duration of curator proposals in seconds |
| _proposalDuration | uint256 | Duration of comet proposals in seconds |

### configControllerFactory

```solidity
function configControllerFactory() external view virtual returns (address)
```

Returns the address of the ConfigControllerFactory

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the ConfigControllerFactory |

