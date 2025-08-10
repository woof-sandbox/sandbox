# Universal Proposal Testing Instruction List

## Overview
This document provides a universal instruction list for testing all kinds of proposals in the same structured way as the 24_remove-collateral-proposal.test.ts file.

## Setup Phase (before block)

### 1. Remove makeProtocol Dependency
- Remove `makeProtocol` import from helpers
- Import individual helper functions: `exp`, `defaultAssets`, `defaultSandboxControllerOpts`, `makeSandboxController`, `makeConfigControllerFactory`, `makeCometFactory`
- Import contract factories: `FaucetToken__factory`, `SimplePriceFeed__factory`, `ConfigController__factory`

### 2. Set Up Signers Manually
```typescript
const signers = await ethers.getSigners();
owner = signers[0];
curator = signers[1];
guardian = signers[2];
const dao = signers[3];
users = [signers[4]] as [SignerWithAddress];
```

### 3. Create Tokens
- Use `defaultAssets()` to get asset configuration
- Deploy `FaucetToken` contracts for each asset using `FaucetToken__factory`
- Set up `baseToken` (USDC) from deployed tokens
- Create tokens object mapping symbol to contract instance

### 4. Create Price Feeds
- Deploy `SimplePriceFeed` contracts for each token using `SimplePriceFeed__factory`
- Create priceFeeds object mapping symbol to contract instance

### 5. Create SandboxController
- Use `defaultSandboxControllerOpts()` with owner, dao, treasury settings
- Call `makeSandboxController()` to deploy and get instance

### 6. Whitelist Base Asset
- Call `sandboxController.whitelistBaseAsset()` with:
  - baseToken address
  - priceFeed address
  - BaseAssetCurve struct with interest rate parameters
  - minBorrow amount

### 7. Whitelist Collateral Assets
- Loop through all non-base tokens
- Call `sandboxController.whitelistCollateralAsset()` for each with:
  - token address
  - priceFeed address
  - collateral factor parameters

### 8. Create ConfigController Infrastructure
- Deploy `ConfigController` implementation using `ConfigController__factory`
- Deploy `ConfigControllerFactory` using `makeConfigControllerFactory()`
- Deploy `SandboxComet` implementation
- Deploy `SandboxCometFactory` using `makeCometFactory()`

### 9. Create ConfigController
- Call `configControllerFactory.createConfigController()` with all 7 parameters:
  - curator address
  - guardian address
  - cometFactory address
  - curatorFee (1000 = 10%)
  - name ("Test Config Controller")
  - curatorProposalDuration (3600)
  - proposalDuration (3600)
- Extract controller address from `ConfigControllerCreated` event
- Get ConfigController contract instance

### 10. Accept Curator Proposal
- Call `configController.connect(curator).acceptProposal(0)` to accept the initial curator proposal

### 11. Create Comet
- Set up collateral token configurations
- Create market config with baseToken, collateralTokens, curveId, and name
- Call `configController.createComet(marketConfig)`
- Get comet address and contract instance

### 12. Prepare Proposal-Specific Data
- Create proposal-specific calldata based on proposal type
- Set proposalType variable
- Set cometAddress variable (or AddressZero for non-comet proposals)
- Create interface for function calls if needed

### 13. Take Snapshot
- Call `takeSnapshot()` and store in snapshot variable

## Test Structure (for each proposal type)

### Create Proposal Tests - Happy Cases
```typescript
describe("create [PROPOSAL_TYPE] proposal - happy cases", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should create a [PROPOSAL_TYPE] proposal", async() => {
        await expect(configController.connect(owner).createProposal(calldata, cometAddress, proposalType)).to.not.be.reverted;
    });

    it("should show that the proposal counter is incremented", async () => {
        const beforeCallCounter = await configController.proposalCounter();
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const afterCallCounter = await configController.proposalCounter();
        expect(afterCallCounter).to.equal(beforeCallCounter.add(1));
    });

    it("should show that the proposal data is saved correctly", async () => {
        const tx = await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const receipt = await tx.wait();
        const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
        const proposal = await configController.proposals(await configController.proposalCounter());

        expect(proposal.proposer).to.equal(owner.address);
        expect(proposal.proposalType).to.equal(proposalType);
        expect(proposal.comet).to.equal(cometAddress);
        expect(proposal.call).to.equal(calldata);
        // Check expiration time based on proposal type
        // Check maturity time based on proposal type
        // Check timelock based on proposal type
    });

    it("should made the proposal with the same calldata twice", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
    });

    it("should create a proposal by the curator", async () => {
        await expect(configController.connect(curator).createProposal(calldata, cometAddress, proposalType)).to.not.be.reverted;
    });
});
```

