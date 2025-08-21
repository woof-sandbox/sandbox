import { ethers, expect, exp, makeConfigController, createComet, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

import { SandboxComet, ConfigControllerPause, ConfigControllerPause__factory, FaucetToken, ISandboxController } from "../build/types";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function assertNoActionsArePaused(comet: SandboxComet) {
  // All pause flags should be false by default.
  expect(await comet.isSupplyPaused()).to.be.false;
  expect(await comet.isTransferPaused()).to.be.false;
  expect(await comet.isWithdrawPaused()).to.be.false;
  expect(await comet.isAbsorbPaused()).to.be.false;
  expect(await comet.isBuyPaused()).to.be.false;
}

async function assertAllActionsArePaused(comet: SandboxComet) {
  // All pause flags should be true after pausing.
  expect(await comet.isSupplyPaused()).to.be.true;
  expect(await comet.isTransferPaused()).to.be.true;
  expect(await comet.isWithdrawPaused()).to.be.true;
  expect(await comet.isAbsorbPaused()).to.be.true;
  expect(await comet.isBuyPaused()).to.be.true;
}

describe("24. Pause Guardian", function () {
  let owner: SignerWithAddress,
    dao: SignerWithAddress,
    curator: SignerWithAddress,
    treasury: SignerWithAddress,
    guardian: SignerWithAddress,
    user: SignerWithAddress;
  let comet: SandboxComet;
  let configController: ConfigControllerPause;
  let sandboxController: ISandboxController;

  let baseToken: FaucetToken;
  let baseTokenDecimals: number;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  const collateralSymbols: string[] = [];

  let snapshot: SnapshotRestorer;

  before(async function () {
    [owner, dao, curator, treasury, guardian, user] = await ethers.getSigners();

    const _configController = (await ethers.getContractFactory("ConfigControllerPause")) as ConfigControllerPause__factory;
    const _configControllerImplAddress = (await _configController.deploy()).address;

    const opts = await makeConfigController(
      {
        owner: owner,
        dao: dao,
        treasury: treasury.address,
        curator: curator,
        guardian: guardian,
      },
      _configControllerImplAddress
    );
    configController = (await ethers.getContractAt("ConfigControllerPause", opts.configController.address)) as ConfigControllerPause;
    sandboxController = opts.sandboxController;
    baseToken = opts.baseToken as FaucetToken;
    baseTokenDecimals = await baseToken.decimals();

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
      collateralSymbols.push(asset);
    }

    // Take snapshot after initial setup
    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    // Restore snapshot after each test
    snapshot.restore();
  });

  it("Should emit pause action event", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);

    const expectedPauseState = {
      supplyPaused: true,
      transferPaused: false,
      withdrawPaused: true,
      absorbPaused: false,
      buyPaused: true,
    };

    // Pause the supply, withdraw and buy
    await expect(configController.pauseMarket(comet.address, true, false, true, false, true))
      .to.emit(comet, "PauseAction")
      .withArgs(
        expectedPauseState.supplyPaused,
        expectedPauseState.transferPaused,
        expectedPauseState.withdrawPaused,
        expectedPauseState.absorbPaused,
        expectedPauseState.buyPaused
      );
  });

  it("Should change supply pause state", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the supply
    await configController.pauseMarket(comet.address, true, false, false, false, false);

    const expectedSupplyPauseState = true;

    expect(await comet.isSupplyPaused()).to.equal(expectedSupplyPauseState);
    expect(await comet.isTransferPaused()).to.be.false;
    expect(await comet.isWithdrawPaused()).to.be.false;
    expect(await comet.isAbsorbPaused()).to.be.false;
    expect(await comet.isBuyPaused()).to.be.false;
  });

  it("Should pause supply action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the supply
    await configController.pauseMarket(comet.address, true, false, false, false, false);

    const supplyBaseAmount = exp(10, baseTokenDecimals);
    // Try to supply after pause
    await expect(comet.connect(user).supply(baseToken.address, supplyBaseAmount)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause supplyTo action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the supply
    await configController.pauseMarket(comet.address, true, false, false, false, false);

    const supplyBaseAmount = exp(10, baseTokenDecimals);
    // Try to supplyTo after pause
    await expect(comet.connect(user).supplyTo(curator.address, baseToken.address, supplyBaseAmount)).to.be.revertedWithCustomError(
      comet,
      "Paused"
    );
  });

  it("Should pause supplyFrom action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the supply
    await configController.pauseMarket(comet.address, true, false, false, false, false);

    const supplyBaseAmount = exp(10, baseTokenDecimals);
    // Try to supplyFrom after pause
    await expect(
      comet.connect(user).supplyFrom(user.address, curator.address, baseToken.address, supplyBaseAmount)
    ).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause repayAllFrom action", async function () {
    // Setup test case
    // Supply collateral and open borrow position
    const collateral = collaterals[collateralSymbols[0]];
    const supplyCollateralAmount = exp(1000, await collateral.decimals());
    const borrowAmount = exp(200, baseTokenDecimals);

    await collateral.allocateTo(user.address, supplyCollateralAmount);
    await collateral.connect(user).approve(comet.address, supplyCollateralAmount);

    await comet.connect(user).supply(collateral.address, supplyCollateralAmount);
    await comet.connect(user).withdraw(baseToken.address, borrowAmount);

    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the supply
    await configController.pauseMarket(comet.address, true, false, false, false, false);
    // Try to repayAllFrom after pause
    await expect(comet.connect(user).repayAllFrom(user.address, user.address)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should change transfer pause state", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the transfer
    await configController.pauseMarket(comet.address, false, true, false, false, false);

    const expectedTransferPauseState = true;

    expect(await comet.isSupplyPaused()).to.be.false;
    expect(await comet.isTransferPaused()).to.equal(expectedTransferPauseState);
    expect(await comet.isWithdrawPaused()).to.be.false;
    expect(await comet.isAbsorbPaused()).to.be.false;
    expect(await comet.isBuyPaused()).to.be.false;
  });

  it("Should pause transfer action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the transfer
    await configController.pauseMarket(comet.address, false, true, false, false, false);

    const transferBaseAmount = exp(500, await baseToken.decimals());
    // Try to transfer after pause
    await expect(comet.connect(user).transfer(curator.address, transferBaseAmount)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause transferFrom action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the transfer
    await configController.pauseMarket(comet.address, false, true, false, false, false);

    const transferBaseAmount = exp(500, await baseToken.decimals());
    // Try to transferFrom after pause
    await expect(comet.connect(user).transferFrom(user.address, curator.address, transferBaseAmount)).to.be.revertedWithCustomError(
      comet,
      "Paused"
    );
  });

  it("Should pause transferAssetFrom action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the transfer
    await configController.pauseMarket(comet.address, false, true, false, false, false);

    const collateral = collaterals[collateralSymbols[0]];
    const transferAssetAmount = exp(500, await collateral.decimals());
    // Try to transfer after pause
    await expect(
      comet.connect(user).transferAssetFrom(user.address, curator.address, collateral.address, transferAssetAmount)
    ).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause transferAllFrom action", async function () {
    // Setup test case
    // Supply base token for open lend position
    const supplyBaseAmount = exp(1000, await baseToken.decimals());

    await baseToken.allocateTo(user.address, supplyBaseAmount);
    await baseToken.connect(user).approve(comet.address, supplyBaseAmount);

    await comet.connect(user).supply(baseToken.address, supplyBaseAmount);

    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the transfer
    await configController.pauseMarket(comet.address, false, true, false, false, false);
    // Try to transfer after pause
    await expect(comet.connect(user).transferAllFrom(user.address, curator.address)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should change withdraw pause state", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the withdraw
    await configController.pauseMarket(comet.address, false, false, true, false, false);

    const expectedWithdrawPauseState = true;

    expect(await comet.isSupplyPaused()).to.be.false;
    expect(await comet.isTransferPaused()).to.be.false;
    expect(await comet.isWithdrawPaused()).to.equal(expectedWithdrawPauseState);
    expect(await comet.isAbsorbPaused()).to.be.false;
    expect(await comet.isBuyPaused()).to.be.false;
  });

  it("Should pause withdraw action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the withdraw
    await configController.pauseMarket(comet.address, false, false, true, false, false);

    const withdrawBaseAmount = exp(500, await baseToken.decimals());
    // Try to withdraw after pause
    await expect(comet.connect(user).withdraw(baseToken.address, withdrawBaseAmount)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause withdrawTo action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the withdraw
    await configController.pauseMarket(comet.address, false, false, true, false, false);

    const withdrawBaseAmount = exp(500, await baseToken.decimals());
    // Try to withdrawTo after pause
    await expect(comet.connect(user).withdrawTo(curator.address, baseToken.address, withdrawBaseAmount)).to.be.revertedWithCustomError(
      comet,
      "Paused"
    );
  });

  it("Should pause withdrawFrom action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the withdraw
    await configController.pauseMarket(comet.address, false, false, true, false, false);

    const withdrawBaseAmount = exp(500, await baseToken.decimals());
    // Try to withdrawFrom after pause
    await expect(
      comet.connect(user).withdrawFrom(user.address, curator.address, baseToken.address, withdrawBaseAmount)
    ).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should pause withdrawAllFrom action", async function () {
    // Setup test case
    // Supply base token for open lend position
    const supplyBaseAmount = exp(1000, baseTokenDecimals);

    await baseToken.allocateTo(user.address, supplyBaseAmount);
    await baseToken.connect(user).approve(comet.address, supplyBaseAmount);

    await comet.connect(user).supply(baseToken.address, supplyBaseAmount);

    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the withdraw
    await configController.pauseMarket(comet.address, false, false, true, false, false);

    // Try to withdrawAllFrom after pause
    await expect(comet.connect(user).withdrawAllFrom(user.address, curator.address)).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should change absorb pause state", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the absorb
    await configController.pauseMarket(comet.address, false, false, false, true, false);

    const expectedAbsorbPauseState = true;

    expect(await comet.isSupplyPaused()).to.be.false;
    expect(await comet.isTransferPaused()).to.be.false;
    expect(await comet.isWithdrawPaused()).to.be.false;
    expect(await comet.isAbsorbPaused()).to.equal(expectedAbsorbPauseState);
    expect(await comet.isBuyPaused()).to.be.false;
  });

  it("Should pause absorb action", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the absorb
    await configController.pauseMarket(comet.address, false, false, false, true, false);
    // Try to absorb after pause
    await expect(comet.connect(user).absorb(baseToken.address, [curator.address])).to.be.revertedWithCustomError(comet, "Paused");
  });

  it("Should change buy pause state", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Pause the buy
    await configController.pauseMarket(comet.address, false, false, false, false, true);
    const collateral = collaterals[collateralSymbols[0]];
    const minAmount = exp(5, await collateral.decimals());
    const baseAmount = exp(50, await baseToken.decimals());
    // Try to buy after pause
    await expect(comet.connect(user).buyCollateral(collateral.address, minAmount, baseAmount, user.address)).to.be.revertedWithCustomError(
      comet,
      "Paused"
    );
  });

  it("Should change all pause states", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    //  1st tx: pause all actions
    await configController.pauseMarket(comet.address, true, true, true, true, true);
    // Check pause state after 1st tx
    await assertAllActionsArePaused(comet);
    //  2nd tx: unpause all actions
    await comet.connect(dao).pause(false, false, false, false, false);
    // Check pause state after 2nd tx
    await assertNoActionsArePaused(comet);
  });

  it("Should allow pausing when called by dao", async function () {
    // Check initial pause state
    await assertNoActionsArePaused(comet);
    // Set all actions to paused
    await comet.connect(dao).pause(true, true, true, true, true);
    // Check pause state after dao call
    await assertAllActionsArePaused(comet);
  });

  it("Should revert if not called by dao or config controller", async function () {
    await expect(comet.connect(curator).pause(true, true, true, true, true)).to.be.revertedWithCustomError(comet, "Unauthorized");
  });
});
