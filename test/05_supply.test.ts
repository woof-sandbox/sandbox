import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  ethers,
  expect,
  exp,
  makeConfigController,
  createComet,
  makeMockERC20,
  SnapshotRestorer,
  takeSnapshot,
  defaultAssets,
} from "./helper/helpers";

import {
  SandboxComet,
  ConfigController,
  FaucetToken,
  ICometExtension,
  ISandboxController,
  NonStandardFaucetFeeToken__factory,
  NonStandardFaucetFeeToken,
  EvilToken,
  EvilToken__factory,
} from "../build/types";

import { BigNumber } from "ethers";

// Note: isolated supply functionality, withdraw and repay are tested in separate testsets
describe("5. supply", function () {
  let owner, dao, curator, treasury, guardian, alice, bob: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  const baseTokenDecimals: number = 6;
  let baseToken: FaucetToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  let seedReserve: BigNumber;

  before(async function () {
    [owner, dao, treasury, curator, guardian, alice, bob] = await ethers.getSigners();

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
    expect(await baseToken.decimals()).to.equal(baseTokenDecimals);

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    seedReserve = await sandboxController.suggestedAmountOfSeedReserves(baseToken.address);

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }

    await baseToken.allocateTo(alice.address, exp(1e10, baseTokenDecimals));
    await baseToken.allocateTo(bob.address, exp(1e10, baseTokenDecimals));
  });

  describe("supply base asset", function () {
    describe("default state (un-accrued)", function () {
      it("supply is not paused by default", async () => {
        expect(await comet.isSupplyPaused()).to.be.false;
      });

      it("no base token on the comet", async () => {
        expect(await baseToken.balanceOf(comet.address)).to.equal(seedReserve);
      });

      it("no collateral tokens on the comet", async () => {
        for (let asset in collaterals) {
          expect(await collaterals[asset].balanceOf(comet.address)).to.equal(0);
        }
      });

      it("default supply index", async () => {
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.equal(exp(1, 15));
      });

      it("no stored total supply with interest by default", async () => {
        expect((await cometExtension.totalsBasic()).totalSupplyBase).to.equal(0);
      });

      it("no displayed total supply with interest by default", async () => {
        expect(await comet.totalSupply()).to.equal(0);
      });

      it("no stored user's balance by default", async () => {
        expect((await comet.userBasic(alice.address)).principal).to.equal(0);
      });

      it("no displayed user's balance by default", async () => {
        expect(await comet.balanceOf(alice.address)).to.equal(0);
      });
    });

    describe("supply base asset: reverts", function () {
      it("reverts if supply is paused", async () => {
        await comet.connect(dao).pause(true, false, false, false, false);
        expect(await comet.isSupplyPaused()).to.be.true;

        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(comet.connect(alice).supply(baseToken.address, 1)).to.be.revertedWithCustomError(comet, "Paused");
        await comet.connect(dao).pause(false, false, false, false, false);
      });

      it("reverts for 0 base asset supply", async () => {
        await expect(comet.connect(alice).supply(baseToken.address, 0)).to.be.revertedWithCustomError(comet, "ZeroAmount");
      });

      it("reverts for not enough base asset balance", async () => {
        const balanceBefore = await baseToken.balanceOf(alice.address);

        await baseToken.connect(alice).approve(comet.address, balanceBefore.add(1));
        await expect(comet.connect(alice).supply(baseToken.address, balanceBefore.add(1))).to.be.reverted;
        await baseToken.connect(alice).approve(comet.address, 0);
      });

      it("reverts if the asset is neither collateral nor base", async () => {
        const newToken = await makeMockERC20({ name: "T1", symbol: "T1" });
        await newToken.allocateTo(alice.address, exp(1, 18));

        await newToken.connect(alice).approve(comet.address, exp(1, 18));
        await expect(comet.connect(alice).supply(newToken.address, 1)).to.be.revertedWithCustomError(comet, "BadAsset");
      });

      it("revert if asset = 0", async () => {
        await expect(comet.connect(alice).supply(ethers.constants.AddressZero, 1)).to.be.revertedWithCustomError(comet, "ZeroAddress");
      });
    });

    describe("supply base asset into empty pool", function () {
      const BASE_AMOUNT: bigint = exp(5e9, baseTokenDecimals);
      let aliceBalanceBefore: BigNumber;
      let aliceBalanceAfter: BigNumber;

      it("wait and accrue state", async () => {
        // wait with empty comet for a while
        await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
        await ethers.provider.send("evm_mine", []);

        await comet.accrueAccount(alice.address);
      });

      it("emits Supply event when supplies base asset into empty pool", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, BASE_AMOUNT);
        expect(await comet.connect(alice).supply(baseToken.address, BASE_AMOUNT))
          .emit(comet, "Supply")
          .withArgs(alice.address, alice.address, BASE_AMOUNT);

        await snapshot.restore();
      });

      it("emits Transfer event when supplies base asset into empty pool (as supply growths)", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        const principalFromBase = BASE_AMOUNT; // default index for the empty pool gives same supply amount

        await baseToken.connect(alice).approve(comet.address, BASE_AMOUNT);
        expect(await comet.connect(alice).supply(baseToken.address, BASE_AMOUNT))
          .emit(comet, "Transfer")
          .withArgs(ethers.constants.AddressZero, alice.address, principalFromBase);

        await snapshot.restore();
      });

      it("supplies base asset into empty pool", async () => {
        aliceBalanceBefore = await baseToken.balanceOf(alice.address);

        await baseToken.connect(alice).approve(comet.address, BASE_AMOUNT);
        await expect(comet.connect(alice).supply(baseToken.address, BASE_AMOUNT)).to.not.be.reverted;

        aliceBalanceAfter = await baseToken.balanceOf(alice.address);
      });

      it("should supply the exact balance as passed as a parameter", async () => {
        expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.equal(BASE_AMOUNT);
      });

      it("comet's token balance is increased", async () => {
        expect(await baseToken.balanceOf(comet.address)).to.equal(seedReserve.add(BASE_AMOUNT));
      });

      it("user's stored principle is increased", async () => {
        const principalFromBase = BASE_AMOUNT; // default index for the empty pool gives same supply amount

        expect((await comet.userBasic(alice.address)).principal).to.equal(principalFromBase);
      });

      it("user's displayed principle is increased", async () => {
        const presentFromBase = BASE_AMOUNT; // default index for the empty pool gives same supply amount

        expect(await comet.balanceOf(alice.address)).to.equal(presentFromBase);
      });

      it("comet's stored total supply is increased", async () => {
        const principalFromBase = BASE_AMOUNT; // default index for the empty pool gives same supply amount

        expect((await cometExtension.totalsBasic()).totalSupplyBase).to.equal(principalFromBase);
      });

      it("comet's displayed total supply is increased", async () => {
        const presentFromBase = BASE_AMOUNT; // default index for the empty pool gives same supply amount

        expect(await comet.totalSupply()).to.equal(presentFromBase);
      });

      it("user supply is same as total supply", async () => {
        expect(await comet.balanceOf(alice.address)).to.equal(await comet.totalSupply());
      });
    });

    describe("supply base asset: happy case", function () {
      const SUPPLIED_AMOUNT_ALICE: bigint = exp(2e9, baseTokenDecimals);
      let aliceBalanceBefore: BigNumber;
      let cometBalanceBefore: BigNumber;
      let aliceDisplayBalanceBefore: BigNumber;
      let alicePrincipalBefore: BigNumber;
      let cometSupplyIndexBefore: BigNumber;
      let cometSupplyRateBefore: BigNumber;
      let cometUpdatedTimeBefore: number;

      const SUPPLIED_AMOUNT_BOB: bigint = exp(1e9, baseTokenDecimals);
      let bobBalanceBefore: BigNumber;

      before(async function () {
        aliceBalanceBefore = await baseToken.balanceOf(alice.address);
        cometBalanceBefore = await baseToken.balanceOf(comet.address);
        aliceDisplayBalanceBefore = await comet.balanceOf(alice.address);
        alicePrincipalBefore = (await comet.userBasic(alice.address)).principal;
        cometSupplyIndexBefore = (await cometExtension.totalsBasic()).baseSupplyIndex;
        cometSupplyRateBefore = await comet.getSupplyRate(0);
        cometUpdatedTimeBefore = (await cometExtension.totalsBasic()).lastAccrualTime;

        // wait with empty comet for a while
        await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
        await ethers.provider.send("evm_mine", []);
      });

      it("initial state: totalSupply > 0 and supplyRate > 0", async () => {
        const storedSupply = (await cometExtension.totalsBasic()).totalSupplyBase;
        expect(storedSupply).to.be.greaterThan(0);

        const displayedSupply = storedSupply.mul((await cometExtension.totalsBasic()).baseSupplyIndex).div(exp(1, 15));
        expect(await comet.totalSupply()).to.be.greaterThan(displayedSupply);

        /// No borrows, but lenders got stimulus from seed reserves
        expect(await comet.getSupplyRate(0)).to.be.greaterThan(0);
      });

      it("should allow 2nd deposit from alice: emits Supply event for existing supply", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, SUPPLIED_AMOUNT_ALICE);
        expect(await comet.connect(alice).supply(baseToken.address, SUPPLIED_AMOUNT_ALICE))
          .emit(comet, "Supply")
          .withArgs(alice.address, alice.address, SUPPLIED_AMOUNT_ALICE);

        await snapshot.restore();
      });

      it("should allow 2nd deposit from alice: emits Transfer event for existing supply", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        const lastUpdated = (await cometExtension.totalsBasic()).lastAccrualTime;

        await baseToken.connect(alice).approve(comet.address, SUPPLIED_AMOUNT_ALICE);
        expect(await comet.connect(alice).supply(baseToken.address, SUPPLIED_AMOUNT_ALICE))
          .emit(comet, "Transfer")
          .withArgs(
            ethers.constants.AddressZero,
            alice.address,
            await getPrincipalChange(comet, lastUpdated, 0, alice.address, BigNumber.from(SUPPLIED_AMOUNT_ALICE))
          );

        await snapshot.restore();
      });

      it("should allow 2nd deposit from alice: accrues the state", async () => {
        const lastUpdated = (await cometExtension.totalsBasic()).lastAccrualTime;

        await baseToken.connect(alice).approve(comet.address, SUPPLIED_AMOUNT_ALICE);
        await comet.connect(alice).supply(baseToken.address, SUPPLIED_AMOUNT_ALICE);

        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.be.greaterThan(lastUpdated);
        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
      });

      it("supples from alice the exact balance as in parameter", async () => {
        const aliceBalanceAfter = await baseToken.balanceOf(alice.address);

        expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.equal(SUPPLIED_AMOUNT_ALICE);
      });

      it("Comet token balance growths", async () => {
        const cometBalanceAfter = await baseToken.balanceOf(comet.address);

        expect(cometBalanceAfter.sub(cometBalanceBefore)).to.equal(SUPPLIED_AMOUNT_ALICE);
      });

      it("alice's principal growths", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const oldBalance = alicePrincipalBefore.mul(accruedIndex).div(1e15);
        const newPrincipal = oldBalance.add(SUPPLIED_AMOUNT_ALICE).mul(1e15).div(accruedIndex);

        expect((await comet.userBasic(alice.address)).principal).to.be.greaterThan(alicePrincipalBefore);
        expect((await comet.userBasic(alice.address)).principal).to.equal(newPrincipal);
      });

      it("alice's displayed balance growths", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const oldBalance = alicePrincipalBefore.mul(cometSupplyIndexBefore).div(exp(1, 15));
        const newBalanceNaive = oldBalance.add(SUPPLIED_AMOUNT_ALICE);

        const newPrincipal = (await comet.userBasic(alice.address)).principal;
        const newBalanceFromPrincipal = newPrincipal.mul(accruedIndex).div(exp(1, 15));

        const newBalance = await comet.balanceOf(alice.address);
        expect(newBalance).to.be.greaterThanOrEqual(newBalanceNaive);
        expect(newBalance.sub(aliceDisplayBalanceBefore)).to.be.greaterThanOrEqual(SUPPLIED_AMOUNT_ALICE);
        expect(newBalance).to.equal(newBalanceFromPrincipal);
      });

      it("Comet's stored total supply corresponds to provided principal", async () => {
        /// currently it is an accrued state, so we can compare directly
        /// single supplier at the moment
        expect((await cometExtension.totalsBasic()).totalSupplyBase).to.equal((await comet.userBasic(alice.address)).principal);
      });

      it("Comet's displayed total supply corresponds to provided token balance", async () => {
        /// currently it is an accrued state, so we can compare directly
        /// single supplier at the moment
        expect(await comet.totalSupply()).to.equal(await comet.balanceOf(alice.address));
      });

      it("wait for new state for bob and update global variables", async () => {
        bobBalanceBefore = await baseToken.balanceOf(bob.address);
        cometBalanceBefore = await baseToken.balanceOf(comet.address);
        /// no deposits from bob yet
        expect((await comet.userBasic(bob.address)).principal).to.equal(0);

        cometSupplyIndexBefore = (await cometExtension.totalsBasic()).baseSupplyIndex;
        cometSupplyRateBefore = await comet.getSupplyRate(0);
        cometUpdatedTimeBefore = (await cometExtension.totalsBasic()).lastAccrualTime;

        // wait with empty comet for a while
        await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
        await ethers.provider.send("evm_mine", []);
      });

      it("should allow deposit from bob (new user): emits Supply event for existing supply", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(bob).approve(comet.address, SUPPLIED_AMOUNT_BOB);
        expect(await comet.connect(bob).supply(baseToken.address, SUPPLIED_AMOUNT_BOB))
          .emit(comet, "Supply")
          .withArgs(bob.address, bob.address, SUPPLIED_AMOUNT_BOB);

        await snapshot.restore();
      });

      it("should allow deposit from bob (new user): emits Transfer event for existing supply", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        const lastUpdated = (await cometExtension.totalsBasic()).lastAccrualTime;

        await baseToken.connect(bob).approve(comet.address, SUPPLIED_AMOUNT_BOB);
        expect(await comet.connect(bob).supply(baseToken.address, SUPPLIED_AMOUNT_BOB))
          .emit(comet, "Transfer")
          .withArgs(
            ethers.constants.AddressZero,
            bob.address,
            await getPrincipalChange(comet, lastUpdated, 0, bob.address, BigNumber.from(SUPPLIED_AMOUNT_BOB))
          );

        await snapshot.restore();
      });

      it("should allow deposit from bob (new user): accrues the state", async () => {
        const lastUpdated = (await cometExtension.totalsBasic()).lastAccrualTime;

        await baseToken.connect(bob).approve(comet.address, SUPPLIED_AMOUNT_BOB);
        await comet.connect(bob).supply(baseToken.address, SUPPLIED_AMOUNT_BOB);

        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.be.greaterThan(lastUpdated);
        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
      });

      it("supples from bob the exact balance as in parameter", async () => {
        const bobBalanceAfter = await baseToken.balanceOf(bob.address);

        expect(bobBalanceBefore.sub(bobBalanceAfter)).to.equal(SUPPLIED_AMOUNT_BOB);
      });

      it("Comet token balance growths", async () => {
        const cometBalanceAfter = await baseToken.balanceOf(comet.address);

        expect(cometBalanceAfter.sub(cometBalanceBefore)).to.equal(SUPPLIED_AMOUNT_BOB);
      });

      it("bob's principal growths", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        /// old balance == 0
        const oldBalance: BigNumber = BigNumber.from(0);
        const newPrincipal = oldBalance.add(SUPPLIED_AMOUNT_BOB).mul(exp(1, 15)).div(accruedIndex);

        expect((await comet.userBasic(bob.address)).principal).to.be.greaterThan(0);
        expect((await comet.userBasic(bob.address)).principal).to.equal(newPrincipal);
      });

      it("bob's displayed balance growths", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const newPrincipal = (await comet.userBasic(bob.address)).principal;

        // old balance for bob is 0
        const newBalanceFromPrincipal = newPrincipal.mul(accruedIndex).div(exp(1, 15));

        const newBalance = await comet.balanceOf(bob.address);
        expect(newBalance).to.equal(newBalanceFromPrincipal);
      });

      it("Comet's stored total supply corresponds to provided principals from all users", async () => {
        /// currently it is an accrued state, so we can compare directly
        /// get alice's and bob's suppleis together
        const alicePrincipal = (await comet.userBasic(alice.address)).principal;
        const bobPrincipal = (await comet.userBasic(bob.address)).principal;
        const totalStoredSupply = alicePrincipal.add(bobPrincipal);
        expect((await cometExtension.totalsBasic()).totalSupplyBase).to.equal(totalStoredSupply);
      });

      it("balanceOf() is >= bob's deposit", async () => {
        const newBalanceNaive = SUPPLIED_AMOUNT_BOB;

        /// Note: since there is a rounding error, the immediate comet.balanceOf() may return value
        /// which is 1 wei less than the deposited amount. Though the difference will be neglected
        /// in around 1 block of supply interest (in case if )

        const newBalance = await comet.balanceOf(bob.address);

        expect(newBalance.sub(newBalanceNaive)).to.be.approximately(0, 1);
      });

      it("Comet's displayed total supply corresponds to displayed balances from all users", async () => {
        /// currently it is an accrued state, so we can compare directly
        /// get alice's and bob's suppleis together
        const alicePresent = await comet.balanceOf(alice.address);
        const bobPresent = await comet.balanceOf(bob.address);
        const totalPresentSupply = alicePresent.add(bobPresent);

        /// Note: because of the rounding errors accumulated (supplied amount -> principle -> present value)
        /// There is a high chance to have around 1 wei difference in the displayed market supply (totalSupply())
        /// and the sum of all balances from all users
        expect(await comet.totalSupply()).to.be.approximately(totalPresentSupply, 1);
      });
    });
  });

  describe("supply collateral flow", function () {
    before(async function () {
      const collateralIndex = await comet.collateralAssetIndex(collaterals["COMP"].address);
      const supplyCap = (await comet.collateralAssets(collateralIndex)).supplyCap;
      await collaterals["COMP"].allocateTo(alice.address, supplyCap.add(exp(1, 18)));
      await collaterals["COMP"].allocateTo(bob.address, exp(1e10, 18));
    });

    describe("reverts for collaterals", function () {
      it("reverts for colalteral when supply is paused", async () => {
        await comet.connect(dao).pause(true, false, false, false, false);
        expect(await comet.isSupplyPaused()).to.be.true;

        await expect(comet.connect(alice).supply(collaterals["COMP"].address, 1)).to.be.revertedWithCustomError(comet, "Paused");
        await comet.connect(dao).pause(false, false, false, false, false);
      });

      it("reverts for not enough collateral balance", async () => {
        const balanceBefore = await collaterals["COMP"].balanceOf(alice.address);

        await collaterals["COMP"].connect(alice).approve(comet.address, balanceBefore.add(1));
        await expect(comet.connect(alice).supply(collaterals["COMP"].address, balanceBefore.add(1))).to.be.reverted;
        await collaterals["COMP"].connect(alice).approve(comet.address, 0);
      });

      it("reverts for 0 collateral amount", async () => {
        await expect(comet.connect(alice).supply(collaterals["COMP"].address, 0)).to.be.revertedWithCustomError(comet, "ZeroAmount");
      });

      it("reverts if supplying collateral exceeds the supply cap", async () => {
        const collateralIndex = await comet.collateralAssetIndex(collaterals["COMP"].address);
        const supplyCap = (await comet.collateralAssets(collateralIndex)).supplyCap;

        // health check
        expect(await collaterals["COMP"].balanceOf(alice.address)).is.greaterThan(supplyCap);

        await collaterals["COMP"].connect(alice).approve(comet.address, supplyCap.add(1));
        await expect(comet.connect(alice).supply(collaterals["COMP"].address, supplyCap.add(1))).to.be.revertedWithCustomError(
          comet,
          "SupplyCapExceeded"
        );
        await collaterals["COMP"].connect(alice).approve(comet.address, 0);
      });
    });

    describe("supply collateral: happy cases", function () {
      const ALICE_COLLATERAL_AMOUNT: BigNumber = BigNumber.from(exp(5, 17)); //0.5 of token
      let aliceCollateralBalanceBefore: BigNumber;
      let totalSupplyBefore: BigNumber;
      let cometSupplyIndexBefore: BigNumber;
      let cometSupplyRateBefore: BigNumber;
      let alicePrincipalBefore: BigNumber;
      let aliceDisplayBalanceBefore: BigNumber;
      let cometUpdatedTimeBefore: number;

      before(async function () {
        const totals = await cometExtension.totalsBasic();
        aliceCollateralBalanceBefore = await collaterals["COMP"].balanceOf(alice.address);

        totalSupplyBefore = totals.totalSupplyBase;
        cometSupplyIndexBefore = totals.baseSupplyIndex;
        cometSupplyRateBefore = await comet.getSupplyRate(0);
        alicePrincipalBefore = (await comet.userBasic(alice.address)).principal;
        aliceDisplayBalanceBefore = await comet.balanceOf(alice.address);

        cometUpdatedTimeBefore = totals.lastAccrualTime;

        // wait for a while to have impact from accrual
        await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
        await ethers.provider.send("evm_mine", []);
      });

      it("should not have collateral registered for a user", async () => {
        const collateralIndex = (await comet.getAssetInfoByAddress(collaterals["COMP"].address))[1];
        const userData = await comet.userBasic(alice.address);
        const offset = 1 << collateralIndex;

        expect(userData.assetsIn & offset).to.equal(0);
      });

      it("should not collateral in the storage", async () => {
        expect(await comet.totalsCollateral(collaterals["COMP"].address)).to.equal(0);
        expect(await comet.userCollateral(alice.address, collaterals["COMP"].address)).to.equal(0);
      });

      it("should not have collateral on the balance", async () => {
        expect(await collaterals["COMP"].balanceOf(comet.address)).to.equal(0);
      });

      it("should emit event during 1st collateral deposit", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        expect(await comet.connect(alice).supply(collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT))
          .to.emit(comet, "SupplyCollateral")
          .withArgs(alice.address, alice.address, collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        await snapshot.restore();
      });

      it("should allow collateral deposit", async () => {
        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await expect(comet.connect(alice).supply(collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT)).to.not.be.reverted;
      });

      it("collateral is added to user's tokens", async () => {
        const collateralIndex = (await comet.getAssetInfoByAddress(collaterals["COMP"].address))[1];
        const userData = await comet.userBasic(alice.address);
        const offset = 1 << collateralIndex;

        expect(userData.assetsIn & offset).to.equal(offset);
      });

      it("exact collateral token balance is supplied from alice", async () => {
        const aliceCollateralBalanceAfter = await collaterals["COMP"].balanceOf(alice.address);
        expect(aliceCollateralBalanceBefore.sub(aliceCollateralBalanceAfter)).to.equal(ALICE_COLLATERAL_AMOUNT);
      });

      it("Comet's collateral token balance growths", async () => {
        expect(await collaterals["COMP"].balanceOf(comet.address)).to.equal(ALICE_COLLATERAL_AMOUNT);
      });

      it("should correctly set alice's collateral balance", async () => {
        expect(await comet.userCollateral(alice.address, collaterals["COMP"].address)).to.equal(ALICE_COLLATERAL_AMOUNT);
      });

      it("should correctly set comet's total balance", async () => {
        expect(await comet.totalsCollateral(collaterals["COMP"].address)).to.equal(ALICE_COLLATERAL_AMOUNT);
      });

      it("should accrue state during collateral supply", async () => {
        const lastUpdated = (await cometExtension.totalsBasic()).lastAccrualTime;

        expect(lastUpdated).to.be.greaterThan(cometUpdatedTimeBefore);
        expect(lastUpdated).to.equal((await ethers.provider.getBlock("latest")).timestamp);
      });

      it("should not change alice principal after accrual (no collateral effect on principal)", async () => {
        expect((await comet.userBasic(alice.address)).principal).to.equal(alicePrincipalBefore);
      });

      it("should have correct display of alice principal", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const newBalanceFromPrincipal = alicePrincipalBefore.mul(accruedIndex).div(exp(1, 15));

        // current balance
        const newBalance = await comet.balanceOf(alice.address);

        expect(newBalance).to.equal(newBalanceFromPrincipal);
        // check the invariant that lender's balance can only grow
        expect(newBalance).to.be.greaterThan(aliceDisplayBalanceBefore);
      });

      it("should change comet's total supply correctly after accrual (no collateral effect on supply)", async () => {
        expect((await cometExtension.totalsBasic()).totalSupplyBase).to.equal(totalSupplyBefore);
      });

      it("should have correct display of total supply", async () => {
        const curTime = (await ethers.provider.getBlock("latest")).timestamp;
        const timeElapsed = curTime - cometUpdatedTimeBefore;
        const accruedIndex = cometSupplyIndexBefore.add(cometSupplyIndexBefore.mul(cometSupplyRateBefore).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const newExpectedTotalSupply = totalSupplyBefore.mul(accruedIndex).div(exp(1, 15));

        // current displayed supply
        const newSupply = await comet.totalSupply();

        expect(newSupply).to.equal(newExpectedTotalSupply);
        // check the invariant that lender's balance can only grow
        expect(newSupply).to.be.greaterThan(totalSupplyBefore);
      });

      it("should allow deposit more of the same collateral", async () => {
        aliceCollateralBalanceBefore = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await comet.connect(alice).supply(collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        expect(await comet.userCollateral(alice.address, collaterals["COMP"].address)).to.equal(
          aliceCollateralBalanceBefore.add(ALICE_COLLATERAL_AMOUNT)
        );
      });

      it("should allow deposit another collateral token", async () => {
        await collaterals["WETH"].allocateTo(alice.address, exp(1, 17)); //0.1 token

        // health check
        expect(await comet.userCollateral(alice.address, collaterals["WETH"].address)).to.equal(0);

        await collaterals["WETH"].connect(alice).approve(comet.address, exp(1, 17));
        await comet.connect(alice).supply(collaterals["WETH"].address, exp(1, 17));

        expect(await comet.userCollateral(alice.address, collaterals["WETH"].address)).to.equal(exp(1, 17));
      });

      it("should have no impact on a previous collateral deposit", async () => {
        expect(await comet.userCollateral(alice.address, collaterals["COMP"].address)).to.equal(
          aliceCollateralBalanceBefore.add(ALICE_COLLATERAL_AMOUNT)
        );
      });

      it("supply of collateral from Bob should not affect Alice", async () => {
        const aliceBalanceBefore = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        const totalCollateralSupplyBefore = await comet.totalsCollateral(collaterals["COMP"].address);

        await collaterals["COMP"].connect(bob).approve(comet.address, exp(1, 17));
        await comet.connect(bob).supply(collaterals["COMP"].address, exp(1, 17));

        expect(await comet.userCollateral(alice.address, collaterals["COMP"].address)).to.equal(aliceBalanceBefore);
        expect(await comet.totalsCollateral(collaterals["COMP"].address)).to.equal(totalCollateralSupplyBefore.add(exp(1, 17)));
      });
    });
  });

  describe("supply flows variations (from/to)", function () {
    const ALICE_BASE_AMOUNT: BigNumber = ethers.utils.parseUnits("0.05", baseTokenDecimals); //0.05 of base token
    const ALICE_COLLATERAL_AMOUNT: BigNumber = ethers.utils.parseUnits("0.2", 18); //0.2 of token
    let cometBaseBalanceBefore: BigNumber;
    let aliceBaseBalanceBefore: BigNumber;
    let cometCollateralBalanceBefore: BigNumber;
    let aliceCollateralBalanceBefore: BigNumber;
    let aliceCollateralBefore: BigNumber;
    let bobCollateralBefore: BigNumber;

    let alicePrincipalBefore: BigNumber;
    let bobPrincipalBefore: BigNumber;
    let cometSupplyIndexBefore: BigNumber;

    before(async function () {
      const totals = await cometExtension.totalsBasic();
      cometBaseBalanceBefore = await baseToken.balanceOf(comet.address);
      aliceBaseBalanceBefore = await baseToken.balanceOf(alice.address);
      cometCollateralBalanceBefore = await collaterals["COMP"].balanceOf(comet.address);
      aliceCollateralBalanceBefore = await collaterals["COMP"].balanceOf(alice.address);

      aliceCollateralBefore = await comet.userCollateral(alice.address, collaterals["COMP"].address);
      bobCollateralBefore = await comet.userCollateral(bob.address, collaterals["COMP"].address);

      cometSupplyIndexBefore = totals.baseSupplyIndex;
      alicePrincipalBefore = (await comet.userBasic(alice.address)).principal;
      bobPrincipalBefore = (await comet.userBasic(bob.address)).principal;

      // wait for a while to have impact from accrual
      await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
      await ethers.provider.send("evm_mine", []);
    });

    describe("supplyTo", function () {
      // Note: tests assume, that supplyTo() is a clone of supply(), thus only key cases are checked
      it("reverts for dst = 0", async () => {
        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(comet.connect(alice).supplyTo(ethers.constants.AddressZero, baseToken.address, 1)).to.be.revertedWithCustomError(
          comet,
          "ZeroAddress"
        );
      });

      it("reverts for asset = 0", async () => {
        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(comet.connect(alice).supplyTo(bob.address, ethers.constants.AddressZero, 1)).to.be.revertedWithCustomError(
          comet,
          "ZeroAddress"
        );
      });

      it("reverts for amount = 0", async () => {
        await expect(comet.connect(alice).supplyTo(bob.address, baseToken.address, 0)).to.be.revertedWithCustomError(comet, "ZeroAmount");
      });

      it("reverts for asset other than base of collateral", async () => {
        const newToken = await makeMockERC20({ name: "T1", symbol: "T1" });
        await newToken.allocateTo(alice.address, exp(1, 18));

        await newToken.connect(alice).approve(comet.address, exp(1, 18));
        await expect(comet.connect(alice).supplyTo(bob.address, newToken.address, 1)).to.be.revertedWithCustomError(comet, "BadAsset");
      });

      it("reverts when protocol paused", async () => {
        await comet.connect(dao).pause(true, false, false, false, false);
        expect(await comet.isSupplyPaused()).to.be.true;

        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(comet.connect(alice).supplyTo(bob.address, baseToken.address, 1)).to.be.revertedWithCustomError(comet, "Paused");
        await comet.connect(dao).pause(false, false, false, false, false);
      });

      it("should accrue state (same as supply())", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyTo(bob.address, baseToken.address, ALICE_BASE_AMOUNT);

        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
        // correctness of index calculation is already checked in previous testcases
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.be.greaterThan(cometSupplyIndexBefore);

        await snapshot.restore();
      });

      it("should supply base asset to the dst", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyTo(bob.address, baseToken.address, ALICE_BASE_AMOUNT);

        // token is transferred
        expect(aliceBaseBalanceBefore.sub(await baseToken.balanceOf(alice.address))).to.equal(ALICE_BASE_AMOUNT);
        expect((await baseToken.balanceOf(comet.address)).sub(cometBaseBalanceBefore)).to.equal(ALICE_BASE_AMOUNT);

        // alice principal is unchanged
        const alicePrincipalAfter = (await comet.userBasic(alice.address)).principal;
        expect(alicePrincipalBefore.sub(alicePrincipalAfter)).to.equal(0);

        // bob's princiapl grows
        // correctness of principal calculation is already checked in previous testcases
        expect((await comet.userBasic(bob.address)).principal).to.be.greaterThan(bobPrincipalBefore);

        await snapshot.restore();
      });

      it("should supply base asset if dst == msg.sender", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyTo(alice.address, baseToken.address, ALICE_BASE_AMOUNT);

        // token is transferred
        expect(aliceBaseBalanceBefore.sub(await baseToken.balanceOf(alice.address))).to.equal(ALICE_BASE_AMOUNT);
        expect((await baseToken.balanceOf(comet.address)).sub(cometBaseBalanceBefore)).to.equal(ALICE_BASE_AMOUNT);

        // alice principal is grows
        // correctness of principal calculation is already checked in previous testcases
        expect((await comet.userBasic(alice.address)).principal).to.be.greaterThan(alicePrincipalBefore);

        await snapshot.restore();
      });

      it("should supply collateral asset to the dst", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await comet.connect(alice).supplyTo(bob.address, collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        // token is transferred
        expect(aliceCollateralBalanceBefore.sub(await collaterals["COMP"].balanceOf(alice.address))).to.equal(ALICE_COLLATERAL_AMOUNT);
        expect((await collaterals["COMP"].balanceOf(comet.address)).sub(cometCollateralBalanceBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        // alice collateral balance is unchanged
        const aliceCollateralAfter = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        expect(aliceCollateralBefore.sub(aliceCollateralAfter)).to.equal(0);

        // bob's collateral balance grows
        const bobCollateralAfter = await comet.userCollateral(bob.address, collaterals["COMP"].address);
        expect(bobCollateralAfter.sub(bobCollateralBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        await snapshot.restore();
      });

      it("should supply collateral asset if dst == msg.sender", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await comet.connect(alice).supplyTo(alice.address, collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        // token is transferred
        expect(aliceCollateralBalanceBefore.sub(await collaterals["COMP"].balanceOf(alice.address))).to.equal(ALICE_COLLATERAL_AMOUNT);
        expect((await collaterals["COMP"].balanceOf(comet.address)).sub(cometCollateralBalanceBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        // alice's collateral balance grows
        const aliceCollateralAfter = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        expect(aliceCollateralAfter.sub(aliceCollateralBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        await snapshot.restore();
      });
    });

    describe("supplyFrom", function () {
      // Note: tests assume, that supplyFrom() is a clone of supply(), thus only key cases are checked

      it("reverts for from = 0", async () => {
        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(
          comet.connect(alice).supplyFrom(ethers.constants.AddressZero, alice.address, baseToken.address, 1)
        ).to.be.revertedWithCustomError(comet, "ZeroAddress");
      });

      it("reverts for dst = 0", async () => {
        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(
          comet.connect(alice).supplyFrom(alice.address, ethers.constants.AddressZero, baseToken.address, 1)
        ).to.be.revertedWithCustomError(comet, "ZeroAddress");
      });

      it("reverts for asset = 0", async () => {
        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(
          comet.connect(alice).supplyFrom(alice.address, bob.address, ethers.constants.AddressZero, 1)
        ).to.be.revertedWithCustomError(comet, "ZeroAddress");
      });

      it("reverts for amount = 0", async () => {
        await expect(comet.connect(alice).supplyFrom(alice.address, bob.address, baseToken.address, 0)).to.be.revertedWithCustomError(
          comet,
          "ZeroAmount"
        );
      });

      it("reverts for asset other than base of collateral", async () => {
        const newToken = await makeMockERC20({ name: "T1", symbol: "T1" });
        await newToken.allocateTo(alice.address, exp(1, 18));

        await newToken.connect(alice).approve(comet.address, exp(1, 18));
        await expect(comet.connect(alice).supplyFrom(alice.address, bob.address, newToken.address, 1)).to.be.revertedWithCustomError(
          comet,
          "BadAsset"
        );
      });

      it("reverts when protocol paused", async () => {
        await comet.connect(dao).pause(true, false, false, false, false);
        expect(await comet.isSupplyPaused()).to.be.true;

        await baseToken.connect(alice).approve(comet.address, 1);
        await expect(comet.connect(alice).supplyFrom(alice.address, bob.address, baseToken.address, 1)).to.be.revertedWithCustomError(
          comet,
          "Paused"
        );
        await comet.connect(dao).pause(false, false, false, false, false);
      });

      it("should accrue state (same as supply())", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyFrom(alice.address, bob.address, baseToken.address, ALICE_BASE_AMOUNT);

        expect((await cometExtension.totalsBasic()).lastAccrualTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
        // correctness of index calculation is already checked in previous testcases
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.be.greaterThan(cometSupplyIndexBefore);

        await snapshot.restore();
      });

      it("should supply base asset to the dst", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyFrom(alice.address, bob.address, baseToken.address, ALICE_BASE_AMOUNT);

        // token is transferred
        expect(aliceBaseBalanceBefore.sub(await baseToken.balanceOf(alice.address))).to.equal(ALICE_BASE_AMOUNT);
        expect((await baseToken.balanceOf(comet.address)).sub(cometBaseBalanceBefore)).to.equal(ALICE_BASE_AMOUNT);

        // alice principal is unchanged
        const alicePrincipalAfter = (await comet.userBasic(alice.address)).principal;
        expect(alicePrincipalBefore.sub(alicePrincipalAfter)).to.equal(0);

        // bob's princiapl grows
        // correctness of principal calculation is already checked in previous testcases
        expect((await comet.userBasic(bob.address)).principal).to.be.greaterThan(bobPrincipalBefore);

        await snapshot.restore();
      });

      it("should supply base asset if dst == msg.sender", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await baseToken.connect(alice).approve(comet.address, ALICE_BASE_AMOUNT);
        await comet.connect(alice).supplyFrom(alice.address, alice.address, baseToken.address, ALICE_BASE_AMOUNT);

        // token is transferred
        expect(aliceBaseBalanceBefore.sub(await baseToken.balanceOf(alice.address))).to.equal(ALICE_BASE_AMOUNT);
        expect((await baseToken.balanceOf(comet.address)).sub(cometBaseBalanceBefore)).to.equal(ALICE_BASE_AMOUNT);

        // alice principal is grows
        // correctness of principal calculation is already checked in previous testcases
        expect((await comet.userBasic(alice.address)).principal).to.be.greaterThan(alicePrincipalBefore);

        await snapshot.restore();
      });

      it("should supply collateral asset to the dst", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await comet.connect(alice).supplyFrom(alice.address, bob.address, collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        // token is transferred
        expect(aliceCollateralBalanceBefore.sub(await collaterals["COMP"].balanceOf(alice.address))).to.equal(ALICE_COLLATERAL_AMOUNT);
        expect((await collaterals["COMP"].balanceOf(comet.address)).sub(cometCollateralBalanceBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        // alice collateral balance is unchanged
        const aliceCollateralAfter = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        expect(aliceCollateralBefore.sub(aliceCollateralAfter)).to.equal(0);

        // bob's collateral balance grows
        const bobCollateralAfter = await comet.userCollateral(bob.address, collaterals["COMP"].address);
        expect(bobCollateralAfter.sub(bobCollateralBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        await snapshot.restore();
      });

      it("should supply collateral asset if dst == msg.sender", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await collaterals["COMP"].connect(alice).approve(comet.address, ALICE_COLLATERAL_AMOUNT);
        await comet.connect(alice).supplyFrom(alice.address, alice.address, collaterals["COMP"].address, ALICE_COLLATERAL_AMOUNT);

        // token is transferred
        expect(aliceCollateralBalanceBefore.sub(await collaterals["COMP"].balanceOf(alice.address))).to.equal(ALICE_COLLATERAL_AMOUNT);
        expect((await collaterals["COMP"].balanceOf(comet.address)).sub(cometCollateralBalanceBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        // alice's collateral balance grows
        const aliceCollateralAfter = await comet.userCollateral(alice.address, collaterals["COMP"].address);
        expect(aliceCollateralAfter.sub(aliceCollateralBefore)).to.equal(ALICE_COLLATERAL_AMOUNT);

        await snapshot.restore();
      });

      // Note: supplyFrom() with different operator is tested in allowance tests.
    });
  });

  describe("reentrancy test", function () {
    let evilComet: SandboxComet;
    let evilCollaterals: { [symbol: string]: FaucetToken | EvilToken } = {};
    let evilSupplyCap: BigNumber;
    let fullAmount: BigNumber;
    let attackAmount: BigNumber;

    before(async function () {
      const assets = defaultAssets();
      assets["WETH"].factory = (await ethers.getContractFactory("EvilToken")) as EvilToken__factory;

      const opts = await makeConfigController({
        owner: owner,
        dao: dao,
        treasury: treasury.address,
        curator: curator,
        guardian: guardian,
        assets: assets,
      });

      evilComet = await createComet(
        owner,
        opts.opts.assets,
        opts.configController,
        opts.sandboxController,
        opts.collaterals,
        opts.baseToken
      );

      for (let asset in opts.collaterals) {
        evilCollaterals[asset] = opts.collaterals[asset] as FaucetToken | EvilToken;
      }

      evilSupplyCap = (await evilComet.getAssetInfoByAddress(evilCollaterals["WETH"].address))[0].supplyCap;

      fullAmount = evilSupplyCap.add(2);
      attackAmount = fullAmount.div(2);

      evilCollaterals["WETH"].allocateTo(alice.address, fullAmount);
    });

    it("blocks reentrancy from exceeding the collateral supply cap", async () => {
      await (evilCollaterals["WETH"] as EvilToken).setAttack({
        attackType: 2, // supply attack
        source: alice.address,
        destination: alice.address,
        asset: evilCollaterals["WETH"].address,
        amount: attackAmount,
        maxCalls: 1, // 1 direct supply, 1 supply via hook
      });

      await evilCollaterals["WETH"].connect(alice).approve(evilComet.address, fullAmount);
      await expect(evilComet.connect(alice).supply(evilCollaterals["WETH"].address, attackAmount)).to.be.revertedWithCustomError(
        comet,
        "ReentrantCallBlocked"
      );
    });
  });

  describe("non-standard tokens", function () {
    describe("USDT-like token", function () {
      let nonStandardToken: NonStandardFaucetFeeToken;
      let nonStandardComet: SandboxComet;
      let collateralsNonStandard: { [symbol: string]: FaucetToken | NonStandardFaucetFeeToken } = {};
      let curSeedReserve: BigNumber;

      before(async function () {
        const assets = defaultAssets();
        assets["USDC"].factory = (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory;
        assets["WETH"].factory = (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory;

        const opts = await makeConfigController({
          owner: owner,
          dao: dao,
          treasury: treasury.address,
          curator: curator,
          guardian: guardian,
          assets: assets,
        });
        nonStandardToken = opts.baseToken as NonStandardFaucetFeeToken;

        nonStandardComet = await createComet(
          owner,
          opts.opts.assets,
          opts.configController,
          opts.sandboxController,
          opts.collaterals,
          nonStandardToken
        );
        curSeedReserve = await opts.sandboxController.suggestedAmountOfSeedReserves(nonStandardToken.address);

        for (let asset in opts.collaterals) {
          collateralsNonStandard[asset] = opts.collaterals[asset] as FaucetToken | NonStandardFaucetFeeToken;
        }

        nonStandardToken.allocateTo(alice.address, exp(100, 18));
        collateralsNonStandard["WETH"].allocateTo(alice.address, exp(100, 18));
      });

      it("can supply base token - non-standard ERC20 (without return interface) e.g. USDT", async () => {
        await nonStandardToken.connect(alice).approve(nonStandardComet.address, exp(1, 18));
        await expect(nonStandardComet.connect(alice).supply(nonStandardToken.address, exp(1, 18))).to.not.be.reverted;

        // as per the initial test case, 1st deposit will end with the same principal
        expect((await nonStandardComet.userBasic(alice.address)).principal).to.equal(exp(1, 18));
        expect(await nonStandardToken.balanceOf(nonStandardComet.address)).to.equal(curSeedReserve.add(exp(1, 18)));
      });

      it("can supply colalteral - non-standard ERC20 (without return interface) e.g. USDT", async () => {
        await collateralsNonStandard["WETH"].connect(alice).approve(nonStandardComet.address, exp(1, 18));
        await expect(nonStandardComet.connect(alice).supply(collateralsNonStandard["WETH"].address, exp(1, 18))).to.not.be.reverted;

        expect(await nonStandardComet.userCollateral(alice.address, collateralsNonStandard["WETH"].address)).to.equal(exp(1, 18));
        expect(await collateralsNonStandard["WETH"].balanceOf(nonStandardComet.address)).to.equal(exp(1, 18));
      });
    });

    describe("fee-on-transfer token", function () {
      let feeToken: NonStandardFaucetFeeToken;
      let feeComet: SandboxComet;
      let feeCollaterals: { [symbol: string]: FaucetToken | NonStandardFaucetFeeToken } = {};
      let curSeedReserve: BigNumber;

      before(async function () {
        const assets = defaultAssets();
        assets["USDC"].factory = (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory;
        assets["WETH"].factory = (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory;

        const opts = await makeConfigController({
          owner: owner,
          dao: dao,
          treasury: treasury.address,
          curator: curator,
          guardian: guardian,
          assets: assets,
        });
        feeToken = opts.baseToken as NonStandardFaucetFeeToken;

        feeComet = await createComet(owner, opts.opts.assets, opts.configController, opts.sandboxController, opts.collaterals, feeToken);
        // Note: fee is not enabled yet, so reserves are transferred in full
        curSeedReserve = await opts.sandboxController.suggestedAmountOfSeedReserves(feeToken.address);

        for (let asset in opts.collaterals) {
          feeCollaterals[asset] = opts.collaterals[asset] as FaucetToken | NonStandardFaucetFeeToken;
        }

        feeToken.allocateTo(alice.address, exp(100, 18));
        feeCollaterals["WETH"].allocateTo(alice.address, exp(100, 18));

        // Set fee to 0.1%
        await (feeToken as NonStandardFaucetFeeToken).setParams(10, exp(100, 18));
        await (feeCollaterals["WETH"] as NonStandardFaucetFeeToken).setParams(10, exp(100, 18));
      });

      it("can supply base token - fee-on-transfer token", async () => {
        const feeBalanceBefore = await feeToken.balanceOf(feeToken.address);
        const userBalanceBefore = await feeToken.balanceOf(alice.address);

        const amountDeposited: BigNumber = BigNumber.from(exp(1, 18));
        const fee: BigNumber = amountDeposited.mul(10).div(10000);
        const amountWithoutFee: BigNumber = amountDeposited.sub(fee);

        await feeToken.connect(alice).approve(feeComet.address, amountDeposited);
        await expect(feeComet.connect(alice).supply(feeToken.address, amountDeposited)).to.not.be.reverted;

        const feeBalanceAfter = await feeToken.balanceOf(feeToken.address);
        const userBalanceAfter = await feeToken.balanceOf(alice.address);

        // as per the initial test case, 1st deposit will end with the same principal
        // we are checking that the (amount - fee) is considered as deposit
        expect((await feeComet.userBasic(alice.address)).principal).to.equal(amountWithoutFee);
        expect(await feeToken.balanceOf(feeComet.address)).to.equal(curSeedReserve.add(amountWithoutFee));

        // full amount is charged from user
        expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(amountDeposited);

        // commission is in right place
        expect(feeBalanceAfter.sub(feeBalanceBefore)).to.equal(fee);
      });

      it("correct amount in the Supply event - fee-on-transfer token", async () => {
        // event should contain amount without fee - the actual received on the contract

        const amountDeposited: BigNumber = BigNumber.from(exp(1, 18));
        const fee: BigNumber = amountDeposited.mul(10).div(10000);
        const amountWithoutFee: BigNumber = amountDeposited.sub(fee);

        await feeToken.connect(alice).approve(feeComet.address, amountDeposited);
        expect(await feeComet.connect(alice).supply(feeToken.address, amountDeposited))
          .to.emit(comet, "Supply")
          .withArgs(alice.address, alice.address, amountWithoutFee.toString());

        /// Note: since it was already tested that Transfer event contains amout calculated from principal, we can omit that case here
      });

      it("can supply collateral token - fee-on-transfer token", async () => {
        const feeBalanceBefore = await feeCollaterals["WETH"].balanceOf(feeCollaterals["WETH"].address);
        const userBalanceBefore = await feeCollaterals["WETH"].balanceOf(alice.address);
        const amountDeposited: BigNumber = BigNumber.from(exp(0.5, 18));
        const fee: BigNumber = amountDeposited.mul(10).div(10000);
        const amountWithoutFee: BigNumber = amountDeposited.sub(fee);

        await feeCollaterals["WETH"].connect(alice).approve(feeComet.address, amountDeposited);
        await expect(feeComet.connect(alice).supply(feeCollaterals["WETH"].address, amountDeposited)).to.not.be.reverted;

        const feeBalanceAfter = await feeCollaterals["WETH"].balanceOf(feeCollaterals["WETH"].address);
        const userBalanceAfter = await feeCollaterals["WETH"].balanceOf(alice.address);

        // we are checking that the (amount - fee) is considered as collateral deposit
        expect(await feeComet.userCollateral(alice.address, feeCollaterals["WETH"].address)).to.equal(amountWithoutFee);
        expect(await feeCollaterals["WETH"].balanceOf(feeComet.address)).to.equal(amountWithoutFee);

        // full amount is charged from user
        expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(amountDeposited);

        // commission is in right place
        expect(feeBalanceAfter.sub(feeBalanceBefore)).to.equal(fee);
      });

      it("correct amount in the SupplyCollateral event - fee-on-transfer token", async () => {
        // event should contain amount without fee - the actual received on the contract

        const amountDeposited: BigNumber = BigNumber.from(exp(0.5, 18));
        const fee: BigNumber = amountDeposited.mul(10).div(10000);
        const amountWithoutFee: BigNumber = amountDeposited.sub(fee);

        await feeCollaterals["WETH"].connect(alice).approve(feeComet.address, amountDeposited);
        expect(await feeComet.connect(alice).supply(feeCollaterals["WETH"].address, amountDeposited))
          .to.emit(comet, "SupplyCollateral")
          .withArgs(alice.address, alice.address, feeCollaterals["WETH"].address, amountWithoutFee.toString());
      });
    });
  });
});

async function getPrincipalChange(
  comet: SandboxComet,
  lastUpdated: number,
  utilization: number,
  user: string,
  amount: BigNumber
): Promise<BigNumber> {
  const cometExtension: ICometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;
  const curTime = (await ethers.provider.getBlock("latest")).timestamp;

  const timeElapsed = curTime - lastUpdated;

  const prevIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;
  const accruedIndex = prevIndex.add(
    prevIndex
      .mul(await comet.getSupplyRate(utilization))
      .mul(timeElapsed)
      .div(exp(1, 18))
  );

  const oldPrincipal = (await comet.userBasic(user)).principal;
  const oldBalance = oldPrincipal.mul(accruedIndex).div(1e15);
  const newPrincipal = oldBalance.add(amount).mul(1e15).div(accruedIndex);

  return newPrincipal.sub(oldPrincipal);
}