### Create Proposal Tests - Reverts
```typescript
describe("create [PROPOSAL_TYPE] proposal - reverts", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should revert when non-owner tries to create proposal", async () => {
        await expect(
            configController.connect(users[0]).createProposal(calldata, cometAddress, proposalType)
        ).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert when invalid proposal type is used", async () => {
        await expect(
            configController.connect(owner).createProposal(calldata, cometAddress, 99)
        ).to.be.revertedWithCustomError(configController, "InvalidProposalType");
    });

    it("should revert when invalid selector is used", async () => {
        const invalidCalldata = "0x12345678";
        await expect(
            configController.connect(owner).createProposal(invalidCalldata, cometAddress, proposalType)
        ).to.be.revertedWithCustomError(configController, "InvalidSelector");
    });

    // Proposal-specific revert tests
    it("should revert when [SPECIFIC_CONDITION]", async () => {
        // Add proposal-specific validation tests
    });
});
```

### Cancel Proposal Tests - Happy Cases
```typescript
describe("cancel [PROPOSAL_TYPE] proposal - happy cases", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
    });

    it("should cancel the proposal when the proposal not in the maturity period by the curator if the curator is the proposer", async () => {
        await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
    });

    it("should cancel the proposal by the owner", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        const proposal = await configController.proposals(proposalId);
        expect(proposal.expirationTime).to.equal(0);
    });

    it("should emit the event when the proposal is cancelled by the owner", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        const tx = await configController.connect(owner).cancelProposal(proposalId);
        const receipt = await tx.wait();
        expect(receipt.events[0].args[0]).to.equal(proposalId);
        expect(receipt.events[0].args[1]).to.equal(owner.address);
    });

    it("should cancel the proposal by the curator if the curator is proposed", async () => {
        await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
        const proposal = await configController.proposals(proposalId);
        expect(proposal.expirationTime).to.equal(0);
    });

    it("should emit the event when the proposal is cancelled by the curator", async () => {
        await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        const tx = await configController.connect(curator).cancelProposal(proposalId);
        const receipt = await tx.wait();
        expect(receipt.events[0].args[0]).to.equal(proposalId);
        expect(receipt.events[0].args[1]).to.equal(curator.address);
    });

    it("should cancel the proposal by the guardian", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(guardian).cancelProposal(proposalId)).to.not.be.reverted;
        const proposal = await configController.proposals(proposalId);
        expect(proposal.expirationTime).to.equal(0);
    });

    it("should emit the event when the proposal is cancelled by the guardian", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        const tx = await configController.connect(guardian).cancelProposal(proposalId);
        const receipt = await tx.wait();
        expect(receipt.events[0].args[0]).to.equal(proposalId);
        expect(receipt.events[0].args[1]).to.equal(guardian.address);
    });
});
```

### Cancel Proposal Tests - Reverts
```typescript
describe("cancel [PROPOSAL_TYPE] proposal - reverts", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should revert when non-owner tries to cancel proposal", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert when proposal is not active", async () => {
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });

    it("should revert when proposal is expired", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
    });

    it("should revert when proposal is out of the maturity period", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert when the proposal is created by the owner and the curator is try to cancel the proposal", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert when the proposal is created by the curator and the guardian is try to cancel the proposal that is out of the maturity period", async () => {
        await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
    });
});
```

