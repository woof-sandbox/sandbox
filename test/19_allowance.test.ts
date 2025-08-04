import { ethers, exp, expect, makeConfigController, createComet, makeMockERC20 } from "./helper/helpers";
import { ICometExtension, FaucetToken, NonStandardFaucetFeeToken, SandboxComet } from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonateAccount, SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

describe.skip("19. allowance", function () {
  let comet: SandboxComet;
  let cometExt: ICometExtension;
  let owner, dao, curator, treasury, guardian, alice, user: SignerWithAddress;

  let baseToken: FaucetToken | NonStandardFaucetFeeToken;
  let collateral: FaucetToken | NonStandardFaucetFeeToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};

  let snapshot: SnapshotRestorer;

  before(async () => {
    [owner, dao, treasury, curator, guardian, alice, user] = await ethers.getSigners();

    const opts = await makeConfigController({ owner: owner, dao: dao, treasury: treasury, curator: curator, guardian: guardian }, true);
    baseToken = opts.baseToken;
    collateral = opts.collaterals["COMP"];
    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }

    comet = (await createComet(
      owner,
      opts.opts.assets,
      opts.configController,
      opts.sandboxController,
      opts.collaterals,
      baseToken
    )) as SandboxComet & ICometExtension;
    cometExt = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("approve", function () {
    it("should increase allowance after approve (baseToken)", async () => {
      const asset = baseToken.address;
      const amount = 100;
      const spender = alice.address;

      const initialAllowance = await comet.allowance(user.address, spender, asset);

      await cometExt.connect(user).approve(spender, asset, amount);

      const newAllowance = await comet.allowance(user.address, spender, asset);

      expect(newAllowance).to.equal(initialAllowance.add(newAllowance));
    });

    it("should increase allowance after approve (collateralToken)", async () => {
      const asset = collateral.address;
      const amount = 100;
      const spender = alice.address;

      const initialAllowance = await comet.allowance(user.address, spender, asset);

      await cometExt.connect(user).approve(spender, asset, amount);

      const newAllowance = await comet.allowance(user.address, spender, asset);

      expect(newAllowance).to.equal(initialAllowance.add(newAllowance));
    });

    it("should emit Approval event after approve", async () => {
      const asset = baseToken.address;
      const amount = 100;
      const spender = alice.address;

      await expect(cometExt.connect(user).approve(spender, asset, amount))
        .to.emit(comet, "Approval")
        .withArgs(user.address, spender, asset, amount);
    });

    it("should revert if asset is not a base or collateral token", async () => {
      const asset = (await makeMockERC20({ name: "FakeToken", symbol: "FAKE", decimals: 18 })).address;
      const amount = 100;
      const spender = alice.address;

      await expect(cometExt.connect(user).approve(spender, asset, amount))
        .to.be.revertedWithCustomError(comet, "WrongToken")
        .withArgs(asset);
    });

    it("should revert if owner is zero address", async () => {
      const zeroAddress = ethers.constants.AddressZero;
      await impersonateAccount(zeroAddress);
      const zeroSigner = await ethers.getSigner(zeroAddress);
      await owner.sendTransaction({
        to: zeroSigner.address,
        value: ethers.utils.parseEther("1"),
      });

      await expect(cometExt.connect(zeroSigner).approve(alice.address, baseToken.address, 100)).to.be.revertedWithCustomError(
        comet,
        "ZeroAddress"
      );
    });

    it("should revert if spender is zero address", async () => {
      const asset = baseToken.address;
      const amount = 100;
      const spender = ethers.constants.AddressZero;

      await expect(cometExt.connect(user).approve(spender, asset, amount)).to.be.revertedWithCustomError(comet, "ZeroAddress");
    });

    it("should revert if asset is zero address", async () => {
      const asset = ethers.constants.AddressZero;
      const amount = 100;
      const spender = alice.address;

      await expect(cometExt.connect(user).approve(spender, asset, amount)).to.be.revertedWithCustomError(comet, "ZeroAddress");
    });
  });

  describe("approveAllTokens", function () {
    it("should allow to set allowance for all assets in comet", async () => {
      const assets = [baseToken.address, ...Object.values(collaterals).map(token => token.address)];
      const amounts = [...Array(assets.length).fill(100n)];
      const spender = alice.address;
      const initialAllowances = await Promise.all(assets.map(asset => comet.allowance(user.address, spender, asset)));

      await cometExt.connect(user).approveAllTokens(spender, amounts[0], amounts.slice(1));

      const newAllowances = await Promise.all(assets.map(asset => comet.allowance(user.address, spender, asset)));

      newAllowances.forEach((allowance, i) => {
        expect(allowance).to.equal(initialAllowances[i].add(100n));
      });
    });

    it("should emit Approval event for each asset", async () => {
      const assets = [baseToken.address, ...Object.values(collaterals).map(token => token.address)];
      const amounts = [...Array(assets.length).fill(100n)];
      const spender = alice.address;

      await expect(cometExt.connect(user).approveAllTokens(spender, amounts[0], amounts.slice(1)))
        .to.emit(comet, "Approval")
        .withArgs(user.address, spender, baseToken.address, 100n);

      for (let i = 0; i < Object.keys(assets).length; i++) {
        await expect(cometExt.connect(user).approveAllTokens(spender, amounts[0], amounts.slice(1)))
          .to.emit(comet, "Approval")
          .withArgs(user.address, spender, Object.values(assets)[i], 100n);
      }
    });

    it("should revert if amounts length does not match assets length", async () => {
      const assets = [baseToken.address, ...Object.values(collaterals).map(token => token.address)];
      const amounts = [...Array(assets.length + 1).fill(100n)]; // One extra amount
      const spender = alice.address;

      await expect(cometExt.connect(user).approveAllTokens(spender, amounts[0], amounts.slice(1))).to.be.revertedWithCustomError(
        cometExt,
        "InvalidLength"
      );
    });
  });

  describe("approveAll", function () {
    it("should allow to give allowance for all base assets at once", async () => {
      // check that allowance all is false
      expect(await comet.allowanceAll(user.address, alice.address)).to.be.false;

      // approve for all assets
      await cometExt.connect(user).approveAll(alice.address, true);

      // check that allowance all is true
      expect(await comet.allowanceAll(user.address, alice.address)).to.be.true;
    });

    it("should allow to revoke allowance for all base assets at once", async () => {
      // approve for all assets
      await cometExt.connect(user).approveAll(alice.address, true);

      // check that allowance all is true
      expect(await comet.allowanceAll(user.address, alice.address)).to.be.true;

      // revoke allowance for all assets
      await cometExt.connect(user).approveAll(alice.address, false);

      // check that allowance all is false
      expect(await comet.allowanceAll(user.address, alice.address)).to.be.false;
    });

    it("should emit ApprovalAll event when approving for all assets", async () => {
      const spender = alice.address;

      await expect(cometExt.connect(user).approveAll(spender, true))
        .to.emit(comet, "ApprovalAll")
        .withArgs(user.address, spender, baseToken.address, true);
    });

    it("should emit ApprovalAll event when revoking for all assets", async () => {
      const spender = alice.address;

      // approve first
      await cometExt.connect(user).approveAll(spender, true);

      await expect(cometExt.connect(user).approveAll(spender, false))
        .to.emit(comet, "ApprovalAll")
        .withArgs(user.address, spender, baseToken.address, false);
    });

    it("should revert if owner is zero address", async () => {
      const zeroAddress = ethers.constants.AddressZero;
      await impersonateAccount(zeroAddress);
      const zeroSigner = await ethers.getSigner(zeroAddress);
      await owner.sendTransaction({
        to: zeroSigner.address,
        value: ethers.utils.parseEther("1"),
      });

      await expect(cometExt.connect(zeroSigner).approveAll(zeroAddress, true)).to.be.revertedWithCustomError(comet, "ZeroAddress");
    });

    it("should revert if spender is zero address", async () => {
      const spender = ethers.constants.AddressZero;

      await expect(cometExt.connect(user).approveAll(spender, true)).to.be.revertedWithCustomError(comet, "ZeroAddress");
    });

    it("should revert if type of allowance is already set", async () => {
      const spender = alice.address;

      // approve first
      await cometExt.connect(user).approveAll(spender, true);

      // try to set allowance again
      await expect(cometExt.connect(user).approveAll(spender, true)).to.be.revertedWithCustomError(comet, "IncorrectApproval");
    });
  });

  describe("hasPermission", function () {
    let owner: string;
    let manager: string;
    let asset: string;
    let amount: number;

    beforeEach(async () => {
      owner = user.address;
      manager = alice.address;
      asset = baseToken.address;
      amount = 100;

      // give some allowance to the manager
      await cometExt.connect(user).approve(manager, asset, amount);
    });

    it("should return true if manager has permission for the asset", async () => {
      expect(await comet.hasPermission(owner, manager, asset, amount)).to.be.true;
    });

    it("should return true if manager is owner", async () => {
      expect(await comet.hasPermission(owner, owner, asset, amount)).to.be.true;
    });

    it("should return false if manager has not enough allowance", async () => {
      const insufficientAmount = amount + 1;
      expect(await comet.hasPermission(owner, manager, asset, insufficientAmount)).to.be.false;
    });
  });

  describe("spendAllowance", function () {
    describe("isAll false", function () {
      it("should not spend allowance if owner is spender", async () => {
        const asset = baseToken;
        const amount = 100;
        const caller = alice;

        await baseToken.allocateTo(caller.address, amount);
        await baseToken.connect(caller).approve(comet.address, amount);

        const initialAllowance = await comet.allowance(caller.address, caller.address, asset.address);

        await comet.connect(caller).supply(asset.address, amount);

        const newAllowance = await comet.allowance(caller.address, caller.address, asset.address);

        expect(newAllowance).to.equal(initialAllowance);
      });

      it("should spend allowance if spender is not owner", async () => {
        const asset = baseToken;
        const amount = 100;
        const owner = user;
        const dst = alice;

        await baseToken.allocateTo(owner.address, amount);
        await baseToken.connect(owner).approve(comet.address, amount);

        await cometExt.connect(owner).approve(dst.address, asset.address, amount);

        const initialAllowance = await comet.allowance(owner.address, dst.address, asset.address);

        await comet.connect(dst).supplyFrom(owner.address, dst.address, asset.address, amount);

        const newAllowance = await comet.allowance(owner.address, dst.address, asset.address);

        expect(newAllowance).to.equal(initialAllowance.sub(amount));
      });

      it("should revert if allowance is not enough", async () => {
        const asset = baseToken;
        const amount = 100;
        const owner = user;
        const dst = alice;

        await baseToken.allocateTo(owner.address, amount);
        await baseToken.connect(owner).approve(comet.address, amount);

        await cometExt.connect(owner).approve(dst.address, asset.address, amount);

        await expect(comet.connect(dst).supplyFrom(owner.address, dst.address, asset.address, amount + 1))
          .to.be.revertedWithCustomError(comet, "InsufficientAllowance")
          .withArgs(asset.address, owner.address, dst.address);
      });

      it("should revert if spend amount is zero", async () => {
        const asset = baseToken.address;
        const amount = 0;

        await expect(comet.connect(user).supplyFrom(alice.address, user.address, asset, amount)).to.be.revertedWithCustomError(
          comet,
          "ZeroAmount"
        );
      });
    });

    describe("isAll true", function () {
      let owner: SignerWithAddress;
      let baseTokenAmount: bigint;
      let borrowAmount: bigint;
      let supplyAmount: bigint;
      let allowancer: SignerWithAddress;

      beforeEach(async () => {
        owner = user;
        baseTokenAmount = exp(1000, 6);
        borrowAmount = exp(100, 6);
        supplyAmount = exp(100, 18);
        allowancer = alice;

        await baseToken.allocateTo(owner.address, baseTokenAmount);
        await collateral.allocateTo(allowancer.address, supplyAmount);
        await baseToken.allocateTo(allowancer.address, baseTokenAmount);
      });

      it('should allow to repay all when "allowanceAll" is true', async () => {
        // first supply some base tokens to comet to allow borrow
        await comet.connect(owner).supply(baseToken.address, baseTokenAmount);

        // make borrow from alice
        await comet.connect(allowancer).supply(collateral.address, supplyAmount);
        await comet.connect(allowancer).withdraw(baseToken.address, borrowAmount);

        // give approval for owner from alice
        await cometExt.connect(allowancer).approveAll(owner.address, true);

        // repay all from owner
        await baseToken.approve(comet.address, ethers.constants.MaxUint256);
        await expect(comet.connect(owner).repayAllFrom(allowancer.address, allowancer.address))
          .to.emit(comet, "ApprovalAll")
          .withArgs(allowancer.address, owner.address, baseToken.address, false);

        // check that borrow balance of Alice is zero
        expect(await comet.borrowBalanceOf(allowancer.address)).to.eq(0);

        // check that allowance became false
        expect(await comet.allowanceAll(allowancer.address, owner.address)).to.be.false;
      });

      it('should allow to transfer all when "allowanceAll" is true', async () => {
        // supply base tokens to comet from allowancer
        await comet.connect(allowancer).supply(baseToken.address, baseTokenAmount);

        // give approval for owner from alice
        await cometExt.connect(allowancer).approveAll(owner.address, true);

        expect(await comet.balanceOf(allowancer.address)).to.eq(baseTokenAmount - 1n);
        expect(await comet.balanceOf(owner.address)).to.eq(0);

        // transfer all from allowancer to owner
        await expect(comet.connect(owner).transferAllFrom(allowancer.address, owner.address))
          .to.emit(comet, "ApprovalAll")
          .withArgs(allowancer.address, owner.address, baseToken.address, false);

        expect(await comet.balanceOf(allowancer.address)).to.eq(0);
        expect(await comet.balanceOf(owner.address)).to.eq(baseTokenAmount - 2n);

        // check that allowance became false
        expect(await comet.allowanceAll(allowancer.address, owner.address)).to.be.false;
      });

      it('should allow to withdraw all when "allowanceAll" is true', async () => {
        // supply base tokens to comet from allowancer
        await comet.connect(allowancer).supply(baseToken.address, baseTokenAmount);

        // give approval for owner from alice
        await cometExt.connect(allowancer).approveAll(owner.address, true);

        expect(await comet.balanceOf(allowancer.address)).to.eq(baseTokenAmount - 1n);

        const baseTokenBalanceOwnerBefore = await baseToken.balanceOf(owner.address);

        // withdraw all from allowancer to owner
        await expect(comet.connect(owner).withdrawAllFrom(allowancer.address, owner.address))
          .to.emit(comet, "ApprovalAll")
          .withArgs(allowancer.address, owner.address, baseToken.address, false);

        expect(await comet.balanceOf(allowancer.address)).to.eq(0);

        expect(await baseToken.balanceOf(owner.address)).to.eq(baseTokenBalanceOwnerBefore.add(baseTokenAmount).sub(1n));
      });

      it("approvalAll is not needed when owner is manager", async () => {
        owner = alice;

        // supply base tokens to comet from allowancer
        await comet.connect(allowancer).supply(baseToken.address, baseTokenAmount);

        expect(await comet.balanceOf(allowancer.address)).to.eq(baseTokenAmount - 1n);

        const baseTokenBalanceOwnerBefore = await baseToken.balanceOf(owner.address);

        // withdraw all from allowancer to owner
        await expect(comet.connect(owner).withdrawAllFrom(allowancer.address, owner.address)).to.not.emit(comet, "ApprovalAll");

        expect(await comet.balanceOf(allowancer.address)).to.eq(0);

        expect(await baseToken.balanceOf(owner.address)).to.eq(baseTokenBalanceOwnerBefore.add(baseTokenAmount).sub(1n));
      });

      it("reverts when no allowance is given", async () => {
        // supply base tokens to comet from allowancer
        await comet.connect(allowancer).supply(baseToken.address, baseTokenAmount);

        // withdraw all from allowancer to owner
        await expect(comet.connect(owner).withdrawAllFrom(allowancer.address, owner.address))
          .to.be.revertedWithCustomError(comet, "InsufficientAllowance")
          .withArgs(baseToken.address, allowancer.address, owner.address);
      });
    });
  });
});
