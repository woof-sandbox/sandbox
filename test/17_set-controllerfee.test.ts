import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ethers, expect, exp, makeConfigController, createComet, makeMockERC20, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

import { SandboxComet, ConfigController, FaucetToken, ICometExtension, ISandboxController } from "../build/types";

import { BigNumber } from "ethers";

// Note: isolated supply functionality, withdraw and repay are tested in separate testsets
describe.only("17. supply", function () {
  let owner, dao, curator, treasury, guardian, alice, bob, charli: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  let baseToken: FaucetToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  let seedReserve: BigNumber;

  before(async function () {
    [owner, dao, treasury, curator, guardian, alice, bob, charli] = await ethers.getSigners();

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

    seedReserve = await sandboxController.suggestedAmountOfSeedReserves(baseToken.address);

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }

    await baseToken.allocateTo(alice.address, exp(1e10, 18));
    await baseToken.allocateTo(bob.address, exp(1e10, 18));
    await baseToken.allocateTo(charli.address, exp(1e10, 18));
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
      const BASE_AMOUNT: bigint = exp(5e9, 18);

      it("wait and accrue state", async () => {
        // wait with empty comet for a while
        await ethers.provider.send("evm_increaseTime", [60 * 60]); // 1 hr
        await ethers.provider.send("evm_mine", []);

        await comet.accrueAccount(alice.address);
      });

      it("emits Supply event when supplies base asset into empty pool", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();
        let getReservesB00 = await comet.getReserves();
        console.log("getReservesB00", getReservesB00.toString());
        await baseToken.connect(alice).approve(comet.address, BASE_AMOUNT);

        await baseToken.connect(alice).transfer(comet.address, exp(5e9, 6));

        expect(await comet.connect(alice).supply(baseToken.address, exp(1e6, 6)))
          .emit(comet, "Supply")
          .withArgs(alice.address, alice.address, BASE_AMOUNT);

        await configController.connect(owner).setCometFee(comet.address, true);

        // await collaterals["COMP"].allocateTo(alice.address, exp(1e10, 18));
        await collaterals["WETH"].allocateTo(bob.address, exp(100e15, 18));
        await baseToken.allocateTo(bob.address, exp(1e5, 18));

        await collaterals["WETH"].allocateTo(charli.address, exp(100e15, 18));
        await baseToken.allocateTo(charli.address, exp(1e5, 18));

        let protocolFeesBaseBefore = await comet.connect(alice).totalProtocolFeesPerAsset(baseToken.address);
        let controllerFeesBefore = await comet.connect(alice).totalControllerFeesPerAsset(baseToken.address);

        await collaterals["WETH"].connect(charli).approve(comet.address, exp(1e8, 18));
        await comet.connect(charli).supply(collaterals["WETH"].address, exp(1e8, 18));

        await collaterals["WETH"].connect(bob).approve(comet.address, exp(1e8, 18));
        await comet.connect(bob).supply(collaterals["WETH"].address, exp(1e8, 18));

        await comet.connect(bob).withdraw(baseToken.address, exp(5e5, 6));

        await comet.connect(charli).withdraw(baseToken.address, exp(5e5, 6));

        await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 360]); // 180 days
        await ethers.provider.send("evm_mine", []);

        await baseToken.connect(bob).approve(comet.address, exp(1e7, 6));
        await baseToken.connect(charli).approve(comet.address, exp(1e7, 6));

        await baseToken.allocateTo(charli.address, exp(1e10, 18));

        await comet.connect(bob).repayAllFrom(bob.address, bob.address);

        let protocolFeesBaseAfter = await comet.connect(alice).totalProtocolFeesPerAsset(baseToken.address);
        let controllerFeesAfter = await comet.connect(alice).totalControllerFeesPerAsset(baseToken.address);

        console.log("protocolFeesBaseDiff", protocolFeesBaseAfter.toNumber() - protocolFeesBaseBefore.toNumber());
        console.log("controllerFeesDiff", controllerFeesAfter.toNumber() - controllerFeesBefore.toNumber());

        await comet.connect(charli).repayAllFrom(charli.address, charli.address);

        let protocolFeesBaseAfter2 = await comet.connect(alice).totalProtocolFeesPerAsset(baseToken.address);
        let controllerFeesAfter2 = await comet.connect(alice).totalControllerFeesPerAsset(baseToken.address);

        console.log("protocolFeesBaseDiff2", protocolFeesBaseAfter2.toNumber() - protocolFeesBaseAfter.toNumber());
        console.log("controllerFeesDiff2", controllerFeesAfter2.toNumber() - controllerFeesAfter.toNumber());

        await snapshot.restore();
      });
    });
  });
});
