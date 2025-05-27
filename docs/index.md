# Solidity API

## CometCore

### MAX_ASSETS

```solidity
uint8 MAX_ASSETS
```

_The max number of assets this contract is hardcoded to support
 Do not change this variable without updating all the fields throughout the contract,_

### MAX_BASE_DECIMALS

```solidity
uint8 MAX_BASE_DECIMALS
```

_The max number of decimals base token can have
 Note this cannot just be increased arbitrarily._

### MAX_COLLATERAL_FACTOR

```solidity
uint64 MAX_COLLATERAL_FACTOR
```

_The max value for a collateral factor (1)_

### PAUSE_SUPPLY_OFFSET

```solidity
uint8 PAUSE_SUPPLY_OFFSET
```

_Offsets for specific actions in the pause flag bit array_

### PAUSE_TRANSFER_OFFSET

```solidity
uint8 PAUSE_TRANSFER_OFFSET
```

### PAUSE_WITHDRAW_OFFSET

```solidity
uint8 PAUSE_WITHDRAW_OFFSET
```

### PAUSE_ABSORB_OFFSET

```solidity
uint8 PAUSE_ABSORB_OFFSET
```

### PAUSE_BUY_OFFSET

```solidity
uint8 PAUSE_BUY_OFFSET
```

### PRICE_FEED_DECIMALS

```solidity
uint8 PRICE_FEED_DECIMALS
```

_The decimals required for a price feed_

### SECONDS_PER_YEAR

```solidity
uint64 SECONDS_PER_YEAR
```

_365 days * 24 hours * 60 minutes * 60 seconds_

### BASE_ACCRUAL_SCALE

```solidity
uint64 BASE_ACCRUAL_SCALE
```

_The scale for base tracking accrual_

### BASE_INDEX_SCALE

```solidity
uint64 BASE_INDEX_SCALE
```

_The scale for base index (depends on time/rate scales, not base token)_

### PRICE_SCALE

```solidity
uint64 PRICE_SCALE
```

_The scale for prices (in USD)_

### FACTOR_SCALE

```solidity
uint64 FACTOR_SCALE
```

_The scale for factors_

### REENTRANCY_GUARD_FLAG_SLOT

```solidity
bytes32 REENTRANCY_GUARD_FLAG_SLOT
```

_The storage slot for reentrancy guard flags_

### REENTRANCY_GUARD_NOT_ENTERED

```solidity
uint256 REENTRANCY_GUARD_NOT_ENTERED
```

_The reentrancy guard statuses_

### REENTRANCY_GUARD_ENTERED

```solidity
uint256 REENTRANCY_GUARD_ENTERED
```

### MIN_TARGET_RESERVES

```solidity
uint256 MIN_TARGET_RESERVES
```

### hasPermission

```solidity
function hasPermission(address owner, address manager) public view returns (bool)
```

Determine if the manager has permission to act on behalf of the owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner account |
| manager | address | The manager account |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the manager has permission |

### presentValue

```solidity
function presentValue(int104 principalValue_) internal view returns (int256)
```

_The positive present supply balance if positive or the negative borrow balance if negative_

### presentValueSupply

```solidity
function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256)
```

_The principal amount projected forward by the supply index_

### presentValueBorrow

```solidity
function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256)
```

_The principal amount projected forward by the borrow index_

### principalValue

```solidity
function principalValue(int256 presentValue_) internal view returns (int104)
```

_The positive principal if positive or the negative principal if negative_

### principalValueSupply

```solidity
function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104)
```

_The present value projected backward by the supply index (rounded down)
 Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals._

### principalValueBorrow

```solidity
function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104)
```

_The present value projected backward by the borrow index (rounded up)
 Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals._

## CometExtension

### version

```solidity
string version
```

The major version of this contract

### DOMAIN_TYPEHASH

```solidity
bytes32 DOMAIN_TYPEHASH
```

_The EIP-712 typehash for the contract's domain_

### AUTHORIZATION_TYPEHASH

```solidity
bytes32 AUTHORIZATION_TYPEHASH
```

_The EIP-712 typehash for allowBySig Authorization_

### MAX_VALID_ECDSA_S

```solidity
uint256 MAX_VALID_ECDSA_S
```

_The highest valid value for s in an ECDSA signature pair (0 < s < secp256k1n ÷ 2 + 1)
 See https://ethereum.github.io/yellowpaper/paper.pdf #307)_

### name32

```solidity
bytes32 name32
```

_The ERC20 name for wrapped base token_

### symbol32

```solidity
bytes32 symbol32
```

_The ERC20 symbol for wrapped base token_

### constructor

```solidity
constructor(bytes32 _name32, bytes32 _symbol32) public
```

Construct a new protocol instance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name32 | bytes32 | The ERC20 name for wrapped base token |
| _symbol32 | bytes32 |  |

### baseAccrualScale

```solidity
function baseAccrualScale() external pure returns (uint64)
```

External getters for internal constants *

### baseIndexScale

```solidity
function baseIndexScale() external pure returns (uint64)
```

### factorScale

```solidity
function factorScale() external pure returns (uint64)
```

### priceScale

```solidity
function priceScale() external pure returns (uint64)
```

### maxAssets

```solidity
function maxAssets() external pure returns (uint8)
```

### totalsBasic

```solidity
function totalsBasic() public view returns (struct CometStorage.TotalsBasic)
```

Aggregate variables tracked for the entire market

### name

```solidity
function name() public view returns (string)
```

Get the ERC20 name for wrapped base token

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The name as a string |

### symbol

```solidity
function symbol() external view returns (string)
```

