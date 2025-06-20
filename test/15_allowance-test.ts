import { ethers, expect, makeProtocol, makeToken } from './helper/helpers';
import { CometExtension, CometHarness, CometExtension__factory, CometHarness__factory, FaucetToken, NonStandardFaucetFeeToken } from '../build/types';
import { Interface } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('15. allowance', function () {
  let comet: CometHarness & CometExtension;
  let user: SignerWithAddress, alice: SignerWithAddress;
  let tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>;
  let baseToken: FaucetToken | NonStandardFaucetFeeToken;

  beforeEach(async () => {
    let cometHarness: CometHarness;
    ({
      comet: cometHarness,
      users: [user, alice],
      tokens,
      baseToken,
    } = await makeProtocol());
    const [signer] = await ethers.getSigners();

    const CometHarnessInterface = new Interface(CometHarness__factory.abi);
    const CometExtensionInterface = new Interface(CometExtension__factory.abi);

    const fragments = [
      ...CometHarnessInterface.fragments,
      ...CometExtensionInterface.fragments.filter(
        (frag) => !CometHarnessInterface.fragments.some((f) => f.type === frag.type && f.name === frag.name),
      ),
    ];

    comet = new ethers.Contract(cometHarness.address, fragments, signer) as typeof comet;
  });

  describe('approve', function () {
    it('should increase allowance after approve (baseToken)', async () => {
      const asset = baseToken.address;
      const amount = 100;
      const spender = alice.address;

      const initialAllowance = await comet.allowance(user.address, spender, asset);

      await comet.connect(user).approve(spender, asset, amount);

      const newAllowance = await comet.allowance(user.address, spender, asset);

      expect(newAllowance).to.equal(initialAllowance.add(newAllowance));
    });

    it('should increase allowance after approve (collateralToken)', async () => {
      const asset = tokens['COMP'].address;
      const amount = 100;
      const spender = alice.address;

      const initialAllowance = await comet.allowance(user.address, spender, asset);

      await comet.connect(user).approve(spender, asset, amount);

      const newAllowance = await comet.allowance(user.address, spender, asset);

      expect(newAllowance).to.equal(initialAllowance.add(newAllowance));
    });

    it('should emit Approval event after approve', async () => {
      const asset = baseToken.address;
      const amount = 100;
      const spender = alice.address;

      await expect(comet.connect(user).approve(spender, asset, amount))
        .to.emit(comet, 'Approval')
        .withArgs(user.address, spender, asset, amount);
    });

    it('should revert if asset is not a base or collateral token', async () => {
      const asset = (await makeToken({ name: 'FakeToken', symbol: 'FAKE', decimals: 18 })).address;
      const amount = 100;
      const spender = alice.address;

      await expect(comet.connect(user).approve(spender, asset, amount)).to.be.revertedWithCustomError(comet, 'WrongToken').withArgs(asset);
    });
  });

  describe('approveAll', function () {
    it('should allow to set allowance for all assets in comet', async () => {
      const assets = [baseToken.address, ...Object.values(tokens).map((token) => token.address)];
      const amounts = [...Array(assets.length - 1).fill(100n)];
      const spender = alice.address;
      const initialAllowances = await Promise.all(assets.map((asset) => comet.allowance(user.address, spender, asset)));

      await comet.connect(user).approveAll(spender, amounts[0], amounts.slice(1));

      const newAllowances = await Promise.all(assets.map((asset) => comet.allowance(user.address, spender, asset)));

      newAllowances.forEach((allowance, i) => {
        expect(allowance).to.equal(initialAllowances[i].add(100n));
      });
    });

    it('should emit Approval event for each asset', async () => {
      const assets = [baseToken.address, ...Object.values(tokens).map((token) => token.address)];
      const amounts = [...Array(assets.length - 1).fill(100n)];
      const spender = alice.address;

      await expect(comet.connect(user).approveAll(spender, amounts[0], amounts.slice(1)))
        .to.emit(comet, 'Approval')
        .withArgs(user.address, spender, baseToken.address, 100n);

      for (let i = 0; i < Object.keys(tokens).length; i++) {
        await expect(comet.connect(user).approveAll(spender, amounts[0], amounts.slice(1)))
          .to.emit(comet, 'Approval')
          .withArgs(user.address, spender, Object.values(tokens)[i].address, 100n);
      }
    });

    it('should revert if amounts length does not match assets length', async () => {
      const assets = [baseToken.address, ...Object.values(tokens).map((token) => token.address)];
      const amounts = [...Array(assets.length).fill(100n)]; // One extra amount
      const spender = alice.address;

      await expect(comet.connect(user).approveAll(spender, amounts[0], amounts.slice(1))).to.be.revertedWithCustomError(comet, 'InvalidLength');
    });
  });

  describe('hasPermission', function () {
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
      await comet.connect(user).approve(manager, asset, amount);
    });

    it('should return true if manager has permission for the asset', async () => {
      expect(await comet.hasPermission(owner, manager, asset, amount)).to.be.true;
    });

    it('should return true if manager is owner', async () => {
      expect(await comet.hasPermission(owner, owner, asset, amount)).to.be.true;
    });

    it('should return false if manager has not enough allowance', async () => {
      const insufficientAmount = amount + 1;
      expect(await comet.hasPermission(owner, manager, asset, insufficientAmount)).to.be.false;
    });
  });

  describe('spendAllowance', function () {
    it('should not spend allowance if owner is spender', async () => {
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

    it('should spend allowance if spender is not owner', async () => {
      const asset = baseToken;
      const amount = 100;
      const owner = user;
      const dst = alice;

      await baseToken.allocateTo(owner.address, amount);
      await baseToken.connect(owner).approve(comet.address, amount);

      await comet.connect(owner).approve(dst.address, asset.address, amount);

      const initialAllowance = await comet.allowance(owner.address, dst.address, asset.address);

      await comet.connect(dst).supplyFrom(owner.address, dst.address, asset.address, amount);

      const newAllowance = await comet.allowance(owner.address, dst.address, asset.address);

      expect(newAllowance).to.equal(initialAllowance.sub(amount));
    });

    it('should revert if allowance is not enough', async () => {
      const asset = baseToken;
      const amount = 100;
      const owner = user;
      const dst = alice;

      await baseToken.allocateTo(owner.address, amount);
      await baseToken.connect(owner).approve(comet.address, amount);

      await comet.connect(owner).approve(dst.address, asset.address, amount);

      await expect(comet.connect(dst).supplyFrom(owner.address, dst.address, asset.address, amount + 1))
        .to.be.revertedWithCustomError(comet, 'InsufficientAllowance')
        .withArgs(asset.address, owner.address, dst.address);
    });
  });
});
