import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ethers, expect, exp, makeConfigController, createComet, defaultAssets, DEFAULT_PRICEFEED_DECIMALS } from "./helper/helpers";

import { SandboxComet, ConfigController, FaucetToken, ICometExtension, ISandboxController, SimplePriceFeed } from "../build/types";

import { BigNumber } from "ethers";

describe.only("8. interest calculation", function () {
  let owner: SignerWithAddress, dao: SignerWithAddress;
  let curator: SignerWithAddress, treasury: SignerWithAddress, guardian: SignerWithAddress;
  let alice: SignerWithAddress, bob: SignerWithAddress, charlie: SignerWithAddress, other: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  let baseToken: FaucetToken;
  const baseDecimals = 6;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  let priceFeeds: { [symbol: string]: SimplePriceFeed } = {};
  let lastUpdatedTime: number;

  let baseSupplyRate: BigNumber, supplyLowSlope: BigNumber;
  let baseBorrowRate: BigNumber, borrowLowSlope: BigNumber;

  before(async function () {
    [owner, dao, treasury, curator, guardian, alice, bob, charlie, other] = await ethers.getSigners();

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

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    lastUpdatedTime = (await cometExtension.totalsBasic()).lastAccrualTime;

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
      priceFeeds[asset] = opts.priceFeeds[asset];
    }
    priceFeeds[opts.baseTokenSymbol] = opts.priceFeeds[opts.baseTokenSymbol];

    baseSupplyRate = await comet.supplyPerSecondInterestRateBase();
    supplyLowSlope = await comet.supplyPerSecondInterestRateSlopeLow();

    baseBorrowRate = await comet.borrowPerSecondInterestRateBase();
    borrowLowSlope = await comet.borrowPerSecondInterestRateSlopeLow();

    await baseToken.allocateTo(alice.address, exp(1e10, baseDecimals));
    await baseToken.allocateTo(bob.address, exp(1e10, baseDecimals));
    await collaterals["COMP"].allocateTo(bob.address, exp(1e10, 18));

    // wait some time
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hr
    await ethers.provider.send("evm_mine", []);
  });

  /// Note: testcases in "regular logic" testset are dependent as they form a single flow which can be
  ///       often met in the work of the protocol:
  ///       create market -> supply -> supply collateral -> borrow -> borrow more to higher utilization ->
  ///       -> supply to decrease utilization
  describe("regular logic", function () {
    const SUPPLY_AMOUNT: BigNumber = BigNumber.from(exp(10000, baseDecimals)); // 10k$
    const COLLATERAL_VALUE: BigNumber = BigNumber.from(exp(20000, baseDecimals)); // 20k$
    let COLLATERAL_AMOUNT: BigNumber; // will be calculated from the price at later testcase
    const BORROW_AMOUNT: BigNumber = BigNumber.from(exp(2000, baseDecimals)); // 2k$
    const AVERAGE_WAIT_TIME = 3600; // 1 hr

    let aliceDepositTimestamp: number;

    describe("empty market", function () {
      it("utilization is 0 for empty market", async () => {
        expect(await comet.getUtilization()).to.equal(0);
      });

      it("supply rate is 0 for empty market", async () => {
        expect(await comet.getSupplyRate(0)).to.equal(0);
      });

      it("borrow rate is 0 for empty market", async () => {
        expect(await comet.getBorrowRate(0)).to.equal(0);
      });

      it("initial supply index = 1", async () => {
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.equal(exp(1, 15));
      });

      it("initial borrow index = 1", async () => {
        expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
      });

      it("perform accrue to update state of the market (accrue action in test)", async () => {
        await comet.accrueAccount(ethers.constants.AddressZero);

        const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
        expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
        expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

        lastUpdatedTime = curUpdatedTime;
      });

      it("supply index is not growing without supplies into the market", async () => {
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.equal(exp(1, 15));
      });

      it("borrow index is not growing without supplies into the market", async () => {
        expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
      });
    });

    describe("supplies with no borrows", function () {
      let timeElapsed: number;
      let prevSupplyIndex: BigNumber;

      before(async function () {
        // wait some time
        await ethers.provider.send("evm_increaseTime", [AVERAGE_WAIT_TIME]); // 1 hr
        await ethers.provider.send("evm_mine", []);
      });

      it("first supply to the market with no borrows accrues the state (user action in test)", async () => {
        await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT);
        await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

        const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
        expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
        expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

        aliceDepositTimestamp = curUpdatedTime;
        lastUpdatedTime = curUpdatedTime;
      });

      it("but does not change supply indexe (as accrue is performed before supply state changes)", async () => {
        expect((await cometExtension.totalsBasic()).baseSupplyIndex).to.equal(exp(1, 15));
      });

      it("and does not change borrow index (as no borrows performed)", async () => {
        expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
      });

      it("supplies to the market does not spike utilization if there are no borrows", async () => {
        expect(await comet.getUtilization()).to.equal(0);
      });

      it("supply rate equals to base rate for supplies with no borrows", async () => {
        expect(await comet.getSupplyRate(0)).to.equal(baseSupplyRate);
      });

      it("borrow rate equals 0 (no borrows)", async () => {
        expect(await comet.getBorrowRate(0)).to.equal(0);
      });

      it("wait some time and get previous state", async () => {
        prevSupplyIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;

        // wait some time
        await ethers.provider.send("evm_increaseTime", [AVERAGE_WAIT_TIME]); // 1 hr
        await ethers.provider.send("evm_mine", []);
      });

      it("accrue after some time updates state of the market (accrue action in test)", async () => {
        await comet.accrueAccount(ethers.constants.AddressZero);

        const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
        expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
        expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

        timeElapsed = curUpdatedTime - lastUpdatedTime;
        lastUpdatedTime = curUpdatedTime;
      });

      it("supply index grows according to the base rate", async () => {
        const accruedIndex = prevSupplyIndex.add(prevSupplyIndex.mul(baseSupplyRate).mul(timeElapsed).div(exp(1, 18)));
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;

        expect(index).to.equal(accruedIndex);
      });

      it("utilization is not growing", async () => {
        expect(await comet.getUtilization()).to.equal(0);
      });

      it("borrow index is not growing without borrows on the market", async () => {
        expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
      });

      it("supply rate equals to base rate for supplies with no borrows", async () => {
        expect(await comet.getSupplyRate(0)).to.equal(baseSupplyRate);
      });

      it("borrow rate equals 0 (no borrows)", async () => {
        expect(await comet.getBorrowRate(0)).to.equal(0);
      });

      it("alice lend displayed principle (balanceOf) grows according to the base rate", async () => {
        timeElapsed = lastUpdatedTime - aliceDepositTimestamp;
        const accruedIndex = prevSupplyIndex.add(prevSupplyIndex.mul(baseSupplyRate).mul(timeElapsed).div(exp(1, 18)));

        // healthcheck than current index is re-calculated correctly
        const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
        expect(index).to.equal(accruedIndex);

        const principal = (await comet.userBasic(alice.address)).principal;
        const expectedBalance = principal.mul(accruedIndex).div(exp(1, 15));

        const balance = await comet.balanceOf(alice.address);
        // 1 wei difference is possible
        expect(balance).to.be.approximately(expectedBalance, 1);
      });
    });

    describe("supplies and borrows (low slope)", function () {
      describe("supplies collateral", function () {
        let prevSupplyIndex: BigNumber;
        let timeElapsed: number;

        before(async function () {
          const colPrice = (await priceFeeds["COMP"].latestRoundData())[1];
          const colPriceInBase = colPrice.mul(exp(1, baseDecimals)).div(exp(1, DEFAULT_PRICEFEED_DECIMALS)); // as base is USDC its price is 1
          COLLATERAL_AMOUNT = BigNumber.from(COLLATERAL_VALUE).mul(exp(1, 18)).div(colPriceInBase);

          prevSupplyIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;

          // wait some time
          await ethers.provider.send("evm_increaseTime", [AVERAGE_WAIT_TIME]); // 1 hr
          await ethers.provider.send("evm_mine", []);
        });

        it("bob supplies collateral - collateral supply accrues the state (user action in test)", async () => {
          await collaterals["COMP"].connect(bob).approve(comet.address, COLLATERAL_AMOUNT);
          await comet.connect(bob).supply(collaterals["COMP"].address, COLLATERAL_AMOUNT);

          const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
          expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
          expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

          timeElapsed = curUpdatedTime - lastUpdatedTime;
          lastUpdatedTime = curUpdatedTime;
        });

        it("but does not impact utilization", async () => {
          expect(await comet.getUtilization()).to.equal(0);
        });

        it("and does not impact borrow rate (as there is no borrow)", async () => {
          expect(await comet.getBorrowRate(0)).to.equal(0);
        });

        it("and does not impact borrow index (as there is no borrow)", async () => {
          expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
        });

        it("supply rate is still == base rate (as there is no borrows)", async () => {
          expect(await comet.getSupplyRate(0)).to.equal(baseSupplyRate);
        });

        it("supply index grows based on the base rate", async () => {
          const accruedIndex = prevSupplyIndex.add(prevSupplyIndex.mul(baseSupplyRate).mul(timeElapsed).div(exp(1, 18)));
          const index = (await cometExtension.totalsBasic()).baseSupplyIndex;

          expect(index).to.equal(accruedIndex);
        });
      });

      describe("market gets first borrow", function () {
        let prevSupplyIndex: BigNumber, prevBorrowIndex: BigNumber;
        let prevUtilization: BigNumber;
        let timeElapsed: number;

        before(async function () {
          // wait some time
          await ethers.provider.send("evm_increaseTime", [AVERAGE_WAIT_TIME]); // 1 hr
          await ethers.provider.send("evm_mine", []);

          prevSupplyIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;
          prevBorrowIndex = (await cometExtension.totalsBasic()).baseBorrowIndex;
          prevUtilization = BigNumber.from(0);
        });

        it("first borrow from the market accrues the state (user action in test)", async () => {
          await comet.connect(bob).withdraw(baseToken.address, BORROW_AMOUNT);

          const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
          expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
          expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

          aliceDepositTimestamp = curUpdatedTime;
          lastUpdatedTime = curUpdatedTime;
        });

        it("but does not change borrow index (as index is accrued before storage change)", async () => {
          expect((await cometExtension.totalsBasic()).baseBorrowIndex).to.equal(exp(1, 15));
        });

        it("supply rate grows to the low slope of the interest curve", async () => {
          const expectedSupplyRate = baseSupplyRate.add(supplyLowSlope.mul(prevUtilization).div(exp(1, 18)));
          const curSupplyRate = await comet.getSupplyRate(prevUtilization);

          expect(curSupplyRate).equal(expectedSupplyRate);
        });

        it("borrow rate grows to the low slope of the interest curve", async () => {
          const expectedBorrowRate = baseBorrowRate.add(borrowLowSlope.mul(prevUtilization).div(exp(1, 18)));
          const curBorrowRate = await comet.getBorrowRate(prevUtilization);

          expect(curBorrowRate).equal(expectedBorrowRate);
        });

        it("utilization grows based on the borrowed amount", async () => {
          const curSupplyIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;
          const curBorrowIndex = (await cometExtension.totalsBasic()).baseBorrowIndex;

          const scaledBorrow = BORROW_AMOUNT.mul(curBorrowIndex).div(exp(1, 15));
          const scaledSupply = SUPPLY_AMOUNT.mul(curSupplyIndex).div(exp(1, 15));
          const expectedUtilization = scaledBorrow.mul(exp(1, 18)).div(scaledSupply); // 20%
          const currentUtilization: BigNumber = await comet.getUtilization();

          /// we can loose some weis of accuracy based on rounding errors
          expect(currentUtilization).to.be.approximately(expectedUtilization, exp(1, 4));
        });

        it("wait some time and get previous state", async () => {
          prevSupplyIndex = (await cometExtension.totalsBasic()).baseSupplyIndex;
          prevBorrowIndex = (await cometExtension.totalsBasic()).baseBorrowIndex;
          prevUtilization = await comet.getUtilization();
          lastUpdatedTime = (await cometExtension.totalsBasic()).lastAccrualTime;

          // wait some time
          await ethers.provider.send("evm_increaseTime", [AVERAGE_WAIT_TIME]); // 1 hr
          await ethers.provider.send("evm_mine", []);
        });

        it("accrue after some time updates state of the market (accrue action in test)", async () => {
          await comet.accrueAccount(ethers.constants.AddressZero);

          const curUpdatedTime: number = (await cometExtension.totalsBasic()).lastAccrualTime;
          expect(curUpdatedTime).to.equal((await ethers.provider.getBlock("latest")).timestamp);
          expect(curUpdatedTime).to.be.greaterThan(lastUpdatedTime);

          timeElapsed = curUpdatedTime - lastUpdatedTime;
          lastUpdatedTime = curUpdatedTime;
        });

        it("supply index grows based on the low slope of the interest curve", async () => {
          const expectedSupplyRate = baseSupplyRate.add(supplyLowSlope.mul(prevUtilization).div(exp(1, 18)));

          const accruedIndex = prevSupplyIndex.add(prevSupplyIndex.mul(expectedSupplyRate).mul(timeElapsed).div(exp(1, 18)));
          const index = (await cometExtension.totalsBasic()).baseSupplyIndex;

          expect(index).to.equal(accruedIndex);
        });

        it("borrow index grows based on the low slope of the interest curve", async () => {
          const expectedBorrowRate = baseBorrowRate.add(borrowLowSlope.mul(prevUtilization).div(exp(1, 18)));

          const accruedIndex = prevBorrowIndex.add(prevBorrowIndex.mul(expectedBorrowRate).mul(timeElapsed).div(exp(1, 18)));
          const index = (await cometExtension.totalsBasic()).baseBorrowIndex;

          expect(index).to.equal(accruedIndex);
        });

        it("alice's lend displayed principle (balanceOf) grows according to the low slope", async () => {
          const expectedSupplyRate = baseSupplyRate.add(supplyLowSlope.mul(prevUtilization).div(exp(1, 18)));
          const accruedIndex = prevSupplyIndex.add(prevSupplyIndex.mul(expectedSupplyRate).mul(timeElapsed).div(exp(1, 18)));

          // healthcheck than current index is re-calculated correctly
          const index = (await cometExtension.totalsBasic()).baseSupplyIndex;
          expect(index).to.equal(accruedIndex);

          const principal = (await comet.userBasic(alice.address)).principal;
          const expectedBalance = principal.mul(accruedIndex).div(exp(1, 15));

          const balance = await comet.balanceOf(alice.address);
          // 1 wei difference is possible
          expect(balance).to.be.approximately(expectedBalance, 1);
        });

        it("bob's displayed borrow (borrowBalanceOf) grows according to the high slope", async () => {
          const expectedBorrowRate = baseBorrowRate.add(borrowLowSlope.mul(prevUtilization).div(exp(1, 18)));
          const accruedIndex = prevBorrowIndex.add(prevBorrowIndex.mul(expectedBorrowRate).mul(timeElapsed).div(exp(1, 18)));

          // healthcheck than current index is re-calculated correctly
          const index = (await cometExtension.totalsBasic()).baseBorrowIndex;
          expect(index).to.equal(accruedIndex);

          const principal = (await comet.userBasic(bob.address)).principal;
          const expectedBalance = principal.mul(accruedIndex).div(exp(1, 15)).mul(-1); /// -1 as principal < 0

          const balance = await comet.borrowBalanceOf(bob.address);
          // 1 wei difference is possible
          expect(balance).to.be.approximately(expectedBalance, 1);
        });
      });
    });

    describe("supplies and borrows (high slope)", function () {
      it("can borrow to reach the kink", async () => {
        // wip
      });

      it("supply rate for the kink is reached", async () => {
        // wip
      });

      it("borrow rate for the kink is reached", async () => {
        // wip
      });

      it("accrue updates indexes while market is on the kink", async () => {
        // wip
      });

      it("can borrow to push utilization over the kink", async () => {
        // wip
      });

      it("supply rate grows to the high slope of the interest curve", async () => {
        // wip
      });

      it("borrow rate grows to the high slope of the interest curve", async () => {
        // wip
      });

      it("accrue updates state of the market", async () => {
        // wip
      });

      it("supply index grows based on the high slope of the interest curve", async () => {
        // wip
      });

      it("borrow index grows based on the high slope of the interest curve", async () => {
        // wip
      });

      it("alice's lend displayed principle (balanceOf) grows according to the high slope", async () => {
        // wip
      });

      it("bob's displayed borrow (borrowBalanceOf) grows according to the high slope", async () => {
        // wip
      });
    });

    describe("over utilization", function () {
      it("can borrow to reach utilization > 100% (borrow from reserves)", async () => {
        // wip
      });

      it("supply rate grows to the high slope of the interest curve (over 100%)", async () => {
        // wip
      });

      it("borrow rate grows to the high slope of the interest curve", async () => {
        // wip
      });

      it("accrue updates state of the market", async () => {
        // wip
      });

      it("supply index grows based on the high slope of the interest curve (over 100%)", async () => {
        // wip
      });

      it("borrow index grows based on the high slope of the interest curve (over 100%)", async () => {
        // wip
      });

      it("alice's lend displayed principle (balanceOf) grows according to the high slope (over 100%)", async () => {
        // wip
      });

      it("bob's displayed borrow (borrowBalanceOf) grows according to the high slope (over 100%)", async () => {
        // wip
      });

      it("should revert for borrow which reach utilization over 200%", async () => {
        // wip
      });
    });
  });

  describe.skip("edge cases", function () {
    describe("supply interest will not exceed seed reserves in case of no borrows for new market", function () {
      it("supply interest will not exceed seed reserves in case of no borrows for new market", async () => {
        // wip
        // todo: add changes in code
        /// No borrows - keep interest until the seed reserves exhaustion
        /// if (utilization == 0 && totalSupply() >= IERC20(baseToken).balanceOf(address(this))) return 0;
      });
    });

    describe("utilization cannot be inflated for empty market", function () {
      let testComet: SandboxComet;
      let testCometExt: ICometExtension;
      let colPriceInBase: BigNumber;

      before(async function () {
        testComet = await createComet(owner, defaultAssets(), configController, sandboxController, collaterals, baseToken);
        testCometExt = (await ethers.getContractAt("CometExtension", testComet.address)) as ICometExtension;

        const colPrice = (await priceFeeds["COMP"].latestRoundData())[1];
        console.log(1, colPrice.toString());

        colPriceInBase = colPrice.mul(exp(1, 6)).div(exp(1, DEFAULT_PRICEFEED_DECIMALS)); // as base is USDC its price is 1
      });

      it("initial utilization is  for fresh comet", async () => {
        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("alice supplies small amount", async () => {
        await baseToken.connect(alice).approve(testComet.address, exp(1, baseDecimals));
        await testComet.connect(alice).supply(baseToken.address, exp(1, baseDecimals));

        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("bob supplies collateral worth of 10k$", async () => {
        console.log(11, colPriceInBase.toString());
        const amount = BigNumber.from(exp(10000, 6)).mul(exp(1, 18)).div(colPriceInBase);

        console.log(12, amount.toString());

        await collaterals["COMP"].allocateTo(bob.address, amount);
        await collaterals["COMP"].connect(bob).approve(testComet.address, amount);
        await testComet.connect(bob).supply(collaterals["COMP"].address, amount);

        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("bob borrows base asset at max", async () => {
        const bobBalanceBefore = await baseToken.balanceOf(bob.address);
        const aliceDisplayBalanceBefore = await testComet.balanceOf(alice.address);
        // default collateral factor is set as 60%
        const amount = BigNumber.from(exp(5000, 6));
        await testComet.connect(bob).withdraw(baseToken.address, amount);
        const bobBalanceAfter = await baseToken.balanceOf(bob.address);

        console.log("alice 0:", aliceDisplayBalanceBefore.toString());
        console.log("alice 1", (await testComet.balanceOf(alice.address)).toString());
        console.log("bob 1:", (await testComet.borrowBalanceOf(bob.address)).toString());

        expect(bobBalanceAfter.sub(bobBalanceBefore)).to.equal(amount);

        console.log(0, (await testCometExt.totalsBasic()).totalSupplyBase.toString());
        console.log(0, (await testCometExt.totalsBasic()).totalBorrowBase.toString());

        console.log("u1:", (await testComet.getUtilization()).div(exp(1, 18)).toString());

        await ethers.provider.send("evm_increaseTime", [600]);
        await ethers.provider.send("evm_mine", []);

        console.log("alice 2", (await testComet.balanceOf(alice.address)).toString());
        console.log("bob 2:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("u2:", (await testComet.getUtilization()).div(exp(1, 18)).toString());
      });
    });

    describe("chain liquidation cannot be initiated because of the inflated utilization", function () {
      let testComet: SandboxComet;
      let testCometExt: ICometExtension;
      let colPriceInBase: BigNumber;

      before(async function () {
        testComet = await createComet(owner, defaultAssets(), configController, sandboxController, collaterals, baseToken);
        testCometExt = (await ethers.getContractAt("CometExtension", testComet.address)) as ICometExtension;

        const colPrice = (await priceFeeds["COMP"].latestRoundData())[1];
        colPriceInBase = colPrice.mul(exp(1, 6)).div(exp(1, DEFAULT_PRICEFEED_DECIMALS)); // as base is USDC its price is 1
      });

      it("initial utilization is  for fresh comet", async () => {
        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("lender supplies base asset worth of 10k$", async () => {
        await baseToken.allocateTo(other.address, exp(10000, baseDecimals));
        await baseToken.connect(other).approve(testComet.address, exp(10000, baseDecimals));
        await testComet.connect(other).supply(baseToken.address, exp(10000, baseDecimals));

        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("alice and bob take supply collateral ~3.5k$ each", async () => {
        const amount = BigNumber.from(exp(3500, baseDecimals)).mul(exp(1, 18)).div(colPriceInBase);

        await collaterals["COMP"].allocateTo(alice.address, amount);
        await collaterals["COMP"].connect(alice).approve(testComet.address, amount);
        await testComet.connect(alice).supply(collaterals["COMP"].address, amount);

        await collaterals["COMP"].allocateTo(bob.address, amount);
        await collaterals["COMP"].connect(bob).approve(testComet.address, amount);
        await testComet.connect(bob).supply(collaterals["COMP"].address, amount);

        expect(await testComet.getUtilization()).to.equal(0);
      });

      it("alice and bob borrow assets at max (80% borrow factor)", async () => {
        const aliceBalanceBefore = await baseToken.balanceOf(bob.address);
        const bobBalanceBefore = await baseToken.balanceOf(bob.address);

        // default collateral factor is set as 80%
        const amount = BigNumber.from(exp(3500, baseDecimals)).mul(80).div(100);
        await testComet.connect(alice).withdraw(baseToken.address, amount);
        const aliceBalanceAfter = await baseToken.balanceOf(alice.address);

        expect(aliceBalanceAfter.sub(aliceBalanceBefore)).to.equal(amount);

        await testComet.connect(bob).withdraw(baseToken.address, amount);
        const bobBalanceAfter = await baseToken.balanceOf(bob.address);

        expect(bobBalanceAfter.sub(bobBalanceBefore)).to.equal(amount);
      });

      it("utilization is expected to be 56% (5.6k borrow vs 10k supply)", async () => {
        const currentUtilization: BigNumber = await testComet.getUtilization();
        /// utilization is scaled by 1e18, so 56% -> 56e16
        expect(currentUtilization).to.be.approximately(exp(56e16), exp(1, 12));
      });

      it("charlie deposits 50k$ worth of collateral", async () => {
        const amount = BigNumber.from(exp(101000, baseDecimals)).mul(exp(1, 18)).div(colPriceInBase);

        await collaterals["COMP"].allocateTo(charlie.address, amount);
        await collaterals["COMP"].connect(charlie).approve(testComet.address, amount);
        await testComet.connect(charlie).supply(collaterals["COMP"].address, amount);

        /// utilization is unchanged
        const currentUtilization: BigNumber = await testComet.getUtilization();
        /// utilization is scaled by 1e18, so 56% -> 56e16
        expect(currentUtilization).to.be.approximately(exp(56e16), exp(1, 12));
      });

      it("charlie borrows 40k$ worth of collateral (spiking utilization over 300%)", async () => {
        console.log(0, (await testCometExt.totalsBasic()).totalSupplyBase.toString());
        console.log(0, (await testCometExt.totalsBasic()).totalBorrowBase.toString());

        console.log("alice 1:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log("bob   1:", (await testComet.borrowBalanceOf(bob.address)).toString());

        console.log("u1:", (await testComet.getUtilization()).div(exp(1, 16)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("======================");
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 360]);
        await ethers.provider.send("evm_mine", []);
        await testComet.accrueAccount(alice.address);

        console.log("alice 2:", (await testComet.borrowBalanceOf(alice.address)).toString());
        console.log("bob   2:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("u2:", (await testComet.getUtilization()).div(exp(1, 16)).toString());

        let price = await testComet.getPrice(priceFeeds["COMP"].address);
        let amount = await testComet.userCollateral(alice.address, collaterals["COMP"].address);
        let colVal = amount.mul(price).div(exp(1, 18));
        let colValLF = colVal.mul(exp(85, 16)).div(exp(1, 18));

        console.log(price.toString());
        console.log(amount.toString());
        console.log("col   :", colVal.toString());
        console.log("col LF:", colValLF.toString());

        let basePrice = await testComet.getPrice(priceFeeds["USDC"].address);
        let baseAmount = await testComet.borrowBalanceOf(alice.address);
        let baseVal = baseAmount.mul(basePrice).div(exp(1, baseDecimals));

        console.log(basePrice.toString());
        console.log(baseAmount.toString());
        console.log("base  :", baseVal.toString());

        console.log(colValLF.sub(baseVal).toString());

        // default collateral factor is set as 80%
        const amount2 = BigNumber.from(exp(80000, baseDecimals));
        await testComet.connect(charlie).withdraw(baseToken.address, amount2);

        console.log("======================");
        console.log("alice 3:", (await testComet.borrowBalanceOf(alice.address)).toString());
        console.log("bob   3:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("u3:", (await testComet.getUtilization()).div(exp(1, 16)).toString());

        price = await testComet.getPrice(priceFeeds["COMP"].address);
        amount = await testComet.userCollateral(alice.address, collaterals["COMP"].address);
        colVal = amount.mul(price).div(exp(1, 18));
        colValLF = colVal.mul(exp(85, 16)).div(exp(1, 18));

        console.log(price.toString());
        console.log(amount.toString());
        console.log("col   :", colVal.toString());
        console.log("col LF:", colValLF.toString());

        basePrice = await testComet.getPrice(priceFeeds["USDC"].address);
        baseAmount = await testComet.borrowBalanceOf(alice.address);
        baseVal = baseAmount.mul(basePrice).div(exp(1, baseDecimals));

        console.log(basePrice.toString());
        console.log(baseAmount.toString());
        console.log("base  :", baseVal.toString());

        console.log(colValLF.sub(baseVal).toString());

        console.log(baseVal.mul(100).div(colVal).toString());

        console.log("======================");
        await ethers.provider.send("evm_increaseTime", [1800]);
        await ethers.provider.send("evm_mine", []);
        await testComet.accrueAccount(alice.address);

        console.log("alice 4:", (await testComet.borrowBalanceOf(alice.address)).toString());
        console.log("bob   4:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("u4:", (await testComet.getUtilization()).div(exp(1, 16)).toString());

        price = await testComet.getPrice(priceFeeds["COMP"].address);
        amount = await testComet.userCollateral(alice.address, collaterals["COMP"].address);
        colVal = amount.mul(price).div(exp(1, 18));
        colValLF = colVal.mul(exp(85, 16)).div(exp(1, 18));

        console.log(price.toString());
        console.log(amount.toString());
        console.log("col   :", colVal.toString());
        console.log("col LF:", colValLF.toString());

        basePrice = await testComet.getPrice(priceFeeds["USDC"].address);
        baseAmount = await testComet.borrowBalanceOf(alice.address);
        baseVal = baseAmount.mul(basePrice).div(exp(1, baseDecimals));

        console.log(basePrice.toString());
        console.log(baseAmount.toString());
        console.log("base  :", baseVal.toString());

        console.log(colValLF.sub(baseVal).toString());

        console.log("======================");

        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 59]);
        await ethers.provider.send("evm_mine", []);
        await testComet.accrueAccount(alice.address);

        console.log("alice 5:", (await testComet.borrowBalanceOf(alice.address)).toString());
        console.log("bob   5:", (await testComet.borrowBalanceOf(bob.address)).toString());
        console.log(await testComet.isLiquidatable(bob.address));

        console.log("u4:", (await testComet.getUtilization()).div(exp(1, 16)).toString());
      });
    });

    describe("lenders can withdraw from the market even peaking utilization", function () {
      it("withdraw by lenders does not revert if reaching >200% utilization", async () => {
        // wip
      });

      it("withdraw by lenders does not revert if reaching utilization above uint64 limit (> 1800%)", async () => {
        // wip
      });
    });
  });
});