Get the ERC20 symbol for wrapped base token

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The symbol as a string |

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view returns (uint128)
```

Query the current collateral balance of an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |
| asset | address | The collateral asset to check the balance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | The collateral balance of the account |

### baseTrackingAccrued

```solidity
function baseTrackingAccrued(address account) external view returns (uint64)
```

Query the total accrued base rewards for an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The accrued rewards, scaled by `BASE_ACCRUAL_SCALE` |

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

Approve or disallow `spender` to transfer on sender's behalf

_Note: this binary approval is unlike most other ERC20 tokens
Note: this grants full approval for spender to manage *all* the owner's assets_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| amount | uint256 | Either uint.max (to allow) or zero (to disallow) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the approval change succeeded |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

Get the current allowance from `owner` for `spender`

_Note: this binary allowance is unlike most other ERC20 tokens
Note: this allowance allows spender to manage *all* the owner's assets_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address of the account which owns the tokens to be spent |
| spender | address | The address of the account which may transfer tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Either uint.max (spender is allowed) or zero (spender is disallowed) |

### allow

```solidity
function allow(address manager, bool isAllowed_) external
```

Allow or disallow another address to withdraw, or transfer from the sender

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | The account which will be allowed or disallowed |
| isAllowed_ | bool | Whether to allow or disallow |

### allowInternal

```solidity
function allowInternal(address owner, address manager, bool isAllowed_) internal
```

_Stores the flag marking whether the manager is allowed to act on behalf of owner_

### allowBySig

```solidity
function allowBySig(address owner, address manager, bool isAllowed_, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

Sets authorization status for a manager via signature from signatory

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address that signed the signature |
| manager | address | The address to authorize (or rescind authorization from) |
| isAllowed_ | bool | Whether to authorize or rescind authorization from manager |
| nonce | uint256 | The next expected nonce value for the signatory |
| expiry | uint256 | Expiration time for the signature |
| v | uint8 | The recovery byte of the signature |
| r | bytes32 | Half of the ECDSA signature pair |
| s | bytes32 | Half of the ECDSA signature pair |

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

### InvalidUInt128

```solidity
error InvalidUInt128()
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

### safe128

```solidity
function safe128(uint256 n) internal pure returns (uint128)
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

## CometStorage

_Versions can enforce append-only storage slots via inheritance._

### TotalsBasic

```solidity
struct TotalsBasic {
  uint64 baseSupplyIndex;
  uint64 baseBorrowIndex;
  uint64 trackingSupplyIndex;
  uint64 trackingBorrowIndex;
  uint104 totalSupplyBase;
  uint104 totalBorrowBase;
  uint40 lastAccrualTime;
  uint8 pauseFlags;
}
```

### TotalsCollateral

```solidity
struct TotalsCollateral {
  uint128 totalSupplyAsset;
  uint128 _reserved;
}
```

### UserBasic

```solidity
struct UserBasic {
  int104 principal;
  uint64 baseTrackingIndex;
  uint64 baseTrackingAccrued;
  uint16 assetsIn;
  uint8 _reserved;
}
```

### UserCollateral

```solidity
struct UserCollateral {
  uint128 balance;
  uint128 _reserved;
}
```

### LiquidatorPoints

```solidity
struct LiquidatorPoints {
  uint32 numAbsorbs;
  uint64 numAbsorbed;
  uint128 approxSpend;
  uint32 _reserved;
}
```

### baseSupplyIndex

```solidity
uint64 baseSupplyIndex
```

_Aggregate variables tracked for the entire market_

### baseBorrowIndex

```solidity
uint64 baseBorrowIndex
```

### trackingSupplyIndex

```solidity
uint64 trackingSupplyIndex
```

### trackingBorrowIndex

```solidity
uint64 trackingBorrowIndex
```

### totalSupplyBase

```solidity
uint104 totalSupplyBase
```

### totalBorrowBase

```solidity
uint104 totalBorrowBase
```

### lastAccrualTime

```solidity
uint40 lastAccrualTime
```

### pauseFlags

```solidity
uint8 pauseFlags
```

### totalsCollateral

```solidity
mapping(address => struct CometStorage.TotalsCollateral) totalsCollateral
```

Aggregate variables tracked for each collateral asset

### isAllowed

```solidity
mapping(address => mapping(address => bool)) isAllowed
```

Mapping of users to accounts which may be permitted to manage the user account

### userNonce

```solidity
mapping(address => uint256) userNonce
```

The next expected nonce for an address, for validating authorizations via signature

### userBasic

```solidity
mapping(address => struct CometStorage.UserBasic) userBasic
```

Mapping of users to base principal and other basic data

### userCollateral

```solidity
mapping(address => mapping(address => struct CometStorage.UserCollateral)) userCollateral
```

Mapping of users to collateral data per collateral asset

### liquidatorPoints

```solidity
mapping(address => struct CometStorage.LiquidatorPoints) liquidatorPoints
```

Mapping of magic liquidator points

## ConfigController

Manages protocol configuration, market creation, and curator governance

_This contract handles the core configuration of the protocol, including:
- Market creation and management
- Curator role management
- Revenue distribution
- Proposal system for market configuration changes
- Market transfer proposals_

### owner

```solidity
address owner
```

The address of the protocol owner

### curator

```solidity
address curator
```

The address of the protocol curator

### guardian

```solidity
address guardian
```

The address of the protocol guardian

### sandboxController

```solidity
address sandboxController
```

The address of the SandboxController contract

### marketFactory

```solidity
address marketFactory
```

The address of the MarketFactory contract

### marketId

```solidity
mapping(address => uint256) marketId
```

The mapping of market address => market Id

_This is a more gas efficient way to store the all markets and check if the market address is inside the array._

### markets

```solidity
address[] markets
```

Array of all markets created by this controller

### marketsLength

```solidity
uint256 marketsLength
```

The number of markets created by this controller

### curatorFee

```solidity
uint256 curatorFee
```

The curator fee in basis points (1% = 100)

### name

```solidity
string name
```

The name of this controller

### unclaimedRevenue

```solidity
mapping(address => mapping(address => uint256)) unclaimedRevenue
```

Mapping of token => address => unclaimed revenue

### marketBaseTokenCurveId

```solidity
mapping(address => uint256) marketBaseTokenCurveId
```

Mapping of market address => base token curve Id.

### proposedBaseAssetCurve

```solidity
mapping(address => struct IConfigController.MarketBaseTokenCurveProposal) proposedBaseAssetCurve
```

Mapping of market address => proposed base asset curve.

### revenueTokens

```solidity
address[] revenueTokens
```

The list of revenue tokens

### revenueTokenIndex

```solidity
mapping(address => uint256) revenueTokenIndex
```

The mapping of revenue token => index

### proposedCurator

```solidity
address proposedCurator
```

The address of the proposed curator

### curatorProposalExpiry

```solidity
uint256 curatorProposalExpiry
```

The timestamp when the curator proposal expires

### curatorProposalDuration

```solidity
uint256 curatorProposalDuration
```

The duration of curator proposals in seconds

### proposalDuration

```solidity
uint256 proposalDuration
```

The duration of market proposals in seconds

### configControllerFactory

```solidity
address configControllerFactory
```

The address of the ConfigControllerFactory contract

### _marketProposals

```solidity
mapping(address => struct IConfigController.MarketConfigProposal) _marketProposals
```

Mapping of market => active market configuration proposal

### _marketTransferProposals

```solidity
mapping(address => struct IConfigController.MarketTransferProposal) _marketTransferProposals
```

Mapping of market => active market transfer proposal

### onlyOwner

```solidity
modifier onlyOwner()
```

Modifier to restrict access to owner only

### onlyOwnerOrCurator

```solidity
modifier onlyOwnerOrCurator()
```

Modifier to restrict access to owner or curator

### onlyGuardian

```solidity
modifier onlyGuardian()
```

Modifier to restrict access to guardian only

### proposalExists

```solidity
modifier proposalExists(address market)
```

Modifier to check if proposal exists and is active

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address _owner, address _curator, address _guardian, address _sandboxController, address _marketFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration, address _configControllerFactory) public
```

Initializes the ConfigController contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner |
| _curator | address |  |
| _guardian | address | The address of the protocol guardian |
| _sandboxController | address | The address of the SandboxController contract |
| _marketFactory | address | The address of the MarketFactory contract |
| _curatorFee | uint256 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint256 | Duration of curator proposals in seconds |
| _proposalDuration | uint256 | Duration of market proposals in seconds |
| _configControllerFactory | address |  |

### baseAssetsCurvesProposals

```solidity
function baseAssetsCurvesProposals(address market) external view returns (struct IConfigController.MarketBaseTokenCurveProposal)
```

Returns the proposed base token curve for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.MarketBaseTokenCurveProposal | The proposed base token curve |

### proposeUpdateBaseTokenCurve

```solidity
function proposeUpdateBaseTokenCurve(address market, uint256 curveId) external
```

Proposes a new base token curve for a market

_Only callable by owner or curator_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |
| curveId | uint256 | The index of the new base token curve |

### executeBaseTokenCurveProposal

```solidity
function executeBaseTokenCurveProposal(address market) external
```

Executes the base token curve proposal for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### cancelBaseTokenCurveProposal

```solidity
function cancelBaseTokenCurveProposal(address market) external
```

Cancels the base token curve proposal for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### marketProposals

```solidity
function marketProposals(address market) external view returns (struct IConfigController.MarketConfigProposal)
```

Returns the market configuration proposal for a given market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.MarketConfigProposal | The market configuration proposal |

### marketTransferProposals

```solidity
function marketTransferProposals(address market) external view returns (struct IConfigController.MarketTransferProposal)
```

Returns the market transfer proposal for a given market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.MarketTransferProposal | The market transfer proposal |

### setCuratorFee

```solidity
function setCuratorFee(uint256 _curatorFee) external
```

Sets a new curator fee

_Only callable by the owner. Emits a CuratorFeeUpdated event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curatorFee | uint256 | New curator fee in basis points (1% = 100). Must not exceed 10000 (100%) |

### revenueTokensLength

```solidity
function revenueTokensLength() external view returns (uint256)
```

Returns the number of revenue tokens

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of revenue tokens |

### accumulateRevenue

```solidity
function accumulateRevenue(address token, uint256 amount) external
```

Accumulates revenue in the contract

_Anyone can call this function to add revenue_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to accumulate |
| amount | uint256 | The amount of tokens to accumulate |

### claimRevenue

```solidity
function claimRevenue(address token) external
```

Claims accumulated revenue for the caller

_Can be called by anyone to claim their share_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to claim |

### claimAllRevenue

```solidity
function claimAllRevenue() external
```

Claims accumulated revenue for all tokens for the caller

_Can be called by anyone to claim their share of all revenue tokens_

### removeClaimRevenueToken

```solidity
function removeClaimRevenueToken(address token) external
```

Removes a revenue token from the list of revenue tokens

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to remove |

### getUnclaimedRevenue

```solidity
function getUnclaimedRevenue(address token, address account) external view returns (uint256)
```

Returns the unclaimed revenue balance for a specific token and address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address |
| account | address | The address to check balance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unclaimed balance |

### createMarket

```solidity
function createMarket(struct IConfigController.MarketConfig _marketConfig) external returns (address)
```

Creates a new market with the specified configuration

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _marketConfig | struct IConfigController.MarketConfig | The configuration parameters for the new market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created market |

### withdraw

```solidity
function withdraw(address market, uint256 amount) external
```

Withdraws base tokens from the market

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |
| amount | uint256 | The amount of base tokens to withdraw |

### grantOwnership

```solidity
function grantOwnership(address _newOwner) external
```

Transfers ownership of the protocol to a new address

_Only callable by the current owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newOwner | address | The address of the new owner |

### proposeCurator

```solidity
function proposeCurator(address _proposedCurator) public
```

Proposes a new curator

_Only callable by the owner. Emits a CuratorProposed event_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposedCurator | address | The address of the proposed curator |

### acceptCuratorRole

```solidity
function acceptCuratorRole() external
```

Accepts the curator role proposal

_Only callable by the proposed curator. Emits a CuratorAccepted event_

### cancelCuratorProposal

```solidity
function cancelCuratorProposal() external
```

Cancels the curator role proposal

_Only callable by the owner. Emits a CuratorProposalCancelled event_

### removeCurator

```solidity
function removeCurator() external
```

Removes the current curator

_Only callable by the owner_

### setGuardian

```solidity
function setGuardian(address _newGuardian) external
```

Sets a new guardian address

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newGuardian | address | The address of the new guardian |

### proposeMarketCollateralTokens

```solidity
function proposeMarketCollateralTokens(address market, struct IConfigController.CollateralTokenConfig[] _collateralTokens) external
```

Proposes new collateral tokens configuration for a market

_Only callable by owner or curator_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |
| _collateralTokens | struct IConfigController.CollateralTokenConfig[] | The new collateral tokens configuration |

### cancelMarketConfigProposal

```solidity
function cancelMarketConfigProposal(address market) external
```

Cancels an active proposal

_Can be called by owner, guardian, or curator (only their own proposals)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### executeMarketConfigProposal

```solidity
function executeMarketConfigProposal(address market) external
```

Executes an active proposal

_Can be called by anyone after proposal period_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### setProposalDurations

```solidity
function setProposalDurations(uint256 _curatorProposalDuration, uint256 _proposalDuration) external
```

Sets the duration for curator and market configuration proposals

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curatorProposalDuration | uint256 | New duration for curator proposals in seconds |
| _proposalDuration | uint256 | New duration for market configuration proposals in seconds |

### proposeMarketTransfer

```solidity
function proposeMarketTransfer(address market, address newController) external
```

Proposes to transfer a market to a new controller

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market to transfer |
| newController | address | The address of the new controller |

### cancelMarketTransferProposal

```solidity
function cancelMarketTransferProposal(address market) external
```

Cancels an active market transfer proposal

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### acceptMarketTransferProposal

```solidity
function acceptMarketTransferProposal(address market) external
```

Accepts a market transfer proposal

_Only callable by the new controller_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### addMarket

```solidity
function addMarket(address market) external
```

### _validateCollateralTokenConfig

```solidity
function _validateCollateralTokenConfig(struct IConfigController.CollateralTokenConfig collateralTokenConfig, struct ISandboxController.CollateralAssetConfiguration collateralAssetLimitations, address[] addedCollateralTokens) internal view
```

Validates market collateral token configuration

_Internal function to validate collateral token parameters_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateralTokenConfig | struct IConfigController.CollateralTokenConfig | The collateral token configuration to validate |
| collateralAssetLimitations | struct ISandboxController.CollateralAssetConfiguration | The limitations from sandbox controller |
| addedCollateralTokens | address[] | Array of already added collateral tokens |

### _isMarketOwned

```solidity
function _isMarketOwned(address market) internal view returns (bool)
```

Internal function to check if a market is owned by this controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the market is owned by this controller |

### _removeMarket

```solidity
function _removeMarket(address market) internal
```

Internal function to remove a market from the controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market to remove |

## ConfigControllerFactory

_Factory contract for creating new ConfigController instances with unique configurations_

### implementation

```solidity
address implementation
```

Returns the implementation address used for cloning

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### controllerIds

```solidity
mapping(address => uint256) controllerIds
```

Returns the controller ID for a given config controller address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### controllerAddresses

```solidity
address[] controllerAddresses
```

Returns the controller address at a given index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### lastController

```solidity
uint256 lastController
```

Returns the last controller ID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### constructor

```solidity
constructor(address _configControllerImplementation) public
```

### create

```solidity
function create(address owner_, address _curator, address guardian_, address _sandboxController, address _marketFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration) external returns (address)
```

Creates a new ConfigController instance with unique configuration

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner_ | address | The address of the protocol owner |
| _curator | address |  |
| guardian_ | address | The address of the protocol guardian |
| _sandboxController | address | The address of the SandboxController contract |
| _marketFactory | address | The address of the MarketFactory contract |
| _curatorFee | uint256 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint256 | Duration of curator proposals in seconds |
| _proposalDuration | uint256 | Duration of market proposals in seconds |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created ConfigController |

### getController

```solidity
function getController(uint256 _controllerId) external view returns (address)
```

Gets a ConfigController by its index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controllerId | uint256 | The index of the controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the ConfigController |

### isController

```solidity
function isController(address _controller) external view returns (bool)
```

Checks if an address is a valid controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controller | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the address is a valid controller |

## SandboxComet

An efficient monolithic money market protocol

### configController

```solidity
address configController
```

Config Controller address

### sandboxController

```solidity
address sandboxController
```

Sandbox Controller address

### extension

```solidity
address extension
```

The address of the extension contract

### baseToken

```solidity
address baseToken
```

The address of the base token contract

### baseTokenPriceFeed

```solidity
address baseTokenPriceFeed
```

The address of the price feed for the base token

### supplyKink

```solidity
uint256 supplyKink
```

The point in the supply rates separating the low interest rate slope and the high interest rate slope (factor)

_uint64_

### supplyPerSecondInterestRateSlopeLow

```solidity
uint256 supplyPerSecondInterestRateSlopeLow
```

Per second supply interest rate slope applied when utilization is below kink (factor)

_uint64_

### supplyPerSecondInterestRateSlopeHigh

```solidity
uint256 supplyPerSecondInterestRateSlopeHigh
```

Per secollateralTokenscond supply interest rate slope applied when utilization is above kink (factor)

_uint64_

### supplyPerSecondInterestRateBase

```solidity
uint256 supplyPerSecondInterestRateBase
```

Per second supply base interest rate (factor)

_uint64_

### borrowKink

```solidity
uint256 borrowKink
```

The point in the borrow rate separating the low interest rate slope and the high interest rate slope (factor)

_uint64_

### borrowPerSecondInterestRateSlopeLow

```solidity
uint256 borrowPerSecondInterestRateSlopeLow
```

Per second borrow interest rate slope applied when utilization is below kink (factor)

_uint64_

### borrowPerSecondInterestRateSlopeHigh

```solidity
uint256 borrowPerSecondInterestRateSlopeHigh
```

Per second borrow interest rate slope applied when utilization is above kink (factor)

_uint64_

### borrowPerSecondInterestRateBase

```solidity
uint256 borrowPerSecondInterestRateBase
```

Per second borrow base interest rate (factor)

_uint64_

### storeFrontPriceFactor

```solidity
uint256 storeFrontPriceFactor
```

The fraction of the liquidation penalty that goes to buyers of collateral instead of the protocol

_uint64_

### baseScale

```solidity
uint256 baseScale
```

The scale for base token (must be less than 18 decimals)

_uint64_

### trackingIndexScale

```solidity
uint256 trackingIndexScale
```

The scale for reward tracking

_uint64_

### baseTrackingSupplySpeed

```solidity
uint256 baseTrackingSupplySpeed
```

The speed at which supply rewards are tracked (in trackingIndexScale)

_uint64_

### baseTrackingBorrowSpeed

```solidity
uint256 baseTrackingBorrowSpeed
```

The speed at which borrow rewards are tracked (in trackingIndexScale)

_uint64_

### daoBaseTrackingSupplySpeed

```solidity
uint256 daoBaseTrackingSupplySpeed
```

The speed at which supply rewards are tracked (in trackingIndexScale)

_uint64_

### daoBaseTrackingBorrowSpeed

```solidity
uint256 daoBaseTrackingBorrowSpeed
```

The speed at which borrow rewards are tracked (in trackingIndexScale)

_uint64_

### baseMinForRewards

```solidity
uint256 baseMinForRewards
```

The minimum amount of base principal wei for rewards to accrue

_This must be large enough so as to prevent division by base wei from overflowing the 64 bit indices
uint104_

### baseBorrowMin

```solidity
uint256 baseBorrowMin
```

The minimum base amount required to initiate a borrow

### targetPercent

```solidity
uint256 targetPercent
```

The minimum base token reserves which must be held before collateral is hodled

### seedReserves

```solidity
uint256 seedReserves
```

Seed reserves

### unlockTimestamp

```solidity
uint256 unlockTimestamp
```

### decimals

```solidity
uint8 decimals
```

The number of decimals for wrapped base token

### numAssets

```solidity
uint8 numAssets
```

The number of assets this contract actually supports

### accrualDescaleFactor

```solidity
uint256 accrualDescaleFactor
```

Factor to divide by when accruing rewards in order to preserve 6 decimals (i.e. baseScale / 1e6)

### collateralAssetIndex

```solidity
mapping(address => uint8) collateralAssetIndex
```

### collateralAssetAddress

```solidity
mapping(uint8 => address) collateralAssetAddress
```

### collateralAssets

```solidity
struct IConfigController.CollateralTokenConfig[] collateralAssets
```

### Configuration

```solidity
struct Configuration {
  address configController;
  address baseToken;
  address baseTokenPriceFeed;
  address extensionDelegate;
  uint64 supplyKink;
  uint64 supplyPerYearInterestRateSlopeLow;
  uint64 supplyPerYearInterestRateSlopeHigh;
  uint64 supplyPerYearInterestRateBase;
  uint64 borrowKink;
  uint64 borrowPerYearInterestRateSlopeLow;
  uint64 borrowPerYearInterestRateSlopeHigh;
  uint64 borrowPerYearInterestRateBase;
  uint64 storeFrontPriceFactor;
  uint64 trackingIndexScale;
  uint64 baseTrackingSupplySpeed;
  uint64 baseTrackingBorrowSpeed;
  uint104 baseMinForRewards;
  uint104 baseBorrowMin;
  uint104 targetPercent;
  uint104 seedReserves;
  uint104 unlockTimestamp;
  struct IConfigController.CollateralTokenConfig[] assetConfigs;
}
```

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(struct IConfigController.MarketConfig market, struct ISandboxController.SandboxControllerConfiguration config, address configController_, address sandboxController_, address ext, uint256 baseBorrowMin_) external
```

replaces your old constructor

### transferOwnership

```solidity
function transferOwnership(address _newConfigController) external
```

### setCollateralTokens

```solidity
function setCollateralTokens(struct IConfigController.CollateralTokenConfig[] _collateralTokens) external
```

### nonReentrant

```solidity
modifier nonReentrant()
```

_Prevents marked functions from being reentered
Note: this restrict contracts from calling comet functions in their hooks.
Doing so will cause the transaction to revert._

### onlyConfigController

```solidity
modifier onlyConfigController()
```

### nonReentrantBefore

```solidity
function nonReentrantBefore() internal
```

_Checks that the reentrancy flag is not set and then sets the flag_

### nonReentrantAfter

```solidity
function nonReentrantAfter() internal
```

_Unsets the reentrancy flag_

_Can be used from constructor or proxy_

### getAssetInfo

