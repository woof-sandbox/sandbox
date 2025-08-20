import { ethers, expect, exp, makeConfigController, createComet, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

import { SandboxComet, ConfigController, FaucetToken, ICometExtension, ISandboxController } from "../build/types";

const { Zero, AddressZero } = ethers.constants;

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("26. transfer", function () {
  let owner: SignerWithAddress,
    dao: SignerWithAddress,
    curator: SignerWithAddress,
    treasury: SignerWithAddress,
    guardian: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress,
    charlie: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;
  const collateralSymbols: string[] = [];

  let baseToken: FaucetToken;
  let baseTokenDecimals: number;
  let collaterals: { [symbol: string]: FaucetToken } = {};

  let snapshot: SnapshotRestorer;

  before(async function () {
    [owner, dao, curator, guardian, treasury, bob, alice, charlie] = await ethers.getSigners();

    const opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury.address,
      curator: curator,
      guardian: guardian,
    });
    configController = opts.configController;
    sandboxController = opts.sandboxController;
    baseToken = opts.baseToken as FaucetToken;
    baseTokenDecimals = await baseToken.decimals();

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
      collateralSymbols.push(asset);
    }

    // Take snapshot after initial setup
    snapshot = await takeSnapshot();
  });

  context("transfer collateral assets", function () {
    let collateral: FaucetToken;
    let collateralDecimals: number;
    let collateralAmount: bigint;

    beforeEach(async function () {
      collateral = collaterals[collateralSymbols[0]];
      collateralDecimals = await collateral.decimals();
      collateralAmount = exp(2000, collateralDecimals);
      await collateral.allocateTo(bob.address, collateralAmount);
      await collateral.connect(bob).approve(comet.address, collateralAmount);
      await comet.connect(bob).supply(collateral.address, collateralAmount);
    });

    afterEach(async function () {
      // Restore snapshot after each test
      snapshot.restore();
    });

    it("should execute collateral transfer successfully", async () => {
      const transferAmount = collateralAmount / 2n;
      await cometExtension.connect(bob).approve(alice.address, collateral.address, transferAmount);

      await expect(await comet.connect(alice).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount)).to.not.be
        .reverted;
    });

    it("should revert if allowance is zero", async () => {
      const transferAmount = collateralAmount / 2n;
      expect(await comet.allowance(bob.address, alice.address, collateral.address)).to.equal(Zero);
      await expect(
        comet.connect(alice).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount)
      ).to.revertedWithCustomError(comet, "InsufficientAllowance");
    });

    it("should emit transfer event", async () => {
      const transferAmount = collateralAmount / 2n;
      await expect(await comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount))
        .to.emit(comet, "TransferCollateral")
        .withArgs(bob.address, alice.address, collateral.address, transferAmount);
    });

    it("should check balances after transfer", async () => {
      const transferAmount = collateralAmount / 2n;
      // Check initial balances
      expect(await comet.userCollateral(bob.address, collateral.address)).to.equal(collateralAmount);
      expect(await comet.userCollateral(alice.address, collateral.address)).to.equal(Zero);

      await comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount);
      // Check final balances
      expect(await comet.userCollateral(bob.address, collateral.address)).to.equal(collateralAmount - transferAmount);
      expect(await comet.userCollateral(alice.address, collateral.address)).to.equal(transferAmount);
    });

    it("should make a transfer within the market", async () => {
      const transferAmount = collateralAmount / 2n;
      // Get initial market balances
      const marketBalanceBefore = await collateral.balanceOf(comet.address);
      const collateralTotalSupplyBefore = await comet.totalsCollateral(collateral.address);

      await comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount);
      // Check market balances after transfer
      expect(await collateral.balanceOf(comet.address)).to.equal(marketBalanceBefore);
      expect(await comet.totalsCollateral(collateral.address)).to.equal(collateralTotalSupplyBefore);
    });

    it("should revert if transferring more than balance", async () => {
      // @todo need add custom error for this test case
      const excessTransferAmount = collateralAmount + 1n;
      // Try transferring excess amount
      await expect(comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, excessTransferAmount)).to.be
        .reverted;
    });

    it("should revert if transferring zero amount", async () => {
      const transferAmount = Zero;
      // Try transferring zero amount
      await expect(
        comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount)
      ).to.be.revertedWithCustomError(comet, "ZeroAmount");
    });

    it("should revert if transferring to self", async () => {
      const transferAmount = collateralAmount / 2n;
      // Try transferring to self
      await expect(
        comet.connect(bob).transferAssetFrom(bob.address, bob.address, collateral.address, transferAmount)
      ).to.be.revertedWithCustomError(comet, "NoSelfTransfer");
    });

    it("should revert if transfer is paused", async () => {
      const transferAmount = collateralAmount / 2n;
      // Set transferPaused to true
      await comet.connect(dao).pause(false, true, false, false, false);
      // Try transferring while paused
      await expect(
        comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount)
      ).to.be.revertedWithCustomError(comet, "Paused");
    });

    it("should revert if collateral used for borrowing", async () => {
      const transferAmount = collateralAmount;
      const borrowAmount = exp(2000, baseTokenDecimals);
      await comet.connect(bob).withdraw(baseToken.address, borrowAmount);
      expect(await comet.borrowBalanceOf(bob.address)).to.equal(borrowAmount);
      // Try transferring collateral while borrowed
      await expect(
        comet.connect(bob).transferAssetFrom(bob.address, alice.address, collateral.address, transferAmount)
      ).to.be.revertedWithCustomError(comet, "NotCollateralized");
    });
  });

  context("transfer base asset", function () {
    let lendAmount: bigint;
    let borrowAmount: bigint;
    let collateral: FaucetToken;
    let collateralDecimals: number;
    let collateralAmount: bigint;

    beforeEach(async function () {
      // Setup lending position for bob
      lendAmount = exp(2000, baseTokenDecimals);
      await baseToken.allocateTo(bob.address, lendAmount);
      await baseToken.connect(bob).approve(comet.address, lendAmount);
      await comet.connect(bob).supply(baseToken.address, lendAmount);
      // Setup borrowing position for alice
      collateral = collaterals[collateralSymbols[0]];
      collateralDecimals = await collateral.decimals();
      collateralAmount = exp(2000, collateralDecimals);

      await collateral.connect(alice).allocateTo(alice.address, collateralAmount);
      await collateral.connect(alice).approve(comet.address, collateralAmount);
      await comet.connect(alice).supply(collateral.address, collateralAmount);
      borrowAmount = exp(1000, baseTokenDecimals);
      await comet.connect(alice).withdraw(baseToken.address, borrowAmount);
    });

    afterEach(async function () {
      // Restore snapshot after each test
      snapshot.restore();
    });

    it("should execute base token transfer successfully", async () => {
      const transferAmount = lendAmount;
      await expect(await comet.connect(bob).transfer(charlie.address, transferAmount)).to.not.be.reverted;
    });

    it("should revert if transfer amount is smaller than minimum", async () => {
      const baseBorrowMin = BigInt((await comet.baseBorrowMin()).toString());
      const transferAmount = baseBorrowMin - 1n;
      await expect(comet.connect(charlie).transfer(bob.address, transferAmount)).to.be.revertedWithCustomError(comet, "BorrowTooSmall");
    });

    it("should emit transfer events", async () => {
      // Event checks are performed only for the transfer method because all methods related to base asset transfers
      // internally use the transferBase function. This ensures that event emission logic is consistent across all such methods,
      // so it is sufficient to verify event correctness in a single representative test.
      const transferAmount = lendAmount / 2n;

      const tx = await comet.connect(bob).transfer(charlie.address, transferAmount);
      const receipt = await tx.wait();

      const events = receipt.events?.filter(e => e.event === "Transfer");
      expect(events).to.have.lengthOf(2);
      const percent = 1n; // 0.0001%
      const allowedDelta = (transferAmount * percent) / exp(100, 4);
      expect(events[0].args[0]).to.equal(bob.address);
      expect(events[0].args[1]).to.equal(AddressZero);
      expect(events[0].args[2]).to.be.closeTo(transferAmount, allowedDelta);
      expect(events[1].args[0]).to.equal(AddressZero);
      expect(events[1].args[1]).to.equal(charlie.address);
      expect(events[1].args[2]).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should emit transfer by only the sender", async () => {
      const transferAmount = lendAmount / 2n;

      const tx = await comet.connect(bob).transfer(alice.address, transferAmount);
      const receipt = await tx.wait();

      const events = receipt.events?.filter(e => e.event === "Transfer");
      expect(events).to.have.lengthOf(1);
      const percent = 1n; // 0.0001%
      const allowedDelta = (transferAmount * percent) / exp(100, 4);
      expect(events[0].args[0]).to.equal(bob.address);
      expect(events[0].args[1]).to.equal(AddressZero);
      expect(events[0].args[2]).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should emit transfer by only the recipient", async () => {
      const transferAmount = exp(500, baseTokenDecimals);

      const tx = await comet.connect(alice).transfer(charlie.address, transferAmount);
      const receipt = await tx.wait();

      const events = receipt.events?.filter(e => e.event === "Transfer");
      expect(events).to.have.lengthOf(1);
      const percent = 1n; // 0.0001%
      const allowedDelta = (transferAmount * percent) / exp(100, 4);
      expect(events[0].args[0]).to.equal(AddressZero);
      expect(events[0].args[1]).to.equal(charlie.address);
      expect(events[0].args[2]).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should not emit transfer events", async () => {
      await collateral.connect(bob).allocateTo(bob.address, collateralAmount);
      await collateral.connect(bob).approve(comet.address, collateralAmount);
      await comet.connect(bob).supply(collateral.address, collateralAmount);
      await comet.connect(bob).withdrawAllFrom(bob.address, bob.address);

      const transferAmount = exp(500, baseTokenDecimals);

      const tx = await comet.connect(bob).transfer(alice.address, transferAmount);
      const receipt = await tx.wait();

      const events = receipt.events?.filter(e => e.event === "Transfer");
      expect(events).to.have.lengthOf(Zero);
    });

    it("should increase sender's borrow on base token transfer", async () => {
      const transferAmount = exp(500, baseTokenDecimals);
      const percent = 1n; // 0.0001%
      let allowedDelta = (borrowAmount * percent) / exp(100, 4);
      expect(await comet.borrowBalanceOf(alice.address)).to.be.closeTo(borrowAmount, allowedDelta);

      await comet.connect(alice).transfer(charlie.address, transferAmount);

      allowedDelta = ((borrowAmount + transferAmount) * percent) / exp(100, 4);
      expect(await comet.borrowBalanceOf(alice.address)).to.be.closeTo(borrowAmount + transferAmount, allowedDelta);
    });

    it("should increase recipient's lend on base token transfer", async () => {
      const transferAmount = exp(300, baseTokenDecimals);
      expect(await comet.balanceOf(charlie.address)).to.equal(Zero);

      await comet.connect(alice).transfer(charlie.address, transferAmount);

      const percent = 1n; // 0.0001%
      const allowedDelta = (transferAmount * percent) / exp(100, 4);
      expect(await comet.balanceOf(charlie.address)).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should decrease recipient's borrow on base token transfer", async () => {
      const transferAmount = exp(500, baseTokenDecimals);
      const percent = 1n; // 0.0001%
      let allowedDelta = (borrowAmount * percent) / exp(100, 4);
      expect(await comet.borrowBalanceOf(alice.address)).to.be.closeTo(borrowAmount, allowedDelta);

      await comet.connect(bob).transfer(alice.address, transferAmount);

      allowedDelta = ((borrowAmount - transferAmount) * percent) / exp(100, 4);
      expect(await comet.borrowBalanceOf(alice.address)).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should decrease sender's lend on base token transfer", async () => {
      const transferAmount = exp(500, baseTokenDecimals);
      const percent = 1n; // 0.0001%
      let allowedDelta = (lendAmount * percent) / exp(100, 4);

      expect(await comet.balanceOf(bob.address)).to.be.closeTo(lendAmount, allowedDelta);

      await comet.connect(bob).transfer(alice.address, transferAmount);

      allowedDelta = ((lendAmount - transferAmount) * percent) / 1000000n;
      expect(await comet.balanceOf(bob.address)).to.be.closeTo(lendAmount - transferAmount, allowedDelta);
    });

    it("should execute base asset transferFrom successfully", async () => {
      const transferAmount = exp(100, baseTokenDecimals);

      await cometExtension.connect(bob).approve(alice.address, baseToken.address, transferAmount);
      await comet.connect(alice).transferFrom(bob.address, charlie.address, transferAmount);
    });

    it("should revert if allowance is insufficient", async () => {
      const transferAmount = exp(100, baseTokenDecimals);

      expect(await comet.allowance(bob.address, alice.address, baseToken.address)).to.equal(Zero);
      await expect(comet.connect(alice).transferFrom(bob.address, charlie.address, transferAmount)).to.revertedWithCustomError(
        comet,
        "InsufficientAllowance"
      );
    });

    it("should update user balances after base asset transfer by operator", async () => {
      const transferAmount = exp(100, baseTokenDecimals);
      const percent = 1n; // 0.0001%
      let allowedDelta = (lendAmount * percent) / exp(100, 4);

      expect(await comet.balanceOf(bob.address)).to.be.closeTo(lendAmount, allowedDelta);
      expect(await comet.balanceOf(charlie.address)).to.equal(Zero);

      await cometExtension.connect(bob).approve(alice.address, baseToken.address, transferAmount);
      await comet.connect(alice).transferFrom(bob.address, charlie.address, transferAmount);

      allowedDelta = ((lendAmount - transferAmount) * percent) / exp(100, 4);
      expect(await comet.balanceOf(bob.address)).to.be.closeTo(lendAmount - transferAmount, allowedDelta);
      allowedDelta = (transferAmount * percent) / exp(100, 4);
      expect(await comet.balanceOf(charlie.address)).to.be.closeTo(transferAmount, allowedDelta);
    });

    it("should execute base asset transferAllFrom successfully", async () => {
      await cometExtension.connect(bob).approveAll(alice.address, true);
      await expect(comet.connect(alice).transferAllFrom(bob.address, charlie.address)).to.not.be.reverted;
    });
  });
});
