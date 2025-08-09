import { ethers, event, expect, SnapshotRestorer, takeSnapshot, wait, makeConfigController, createComet } from "./helper/helpers";
import { BigNumber, Signature } from "ethers";
import { SandboxComet, ICometExtension, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const types = {
  AuthorizationAll: [
    { name: "owner", type: "address" },
    { name: "manager", type: "address" },
    { name: "approved", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

describe("20. allowAllBySig — SandboxComet / CometExtension", function () {
  let snapshot: SnapshotRestorer;

  let comet: SandboxComet;
  let cometExt: ICometExtension;

  let owner, dao, curator, treasury, guardian, signer, manager: SignerWithAddress;

  let baseToken: FaucetToken | NonStandardFaucetFeeToken;
  let domain: { name: string; version: string; chainId: number; verifyingContract: string };

  let now: number;

  let signatureArgs: {
    owner: string;
    manager: string;
    approved: boolean;
    nonce: BigNumber;
    expiry: number;
  };

  let signature: Signature;

  before(async function () {
    [owner, dao, treasury, curator, guardian, signer, manager] = await ethers.getSigners();

    const opts = await makeConfigController({ owner: owner, dao: dao, treasury: treasury, curator: curator, guardian: guardian }, true);
    baseToken = opts.baseToken as FaucetToken;

    comet = await createComet(owner, opts.opts.assets, opts.configController, opts.sandboxController, opts.collaterals, baseToken);
    cometExt = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    domain = {
      name: await cometExt.name(),
      version: await cometExt.version(),
      chainId: 1337,
      verifyingContract: comet.address,
    };

    now = await time.latest();

    signatureArgs = {
      owner: signer.address,
      manager: manager.address,
      approved: true,
      nonce: await cometExt.userNonce(signer.address),
      expiry: now + 10,
    };

    const rawSignature = await signer._signTypedData(domain, types, signatureArgs);
    signature = ethers.utils.splitSignature(rawSignature);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  it("authorizes with a valid signature", async function () {
    expect(await cometExt.allowanceAll(signatureArgs.owner, signatureArgs.manager)).to.be.false;

    const tx = await wait(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    );

    expect(await cometExt.allowanceAll(signer.address, manager.address)).to.be.true;
    expect(await cometExt.userNonce(signer.address)).to.equal(signatureArgs.nonce.add(1));

    expect(event(tx, 0)).to.deep.equal({
      ApprovalAll: {
        owner: signer.address,
        spender: manager.address,
        baseAsset: baseToken.address,
        approval: signatureArgs.approved,
      },
    });
  });

  it("fails if owner argument is altered", async function () {
    const invalidOwnerAddress = ethers.Wallet.createRandom().address;

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          invalidOwnerAddress,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if manager argument is altered", async function () {
    const invalidManagerAddress = ethers.Wallet.createRandom().address;

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          invalidManagerAddress,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if nonce argument is altered", async function () {
    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce.add(1),
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if expiry argument is altered", async function () {
    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry + 100,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if signature contains invalid nonce", async function () {
    const invalidNonce = signatureArgs.nonce.add(1);
    const rawSignature = await (
      await ethers.getSigner(signatureArgs.owner)
    )._signTypedData(domain, types, { ...signatureArgs, nonce: invalidNonce });
    const sigBad = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          invalidNonce,
          signatureArgs.expiry,
          sigBad.v,
          sigBad.r,
          sigBad.s
        )
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });

  it("rejects a repeated message", async function () {
    await cometExt
      .connect(manager)
      .allowAllBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.approved,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s
      );

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });

  it("fails if signature expiry has passed", async function () {
    const past = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp - 1;

    const expiredArgs = { ...signatureArgs, expiry: past };
    const rawSig = await (await ethers.getSigner(signatureArgs.owner))._signTypedData(domain, types, expiredArgs);
    const expiredSignature = ethers.utils.splitSignature(rawSig);

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          expiredArgs.owner,
          expiredArgs.manager,
          expiredArgs.approved,
          expiredArgs.nonce,
          expiredArgs.expiry,
          expiredSignature.v,
          expiredSignature.r,
          expiredSignature.s
        )
    ).to.be.revertedWith("custom error 'SignatureExpired()'");
  });

  it("fails if v not in {27,28}", async function () {
    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          26,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'InvalidValueV()'");
  });

  it("fails if s is too high", async function () {
    const invalidS = "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1";

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          invalidS
        )
    ).to.be.revertedWith("custom error 'InvalidValueS()'");
  });

  it("fails if owner is zero address", async function () {
    const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;

    const invalidSig = {
      v: 27,
      r: "0x0000000000000000000000000000000000000000000000000000000000000000",
      s: "0x36b99b3646118e24ca7c0c698792ebaf25a4bfa08c1cd6778c335a537b0eb43c",
    };

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          ethers.constants.AddressZero,
          manager.address,
          signatureArgs.approved,
          await cometExt.userNonce(ethers.constants.AddressZero),
          now + 100,
          invalidSig.v,
          invalidSig.r,
          invalidSig.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if manager is zero address", async function () {
    const zeroAddress = ethers.constants.AddressZero;
    const rawSignature = await signer._signTypedData(domain, types, { ...signatureArgs, manager: zeroAddress });
    signature = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          zeroAddress,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'ZeroAddress()'");
  });

  it("fails if type of allowance is already set", async function () {
    const rawSignature = await signer._signTypedData(domain, types, { ...signatureArgs, approved: false });
    signature = ethers.utils.splitSignature(rawSignature);
    signatureArgs.approved = false;

    // check that the allowanceAll is already set to false
    expect(await cometExt.allowanceAll(signatureArgs.owner, signatureArgs.manager)).to.be.false;

    await expect(
      cometExt
        .connect(manager)
        .allowAllBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.approved,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWithCustomError(cometExt, "IncorrectApproval");
  });
});