```solidity
function getAssetInfo(uint8 i) public view returns (struct IConfigController.CollateralTokenConfig)
```

Get the i-th asset info, according to the order they were passed in originally

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| i | uint8 | The index of the asset info to get |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.CollateralTokenConfig | The asset info object |

### getAssetInfoByAddress

```solidity
function getAssetInfoByAddress(address asset) public view returns (struct IConfigController.CollateralTokenConfig, uint8 index)
```

_Determine index of asset that matches given address_

### getNowInternal

```solidity
function getNowInternal() internal view virtual returns (uint40)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | The current timestamp |

### accruedInterestIndices

```solidity
function accruedInterestIndices(uint256 timeElapsed) internal view returns (uint64, uint64)
```

_Calculate accrued interest indices for base token supply and borrows_

### lastReserveBalance

```solidity
uint256 lastReserveBalance
```

### _marketState

```solidity
function _marketState(uint256 reserves) internal view returns (enum ISandboxController.MarketState)
```

### _distributeReserves

```solidity
function _distributeReserves() internal
```

### accrueInternal

```solidity
function accrueInternal() internal
```

### accrueAccount

```solidity
function accrueAccount(address account) external
```

Accrue interest and rewards for an account

### getSupplyRate

```solidity
function getSupplyRate(uint256 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint256 | The utilization to check the supply rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second supply rate at `utilization` |

### getBorrowRate

```solidity
function getBorrowRate(uint256 utilization) public view returns (uint64)
```

_Note: Does not accrue interest first_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| utilization | uint256 | The utilization to check the borrow rate for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The per second borrow rate at `utilization` |

### getUtilization

```solidity
function getUtilization() public view returns (uint256)
```

_Note: Does not accrue interest first_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The utilization rate of the base asset |

### getPrice

```solidity
function getPrice(address priceFeed) public view returns (uint256)
```

Get the current price from a feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | The address of a price feed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The price, scaled by `PRICE_SCALE` |

### getCollateralReserves

```solidity
function getCollateralReserves(address asset) public view returns (uint256)
```

Gets the total balance of protocol collateral reserves for an asset

_Note: Reverts if collateral reserves are somehow negative, which should not be possible_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The collateral asset |

### getReserves

```solidity
function getReserves() public view returns (int256)
```

Gets the total amount of protocol reserves of the base asset

### isBorrowCollateralized

```solidity
function isBorrowCollateralized(address account) public view returns (bool)
```

Check whether an account has enough collateral to borrow

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the account is minimally collateralized enough to borrow |

### isLiquidatable

```solidity
function isLiquidatable(address account) public view returns (bool)
```

Check whether an account has enough collateral to not be liquidated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the account is minimally collateralized enough to not be liquidated |

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseTrackingSupplySpeed_ | uint64 | The new base tracking supply speed |
| baseTrackingBorrowSpeed_ | uint64 | The new base tracking borrow speed |
| _dao | bool | Whether or not set dao speeds |

### repayAndSupplyAmount

```solidity
function repayAndSupplyAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104)
```

_The change in principal broken into repay and supply amounts_

### withdrawAndBorrowAmount

```solidity
function withdrawAndBorrowAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104)
```

_The change in principal broken into withdraw and borrow amounts_

### pause

```solidity
function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external
```

Pauses different actions within Comet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| supplyPaused | bool | Boolean for pausing supply actions |
| transferPaused | bool | Boolean for pausing transfer actions |
| withdrawPaused | bool | Boolean for pausing withdraw actions |
| absorbPaused | bool | Boolean for pausing absorb actions |
| buyPaused | bool | Boolean for pausing buy actions |

### isSupplyPaused

```solidity
function isSupplyPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not supply actions are paused |

### isTransferPaused

```solidity
function isTransferPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not transfer actions are paused |

### isWithdrawPaused

```solidity
function isWithdrawPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not withdraw actions are paused |

### isAbsorbPaused

```solidity
function isAbsorbPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not absorb actions are paused |

### isBuyPaused

```solidity
function isBuyPaused() public view returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not buy actions are paused |

### mulFactor

```solidity
function mulFactor(uint256 n, uint256 factor) internal pure returns (uint256)
```

_Multiply a number by a factor_

### divBaseWei

```solidity
function divBaseWei(uint256 n, uint256 baseWei) internal view returns (uint256)
```

_Divide a number by an amount of base_

### mulPrice

```solidity
function mulPrice(uint256 n, uint256 price, uint64 fromScale) internal pure returns (uint256)
```

_Multiply a `fromScale` quantity by a price, returning a common price quantity_

### signedMulPrice

```solidity
function signedMulPrice(int256 n, uint256 price, uint64 fromScale) internal pure returns (int256)
```

_Multiply a signed `fromScale` quantity by a price, returning a common price quantity_

### divPrice

```solidity
function divPrice(uint256 n, uint256 price, uint64 toScale) internal pure returns (uint256)
```

_Divide a common price quantity by a price, returning a `toScale` quantity_

### isInAsset

```solidity
function isInAsset(uint16 assetsIn, uint8 assetOffset, uint8 _reserved) internal pure returns (bool)
```

_Whether user has a non-zero balance of an asset, given assetsIn flags
_reserved is used to check bits 16-23 of assetsIn_

### updateAssetsIn

```solidity
function updateAssetsIn(address account, uint8 index, uint128 initialUserBalance, uint128 finalUserBalance) internal
```

_Update assetsIn bit vector if user has entered or exited an asset_

### updateBasePrincipal

```solidity
function updateBasePrincipal(address account, struct CometStorage.UserBasic basic, int104 principalNew) internal
```

_Write updated principal to store and tracking participation_

### doTransferIn

```solidity
function doTransferIn(address asset, address from, uint256 amount) internal returns (uint256)
```

_Safe ERC20 transfer in and returns the final amount transferred (taking into account any fees)
Note: Safely handles non-standard ERC-20 tokens that do not return a value. See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

### doTransferOut

```solidity
function doTransferOut(address asset, address to, uint256 amount) internal
```

_Safe ERC20 transfer out
Note: Safely handles non-standard ERC-20 tokens that do not return a value. See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

### supply

```solidity
function supply(address asset, uint256 amount) external
```

Supply an amount of asset to the protocol

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### supplyTo

```solidity
function supplyTo(address dst, address asset, uint256 amount) external
```

Supply an amount of asset to dst

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dst | address | The address which will hold the balance |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### supplyFrom

```solidity
function supplyFrom(address from, address dst, address asset, uint256 amount) external
```

Supply an amount of asset from `from` to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The supplier address |
| dst | address | The address which will hold the balance |
| asset | address | The asset to supply |
| amount | uint256 | The quantity to supply |

### supplyInternal

```solidity
function supplyInternal(address operator, address from, address dst, address asset, uint256 amount) internal
```

_Supply either collateral or base asset, depending on the asset, if operator is allowed
Note: Specifying an `amount` of uint256.max will repay all of `dst`'s accrued base borrow balance_

### supplyBase

```solidity
function supplyBase(address from, address dst, uint256 amount) internal
```

_Supply an amount of base asset from `from` to dst_

### supplyCollateral

```solidity
function supplyCollateral(address from, address dst, address asset, uint128 amount) internal
```

_Supply an amount of collateral asset from `from` to dst_

### transfer

```solidity
function transfer(address dst, uint256 amount) external returns (bool)
```

ERC20 transfer an amount of base token to dst

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dst | address | The recipient address |
| amount | uint256 | The quantity to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true |

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) external returns (bool)
```

ERC20 transfer an amount of base token from src to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| dst | address | The recipient address |
| amount | uint256 | The quantity to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true |

### transferAsset

```solidity
function transferAsset(address dst, address asset, uint256 amount) external
```

Transfer an amount of asset to dst

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dst | address | The recipient address |
| asset | address | The asset to transfer |
| amount | uint256 | The quantity to transfer |

### transferAssetFrom

```solidity
function transferAssetFrom(address src, address dst, address asset, uint256 amount) external
```

Transfer an amount of asset from src to dst, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| dst | address | The recipient address |
| asset | address | The asset to transfer |
| amount | uint256 | The quantity to transfer |

### transferInternal

```solidity
function transferInternal(address operator, address src, address dst, address asset, uint256 amount) internal
```

_Transfer either collateral or base asset, depending on the asset, if operator is allowed
Note: Specifying an `amount` of uint256.max will transfer all of `src`'s accrued base balance_

### transferBase

```solidity
function transferBase(address src, address dst, uint256 amount) internal
```

_Transfer an amount of base asset from src to dst, borrowing if possible/necessary_

### transferCollateral

```solidity
function transferCollateral(address src, address dst, address asset, uint128 amount) internal
```

_Transfer an amount of collateral asset from src to dst_

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external
```

Withdraw an amount of asset from the protocol

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawTo

```solidity
function withdrawTo(address to, address asset, uint256 amount) external
```

Withdraw an amount of asset to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient address |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawFrom

```solidity
function withdrawFrom(address src, address to, address asset, uint256 amount) external
```

Withdraw an amount of asset from src to `to`, if allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| src | address | The sender address |
| to | address | The recipient address |
| asset | address | The asset to withdraw |
| amount | uint256 | The quantity to withdraw |

### withdrawInternal

```solidity
function withdrawInternal(address operator, address src, address to, address asset, uint256 amount) internal
```

_Withdraw either collateral or base asset, depending on the asset, if operator is allowed
Note: Specifying an `amount` of uint256.max will withdraw all of `src`'s accrued base balance_

### withdrawBase

```solidity
function withdrawBase(address src, address to, uint256 amount) internal
```

_Withdraw an amount of base asset from src to `to`, borrowing if possible/necessary_

### withdrawCollateral

```solidity
function withdrawCollateral(address src, address to, address asset, uint128 amount) internal
```

_Withdraw an amount of collateral asset from src to `to`_

### absorb

```solidity
function absorb(address absorber, address[] accounts) external
```

Absorb a list of underwater accounts onto the protocol balance sheet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| absorber | address | The recipient of the incentive paid to the caller of absorb |
| accounts | address[] | The list of underwater accounts to absorb |

### absorbInternal

```solidity
function absorbInternal(address absorber, address account) internal
```

_Transfer user's collateral and debt to the protocol itself._

### buyCollateral

```solidity
function buyCollateral(address asset, uint256 minAmount, uint256 baseAmount, address recipient) external
```

Buy collateral from the protocol using base tokens, increasing protocol reserves
       A minimum collateral amount should be specified to indicate the maximum slippage acceptable for the buyer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The asset to buy |
| minAmount | uint256 | The minimum amount of collateral tokens that should be received by the buyer |
| baseAmount | uint256 | The amount of base tokens used to buy the collateral |
| recipient | address | The recipient address |

### quoteCollateral

```solidity
function quoteCollateral(address asset, uint256 baseAmount) public view returns (uint256)
```

Gets the quote for a collateral asset in exchange for an amount of base asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The collateral asset to get the quote for |
| baseAmount | uint256 | The amount of the base asset to get the quote for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The quote in terms of the collateral asset |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Get the total number of tokens in circulation

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The supply of tokens |

### totalBorrow

```solidity
function totalBorrow() public view returns (uint256)
```

Get the total amount of debt

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of debt |

### targetReserves

```solidity
function targetReserves() public view returns (uint256)
```

Get the target reserves of the protocol

_Note: uses updated interest indices to calculate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The target reserves |

### balanceOf

```solidity
function balanceOf(address account) public view returns (uint256)
```

Query the current positive base balance of an account or zero

_Note: uses updated interest indices to calculate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The present day base balance magnitude of the account, if positive |

### borrowBalanceOf

```solidity
function borrowBalanceOf(address account) public view returns (uint256)
```

Query the current negative base balance of an account or zero

_Note: uses updated interest indices to calculate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account whose balance to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The present day base balance magnitude of the account, if negative |

### getConfiguration

```solidity
function getConfiguration() external view returns (struct SandboxComet.Configuration)
```

Returns the current configuration of the market

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SandboxComet.Configuration | Configuration struct containing all market parameters |

### receive

```solidity
receive() external payable
```

### fallback

```solidity
fallback() external payable
```

Fallback to calling the extension delegate for everything else

## SandboxCometFactory

### configController

```solidity
address configController
```

### sandboxController

```solidity
address sandboxController
```

### cometImplementation

```solidity
address cometImplementation
```

### markets

```solidity
address[] markets
```

### initialize

```solidity
function initialize(address _cometImplementation, address _sanboxController, address _configController) external
```

### createMarket

```solidity
function createMarket(struct IConfigController.MarketConfig _marketConfig, struct ISandboxController.SandboxControllerConfiguration config) external returns (address)
```

## SandboxController

_Manages base asset configurations and interest rate baseAssetCurves._

### protocolFactorBorrow

```solidity
uint256 protocolFactorBorrow
```

### reserveFactorBorrow

```solidity
uint256 reserveFactorBorrow
```

### protocolFactorLiquidation

```solidity
uint256 protocolFactorLiquidation
```

### reserveFactorLiquidation

```solidity
uint256 reserveFactorLiquidation
```

### maxCollateralAssets

```solidity
uint256 maxCollateralAssets
```

### baseAssetCount

```solidity
uint256 baseAssetCount
```

### collateralAssetCount

```solidity
uint256 collateralAssetCount
```

### treasury

```solidity
address treasury
```

### owner

```solidity
address owner
```

### dao

```solidity
address dao
```

### feeEnabled

```solidity
bool feeEnabled
```

### _controllerConfiguration

```solidity
struct ISandboxController.SandboxControllerConfiguration _controllerConfiguration
```

### baseAssetTokens

```solidity
address[] baseAssetTokens
```

### collateralAssetTokens

```solidity
address[] collateralAssetTokens
```

### isPriceFeedWhitelisted

```solidity
mapping(address => bool) isPriceFeedWhitelisted
```

### reserveCommission

```solidity
mapping(enum ISandboxController.MarketState => uint256) reserveCommission
```

### protocolCommission

```solidity
mapping(enum ISandboxController.MarketState => uint256) protocolCommission
```

### threshold

```solidity
mapping(enum ISandboxController.MarketState => uint256) threshold
```

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlyDao

```solidity
modifier onlyDao()
```

### onlyAuthorized

```solidity
modifier onlyAuthorized()
```

_Both owner and dao are considered "authorized."
     If you want them to have separate powers, use onlyOwner or onlyDao
     in the relevant functions. For shared powers, use onlyAuthorized._

### constructor

```solidity
constructor(address _owner, address _dao, bool _feeEnabled, uint256 _protocolFactorBorrow, uint256 _reserveFactorBorrow, uint256 _protocolFactorLiquidation, uint256 _reserveFactorLiquidation, uint256 _maxCollateralAssets, uint256 _targetPercent, uint256 _storeFrontPriceFactor, uint256 _minUpdateTime, uint256 _suggestedAmountOfSeedReserves, uint256 _suggestedLockTimeOfSeedReserves) public
```

_Set all global parameters (including owner and DAO) at deployment._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address of the protocol owner. |
| _dao | address | The address of the DAO (governance). |
| _feeEnabled | bool | Global fee flag for the entire protocol. |
| _protocolFactorBorrow | uint256 | Nonzero. Will combine with reserveFactorBorrow. |
| _reserveFactorBorrow | uint256 | Nonzero. Sum with _protocolFactorBorrow <= 1e18. |
| _protocolFactorLiquidation | uint256 | Nonzero. Sum with _reserveFactorLiquidation <= 1e18. |
| _reserveFactorLiquidation | uint256 | Nonzero. |
| _maxCollateralAssets | uint256 | > 0 |
| _targetPercent | uint256 | < 0.5 (50%) |
| _storeFrontPriceFactor | uint256 | < 1e18 |
| _minUpdateTime | uint256 | > 0 |
| _suggestedAmountOfSeedReserves | uint256 | > 0 |
| _suggestedLockTimeOfSeedReserves | uint256 | > 0 |

### setThresholds

```solidity
function setThresholds(uint256[3] thresholds) external
```

Sets the threshold factors for each market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| thresholds | uint256[3] | The new threshold factors, scaled by 1e18. |

### setReserveCommissions

```solidity
function setReserveCommissions(uint256[3] reserveCommissions) external
```

Sets the reserve commission factors for each market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| reserveCommissions | uint256[3] | The new reserve commission factors, scaled by 1e18. |

### setProtocolCommissions

```solidity
function setProtocolCommissions(uint256[3] protocolCommissions) external
```

Sets the protocol commission factors for each market state.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolCommissions | uint256[3] | The new protocol commission factors, scaled by 1e18. |

### setTreasury

```solidity
function setTreasury(address _treasury) external
```

Sets the treasury address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | The address of the treasury. |

### whitelistBaseAsset

```solidity
function whitelistBaseAsset(address token, address priceFeed, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow) external
```

Whitelists a new base asset with its price feed and curve configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |
| priceFeed | address | The associated price feed contract address. |
| baseAssetCurve | struct ISandboxController.BaseAssetCurve | The initial interest rate curve configuration. |
| minBorrow | uint256 | The minimal borrow amount for this asset. |

### whitelistCollateralAsset

```solidity
function whitelistCollateralAsset(address token, address priceFeed, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor) external
```

Whitelists a new collateral asset with its full configuration and price feed.

_Includes additional validation on the factors._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral token. |
| priceFeed | address | The price feed contract address for the collateral. |
| minBorrowCollateralFactor | uint64 | The minimum borrow collateral factor, scaled by 1e4. |
| maxBorrowCollateralFactor | uint64 | The maximum borrow collateral factor, scaled by 1e4, e.g., 8000 = 80%. |
| minLiquidateCollateralFactor | uint64 | The minimum collateral factor at which liquidation can start. |
| maxLiquidateCollateralFactor | uint64 | The maximum collateral factor for liquidation calculations. |
| minLiquidationFactor | uint64 | Minimum factor for liquidation penalty. |
| maxLiquidationFactor | uint64 | Maximum factor for liquidation penalty. |

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external
```

_Emitted when a base asset is whitelisted._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _config | struct ISandboxController.SandboxControllerConfiguration | Configuration of the sandbox controller. |

### setFeeEnabled

```solidity
function setFeeEnabled(bool _feeEnabled) external
```

Sets the global feeEnabled flag for the entire protocol.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeEnabled | bool | True to enable fees, false to disable. |

### addBaseAssetCurve

```solidity
function addBaseAssetCurve(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve) external
```

Adds a new interest rate curve for an existing base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset. |
| baseAssetCurve | struct ISandboxController.BaseAssetCurve | The new interest rate curve configuration. |

### changeBaseAssetCurve

```solidity
function changeBaseAssetCurve(address token, uint256 curveIndex, struct ISandboxController.BaseAssetCurve newCurve) external
```

Updates an existing interest rate curve for a base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset. |
| curveIndex | uint256 | The index of the curve to update. |
| newCurve | struct ISandboxController.BaseAssetCurve | The updated interest rate curve. |

### transferOwner

```solidity
function transferOwner(address newOwner) external
```

Transfers the owner privileges to a new address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOwner | address | The address of the new owner. |

### transferDao

```solidity
function transferDao(address newDao) external
```

Transfers the DAO privileges to a new address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newDao | address | The address of the new DAO. |

### isBaseTokenWhitelisted

```solidity
function isBaseTokenWhitelisted(address token) public view returns (bool)
```

Checks if a token is whitelisted as a base asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the token is whitelisted, otherwise false. |

### isCollateralTokenWhitelisted

```solidity
function isCollateralTokenWhitelisted(address token) public view returns (bool)
```

Checks if a token is whitelisted as a collateral asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the token is whitelisted, otherwise false. |

### isCurveConfigurationValid

```solidity
function isCurveConfigurationValid(struct ISandboxController.BaseAssetCurve curve) public pure returns (bool)
```

Validates an interest rate curve configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| curve | struct ISandboxController.BaseAssetCurve | The interest rate curve configuration to validate. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if valid, false otherwise. |

### baseAssets

```solidity
function baseAssets(address token) external view returns (struct ISandboxController.BaseAssetConfiguration)
```

Returns base asset configuration for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token.  @return The base asset configuration. |

### collateralAssets

```solidity
function collateralAssets(address token) external view returns (struct ISandboxController.CollateralAssetConfiguration)
```

Returns collateral asset configuration for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the collateral asset token.  @return The collateral asset configuration. |

### curves

```solidity
function curves(address token) external view returns (struct ISandboxController.BaseAssetCurve[])
```

Returns base asset baseAssetCurves for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ISandboxController.BaseAssetCurve[] | The base asset baseAssetCurves. |

### controllerConfiguration

```solidity
function controllerConfiguration() external view returns (struct ISandboxController.SandboxControllerConfiguration)
```

### borrowMin

```solidity
function borrowMin(address token) external view returns (uint256)
```

Returns the minimum borrow amount for a given base asset token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the base asset token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The minimum borrow amount. |

### config

```solidity
function config() external view returns (struct ISandboxController.SandboxControllerConfiguration)
```

Returns the configuration of the sandbox controller.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ISandboxController.SandboxControllerConfiguration | The sandbox controller configuration. |

## WETH9

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

### Approval

```solidity
event Approval(address src, address guy, uint256 wad)
```

### Transfer

```solidity
event Transfer(address src, address dst, uint256 wad)
```

### Deposit

```solidity
event Deposit(address dst, uint256 wad)
```

### Withdrawal

```solidity
event Withdrawal(address src, uint256 wad)
```

### balanceOf

```solidity
mapping(address => uint256) balanceOf
```

### allowance

```solidity
mapping(address => mapping(address => uint256)) allowance
```

### receive

```solidity
receive() external payable
```

### deposit

```solidity
function deposit() public payable
```

### withdraw

```solidity
function withdraw(uint256 wad) public
```

### totalSupply

```solidity
function totalSupply() public view returns (uint256)
```

### approve

```solidity
function approve(address guy, uint256 wad) public returns (bool)
```

### transfer

```solidity
function transfer(address dst, uint256 wad) public returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 wad) public returns (bool)
```

## IClaimable

_Interface for claiming rewards from the CometRewards contract_

### claim

```solidity
function claim(address comet, address src, bool shouldAccrue) external
```

### claimTo

```solidity
function claimTo(address comet, address src, address to, bool shouldAccrue) external
```

## BaseBulker

Executes multiple Comet-related actions in a single transaction

_Note: Only intended to be used on EVM chains that have a native token and wrapped native token that implements the IWETH interface_

### AdminTransferred

```solidity
event AdminTransferred(address oldAdmin, address newAdmin)
```

Custom events *

### admin

```solidity
address admin
```

The admin of the Bulker contract

### wrappedNativeToken

```solidity
address payable wrappedNativeToken
```

The address of the wrapped representation of the chain's native asset

### ACTION_SUPPLY_ASSET

```solidity
bytes32 ACTION_SUPPLY_ASSET
```

The action for supplying an asset to Comet

### ACTION_SUPPLY_NATIVE_TOKEN

```solidity
bytes32 ACTION_SUPPLY_NATIVE_TOKEN
```

The action for supplying a native asset (e.g. ETH on Ethereum mainnet) to Comet

### ACTION_TRANSFER_ASSET

```solidity
bytes32 ACTION_TRANSFER_ASSET
```

The action for transferring an asset within Comet

### ACTION_WITHDRAW_ASSET

```solidity
bytes32 ACTION_WITHDRAW_ASSET
```

The action for withdrawing an asset from Comet

### ACTION_WITHDRAW_NATIVE_TOKEN

```solidity
bytes32 ACTION_WITHDRAW_NATIVE_TOKEN
```

The action for withdrawing a native asset from Comet

### ACTION_CLAIM_REWARD

```solidity
bytes32 ACTION_CLAIM_REWARD
```

The action for claiming rewards from the Comet rewards contract

### InvalidAddress

```solidity
error InvalidAddress()
```

Custom errors *

### InvalidArgument

```solidity
error InvalidArgument()
```

### FailedToSendNativeToken

```solidity
error FailedToSendNativeToken()
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

### UnhandledAction

```solidity
error UnhandledAction()
```

### constructor

```solidity
constructor(address admin_, address payable wrappedNativeToken_) public
```

Construct a new BaseBulker instance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin_ | address | The admin of the Bulker contract |
| wrappedNativeToken_ | address payable | The address of the wrapped representation of the chain's native asset |

### receive

```solidity
receive() external payable
```

Fallback for receiving native token. Needed for ACTION_WITHDRAW_NATIVE_TOKEN

### sweepToken

```solidity
function sweepToken(address recipient, address asset) external
```

A public function to sweep accidental ERC-20 transfers to this contract

_Note: Make sure to check that the asset being swept out is not malicious_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address that will receive the swept funds |
| asset | address | The address of the ERC-20 token to sweep |

### sweepNativeToken

```solidity
function sweepNativeToken(address recipient) external
```

A public function to sweep accidental native token transfers to this contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address that will receive the swept funds |

### transferAdmin

```solidity
function transferAdmin(address newAdmin) external
```

Transfers the admin rights to a new address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin | address | The address that will become the new admin |

### invoke

```solidity
function invoke(bytes32[] actions, bytes[] data) external payable
```

Executes a list of actions in order

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| actions | bytes32[] | The list of actions to execute in order |
| data | bytes[] | The list of calldata to use for each action |

### handleAction

```solidity
function handleAction(bytes32 action, bytes data) internal virtual
```

Handles any actions not handled by the BaseBulker implementation

_Note: Meant to be overridden by contracts that extend BaseBulker and want to support more actions_

### supplyTo

```solidity
function supplyTo(address comet, address to, address asset, uint256 amount) internal
```

Supplies an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### supplyNativeTokenTo

```solidity
function supplyNativeTokenTo(address comet, address to, uint256 amount) internal returns (uint256)
```

Wraps the native token and supplies wrapped native token to a user in Comet

_Note: Supports `amount` of `uint256.max` implies max only for base asset_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of the native token wrapped and supplied to Comet |

### transferTo

```solidity
function transferTo(address comet, address to, address asset, uint256 amount) internal
```

Transfers an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### withdrawTo

```solidity
function withdrawTo(address comet, address to, address asset, uint256 amount) internal
```

Withdraws an asset to a user in Comet

_Note: This contract must have permission to manage msg.sender's Comet account_

### withdrawNativeTokenTo

```solidity
function withdrawNativeTokenTo(address comet, address to, uint256 amount) internal
```

Withdraws wrapped native token from Comet, unwraps it to the native token, and transfers it to a user

_Note: This contract must have permission to manage msg.sender's Comet account
Note: Supports `amount` of `uint256.max` only for the base asset. Should revert for a collateral asset_

### claimReward

```solidity
function claimReward(address comet, address rewards, address src, bool shouldAccrue) internal
```

Claims rewards for a user

### doTransferIn

```solidity
function doTransferIn(address asset, address from, uint256 amount) internal
```

Similar to ERC-20 transfer, except it properly handles `transferFrom` from non-standard ERC-20 tokens

_Note: This does not check that the amount transferred in is actually equals to the amount specified (e.g. fee tokens will not revert)
Note: This wrapper safely handles non-standard ERC-20 tokens that do not return a value. See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The ERC-20 token to transfer in |
| from | address | The address to transfer from |
| amount | uint256 | The amount of the token to transfer |

### doTransferOut

```solidity
function doTransferOut(address asset, address to, uint256 amount) internal
```

Similar to ERC-20 transfer, except it properly handles `transfer` from non-standard ERC-20 tokens

_Note: This wrapper safely handles non-standard ERC-20 tokens that do not return a value. See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The ERC-20 token to transfer out |
| to | address | The recipient of the token transfer |
| amount | uint256 | The amount of the token to transfer |

## AggregatorInterface

### latestAnswer

```solidity
function latestAnswer() external view returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() external view returns (uint256)
```

### latestRound

```solidity
function latestRound() external view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256 roundId) external view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256 roundId) external view returns (uint256)
```

### AnswerUpdated

```solidity
event AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt)
```

### NewRound

```solidity
event NewRound(uint256 roundId, address startedBy, uint256 startedAt)
```

## AggregatorV2V3Interface

## AggregatorV3Interface

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IBalancerRateProvider

### getRate

```solidity
function getRate() external view returns (uint256)
```

## ICometExtension

An efficient monolithic money market protocol

### BadAmount

```solidity
error BadAmount()
```

### BadNonce

```solidity
error BadNonce()
```

### BadSignatory

```solidity
error BadSignatory()
```

### InvalidValueS

```solidity
error InvalidValueS()
```

### InvalidValueV

```solidity
error InvalidValueV()
```

### SignatureExpired

```solidity
error SignatureExpired()
```

### allow

```solidity
function allow(address manager, bool isAllowed) external virtual
```

### allowBySig

```solidity
function allowBySig(address owner, address manager, bool isAllowed, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external virtual
```

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view virtual returns (uint128)
```

### baseTrackingAccrued

```solidity
function baseTrackingAccrued(address account) external view virtual returns (uint64)
```

### baseAccrualScale

```solidity
function baseAccrualScale() external view virtual returns (uint64)
```

### baseIndexScale

```solidity
function baseIndexScale() external view virtual returns (uint64)
```

### factorScale

```solidity
function factorScale() external view virtual returns (uint64)
```

### priceScale

```solidity
function priceScale() external view virtual returns (uint64)
```

### maxAssets

```solidity
function maxAssets() external view virtual returns (uint8)
```

### totalsBasic

```solidity
function totalsBasic() external view virtual returns (struct CometStorage.TotalsBasic)
```

### version

```solidity
function version() external view virtual returns (string)
```

### name

```solidity
function name() external view virtual returns (string)
```

===== ERC20 interfaces =====
Does not include the following functions/events, which are defined in `CometMainInterface` instead:
- function decimals() virtual external view returns (uint8)
- function totalSupply() virtual external view returns (uint256)
- function transfer(address dst, uint amount) virtual external returns (bool)
- function transferFrom(address src, address dst, uint amount) virtual external returns (bool)
- function balanceOf(address owner) virtual external view returns (uint256)
- event Transfer(address indexed from, address indexed to, uint256 amount)

### symbol

```solidity
function symbol() external view virtual returns (string)
```

### approve

```solidity
function approve(address spender, uint256 amount) external virtual returns (bool)
```

Approve `spender` to transfer up to `amount` from `src`

_This will overwrite the approval amount for `spender`
 and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| amount | uint256 | The number of tokens that are approved (-1 means infinite) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the approval succeeded |

### allowance

```solidity
function allowance(address owner, address spender) external view virtual returns (uint256)
```

Get the current allowance from `owner` for `spender`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address of the account which owns the tokens to be spent |
| spender | address | The address of the account which may transfer tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of tokens allowed to be spent (-1 means infinite) |

### Approval

```solidity
event Approval(address owner, address spender, uint256 amount)
```

## IComp

_Interface for interacting with COMP.
Note Not a comprehensive interface_

### delegate

```solidity
function delegate(address delegatee) external
```

### getCurrentVotes

```solidity
function getCurrentVotes(address account) external view returns (uint96)
```

## IConfigController

### MarketTransferProposal

Market transfer proposal

```solidity
struct MarketTransferProposal {
  address market;
  address newController;
  uint256 expiration;
}
```

### MarketConfigProposal

```solidity
struct MarketConfigProposal {
  address market;
  struct IConfigController.CollateralTokenConfig[] collateralTokens;
  uint256 revertTime;
  address proposer;
}
```

### MarketBaseTokenCurveProposal

```solidity
struct MarketBaseTokenCurveProposal {
  address market;
  uint256 curveId;
  uint256 revertTime;
  address proposer;
}
```

### MarketConfig

```solidity
struct MarketConfig {
  address baseToken;
  address priceFeed;
  struct IConfigController.CollateralTokenConfig[] collateralTokens;
  uint256 baseTokenCurveId;
}
```

### CollateralTokenConfig

```solidity
struct CollateralTokenConfig {
  address collateralToken;
  address priceFeed;
  uint64 borrowCollateralFactor;
  uint64 liquidateCollateralFactor;
  uint64 liquidationFactor;
  uint128 supplyCap;
}
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

### TokenNotRevenue

```solidity
error TokenNotRevenue()
```

### MarketAlreadyAdded

```solidity
error MarketAlreadyAdded()
```

### NonConfigController

```solidity
error NonConfigController()
```

### MarketNotOwned

```solidity
error MarketNotOwned()
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

### MarketBaseTokenCurveProposed

```solidity
event MarketBaseTokenCurveProposed(address market, address proposer, uint256 revertTime, uint256 curveId)
```

### MarketBaseTokenCurveProposalExecuted

```solidity
event MarketBaseTokenCurveProposalExecuted(address market, address executedBy)
```

### MarketBaseTokenCurveProposalCancelled

```solidity
event MarketBaseTokenCurveProposalCancelled(address market, address cancelledBy)
```

### MarketCreated

```solidity
event MarketCreated(address market, address baseToken, address priceFeed, uint256 marketId, uint256 baseTokenCurveId)
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

### MarketConfigProposed

```solidity
event MarketConfigProposed(address market, address proposer, uint256 revertTime)
```

Events for proposal system

### MarketConfigProposalCancelled

```solidity
event MarketConfigProposalCancelled(address market, address cancelledBy)
```

### MarketConfigProposalExecuted

```solidity
event MarketConfigProposalExecuted(address market, address executedBy)
```

### ProposalDurationsUpdated

```solidity
event ProposalDurationsUpdated(uint256 oldCuratorDuration, uint256 newCuratorDuration, uint256 oldProposalDuration, uint256 newProposalDuration)
```

### MarketTransferProposed

```solidity
event MarketTransferProposed(address market, address newController, uint256 expiration)
```

Events for market transfer proposal system

### MarketTransferProposalCancelled

```solidity
event MarketTransferProposalCancelled(address market, address cancelledBy)
```

### MarketTransferProposalAccepted

```solidity
event MarketTransferProposalAccepted(address market, address oldController, address newController)
```

### Withdrawn

```solidity
event Withdrawn(address baseToken, address sender, uint256 amount)
```

### ZERO_ADDRESS

```solidity
address ZERO_ADDRESS
```

### executeBaseTokenCurveProposal

```solidity
function executeBaseTokenCurveProposal(address market) external virtual
```

Executes the base token curve proposal for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### cancelBaseTokenCurveProposal

```solidity
function cancelBaseTokenCurveProposal(address market) external virtual
```

Cancels the base token curve proposal for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

### proposeUpdateBaseTokenCurve

```solidity
function proposeUpdateBaseTokenCurve(address market, uint256 curveId) external virtual
```

Proposes an update to the base token curve for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |
| curveId | uint256 | The id of the new base token curve |

### baseAssetsCurvesProposals

```solidity
function baseAssetsCurvesProposals(address market) external view virtual returns (struct IConfigController.MarketBaseTokenCurveProposal)
```

Returns the proposed base token curve for a market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.MarketBaseTokenCurveProposal | The proposed base token curve |

### marketBaseTokenCurveId

```solidity
function marketBaseTokenCurveId(address market) external view virtual returns (uint256)
```

Returns the base token curve id for a given market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The base token curve id |

### revenueTokens

```solidity
function revenueTokens(uint256) external view virtual returns (address)
```

Returns the address of a revenue token by its index

### revenueTokensLength

```solidity
function revenueTokensLength() external view virtual returns (uint256)
```

Returns the number of revenue tokens

### curatorFee

```solidity
function curatorFee() external view virtual returns (uint256)
```

Returns the current curator fee in basis points (1% = 100)

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The curator fee value |

### setCuratorFee

```solidity
function setCuratorFee(uint256 _curatorFee) external virtual
```

Sets a new curator fee

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _curatorFee | uint256 | New curator fee in basis points (1% = 100). Must not exceed 10000 (100%) |

### accumulateRevenue

```solidity
function accumulateRevenue(address token, uint256 amount) external virtual
```

Accumulates revenue in the contract

_Anyone can call this function to add revenue_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to accumulate |
| amount | uint256 | The amount of tokens to accumulate |

### claimRevenue

```solidity
function claimRevenue(address token) external virtual
```

Claims accumulated revenue for the caller

_Can be called by owner or curator to claim their share_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to claim |

### claimAllRevenue

```solidity
function claimAllRevenue() external virtual
```

Claims accumulated revenue for all tokens for the caller

_Can be called by anyone to claim their share of all revenue tokens_

### removeClaimRevenueToken

```solidity
function removeClaimRevenueToken(address token) external virtual
```

Removes a revenue token from the list of revenue tokens

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address to remove |

### getUnclaimedRevenue

```solidity
function getUnclaimedRevenue(address token, address account) external view virtual returns (uint256)
```

Returns the unclaimed revenue balance for a specific token and address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address |
| account | address | The address to check balance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The unclaimed balance |

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

### marketFactory

```solidity
function marketFactory() external view virtual returns (address)
```

### markets

```solidity
function markets(uint256) external view virtual returns (address)
```

### marketsLength

```solidity
function marketsLength() external view virtual returns (uint256)
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

### marketProposals

```solidity
function marketProposals(address market) external view virtual returns (struct IConfigController.MarketConfigProposal)
```

Returns the market configuration proposal for a given market

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IConfigController.MarketConfigProposal | The market configuration proposal |

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

### createMarket

```solidity
function createMarket(struct IConfigController.MarketConfig _marketConfig) external virtual returns (address)
```

Creates a new market with the specified configuration

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _marketConfig | struct IConfigController.MarketConfig | The configuration parameters for the new market |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created market |

### withdraw

```solidity
function withdraw(address market, uint256 amount) external virtual
```

Withdraws base tokens from the market

_Only callable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| market | address | The address of the market |
| amount | uint256 | The amount of base tokens to withdraw |

### initialize

```solidity
function initialize(address owner_, address _curator, address guardian_, address _sandboxController, address _marketFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration, address _configControllerFactory) external virtual
```

Initializes the ConfigController contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner_ | address | The address of the protocol owner |
| _curator | address |  |
| guardian_ | address | The address of the protocol guardian |
| _sandboxController | address | The address of the SandboxController contract |
| _marketFactory | address | The address of the MarketFactory contract |
| _curatorFee | uint256 | Initial curator fee in basis points (1% = 100) |
| _name | string | Name of the controller |
| _curatorProposalDuration | uint256 | Duration of curator proposals in seconds |
| _proposalDuration | uint256 | Duration of market proposals in seconds |
| _configControllerFactory | address | The address of the ConfigControllerFactory contract |

### configControllerFactory

```solidity
function configControllerFactory() external view virtual returns (address)
```

Returns the address of the ConfigControllerFactory

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the ConfigControllerFactory |

### addMarket

```solidity
function addMarket(address market) external virtual
```

## IConfigControllerFactory

Interface for the ConfigControllerFactory contract

_This interface defines the functions and events for creating and managing ConfigController instances_

### ConfigControllerCreated

```solidity
event ConfigControllerCreated(address controller, address owner, address guardian, address sandboxController, address marketFactory, uint256 curatorFee, string name, uint256 curatorProposalDuration, uint256 proposalDuration, uint256 controllerId)
```

Event emitted when a new ConfigController is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| controller | address | The address of the newly created controller |
| owner | address | The address of the controller owner |
| guardian | address | The address of the controller guardian |
| sandboxController | address | The address of the sandbox controller |
| marketFactory | address | The address of the market factory |
| curatorFee | uint256 | The curator fee in basis points |
| name | string | The name of the controller |
| curatorProposalDuration | uint256 | The duration of curator proposals in seconds |
| proposalDuration | uint256 | The duration of market proposals in seconds |
| controllerId | uint256 |  |

### implementation

```solidity
function implementation() external view virtual returns (address)
```

Returns the implementation address used for cloning

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the implementation contract |

### controllerIds

```solidity
function controllerIds(address configController) external view virtual returns (uint256)
```

Returns the controller ID for a given config controller address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| configController | address | The address of the config controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The ID of the controller |

### controllerAddresses

```solidity
function controllerAddresses(uint256 index) external view virtual returns (address)
```

Returns the controller address at a given index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the controller |

### lastController

```solidity
function lastController() external view virtual returns (uint256)
```

Returns the last controller ID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The ID of the last controller |

### create

```solidity
function create(address owner_, address _curator, address guardian_, address _sandboxController, address _marketFactory, uint256 _curatorFee, string _name, uint256 _curatorProposalDuration, uint256 _proposalDuration) external virtual returns (address)
```

Creates a new ConfigController with the specified parameters

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner_ | address | The address of the controller owner |
| _curator | address |  |
| guardian_ | address | The address of the controller guardian |
| _sandboxController | address | The address of the sandbox controller |
| _marketFactory | address | The address of the market factory |
| _curatorFee | uint256 | The curator fee in basis points |
| _name | string | The name of the controller |
| _curatorProposalDuration | uint256 | The duration of curator proposals in seconds |
| _proposalDuration | uint256 | The duration of market proposals in seconds |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created controller |

### getController

```solidity
function getController(uint256 _controllerId) external view virtual returns (address)
```

Gets a ConfigController by its index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controllerId | uint256 | The index of the controller |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the ConfigController |

### isController

```solidity
function isController(address _controller) external view virtual returns (bool)
```

Checks if an address is a valid controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _controller | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the address is a valid controller |

## IERC20NonStandard

_Version of ERC20 with no return values for `approve`, `transfer`, and `transferFrom`
 See https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca_

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

### approve

```solidity
function approve(address spender, uint256 amount) external
```

Approve `spender` to transfer up to `amount` from `src`

_This will overwrite the approval amount for `spender`
 and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | The address of the account which may transfer tokens |
| amount | uint256 | The number of tokens that are approved (-1 means infinite) |

### transfer

```solidity
function transfer(address to, uint256 value) external
```

Transfer `value` tokens from `msg.sender` to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address of the destination account |
| value | uint256 | The number of tokens to transfer |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 value) external
```

Transfer `value` tokens from `from` to `to`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address of the source account |
| to | address | The address of the destination account |
| value | uint256 | The number of tokens to transfer |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

Gets the balance of the specified address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address from which the balance will be retrieved |

## IGovernorBravo

_Interface for interacting with Governor bravo.
Note Not a comprehensive interface_

### ProposalState

```solidity
enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}
```

### Proposal

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  uint256 eta;
  uint256 startBlock;
  uint256 endBlock;
  uint256 forVotes;
  uint256 againstVotes;
  uint256 abstainVotes;
  bool canceled;
  bool executed;
}
```

