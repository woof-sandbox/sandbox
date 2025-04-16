# Protocol User Stories

## ConfigController Stories

### 1. Market Creation
**As a** protocol owner  
**I want to** create a new market  
**So that** users can trade assets with specific configurations

**Prerequisites:**
1. Caller must be the contract owner
2. Base token must be whitelisted in SandboxController
3. Price feed must be whitelisted
4. At least one collateral token must be specified
5. Base token curve ID must be valid
6. All collateral tokens must be whitelisted

**Steps:**
1. Prepare MarketConfig structure with:
   - Base token address
   - Price feed address
   - Base token curve ID
   - Array of collateral token configurations
2. Call `createMarket` with the prepared configuration
3. System validates all parameters
4. System creates new market via MarketFactory
5. System adds market to the markets array
6. System adds base token to revenue tokens list if not already added

**Post-conditions:**
1. New market is created and accessible
2. Market is registered in markets array
3. Base token is added to revenue tokens
4. MarketConfigurationCreated event is emitted

### 2. Revenue Management
**As a** market  
**I want to** accumulate and distribute revenue  
**So that** owner and curator can receive their shares

**Prerequisites:**
1. Caller must be a market created by this controller
2. Token must not be zero address
3. Amount must be greater than zero
4. Market must have approved tokens to ConfigController

**Steps:**
1. Call `accumulateRevenue` with token and amount
2. System transfers tokens from market to controller
3. System calculates shares based on curatorFee
4. System updates unclaimedRevenue mapping

**Post-conditions:**
1. Tokens are transferred to controller
2. UnclaimedRevenue is updated for owner and curator
3. RevenueAccumulated event is emitted

### 3. Curator Management
**As a** protocol owner  
**I want to** manage curator role  
**So that** protocol governance can be properly maintained

**Prerequisites:**
1. Caller must be the owner
2. Proposed curator must be valid address
3. No active curator proposal should exist

**Steps:**
1. Call `proposeCurator` with new curator address
2. System sets proposed curator
3. System sets proposal expiry time
4. Proposed curator calls `acceptCuratorRole`

**Post-conditions:**
1. New curator is set
2. Proposal data is cleared
3. CuratorAccepted event is emitted

### 4. Market Configuration Proposals
**As a** owner or curator  
**I want to** propose market configuration changes  
**So that** markets can be updated safely

**Prerequisites:**
1. Caller must be owner or curator
2. Market must exist
3. No active proposal should exist
4. New configuration must be valid

**Steps:**
1. Call `proposeMarketCollateralTokens` with new configuration
2. System validates proposal
3. System sets proposal expiry time
4. After expiry, call `executeMarketConfigProposal`

**Post-conditions:**
1. Market configuration is updated
2. Proposal is cleared
3. MarketConfigProposalExecuted event is emitted

### 5. Market Transfer Management
**As a** protocol owner  
**I want to** transfer markets between controllers  
**So that** I can reorganize market management

**Prerequisites:**
1. Caller must be the owner
2. Market must exist and be owned by current controller
3. New controller must be a valid ConfigController
4. No active transfer proposal should exist

**Steps:**
1. Call `proposeMarketTransfer` with market and new controller
2. System validates proposal
3. System sets proposal expiry time
4. New controller calls `acceptMarketTransferProposal`

**Post-conditions:**
1. Market is transferred to new controller
2. Market is removed from old controller
3. MarketTransferProposalAccepted event is emitted

### 6. Revenue Token Management
**As a** protocol owner  
**I want to** manage revenue tokens  
**So that** I can control which tokens can generate revenue

**Prerequisites:**
1. Caller must be the owner
2. Token must be a valid revenue token

**Steps:**
1. Call `removeClaimRevenueToken` with token address
2. System removes token from revenue tokens list
3. System updates revenue token index

**Post-conditions:**
1. Token is removed from revenue tokens
2. Token index is cleared
3. Token can no longer generate revenue

### 7. Guardian Management
**As a** protocol owner  
**I want to** manage guardian role  
**So that** I can ensure protocol security

**Prerequisites:**
1. Caller must be the owner
2. New guardian must be a valid address

**Steps:**
1. Call `setGuardian` with new guardian address
2. System updates guardian address
3. System emits GuardianUpdated event

**Post-conditions:**
1. New guardian is set
2. GuardianUpdated event is emitted
3. New guardian has appropriate permissions

### 8. Proposal Duration Management
**As a** protocol owner  
**I want to** manage proposal durations  
**So that** I can control governance timing

**Prerequisites:**
1. Caller must be the owner
2. New durations must be greater than minimum update time
3. New durations must be valid

**Steps:**
1. Call `setProposalDurations` with new durations
2. System validates new durations
3. System updates duration values
4. System emits ProposalDurationsUpdated event

