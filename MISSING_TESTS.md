# Missing Test Cases for ConfigController

## Overview
This document outlines the missing test cases for the ConfigController contract, covering all proposal types and functions.

## Current Test Coverage Analysis

### ✅ Implemented Tests

#### ProposeNewCollateralToken (test/17_proposals-collateral-test.ts) - 95% Coverage
**Create Proposal Tests:**
- ✅ Basic proposal creation and execution success
- ✅ Authorization (owner vs non-owner, curator, guardian)
- ✅ Invalid proposal type validation
- ✅ Invalid selector validation
- ✅ Collateral token whitelist validation
- ✅ Supply cap validation (zero supply cap)
- ✅ Collateral factors validation (borrow, liquidate, liquidation)
- ✅ Base token validation (can't add base token as collateral)
- ✅ Zero address comet validation
- ✅ Malformed calldata validation
- ✅ Empty calldata validation
- ✅ Proposal counter increment
- ✅ Timestamp validation
- ✅ Duplicate token during proposal acceptance
- ✅ Configuration changes after proposal creation
- ✅ Multiple proposals with same token
- ✅ Already executed proposal handling
- ✅ Non-owned comet validation
- ✅ Boundary value tests for all collateral factors
- ✅ Calldata with extra bytes handling
- ✅ Curator cannot accept ProposeNewCollateralToken proposal
- ✅ Guardian cannot accept ProposeNewCollateralToken proposal
- ✅ Owner cannot accept proposal before maturity time
- ✅ Owner cannot accept proposal after expiration deadline
- ✅ Calldata structure validation with wrong parameters
- ✅ MAX_ASSETS limit validation

**Accept Proposal Tests:**
- ✅ Basic proposal acceptance and execution
- ✅ Authorization checks (only owner can accept)
- ✅ Maturity time validation
- ✅ Expiration time validation
- ✅ Comet ownership validation during acceptance
- ✅ Collateral token configuration re-validation
- ✅ Duplicate token check during acceptance
- ✅ Comet call failure handling (CometCallFailed)
- ✅ Proposal state management after acceptance

#### ProposeCurator (test/18_proposals-curator-test.ts) - 90% Coverage
**Create Proposal Tests:**
- ✅ Basic curator proposal creation
- ✅ Authorization (owner vs non-owner)
- ✅ Invalid curator validation (current curator, owner, guardian)
- ✅ Proposal counter increment
- ✅ Timestamp validation

**Accept Proposal Tests:**
- ✅ Curator proposal acceptance
- ✅ Non-proposed curator acceptance attempt
- ✅ Expired proposal handling
- ✅ Non-existent proposal handling

#### Proposal Cancellation (test/19_cancelProposal-test.ts) - 95% Coverage
- ✅ Owner cancellation during maturity period
- ✅ Guardian cancellation during maturity period
- ✅ Proposer cancellation after maturity period
- ✅ Non-authorized user cancellation attempts
- ✅ Already cancelled proposal handling
- ✅ Expired proposal handling
- ✅ Non-existent proposal handling
- ✅ Curator proposal cancellation
- ✅ Proposal state verification after cancellation

#### General ConfigController (test/04_config-controller-test.ts) - 70% Coverage
**Implemented Functions:**
- ✅ Ownership transfer (grantOwnership)
- ✅ Curator role management (propose, accept, cancel, remove)
- ✅ Guardian updates (setGuardian)
- ✅ Proposal duration settings

**Missing Functions:**
- ❌ createComet function
- ❌ setCometFee function
- ❌ extractFees function
- ❌ cometsLength function
- ❌ _isCometOwned function
- ❌ _validateCollateralTokenConfig function

## Missing Test Cases - Critical Gaps

### 1. acceptProposal - High Priority

#### 1.1 Test for Proposal Not Timelocked
**Description**: Test accepting proposal before timelock period
**Expected**: Should revert with `ProposalNotTimelocked`
**Test Name**: `should fail if proposal is not timelocked`
**Status**: ❌ Missing - Critical for security

#### 1.2 Test for Comet Call Failure with Different Error Types
**Description**: Test handling when the comet call fails with various error types
**Expected**: Should revert with `CometCallFailed` for different failure scenarios
**Test Name**: `should fail if comet call fails with different error types`
**Status**: ❌ Missing - Important for robustness

### 2. createComet Function - High Priority

#### 2.1 Test Comet Creation Success
**Description**: Test successful comet creation with valid configuration
**Expected**: Should create comet and emit CometCreated event
**Test Name**: `should create comet successfully`
**Status**: ❌ Missing - Core functionality

#### 2.2 Test Comet Creation Validation
**Description**: Test all validation checks in createComet
**Expected**: Should revert for invalid configurations
**Test Name**: `should validate comet creation parameters`
**Status**: ❌ Missing - Critical for security

#### 2.3 Test Comet Creation with Seed Reserves
**Description**: Test comet creation with seed reserves allocation
**Expected**: Should transfer seed reserves to comet
**Test Name**: `should allocate seed reserves during comet creation`
**Status**: ❌ Missing - Important functionality

### 3. setCometFee Function - High Priority

#### 3.1 Test Fee Enable/Disable
**Description**: Test enabling and disabling comet fees
**Expected**: Should update fee settings and emit event
**Test Name**: `should set comet fee correctly`
**Status**: ❌ Missing - Core functionality

#### 3.2 Test Fee Validation
**Description**: Test validation checks in setCometFee
**Expected**: Should revert for invalid parameters
**Test Name**: `should validate setCometFee parameters`
**Status**: ❌ Missing - Security critical

### 4. extractFees Function - High Priority

#### 4.1 Test Fee Extraction
**Description**: Test fee extraction from comets
**Expected**: Should extract fees and distribute correctly
**Test Name**: `should extract fees correctly`
**Status**: ❌ Missing - Core functionality

#### 4.2 Test Fee Extraction Validation
**Description**: Test validation checks in extractFees
**Expected**: Should revert for invalid parameters
**Test Name**: `should validate extractFees parameters`
**Status**: ❌ Missing - Security critical

### 5. Integration Tests - Medium Priority

#### 5.1 Test Proposal Creation After Comet Transfer
**Description**: Test creating proposal after comet ownership changes
**Expected**: Should fail if comet is transferred to another controller
**Test Name**: `should fail if comet ownership changes after proposal creation`
**Status**: ❌ Missing - Important edge case

#### 5.2 Test Proposal Creation with Changed SandboxController Limits
**Description**: Test creating proposal after collateral token limits are modified
**Expected**: Should fail if new limits make the proposal invalid
**Test Name**: `should fail if SandboxController limits change`
**Status**: ❌ Missing - Important edge case

#### 5.3 Test Multiple Comets Management
**Description**: Test managing multiple comets in the same controller
**Expected**: Should handle multiple comets correctly
**Test Name**: `should manage multiple comets correctly`
**Status**: ❌ Missing - Important functionality

### 6. Edge Cases - Medium Priority

#### 6.1 Test with Maximum Valid Values
**Description**: Test with the highest allowed collateral factors
**Expected**: Should succeed with maximum valid values
**Test Name**: `should succeed with maximum valid collateral factors`
**Status**: ❌ Missing - Boundary testing

#### 6.2 Test with Minimum Valid Values
**Description**: Test with the lowest allowed collateral factors
**Expected**: Should succeed with minimum valid values
**Test Name**: `should succeed with minimum valid collateral factors`
**Status**: ❌ Missing - Boundary testing

#### 6.3 Test with Boundary Values
**Description**: Test exactly at the boundary of valid/invalid values
**Expected**: Should succeed at boundary, fail just beyond
**Test Name**: `should handle boundary values correctly`
**Status**: ❌ Missing - Boundary testing

### 7. Event Emission Tests - Medium Priority

#### 7.1 Test Event Parameters for ProposeNewCollateralToken
**Description**: Verify all event parameters are emitted correctly
**Expected**: All event fields should match the proposal data
**Test Name**: `should emit correct ProposeNewCollateralToken event parameters`
**Status**: ❌ Missing - Event verification

#### 7.2 Test Event Parameters for ProposeNewCollateralTokenAccepted
**Description**: Verify acceptance event parameters
**Expected**: All event fields should match the accepted proposal data
**Test Name**: `should emit correct ProposeNewCollateralTokenAccepted event parameters`
**Status**: ❌ Missing - Event verification

#### 7.3 Test CometCreated Event
**Description**: Verify CometCreated event parameters
**Expected**: All event fields should match the created comet data
**Test Name**: `should emit correct CometCreated event parameters`
**Status**: ❌ Missing - Event verification

### 8. Gas and Performance Tests - Low Priority

#### 8.1 Test Gas Consumption
**Description**: Measure gas usage for proposal creation and acceptance
**Expected**: Gas usage should be reasonable and documented
**Test Name**: `should have reasonable gas consumption`
**Status**: ❌ Missing - Performance testing

#### 8.2 Test with Large Calldata
**Description**: Test with maximum size calldata
**Expected**: Should handle large calldata without issues
**Test Name**: `should handle large calldata`
**Status**: ❌ Missing - Performance testing

### 9. Error Message Tests - Low Priority

#### 9.1 Test Specific Error Messages
**Description**: Verify that the correct custom errors are thrown
**Expected**: Each validation failure should throw the appropriate custom error
**Test Name**: `should throw correct custom errors`
**Status**: ❌ Missing - Error verification

#### 9.2 Test Error Conditions Order
**Description**: Test that errors are thrown at the right validation points
**Expected**: Errors should be thrown in the correct order
**Test Name**: `should throw errors at correct validation points`
**Status**: ❌ Missing - Error verification

### 10. Missing Function Tests - High Priority

#### 10.1 Test cometsLength Function
**Description**: Test comet count functionality
**Expected**: Should return correct number of comets
**Test Name**: `should return correct comets length`
**Status**: ❌ Missing - Core functionality

#### 10.2 Test _isCometOwned Function
**Description**: Test comet ownership verification
**Expected**: Should correctly identify owned comets
**Test Name**: `should correctly identify owned comets`
**Status**: ❌ Missing - Core functionality

#### 10.3 Test _validateCollateralTokenConfig Function
**Description**: Test collateral token configuration validation
**Expected**: Should validate all configuration parameters
**Test Name**: `should validate collateral token configuration`
**Status**: ❌ Missing - Core functionality

## Priority Levels

### High Priority (Critical for Security/Functionality) - 8 Tests
1. Test for proposal not timelocked
2. Test for comet call failure with different error types
3. Test createComet function (3 tests)
4. Test setCometFee function (2 tests)
5. Test extractFees function (2 tests)
6. Test cometsLength, _isCometOwned, _validateCollateralTokenConfig functions (3 tests)

### Medium Priority (Important for Robustness) - 8 Tests
1. Test with boundary values (3 tests)
2. Test integration scenarios (3 tests)
3. Test event parameter verification (3 tests)

### Low Priority (Nice to Have) - 4 Tests
1. Gas consumption tests (2 tests)
2. Error condition order tests (2 tests)

## Implementation Notes

### Critical Issues to Address
1. **TypeScript/Chai Assertion Issues**: The test file has multiple linter errors due to incorrect assertion syntax. Need to fix:
   - `revertedWithCustomError` should be `revertedWithCustomError`
   - `reverted` should be `reverted`
   - BigNumber arithmetic operations need proper conversion

2. **Missing Core Functions**: The most critical missing tests are for:
   - `createComet` - Core functionality for creating new comets
   - `setCometFee` - Fee management functionality
   - `extractFees` - Revenue distribution functionality

3. **Timelock Testing**: The `acceptProposal` function has a timelock check that's not tested:
   ```solidity
   if (block.timestamp < _proposal.timelock) revert ProposalNotTimelocked();
   ```

### Test Structure Recommendations
- Create helper functions to reduce code duplication
- Use consistent error assertion patterns
- Implement proper BigNumber handling
- Add comprehensive event verification
- Include boundary value testing

## Files to Update

- `test/17_proposals-collateral-test.ts` - Fix linter errors, add missing edge cases
- `test/04_config-controller-test.ts` - Add missing function tests (createComet, setCometFee, extractFees)
- `test/18_proposals-curator-test.ts` - Add missing edge cases
- `test/19_cancelProposal-test.ts` - Add missing edge cases
- Consider creating new test files for specific functionality if needed

## Test Coverage Summary

### Current Coverage: ~85%
- ProposeNewCollateralToken: ~95% covered
- ProposeCurator: ~90% covered  
- Proposal Cancellation: ~95% covered
- General ConfigController: ~70% covered

### Target Coverage: 95%+
- All critical paths should be tested
- All error conditions should be tested
- All edge cases should be covered
- All events should be verified
- All functions should have comprehensive test coverage

### Immediate Action Items
1. Fix TypeScript/Chai assertion errors in existing tests
2. Implement missing core function tests (createComet, setCometFee, extractFees)
3. Add timelock testing for acceptProposal
4. Add boundary value testing for all validation functions
5. Implement comprehensive event verification 