### ProposalCreated

```solidity
event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
```

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 proposalId)
```

### ProposalQueued

```solidity
event ProposalQueued(uint256 proposalId, uint256 eta)
```

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 proposalId)
```

### MIN_VOTING_PERIOD

```solidity
function MIN_VOTING_PERIOD() external view returns (uint256)
```

### MIN_VOTING_DELAY

```solidity
function MIN_VOTING_DELAY() external view returns (uint256)
```

### MIN_PROPOSAL_THRESHOLD

```solidity
function MIN_PROPOSAL_THRESHOLD() external view returns (uint256)
```

### token

```solidity
function token() external view returns (address)
```

### proposalEta

```solidity
function proposalEta(uint256) external view returns (uint256)
```

### proposalCount

```solidity
function proposalCount() external view returns (uint256)
```

### proposals

```solidity
function proposals(uint256 proposalId) external view returns (struct IGovernorBravo.Proposal)
```

### votingDelay

```solidity
function votingDelay() external view returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() external view returns (uint256)
```

### state

```solidity
function state(uint256 proposalId) external view returns (enum IGovernorBravo.ProposalState)
```

### propose

```solidity
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256 proposalId)
```

### queue

```solidity
function queue(uint256 proposalId) external
```

### execute

```solidity
function execute(uint256 proposalId) external
```

