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
  getPrincipalChange,
} from "./helper/helpers";

import { SandboxComet, ConfigController, FaucetToken, ICometExtension, ISandboxController } from "../build/types";
import { BigNumber } from "ethers";

// Note: isolated supply functionality, withdraw and repay are tested in separate testsets
describe.only("5. supply", function () {
  let owner, dao, curator, treasury, guardian, alice, bob: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  let baseToken: FaucetToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  let seedReserve: BigNumber;

  before(async function () {
    [owner, dao, treasury, curator, guardian, alice, bob] = await ethers.getSigners();

    const opts = await makeConfigController({ owner: owner, dao: dao, treasury: treasury, curator: curator, guardian: guardian }, true);
    configController = opts.configController;
    sandboxController = opts.sandboxController;
    baseToken = opts.baseToken as FaucetToken;

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    seedReserve = (await sandboxController.config()).suggestedAmountOfSeedReserves;

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }

    baseToken.allocateTo(alice.address, exp(1e10, 18));
    baseToken.allocateTo(bob.address, exp(1e10, 18));
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
      const BASE_AMOUNT: bigint = exp(5e9, 18);
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
      const SUPPLIED_AMOUNT_ALICE: bigint = exp(2e9, 18);
      let aliceBalanceBefore: BigNumber;
      let cometBalanceBefore: BigNumber;
      let aliceDisplayBalanceBefore: BigNumber;
      let alicePrincipalBefore: BigNumber;
      let cometSupplyIndexBefore: BigNumber;
      let cometSupplyRateBefore: BigNumber;
      let cometUpdatedTimeBefore: number;

      const SUPPLIED_AMOUNT_BOB: bigint = exp(1e9, 18);
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
            await getPrincipalChange(comet, lastUpdated, 0, alice.address, SUPPLIED_AMOUNT_ALICE)
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
            await getPrincipalChange(comet, lastUpdated, 0, bob.address, SUPPLIED_AMOUNT_BOB)
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
        const snapshot: SnapshotRestorer = await takeSnapshot();

        const newBalanceNaive = SUPPLIED_AMOUNT_BOB;

        /// Note: since there is a rounding error, the immediate comet.balanceOf() may return value
        /// which is 1 wei less than the deposited amount. Though the difference will be neglected
        /// in around 1 block of supply interest (in case if )
        await ethers.provider.send("evm_increaseTime", [30]); // 30 sec
        await ethers.provider.send("evm_mine", []);

        const newBalance = await comet.balanceOf(bob.address);

        expect(newBalance).to.be.greaterThanOrEqual(newBalanceNaive);

        await snapshot.restore();
      });

      it("Comet's displayed total supply corresponds to displayed balances from all users", async () => {
        /// currently it is an accrued state, so we can compare directly
        /// get alice's and bob's suppleis together
        const alicePresent = await comet.balanceOf(alice.address);
        const bobPresent = await comet.balanceOf(bob.address);
        const totalPresentSupply = alicePresent.add(bobPresent);
        expect(await comet.totalSupply()).to.equal(totalPresentSupply);
      });
    });
  });

  describe.skip("supply collateral flow", function () {
    const chosenCollateral: FaucetToken = collaterals[0];

    describe("reverts for collaterals", function () {
      it("reverts for colalteral when supply is paused", async () => {
        // WIP
      });

      it("reverts for not enough collateral balance", async () => {
        // WIP
      });

      it("reverts for 0 colalteral amount", async () => {
        // WIP
      });

      it("reverts if supplying collateral exceeds the supply cap", async () => {
        const collateralIndex = await comet.collateralAssetIndex(chosenCollateral.address);
        const supplyCap = (await comet.collateralAssets(collateralIndex)).supplyCap;

        expect(await chosenCollateral.balanceOf(alice.address)).is.greaterThan(supplyCap);

        await chosenCollateral.connect(alice).approve(comet.address, supplyCap.add(1));
        await expect(comet.supplyTo(alice.address, chosenCollateral.address, supplyCap.add(1))).to.be.revertedWithCustomError(
          comet,
          "SupplyCapExceeded"
        );
        await chosenCollateral.connect(alice).approve(comet.address, 0);
      });
    });

    describe("supply collateral: happy cases", function () {
      it("collateral is added to user's tokens", async () => {
        // WIP
      });

      it("exact collateral token balance is supplied from alice", async () => {
        // WIP
      });

      it("Comet's collateral token balance growths", async () => {
        // WIP
      });

      it("should correclty set alice's colalteral balance", async () => {
        // WIP
      });

      it("should allow deposit more of the same collateral", async () => {
        // WIP
      });

      it("should allow deposit another collateral token", async () => {
        // WIP
      });
    });
  });

  describe.skip("supply flows variations (from/to)", function () {
    // wip
    // supplyTo works for msg sender
  });

  describe.skip("non-standard tokens", function () {
    it("can supply base token - non-standard ERC20 (without return interface) e.g. USDT", async () => {
      // WIP
    });

    it("can supply colalteral - non-standard ERC20 (without return interface) e.g. USDT", async () => {
      // WIP
    });

    it("can supply base token - fee-on-transfer token", async () => {
      /*
      const assets = defaultAssets();
      // Add USDT to assets on top of default assets
      assets["USDT"] = {
        initial: 1e6,
        decimals: 6,
        factory: (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory,
      };
      const protocol = await makeProtocol({ base: "USDT", assets: assets });
      const {
        comet,
        tokens,
        users: [alice, bob],
      } = protocol;
      const { USDT } = tokens;

      // Set fee to 0.1%
      await (USDT as NonStandardFaucetFeeToken).setParams(10, 10);

      const _i0 = await USDT.allocateTo(bob.address, 1000e6);
      const baseAsB = USDT.connect(bob);
      const cometAsB = comet.connect(bob);

      const p0 = await portfolio(protocol, alice.address);
      const q0 = await portfolio(protocol, bob.address);
      const _a0 = await wait(baseAsB.approve(comet.address, 1000e6));
      const s0 = await wait(cometAsB.supplyTo(alice.address, USDT.address, 1000e6));

      const p1 = await portfolio(protocol, alice.address);
      const q1 = await portfolio(protocol, bob.address);

      expect(event(s0, 0)).to.be.deep.equal({
        Transfer: {
          from: bob.address,
          to: comet.address,
          amount: BigInt(999e6),
        },
      });
      expect(event(s0, 1)).to.be.deep.equal({
        Supply: {
          from: bob.address,
          dst: alice.address,
          amount: BigInt(999e6),
        },
      });
      expect(event(s0, 2)).to.be.deep.equal({
        Transfer: {
          from: ethers.constants.AddressZero,
          to: alice.address,
          amount: BigInt(999e6) - BigInt(1),
        },
      });

      expect(p0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      expect(p0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      expect(q0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: exp(1000, 6) });
      expect(p1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: exp(999, 6) - BigInt(1) });
      expect(p1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      expect(q1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      expect(q1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, USDT: 0n });
      // Fee Token logics will cost a bit more gas than standard ERC20 token with no fee calculation
      expect(Number(s0.receipt.gasUsed)).to.be.lessThan(151000);
      */
    });

    it("can supply collateral token - fee-on-transfer token", async () => {
      /*
      const assets = defaultAssets();
      // Add FeeToken Collateral to assets on top of default assets
      assets["FeeToken"] = {
        initial: 1e8,
        decimals: 18,
        factory: (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory,
      };

      const protocol = await makeProtocol({ base: "USDC", assets: assets });
      const {
        comet,
        tokens,
        users: [alice, bob],
      } = protocol;
      const { FeeToken } = tokens;

      // Set fee to 0.1%
      await (FeeToken as NonStandardFaucetFeeToken).setParams(10, 10);

      const _i0 = await FeeToken.allocateTo(bob.address, 2000e8);
      const baseAsB = FeeToken.connect(bob);
      const cometAsB = comet.connect(bob);

      const t0 = await comet.totalsCollateral(FeeToken.address);
      const p0 = await portfolio(protocol, alice.address);
      const q0 = await portfolio(protocol, bob.address);
      const _a0 = await wait(baseAsB.approve(comet.address, 2000e8));
      const s0 = await wait(cometAsB.supplyTo(alice.address, FeeToken.address, 2000e8));
      const t1 = await comet.totalsCollateral(FeeToken.address);
      const p1 = await portfolio(protocol, alice.address);
      const q1 = await portfolio(protocol, bob.address);

      expect(event(s0, 0)).to.be.deep.equal({
        Transfer: {
          from: bob.address,
          to: comet.address,
          amount: BigInt(1998e8),
        },
      });
      expect(event(s0, 1)).to.be.deep.equal({
        SupplyCollateral: {
          from: bob.address,
          dst: alice.address,
          asset: FeeToken.address,
          amount: BigInt(1998e8),
        },
      });

      expect(p0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(p0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(q0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: exp(2000, 8) });
      expect(p1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: exp(1998, 8) });
      expect(p1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(q1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(q1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n, FeeToken: 0n });
      expect(t1).to.be.equal(t0.add(1998e8));
      // Fee Token logics will cost a bit more gas than standard ERC20 token with no fee calculation
      expect(Number(s0.receipt.gasUsed)).to.be.lessThan(190000);
      */
    });
  });

  describe.skip("edge-cases", function () {
    // This is an edge-case that can occur when a user supplies 0 base.
    // Rare case (e.g. for 1 wei), when in `supplyBase`, `dstPrincipalNew = principalValue(presentValue(dstPrincipal))`
    // In some cases, `dstPrincipalNew` can actually be less than `dstPrincipal` due to the fact
    // that the principal value and present value functions round down. This breaks our assumption
    // in `repayAndSupplyAmount` that `newPrincipal >= oldPrincipal` MUST be true. The new code now explicitly checks
    // this assumption and sets both `repayAmount` and `supplyAmount` to 0 if the assumption is violated.
    it.skip("supplies 1 wei and does not revert when dstPrincipalNew < dstPrincipal", async () => {
      //await comet.setBasePrincipal(alice.address, 99999992291226);
      // recreate conditions
      // supply from alice
      // catch the Supply event with 0 amount
    });

    it("blocks reentrancy from exceeding the collateral supply cap", async () => {
      // create comet with evil token
      // (await ethers.getContractFactory("EvilToken")) as EvilToken__factory,
      // const { EVIL } = <{ EVIL: EvilToken }>tokens;
      // recreate the attack
      /*
      const attack = Object.assign({}, await EVIL.getAttack(), {
        attackType: ReentryAttack.SupplyFrom,
        source: alice.address,
        destination: bob.address,
        asset: EVIL.address,
        amount: 75e6,
        maxCalls: 1,
      });
      await EVIL.setAttack(attack);
      */
      // await expect(comet.connect(alice).supplyTo(bob.address, EVIL.address, 75e6)).to.be.revertedWithCustomError(
      //   comet,
      //   "ReentrantCallBlocked"
      // );
    });
  });
});