**Post-conditions:**
1. New proposal durations are set
2. ProposalDurationsUpdated event is emitted
3. Future proposals use new durations

### 9. Protocol Ownership Management
**As a** protocol owner  
**I want to** manage protocol ownership  
**So that** I can delegate control of the protocol

**Prerequisites:**
1. Caller must be the current owner
2. New owner address must be valid (non-zero)
3. New owner must be different from current owner

**Steps:**
1. Call `grantOwnership` with new owner address
2. System validates new owner address
3. System updates owner address
4. System transfers ownership to new address

**Post-conditions:**
1. New owner is set
2. Old owner loses control
3. New owner has full protocol control
4. New owner can manage all protocol functions

## MarketFactory Stories

### 1. Market Deployment
**As a** ConfigController  
**I want to** deploy a new market contract  
**So that** it can be used for trading

**Prerequisites:**
1. Caller must be a registered ConfigController
2. Market implementation contract must be set
3. Valid market configuration must be provided

**Steps:**
1. Call `createMarket` with market configuration
2. System clones the market implementation
3. System initializes the new market
4. System records the market in its registry

**Post-conditions:**
1. New market contract is deployed
2. Market is initialized with provided configuration
3. Market is registered with its controller
4. MarketCreated event is emitted

### 2. Market Verification
**As a** protocol administrator  
**I want to** verify market ownership  
**So that** I can ensure proper market management

**Prerequisites:**
1. Market must exist
2. Controller must be valid

**Steps:**
1. Call `marketToController` with market address
2. System checks market ownership
3. System returns controller address

**Post-conditions:**
1. Market ownership is verified
2. Controller address is returned
3. Market management can proceed

## SandboxController Stories

### 1. Asset Whitelisting
**As a** protocol owner  
**I want to** whitelist new assets  
**So that** they can be used in markets

**Prerequisites:**
1. Caller must be the owner
2. Valid price feed must be provided
3. Valid asset configuration must be provided

**Steps:**
1. Call `whitelistBaseAsset` with token, price feed, and configuration
2. System validates configuration parameters
3. System stores asset configuration
4. System updates asset counters

**Post-conditions:**
1. Asset is whitelisted
2. Price feed is registered
3. Asset configuration is stored
4. Asset can be used in markets

### 2. Protocol Configuration
**As a** protocol owner/DAO  
**I want to** configure protocol parameters  
**So that** the protocol operates with desired settings

**Prerequisites:**
1. Caller must be owner or DAO
2. Parameters must be within valid ranges

**Steps:**
1. Call appropriate configuration function
2. System validates new parameters
3. System updates configuration
4. System emits configuration events

**Post-conditions:**
1. New configuration is active
2. Events are emitted
3. Protocol operates with new parameters

### 3. Base Asset Curve Management
**As a** protocol owner/DAO  
**I want to** manage base asset curves  
**So that** I can control interest rates

**Prerequisites:**
1. Caller must be owner or DAO
2. Token must be whitelisted
3. Curve configuration must be valid

**Steps:**
1. Call `addBaseAssetCurve` with token and curve configuration
2. System validates curve parameters
3. System adds curve to base asset
4. System emits BaseAssetCurveAdded event

**Post-conditions:**
1. New curve is added to base asset
2. BaseAssetCurveAdded event is emitted
3. Curve can be used in markets

### 4. Fee Management
**As a** protocol DAO  
**I want to** manage protocol fees  
**So that** I can control revenue generation

**Prerequisites:**
1. Caller must be DAO
2. New fee configuration must be valid

**Steps:**
1. Call `setFeeEnabled` with new fee status
2. System updates fee status
3. System emits FeeEnabledSet event

**Post-conditions:**
1. Fee status is updated
2. FeeEnabledSet event is emitted
3. Protocol operates with new fee settings

### 5. Collateral Asset Whitelisting
**As a** protocol owner/DAO  
**I want to** whitelist new collateral assets  
**So that** they can be used as collateral in markets

**Prerequisites:**
1. Caller must be owner or DAO
2. Token and price feed must be valid addresses
3. All collateral factors must be within valid ranges
4. Price feed must provide valid data

**Steps:**
1. Call `whitelistCollateralAsset` with:
   - Token address
   - Price feed address
   - Borrow collateral factors
   - Liquidation factors
2. System validates all parameters
3. System stores collateral configuration
4. System updates collateral asset counters

**Post-conditions:**
1. Collateral asset is whitelisted
2. Price feed is registered
3. Collateral configuration is stored
4. Asset can be used as collateral in markets

### 6. Protocol Factor Management
**As a** protocol owner  
**I want to** manage protocol factors  
**So that** I can control protocol behavior

**Prerequisites:**
1. Caller must be the owner
2. Factors must be within valid ranges
3. Sum of factors must not exceed limits