### castVote

```solidity
function castVote(uint256 proposalId, uint8 support) external returns (uint256 balance)
```

### getActions

```solidity
function getActions(uint256 proposalId) external view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)
```

## ILRTOracle

### rsETHPrice

```solidity
function rsETHPrice() external view returns (uint256)
```

## IMarket

### BaseCurveParams

```solidity
struct BaseCurveParams {
  uint64 supplyKink;
  uint64 supplyPerYearInterestRateSlopeLow;
  uint64 supplyPerYearInterestRateSlopeHigh;
  uint64 supplyPerYearInterestRateBase;
  uint64 borrowKink;
  uint64 borrowPerYearInterestRateSlopeLow;
  uint64 borrowPerYearInterestRateSlopeHigh;
  uint64 borrowPerYearInterestRateBase;
}
```

### baseToken

```solidity
function baseToken() external view returns (address)
```

### priceFeed

```solidity
function priceFeed() external view returns (address)
```

### baseTokenCurveId

```solidity
function baseTokenCurveId() external view returns (uint256)
```

### collateralTokensCount

```solidity
function collateralTokensCount() external view returns (uint256)
```

### getBaseCurveParams

```solidity
function getBaseCurveParams() external view returns (struct IMarket.BaseCurveParams)
```

### setBaseCurveParams