### Accept Proposal Tests - Happy Cases
```typescript
describe("accept [PROPOSAL_TYPE] proposal - happy cases", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should accept the proposal", async () => {
        await configController.createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(owner).acceptProposal(proposalId)).to.not.be.reverted;
    });

    it("should emit the event when the proposal is accepted", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        
        const tx = await configController.connect(owner).acceptProposal(proposalId);
        const receipt = await tx.wait();
        const event = receipt.events?.find(
            (e) => e.event === "[PROPOSAL_EVENT_NAME]"
        );
        expect(event).to.not.be.undefined;
        // Check event args based on proposal type
    });

    it("should correctly change the storage", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);

        await configController.connect(owner).acceptProposal(proposalId);
        
        const proposal = await configController.proposals(proposalId);
        expect(proposal.expirationTime).to.equal(0);
    });

    it("should [PROPOSAL_SPECIFIC_ACTION]", async () => {
        // Add proposal-specific acceptance tests
        // e.g., "should initiate the collateral removal"
        // e.g., "should transfer ownership"
        // e.g., "should update configuration"
    });

    it("should allow curator to accept proposal", async () => {
        await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(curator).acceptProposal(proposalId)).to.not.be.reverted;
    });

    it("should correctly handle multiple proposals and accept them in sequence", async () => {
        // Create multiple proposals
        // Accept them in sequence
        // Verify state changes
    });

    it("should proposal be active after the proposal is reverted", async () => {
        const proposalId = await configController.proposalCounter();
        const proposal = await configController.proposals(proposalId);
        expect(proposal.expirationTime).to.not.equal(0);
    });
});
```

### Accept Proposal Tests - Reverts
```typescript
describe("accept [PROPOSAL_TYPE] proposal - reverts", () => {
    after(async () => {
        await snapshot.restore();
    });

    it("should revert when trying to accept proposal before maturity period", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
    });

    it("should revert when trying to accept proposal after expiration", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        
        await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "ProposalExpired");
    });

    it("should revert when non-owner tries to accept proposal", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(
            configController.connect(users[0]).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert when trying to accept non-existent proposal", async () => {
        const nonExistentProposalId = 999;
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(
            configController.connect(owner).acceptProposal(nonExistentProposalId)
        ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });

    it("should revert when trying to accept already accepted proposal", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);

        await configController.connect(owner).acceptProposal(proposalId);
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });

    it("should revert when [PROPOSAL_SPECIFIC_CONDITION]", async () => {
        // Add proposal-specific revert tests
        // e.g., "should revert when collateral token is no longer in comet"
        // e.g., "should revert when guardian tries to accept proposal"
    });

    it("should revert when proposal is not matured", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
    });

    it("should revert when proposal is expired", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        
        await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "ProposalExpired");
    });

    it("should revert when proposal is cancelled", async () => {
        await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        const proposalId = await configController.proposalCounter();
        
        await configController.connect(owner).cancelProposal(proposalId);
        
        await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
        await ethers.provider.send("evm_mine", []);
        
        await expect(
            configController.connect(owner).acceptProposal(proposalId)
        ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });
});
```

## Proposal-Specific Variables to Define

### Constants
- `MATURITY_PERIOD`: Time before proposal can be accepted
- `LIFETIME_PERIOD`: Time before proposal expires
- `TIMELOCK_PERIOD`: Time before proposal can be executed (if applicable)

### Proposal-Specific Data
- `calldata`: Encoded function call or data for the proposal
- `proposalType`: Integer representing the proposal type (0-5)
- `cometAddress`: Address of the comet (or AddressZero for non-comet proposals)
- `[PROPOSAL_EVENT_NAME]`: Name of the event emitted when proposal is accepted

### Proposal-Specific Tests
- Add proposal-specific validation tests in create proposal reverts
- Add proposal-specific acceptance tests in accept proposal happy cases
- Add proposal-specific revert tests in accept proposal reverts

## Implementation Notes

1. **Use proper TypeScript types** for all contract factories and instances
2. **Handle BigNumber conversions** properly for struct parameters
3. **Use proper event extraction** from transaction receipts
4. **Test both happy path and revert scenarios** for each operation
5. **Verify state changes** after each operation
6. **Test edge cases** like expired proposals, unauthorized access, etc.
7. **Use snapshot restoration** after each describe block
8. **Add proposal-specific validation** based on the proposal type requirements

## Proposal Types Reference

| Type | Name | Description |
|------|------|-------------|
| 0 | ProposeCurator | Propose a new curator |
| 1 | ProposeCometTransfer | Transfer comet ownership |
| 2 | ProposeCollateralRemoval | Remove collateral asset from comet |
| 3 | ProposeCometConfiguration | Change comet configuration |
| 4 | ProposeCometFee | Change comet fee settings |
| 5 | ProposeCometCurve | Change comet interest rate curve | 