**Steps:**
1. Call `setProtocolCommissions` with new commission rates
2. System validates commission rates
3. System updates protocol commission mapping
4. System emits ProtocolCommissionChanged events

**Post-conditions:**
1. New protocol commissions are set
2. ProtocolCommissionChanged events are emitted
3. Protocol operates with new commission rates

### 7. Reserve Factor Management
**As a** protocol owner  
**I want to** manage reserve factors  
**So that** I can control reserve behavior

**Prerequisites:**
1. Caller must be the owner
2. Factors must be within valid ranges
3. Sum of factors must not exceed limits

**Steps:**
1. Call `setReserveCommissions` with new commission rates
2. System validates commission rates
3. System updates reserve commission mapping
4. System emits ReserveCommissionChanged events

**Post-conditions:**
1. New reserve commissions are set
2. ReserveCommissionChanged events are emitted
3. Reserves operate with new commission rates

### 8. Threshold Management
**As a** protocol owner  
**I want to** manage market state thresholds  
**So that** I can control market state transitions

**Prerequisites:**
1. Caller must be the owner
2. Thresholds must be within valid ranges
3. Thresholds must be less than 1e18

**Steps:**
1. Call `setThresholds` with new threshold values
2. System validates threshold values
3. System updates threshold mapping
4. System emits ThresholdChanged events

**Post-conditions:**
1. New thresholds are set
2. ThresholdChanged events are emitted
3. Market state transitions use new thresholds

### 9. Treasury Management
**As a** protocol owner  
**I want to** manage treasury address  
**So that** I can control protocol funds

**Prerequisites:**
1. Caller must be the owner
2. New treasury address must be valid

**Steps:**
1. Call `setTreasury` with new treasury address
2. System validates address
3. System updates treasury address
4. System emits TreasuryChanged event

**Post-conditions:**
1. New treasury address is set
2. TreasuryChanged event is emitted
3. Protocol funds are directed to new treasury

### 10. Base Asset Curve Update
**As a** protocol DAO  
**I want to** update existing base asset curves  
**So that** I can modify interest rates

**Prerequisites:**
1. Caller must be DAO
2. Token must be whitelisted
3. Curve index must be valid
4. New curve must be valid

**Steps:**
1. Call `changeBaseAssetCurve` with token, curve index, and new curve
2. System validates parameters
3. System updates curve configuration
4. System emits BaseAssetCurveChanged event

**Post-conditions:**
1. Base asset curve is updated
2. BaseAssetCurveChanged event is emitted
3. Markets use new interest rate curve

### 11. Protocol Ownership Transfer
**As a** protocol owner  
**I want to** transfer ownership  
**So that** I can delegate protocol control

**Prerequisites:**
1. Caller must be the owner
2. New owner address must be valid

**Steps:**
1. Call `transferOwner` with new owner address
2. System validates address
3. System updates owner address
4. System emits OwnerTransferred event

**Post-conditions:**
1. New owner is set
2. OwnerTransferred event is emitted
3. New owner has full protocol control

### 12. DAO Transfer
**As a** protocol DAO  
**I want to** transfer DAO privileges  
**So that** I can delegate governance control

**Prerequisites:**
1. Caller must be current DAO
2. New DAO address must be valid

**Steps:**
1. Call `transferDao` with new DAO address
2. System validates address
3. System updates DAO address
4. System emits DaoTransferred event

**Post-conditions:**
1. New DAO is set
2. DaoTransferred event is emitted
3. New DAO has governance control

## ConfigControllerFactory Stories

### 1. Controller Creation
**As a** protocol deployer  
**I want to** create new ConfigController instances  
**So that** multiple configurations can be managed

**Prerequisites:**
1. Implementation contract must be set
2. Valid configuration parameters must be provided

**Steps:**
1. Call `createConfigController` with parameters
2. System clones implementation contract
3. System initializes new controller
4. System registers controller

**Post-conditions:**
1. New controller is created
2. Controller is initialized
3. Controller is registered
4. ConfigControllerCreated event is emitted

### 2. Controller Management
**As a** protocol administrator  
**I want to** manage controller instances  
**So that** I can track and verify controllers

**Prerequisites:**
1. Controller must exist
2. Caller must have appropriate permissions

**Steps:**
1. Call controller management functions
2. System verifies controller existence
3. System performs requested operation

**Post-conditions:**
1. Operation is completed
2. State is updated
3. Events are emitted if applicable

### 3. Controller Verification
**As a** protocol administrator  
**I want to** verify controller validity  
**So that** I can ensure proper controller management

**Prerequisites:**
1. Controller address must be provided

**Steps:**
1. Call `isController` with controller address
2. System checks controller registry
3. System returns verification result

**Post-conditions:**
1. Controller validity is verified
2. Boolean result is returned
3. Controller operations can proceed 