```solidity
function setBaseCurveParams(uint256 _curveId) external
```

### transferOwnership

```solidity
function transferOwnership(address _newConfigController) external
```

### getCollateralTokenConfig

```solidity
function getCollateralTokenConfig(uint256 _collateralTokenId) external view returns (struct IConfigController.CollateralTokenConfig)
```

### getAllCollateralTokenConfigs

```solidity
function getAllCollateralTokenConfigs() external view returns (struct IConfigController.CollateralTokenConfig[])
```

### setCollateralTokens

```solidity
function setCollateralTokens(struct IConfigController.CollateralTokenConfig[] _collateralTokens) external
```

### setCollateralTokenConfig

```solidity
function setCollateralTokenConfig(uint256 _index, struct IConfigController.CollateralTokenConfig _config) external
```

### setCollateralTokenSupplyCap

```solidity
function setCollateralTokenSupplyCap(uint256 _index, uint128 _supplyCap) external
```

### setCollateralTokenBorrowCollateralFactor

```solidity
function setCollateralTokenBorrowCollateralFactor(uint256 _index, uint64 _borrowCF) external
```

### setCollateralTokenLiquidateCollateralFactor

```solidity
function setCollateralTokenLiquidateCollateralFactor(uint256 _index, uint64 _liquidateCF) external
```

### setCollateralTokenLiquidationFactor

```solidity
function setCollateralTokenLiquidationFactor(uint256 _index, uint64 _liquidationFactor) external
```

### initialize

```solidity
function initialize(struct IConfigController.MarketConfig _marketConfig, struct ISandboxController.SandboxControllerConfiguration config, address _configControllerAddress, address _sandboxControllerAddress, uint256 baseBorrowMin_) external
```

## IPriceFeed

_Interface for price feeds used by Comet
Note This is Chainlink's AggregatorV3Interface, but without the `getRoundData` function._

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IProxy

_Interface for interacting with a basic proxy.
Note Not a comprehensive interface_

### implementation

```solidity
function implementation() external view returns (address)
```

## IRateProvider

### getRate

```solidity
function getRate() external view returns (uint256)
```

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

### BadMinimum

```solidity
error BadMinimum()
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

### setCollateralTokens

```solidity
function setCollateralTokens(struct IConfigController.CollateralTokenConfig[] _collateralTokens) external virtual
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

### transferOwnership

```solidity
function transferOwnership(address _newConfigController) external virtual
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

### initialize

```solidity
function initialize(struct IConfigController.MarketConfig market, struct ISandboxController.SandboxControllerConfiguration config, address configController_, address sandboxController_, address ext_, uint256 baseBorrowMin_) external virtual
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

### configController

```solidity
function configController() external view virtual returns (address)
```

### sandboxController

```solidity
function sandboxController() external view virtual returns (address)
```

### baseToken

```solidity
function baseToken() external view virtual returns (address)
```

### baseTokenPriceFeed

```solidity
function baseTokenPriceFeed() external view virtual returns (address)
```

### extension

```solidity
function extension() external view virtual returns (address)
```

### supplyKink

```solidity
function supplyKink() external view virtual returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateSlopeLow

```solidity
function supplyPerSecondInterestRateSlopeLow() external view virtual returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateSlopeHigh

```solidity
function supplyPerSecondInterestRateSlopeHigh() external view virtual returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateBase

```solidity
function supplyPerSecondInterestRateBase() external view virtual returns (uint256)
```

_uint64_

### borrowKink

```solidity
function borrowKink() external view virtual returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateSlopeLow

```solidity
function borrowPerSecondInterestRateSlopeLow() external view virtual returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateSlopeHigh

```solidity
function borrowPerSecondInterestRateSlopeHigh() external view virtual returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateBase

```solidity
function borrowPerSecondInterestRateBase() external view virtual returns (uint256)
```

_uint64_

### storeFrontPriceFactor

```solidity
function storeFrontPriceFactor() external view virtual returns (uint256)
```

_uint64_

### baseScale

```solidity
function baseScale() external view virtual returns (uint256)
```

_uint64_

### trackingIndexScale

```solidity
function trackingIndexScale() external view virtual returns (uint256)
```

_uint64_

### baseTrackingSupplySpeed

```solidity
function baseTrackingSupplySpeed() external view virtual returns (uint256)
```

_uint64_

### baseTrackingBorrowSpeed

```solidity
function baseTrackingBorrowSpeed() external view virtual returns (uint256)
```

_uint64_

### daoBaseTrackingSupplySpeed

```solidity
function daoBaseTrackingSupplySpeed() external view virtual returns (uint256)
```

### daoBaseTrackingBorrowSpeed

```solidity
function daoBaseTrackingBorrowSpeed() external view virtual returns (uint256)
```

### baseMinForRewards

```solidity
function baseMinForRewards() external view virtual returns (uint256)
```

_uint104_

### baseBorrowMin

```solidity
function baseBorrowMin() external view virtual returns (uint256)
```

_uint104_

### targetReserves

```solidity
function targetReserves() external view virtual returns (uint256)
```

_uint104_

### targetPercent

```solidity
function targetPercent() external view virtual returns (uint256)
```

### seedReserves

```solidity
function seedReserves() external view virtual returns (uint256)
```

### unlockTimestamp

```solidity
function unlockTimestamp() external view virtual returns (uint256)
```

### numAssets

```solidity
function numAssets() external view virtual returns (uint8)
```

### decimals

```solidity
function decimals() external view virtual returns (uint8)
```

## ISandboxCometFactory

### initialize

```solidity
function initialize(address _cometImplementation, address _sandboxController, address _configController) external
```

### createMarket

```solidity
function createMarket(struct IConfigController.MarketConfig _marketConfig, struct ISandboxController.SandboxControllerConfiguration config) external returns (address)
```

## ISandboxController

### MarketState

```solidity
enum MarketState {
  Low,
  Medium,
  High
}
```

### BaseAssetCurve

```solidity
struct BaseAssetCurve {
  uint64 supplyKink;
  uint64 supplyPerYearInterestRateBase;
  uint64 supplyPerYearInterestRateSlopeLow;
  uint64 supplyPerYearInterestRateSlopeHigh;
  uint64 borrowKink;
  uint64 borrowPerYearInterestRateBase;
  uint64 borrowPerYearInterestRateSlopeLow;
  uint64 borrowPerYearInterestRateSlopeHigh;
}
```

### BaseAssetConfiguration

```solidity
struct BaseAssetConfiguration {
  address priceFeed;
  uint8 decimals;
  uint256 minBorrow;
  struct ISandboxController.BaseAssetCurve[] baseAssetCurves;
}
```

### CollateralAssetConfiguration

```solidity
struct CollateralAssetConfiguration {
  address collateralToken;
  address priceFeed;
  uint8 decimals;
  uint64 maxBorrowCollateralFactor;
  uint64 minBorrowCollateralFactor;
  uint64 minLiquidateCollateralFactor;
  uint64 maxLiquidateCollateralFactor;
  uint64 minLiquidationFactor;
  uint64 maxLiquidationFactor;
}
```

### SandboxControllerConfiguration

```solidity
struct SandboxControllerConfiguration {
  uint256 targetPercent;
  uint256 storeFrontPriceFactor;
  uint256 minUpdateTime;
  uint256 suggestedAmountOfSeedReserves;
  uint256 suggestedLockTimeOfSeedReserves;
}
```

### BaseAssetWhitelisted

```solidity
event BaseAssetWhitelisted(address token, address priceFeed, uint8 decimals, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow)
```

### BaseAssetCurveAdded

```solidity
event BaseAssetCurveAdded(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve)
```

### BaseAssetCurveChanged

```solidity
event BaseAssetCurveChanged(address token, struct ISandboxController.BaseAssetCurve oldCurve, struct ISandboxController.BaseAssetCurve newCurve)
```

### CollateralAssetWhitelisted

```solidity
event CollateralAssetWhitelisted(address token, address priceFeed, uint256 decimals, uint64 maxBorrowCollateralFactor, uint64 minBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor)
```

### ThresholdChanged

```solidity
event ThresholdChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### ReserveCommissionChanged

```solidity
event ReserveCommissionChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### ProtocolCommissionChanged

```solidity
event ProtocolCommissionChanged(enum ISandboxController.MarketState state, uint256 oldValue, uint256 newValue)
```

### TreasuryChanged

```solidity
event TreasuryChanged(address oldTreasury, address newTreasury)
```

### ConfigurationChanged

```solidity
event ConfigurationChanged(struct ISandboxController.SandboxControllerConfiguration oldConfig, struct ISandboxController.SandboxControllerConfiguration newConfig)
```

### FeeEnabledSet

```solidity
event FeeEnabledSet(bool feeEnabled)
```

### OwnerTransferred

```solidity
event OwnerTransferred(address oldOwner, address newOwner)
```

### DaoTransferred

```solidity
event DaoTransferred(address oldDao, address newDao)
```

### protocolFactorBorrow

```solidity
function protocolFactorBorrow() external view virtual returns (uint256)
```

### reserveFactorBorrow

```solidity
function reserveFactorBorrow() external view virtual returns (uint256)
```

### protocolFactorLiquidation

```solidity
function protocolFactorLiquidation() external view virtual returns (uint256)
```

### reserveFactorLiquidation

```solidity
function reserveFactorLiquidation() external view virtual returns (uint256)
```

### maxCollateralAssets

```solidity
function maxCollateralAssets() external view virtual returns (uint256)
```

### baseAssetCount

```solidity
function baseAssetCount() external view virtual returns (uint256)
```

### collateralAssetCount

```solidity
function collateralAssetCount() external view virtual returns (uint256)
```

### treasury

```solidity
function treasury() external view virtual returns (address)
```

### owner

```solidity
function owner() external view virtual returns (address)
```

### dao

```solidity
function dao() external view virtual returns (address)
```

### feeEnabled

```solidity
function feeEnabled() external view virtual returns (bool)
```

### controllerConfiguration

```solidity
function controllerConfiguration() external view virtual returns (struct ISandboxController.SandboxControllerConfiguration)
```

### baseAssetTokens

```solidity
function baseAssetTokens(uint256) external view virtual returns (address)
```

### collateralAssetTokens

```solidity
function collateralAssetTokens(uint256) external view virtual returns (address)
```

### isPriceFeedWhitelisted

```solidity
function isPriceFeedWhitelisted(address) external view virtual returns (bool)
```

### reserveCommission

```solidity
function reserveCommission(enum ISandboxController.MarketState) external view virtual returns (uint256)
```

### protocolCommission

```solidity
function protocolCommission(enum ISandboxController.MarketState) external view virtual returns (uint256)
```

### threshold

```solidity
function threshold(enum ISandboxController.MarketState) external view virtual returns (uint256)
```

### whitelistBaseAsset

```solidity
function whitelistBaseAsset(address token, address priceFeed, struct ISandboxController.BaseAssetCurve baseAssetCurve, uint256 minBorrow) external virtual
```

### whitelistCollateralAsset

```solidity
function whitelistCollateralAsset(address token, address priceFeed, uint64 minBorrowCollateralFactor, uint64 maxBorrowCollateralFactor, uint64 minLiquidateCollateralFactor, uint64 maxLiquidateCollateralFactor, uint64 minLiquidationFactor, uint64 maxLiquidationFactor) external virtual
```

### addBaseAssetCurve

```solidity
function addBaseAssetCurve(address token, struct ISandboxController.BaseAssetCurve baseAssetCurve) external virtual
```

### changeBaseAssetCurve

```solidity
function changeBaseAssetCurve(address token, uint256 curveIndex, struct ISandboxController.BaseAssetCurve newCurve) external virtual
```

### setThresholds

```solidity
function setThresholds(uint256[3] thresholds) external virtual
```

### setReserveCommissions

```solidity
function setReserveCommissions(uint256[3] reserveCommissions) external virtual
```

### setProtocolCommissions

```solidity
function setProtocolCommissions(uint256[3] protocolCommissions) external virtual
```

### setTreasury

```solidity
function setTreasury(address _treasury) external virtual
```

### setConfiguration

```solidity
function setConfiguration(struct ISandboxController.SandboxControllerConfiguration _config) external virtual
```

### setFeeEnabled

```solidity
function setFeeEnabled(bool _feeEnabled) external virtual
```

### transferOwner

```solidity
function transferOwner(address newOwner) external virtual
```

### transferDao

```solidity
function transferDao(address newDao) external virtual
```

### isBaseTokenWhitelisted

```solidity
function isBaseTokenWhitelisted(address token) external view virtual returns (bool)
```

### isCollateralTokenWhitelisted

```solidity
function isCollateralTokenWhitelisted(address token) external view virtual returns (bool)
```

### isCurveConfigurationValid

```solidity
function isCurveConfigurationValid(struct ISandboxController.BaseAssetCurve curve) external pure virtual returns (bool)
```

### baseAssets

```solidity
function baseAssets(address token) external view virtual returns (struct ISandboxController.BaseAssetConfiguration)
```

### collateralAssets

```solidity
function collateralAssets(address token) external view virtual returns (struct ISandboxController.CollateralAssetConfiguration)
```

### curves

```solidity
function curves(address token) external view virtual returns (struct ISandboxController.BaseAssetCurve[])
```

### config

```solidity
function config() external view virtual returns (struct ISandboxController.SandboxControllerConfiguration)
```

## ISandboxErrors

### ZeroAddress

```solidity
error ZeroAddress()
```

### ZeroAmount

```solidity
error ZeroAmount()
```

### ZeroCollateralAssets

```solidity
error ZeroCollateralAssets()
```

### BaseTokenAlreadyWhitelisted

```solidity
error BaseTokenAlreadyWhitelisted()
```

### CollateralTokenAlreadyWhitelisted

```solidity
error CollateralTokenAlreadyWhitelisted()
```

### BaseTokenNotWhitelisted

```solidity
error BaseTokenNotWhitelisted()
```

### CollateralTokenNotWhitelisted

```solidity
error CollateralTokenNotWhitelisted()
```

### PriceFeedAlreadyWhitelisted

```solidity
error PriceFeedAlreadyWhitelisted()
```

### InvalidCurveConfiguration

```solidity
error InvalidCurveConfiguration()
```

### InvalidPriceFeed

```solidity
error InvalidPriceFeed()
```

### InvalidFactors

```solidity
error InvalidFactors()
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

### Unauthorized

```solidity
error Unauthorized()
```

### NotOwner

```solidity
error NotOwner(address caller)
```

### NotDao

```solidity
error NotDao(address caller)
```

### CollateralTokenAlreadyAdded

```solidity
error CollateralTokenAlreadyAdded()
```

### InvalidFeePercentage

```solidity
error InvalidFeePercentage()
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

### ProposalNotExpired

```solidity
error ProposalNotExpired()
```

### ExecutionFailed

```solidity
error ExecutionFailed()
```

### MarketFactoryNotInitialized

```solidity
error MarketFactoryNotInitialized()
```

## IStableSwap

_Interface for interacting with Curve pools
Note Not a comprehensive interface_

### coins

```solidity
function coins(uint256 i) external view returns (address)
```

### exchange

```solidity
function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy) external payable returns (uint256)
```

## ITimelock

_Interface for interacting with a Timelock_

### NewAdmin

```solidity
event NewAdmin(address newAdmin)
```

Event emitted when a pending admin accepts admin position

### NewPendingAdmin

```solidity
event NewPendingAdmin(address newPendingAdmin)
```

Event emitted when new pending admin is set by the timelock

### NewDelay

```solidity
event NewDelay(uint256 newDelay)
```

Event emitted when Timelock sets new delay value

### CancelTransaction

```solidity
event CancelTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Event emitted when admin cancels an enqueued transaction

### ExecuteTransaction

```solidity
event ExecuteTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Event emitted when admin executes an enqueued transaction

### QueueTransaction

```solidity
event QueueTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Event emitted when admin enqueues a transaction

### GRACE_PERIOD

```solidity
function GRACE_PERIOD() external view virtual returns (uint256)
```

The length of time, once the delay has passed, in which a transaction can be executed before it becomes stale

### MINIMUM_DELAY

```solidity
function MINIMUM_DELAY() external view virtual returns (uint256)
```

The minimum value that the `delay` variable can be set to

### MAXIMUM_DELAY

```solidity
function MAXIMUM_DELAY() external view virtual returns (uint256)
```

The maximum value that the `delay` variable can be set to

### admin

```solidity
function admin() external view virtual returns (address)
```

Address that has admin privileges

### pendingAdmin

```solidity
function pendingAdmin() external view virtual returns (address)
```

The address that may become the new admin by calling `acceptAdmin()`

### setPendingAdmin

```solidity
function setPendingAdmin(address pendingAdmin_) external virtual
```

Set the pending admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pendingAdmin_ | address | New pending admin address |

### acceptAdmin

```solidity
function acceptAdmin() external virtual
```

Accept the position of admin (if caller is the current pendingAdmin)

### delay

```solidity
function delay() external view virtual returns (uint256)
```

Duration that a transaction must be queued before it can be executed

### setDelay

```solidity
function setDelay(uint256 delay) external virtual
```

Set the delay value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| delay | uint256 | New delay value |

### queuedTransactions

```solidity
function queuedTransactions(bytes32 txHash) external virtual returns (bool)
```

Mapping of transaction hashes to whether that transaction is currently enqueued

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external virtual returns (bytes32)
```

Enque a transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Address that the transaction is targeted at |
| value | uint256 | Value to send to target address |
| signature | string | Function signature to call on target address |
| data | bytes | Calldata for function called on target address |
| eta | uint256 | Timestamp of when the transaction can be executed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | txHash of the enqueued transaction |

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external virtual
```

Cancel an enqueued transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Address that the transaction is targeted at |
| value | uint256 | Value of the transaction to cancel |
| signature | string | Function signature of the transaction to cancel |
| data | bytes | Calldata for the transaction to cancel |
| eta | uint256 | Timestamp of the transaction to cancel |

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external payable virtual returns (bytes)
```

Execute an enqueued transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Target address of the transaction to execute |
| value | uint256 | Value of the transaction to execute |
| signature | string | Function signature of the transaction to execute |
| data | bytes | Calldata for the transaction to execute |
| eta | uint256 | Timestamp of the transaction to execute |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | bytes returned from executing transaction |

## IVault

_Interfaces for interacting with Balancer Vaults
Note Not comprehensive_

### SwapKind

```solidity
enum SwapKind {
  GIVEN_IN,
  GIVEN_OUT
}
```

### BatchSwapStep

```solidity
struct BatchSwapStep {
  bytes32 poolId;
  uint256 assetInIndex;
  uint256 assetOutIndex;
  uint256 amount;
  bytes userData;
}
```

### FundManagement

```solidity
struct FundManagement {
  address sender;
  bool fromInternalBalance;
  address payable recipient;
  bool toInternalBalance;
}
```

### batchSwap

```solidity
function batchSwap(enum IVault.SwapKind kind, struct IVault.BatchSwapStep[] swaps, contract IAsset[] assets, struct IVault.FundManagement funds, int256[] limits, uint256 deadline) external payable returns (int256[])
```

## IAsset

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

## IWstETH

_Interface for interacting with WstETH contract
Note Not a comprehensive interface_

### decimals

```solidity
function decimals() external view returns (uint8)
```

### stETH

```solidity
function stETH() external returns (address)
```

### wrap

```solidity
function wrap(uint256 _stETHAmount) external returns (uint256)
```

### unwrap

```solidity
function unwrap(uint256 _wstETHAmount) external returns (uint256)
```

### receive

```solidity
function receive() external payable
```

### getWstETHByStETH

```solidity
function getWstETHByStETH(uint256 _stETHAmount) external view returns (uint256)
```

### getStETHByWstETH

```solidity
function getStETHByWstETH(uint256 _wstETHAmount) external view returns (uint256)
```

### stEthPerToken

```solidity
function stEthPerToken() external view returns (uint256)
```

### tokensPerStEth

```solidity
function tokensPerStEth() external view returns (uint256)
```

## ConstantPriceFeed

A custom price feed that always returns a constant price

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### constantPrice

```solidity
int256 constantPrice
```

The constant price

### constructor

```solidity
constructor(uint8 decimals_, int256 constantPrice_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| decimals_ | uint8 | The number of decimals for the returned prices |
| constantPrice_ | int256 |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset (will always be a constant price) |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

## EzETHExchangeRatePriceFeed

A custom price feed that scales up or down the price received from an underlying Renzo ezETH / ETH exchange rate price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

### BadDecimals

```solidity
error BadDecimals()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

ezETH price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### constructor

```solidity
constructor(address ezETHRateProvider, uint8 decimals_, string description_) public
```

Construct a new ezETH scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ezETHRateProvider | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## MultiplicativePriceFeed

A custom price feed that multiplies the prices from two price feeds and returns the result

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### priceFeedA

```solidity
address priceFeedA
```

Chainlink price feed A

### priceFeedB

```solidity
address priceFeedB
```

Chainlink price feed B

### combinedScale

```solidity
int256 combinedScale
```

Combined scale of the two underlying Chainlink price feeds

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### constructor

```solidity
constructor(address priceFeedA_, address priceFeedB_, uint8 decimals_, string description_) public
```

Construct a new multiplicative price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeedA_ | address | The address of the first price feed to fetch prices from |
| priceFeedB_ | address | The address of the second price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Calculates the latest round data using data from the two price feeds

_Note: Only the `answer` really matters for downstream contracts that use this price feed (e.g. Comet)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from price feed B |
| [1] | int256 | answer Latest price |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from price feed B |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from price feed B |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from price feed B |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## PriceFeedWith4626Support

A custom price feed that calculates the price for an ERC4626 asset

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### rateProviderDecimals

```solidity
uint8 rateProviderDecimals
```

Number of decimals for the 4626 rate provider

### underlyingDecimals

```solidity
uint8 underlyingDecimals
```

Number of decimals for the underlying asset

### rateProvider

```solidity
address rateProvider
```

4626 rate provider

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Chainlink oracle for the underlying asset

### combinedScale

```solidity
int256 combinedScale
```

Combined scale of the two underlying price feeds

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### constructor

```solidity
constructor(address rateProvider_, address underlyingPriceFeed_, uint8 decimals_, string description_) public
```

Construct a new 4626 price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rateProvider_ | address | The address of the 4626 rate provider |
| underlyingPriceFeed_ | address | The address of the underlying asset price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Get the latest price for the underlying asset

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from the underlying asset price feed |
| [1] | int256 | answer Latest price for the underlying asset |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from the underlying asset price feed |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from the underlying asset price feed |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from the underlying asset price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## RateBasedScalingPriceFeed

A custom price feed that scales up or down the price received from an underlying price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

### BadDecimals

```solidity
error BadDecimals()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint8 decimals_, uint8 underlyingDecimals_, string description_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| underlyingDecimals_ | uint8 |  |
| description_ | string |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Current version of the price feed

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## ReverseMultiplicativePriceFeed

A custom price feed that multiplies the price from one price feed and the inverse price from another price feed and returns the result

_for example if we need tokenX to eth, but there is only tokenX to usd, we can use this price feed to get tokenX to eth: tokenX to usd * reversed(eth to usd)_

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### priceFeedA

```solidity
address priceFeedA
```

Chainlink price feed A

### priceFeedB

```solidity
address priceFeedB
```

Chainlink price feed B

### priceFeedAScale

```solidity
int256 priceFeedAScale
```

Price feed A scale

### priceFeedBScale

```solidity
int256 priceFeedBScale
```

Price feed B scale

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### constructor

```solidity
constructor(address priceFeedA_, address priceFeedB_, uint8 decimals_, string description_) public
```

Construct a new reverse multiplicative price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeedA_ | address | The address of the first price feed to fetch prices from |
| priceFeedB_ | address | The address of the second price feed to fetch prices from that should be reversed |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string | The description of the price feed |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Calculates the latest round data using data from the two price feeds

_Note: Only the `answer` really matters for downstream contracts that use this price feed (e.g. Comet)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from price feed B |
| [1] | int256 | answer Latest price |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from price feed B |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from price feed B |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from price feed B |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## RsETHScalingPriceFeed

A custom price feed that scales up or down the price received from an underlying Kelp price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

### BadDecimals

```solidity
error BadDecimals()
```

### VERSION

```solidity
uint256 VERSION
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying Kelp price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint8 decimals_, string description_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

### version

```solidity
function version() external pure returns (uint256)
```

Current version of the price feed

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The version of the price feed contract |

## ScalingPriceFeed

A custom price feed that scales up or down the price received from an underlying price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint8 decimals_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

## ScalingPriceFeedWithCustomDescription

A custom price feed that scales up or down the price received from an underlying price feed and returns the result

### InvalidInt256

```solidity
error InvalidInt256()
```

Custom errors *

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying price feed where prices are fetched from

### shouldUpscale

```solidity
bool shouldUpscale
```

Whether or not the price should be upscaled

### rescaleFactor

```solidity
int256 rescaleFactor
```

The amount to upscale or downscale the price by

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint8 decimals_, string description_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |
| description_ | string |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from underlying price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### scalePrice

```solidity
function scalePrice(int256 price) internal view returns (int256)
```

## WBTCPriceFeed

A custom price feed that calculates the price for WBTC / USD

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### WBTCToBTCPriceFeed

```solidity
address WBTCToBTCPriceFeed
```

Chainlink WBTC / BTC price feed

### BTCToUSDPriceFeed

```solidity
address BTCToUSDPriceFeed
```

Chainlink BTC / USD price feed

### combinedScale

```solidity
int256 combinedScale
```

Combined scale of the two underlying Chainlink price feeds

### priceFeedScale

```solidity
int256 priceFeedScale
```

Scale of this price feed

### constructor

```solidity
constructor(address WBTCToBTCPriceFeed_, address BTCToUSDPriceFeed_, uint8 decimals_) public
```

Construct a new WBTC / USD price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| WBTCToBTCPriceFeed_ | address | The address of the WBTC / BTC price feed to fetch prices from |
| BTCToUSDPriceFeed_ | address | The address of the BTC / USD price feed to fetch prices from |
| decimals_ | uint8 | The number of decimals for the returned prices |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

WBTC price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint80 | roundId Round id from the BTC / USD price feed |
| [1] | int256 | answer Latest price for WBTC / USD |
| [2] | uint256 | startedAt Timestamp when the round was started; passed on from the BTC / USD price feed |
| [3] | uint256 | updatedAt Timestamp when the round was last updated; passed on from the BTC / USD price feed |
| [4] | uint80 | answeredInRound Round id in which the answer was computed; passed on from the BTC / USD price feed |

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

## WstETHPriceFeed

A custom price feed that calculates the price for wstETH / ETH

### BadDecimals

```solidity
error BadDecimals()
```

Custom errors *

### InvalidInt256

```solidity
error InvalidInt256()
```

### version

```solidity
uint256 version
```

Version of the price feed

### description

```solidity
string description
```

Description of the price feed

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### stETHtoETHPriceFeed

```solidity
address stETHtoETHPriceFeed
```

Chainlink stETH / ETH price feed

### stETHToETHPriceFeedDecimals

```solidity
uint256 stETHToETHPriceFeedDecimals
```

Number of decimals for the stETH / ETH price feed

### wstETH

```solidity
address wstETH
```

WstETH contract address

### wstETHScale

```solidity
int256 wstETHScale
```

Scale for WstETH contract

### constructor

```solidity
constructor(address stETHtoETHPriceFeed_, address wstETH_, uint8 decimals_) public
```

### signed256

```solidity
function signed256(uint256 n) internal pure returns (int256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

WstETH price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the stETH price feed |
| answer | int256 | Latest price for wstETH / USD |
| startedAt | uint256 | Timestamp when the round was started; passed on from stETH price feed |
| updatedAt | uint256 | Timestamp when the round was last updated; passed on from stETH price feed |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from stETH price feed |

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
function collateralBalanceOf(address account, address asset) external view returns (uint128)
```

### setTotalsBasic

```solidity
function setTotalsBasic(struct CometStorage.TotalsBasic totals) external
```

### setTotalsCollateral

```solidity
function setTotalsCollateral(address asset, struct CometStorage.TotalsCollateral totals) external
```

### setBasePrincipal

```solidity
function setBasePrincipal(address account, int104 principal) external
```

### setCollateralBalance

```solidity
function setCollateralBalance(address account, address asset, uint128 balance) external
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

## StandardToken

_Implementation of the basic standard token.
 See https://github.com/ethereum/EIPs/issues/20_

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

### totalSupply

```solidity
uint256 totalSupply
```

### allowance

```solidity
mapping(address => mapping(address => uint256)) allowance
```

### balanceOf

```solidity
mapping(address => uint256) balanceOf
```

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### transfer

```solidity
function transfer(address dst, uint256 amount) public virtual returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) public virtual returns (bool)
```

### approve

```solidity
function approve(address _spender, uint256 amount) external returns (bool)
```

## FaucetToken

A simple test token that lets anyone get more of it.

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### allocateTo

```solidity
function allocateTo(address _owner, uint256 value) public
```

## FaucetWETH

A simple test token that lets anyone get more of it.

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### allocateTo

```solidity
function allocateTo(address _owner, uint256 value) public
```

## Fauceteer

### lastReceived

```solidity
mapping(address => mapping(address => uint256)) lastReceived
```

Mapping of user address -> asset address -> last time the user
received that asset

### BalanceTooLow

```solidity
error BalanceTooLow()
```

### RequestedTooFrequently

```solidity
error RequestedTooFrequently()
```

### TransferFailed

```solidity
error TransferFailed()
```

### drip

```solidity
function drip(address token) public
```

## TimelockInterface

### queuedTransactions

```solidity
function queuedTransactions(bytes32 hash) external view returns (bool)
```

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data) external returns (bytes32)
```

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data) external
```

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data) external payable returns (bytes)
```

### executeTransactions

```solidity
function executeTransactions(address[] targets, uint256[] values, string[] signatures, bytes[] data) external payable
```

## GovernorSimple

GovSimple:
 - A system similar to Compound's Governor{Alpha, Bravo, Charlie} but just for test-net.
 - Instead of allowing voting by tokens, the system is run by a set of admins with unlimited power. Anyone in this set should be able to add or remove other admins (it's test-net).
 - There is no voting - everything passes by will of any admin.
 - The ABI for proposing, queueing, executing should be identical to main-net. The execution should, similarly, go through a simple test-net Timelock.
 - ABI:
   - function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) public returns (uint)
   - function queue(uint proposalId) public
   - function execute(uint proposalId) public payable

### ProposalCreated

```solidity
event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, string description)
```

An event emitted when a new proposal is created

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 id)
```

An event emitted when a proposal has been canceled

### ProposalQueued

```solidity
event ProposalQueued(uint256 id)
```

An event emitted when a proposal has been queued in the Timelock

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 id)
```

An event emitted when a proposal has been executed in the Timelock

### proposalMaxOperations

```solidity
uint256 proposalMaxOperations
```

The maximum number of actions that can be included in a proposal

### timelock

```solidity
contract TimelockInterface timelock
```

The timelock

### admins

```solidity
address[] admins
```

The list of admins that can propose, cancel, queue, and execute proposals

### proposalCount

```solidity
uint256 proposalCount
```

The total number of proposals

### proposals

```solidity
mapping(uint256 => struct GovernorSimple.Proposal) proposals
```

The official record of all proposals ever proposed

### Proposal

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  address[] targets;
  uint256[] values;
  string[] signatures;
  bytes[] calldatas;
  uint256 startBlock;
  bool canceled;
  bool queued;
  bool executed;
}
```

### ProposalState

Possible states that a proposal may be in

```solidity
enum ProposalState {
  Active,
  Canceled,
  Queued,
  Executed
}
```

### initialize

```solidity
function initialize(address timelock_, address[] admins_) external
```

Initialize the initial contract storage

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timelock_ | address | The address of the Timelock |
| admins_ | address[] | The admins of governor |

### propose

```solidity
function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description) public returns (uint256)
```

Function used to propose a new proposal. Sender must be a governor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targets | address[] | Target addresses for proposal calls |
| values | uint256[] | Eth values for proposal calls |
| signatures | string[] | Function signatures for proposal calls |
| calldatas | bytes[] | Calldatas for proposal calls |
| description | string | String description of the proposal |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Proposal id of new proposal |

### queue

```solidity
function queue(uint256 proposalId) external
```

Queues a proposal of state active

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to queue |

### queueOrRevertInternal

```solidity
function queueOrRevertInternal(address target, uint256 value, string signature, bytes data) internal
```

### execute

```solidity
function execute(uint256 proposalId) external payable
```

Executes a queued proposal if eta has passed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to execute |

### cancel

```solidity
function cancel(uint256 proposalId) external
```

Cancels a proposal only if sender is a governor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal to cancel |

### getActions

```solidity
function getActions(uint256 proposalId) external view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)
```

Gets actions of a proposal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | the id of the proposal |

### state

```solidity
function state(uint256 proposalId) public view returns (enum GovernorSimple.ProposalState)
```

Gets the state of a proposal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | The id of the proposal |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum GovernorSimple.ProposalState | Proposal state |

### isAdmin

```solidity
function isAdmin(address account) public view returns (bool)
```

Checks whether an account is a governor or not

### addAdmin

```solidity
function addAdmin(address newAdminAddress) external
```

Add new admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdminAddress | address | Address of admin to add |

### removeAdmin

```solidity
function removeAdmin(address adminAddress) external
```

Remove admin from admin array

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| adminAddress | address | Address of admin to remove |

## ManagedFaucetToken

A simple test token that lets anyone get more of it.

### admin

```solidity
address admin
```

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### changeAdmin

```solidity
function changeAdmin(address newAdmin) public
```

### allocateTo

```solidity
function allocateTo(address _owner, uint256 value) public
```

## ManagedSimplePriceFeed

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

### admin

```solidity
address admin
```

### constructor

```solidity
constructor(int256 answer_, uint8 decimals_) public
```

### onlyAdmin

```solidity
modifier onlyAdmin()
```

### setRoundData

```solidity
function setRoundData(uint80 roundId_, int256 answer_, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) public
```

### changeAdmin

```solidity
function changeAdmin(address newAdmin) public
```

### getRoundData

```solidity
function getRoundData(uint80 roundId_) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

## MarketMock

### baseToken

```solidity
address baseToken
```

### priceFeed

```solidity
address priceFeed
```

### baseTokenCurveId

```solidity
uint256 baseTokenCurveId
```

### collateralTokens

```solidity
struct IConfigController.CollateralTokenConfig[] collateralTokens
```

### collateralTokensCount

```solidity
uint256 collateralTokensCount
```

### sandboxControllerAddress

```solidity
address sandboxControllerAddress
```

### configControllerAddress

```solidity
address configControllerAddress
```

### baseCurveParams

```solidity
struct IMarket.BaseCurveParams baseCurveParams
```

### Unauthorized

```solidity
error Unauthorized()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### onlyConfigController

```solidity
modifier onlyConfigController()
```

### initialize

```solidity
function initialize(struct IConfigController.MarketConfig _marketConfig, struct ISandboxController.SandboxControllerConfiguration _config, address _configControllerAddress, address _sandboxControllerAddress, uint256 baseBorrowMin_) external
```

### transferOwnership

```solidity
function transferOwnership(address _newConfigController) external
```

### accumulateRevenue

```solidity
function accumulateRevenue(address _token, uint256 _amount) external
```

### getCollateralTokenConfig

```solidity
function getCollateralTokenConfig(uint256 _collateralTokenId) external view returns (struct IConfigController.CollateralTokenConfig)
```

### getBaseCurveParams

```solidity
function getBaseCurveParams() external view returns (struct IMarket.BaseCurveParams)
```

### setBaseCurveParams

```solidity
function setBaseCurveParams(uint256 _curveId) external
```

### setCollateralTokens

```solidity
function setCollateralTokens(struct IConfigController.CollateralTokenConfig[] _collateralTokens) external
```

### setCollateralTokenConfig

```solidity
function setCollateralTokenConfig(uint256 _index, struct IConfigController.CollateralTokenConfig _config) external
```

### setCollateralTokenSupplyCap

```solidity
function setCollateralTokenSupplyCap(uint256 _index, uint128 _supplyCap) external
```

### setCollateralTokenBorrowCollateralFactor

```solidity
function setCollateralTokenBorrowCollateralFactor(uint256 _index, uint64 _borrowCF) external
```

### setCollateralTokenLiquidateCollateralFactor

```solidity
function setCollateralTokenLiquidateCollateralFactor(uint256 _index, uint64 _liquidateCF) external
```

### setCollateralTokenLiquidationFactor

```solidity
function setCollateralTokenLiquidationFactor(uint256 _index, uint64 _liquidationFactor) external
```

### getAllCollateralTokenConfigs

```solidity
function getAllCollateralTokenConfigs() external view returns (struct IConfigController.CollateralTokenConfig[])
```

## MockRedstoneOracle

Mock oracle to test the scaling price feed with updated update time

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying Chainlink price feed where prices are fetched from

### lastPrice

```solidity
uint256 lastPrice
```

### constructor

```solidity
constructor(address underlyingPriceFeed_, uint256 lastPrice_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |
| lastPrice_ | uint256 |  |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Current timestamp |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

## MockRenzoOracle

Mock oracle to test the scaling price feed with updated update time

### decimals

```solidity
uint8 decimals
```

Number of decimals for returned prices

### underlyingPriceFeed

```solidity
address underlyingPriceFeed
```

Underlying Chainlink price feed where prices are fetched from

### constructor

```solidity
constructor(address underlyingPriceFeed_) public
```

Construct a new scaling price feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingPriceFeed_ | address | The address of the underlying price feed to fetch prices from |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Price for the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id from the underlying price feed |
| answer | int256 | Latest price for the asset in terms of ETH |
| startedAt | uint256 | Timestamp when the round was started; passed on from underlying price feed |
| updatedAt | uint256 | Current timestamp |
| answeredInRound | uint80 | Round id in which the answer was computed; passed on from underlying price feed |

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

## NonStandardToken

_Implementation of the basic standard token.
 See https://github.com/ethereum/EIPs/issues/20
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

### totalSupply

```solidity
uint256 totalSupply
```

### allowance

```solidity
mapping(address => mapping(address => uint256)) allowance
```

### balanceOf

```solidity
mapping(address => uint256) balanceOf
```

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
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
function approve(address _spender, uint256 amount) external returns (bool)
```

## NonStandardFaucetToken

A simple test token that lets anyone get more of it.

### constructor

```solidity
constructor(uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public
```

### allocateTo

```solidity
function allocateTo(address _owner, uint256 value) public
```

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

### constructor

```solidity
constructor(int256 answer_, uint8 decimals_) public
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

## SimpleWstETH

### decimals

```solidity
uint8 decimals
```

### tokensPerStEth

```solidity
uint256 tokensPerStEth
```

### constructor

```solidity
constructor(uint256 tokensPerStEth_) public
```

