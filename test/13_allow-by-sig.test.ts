import { ethers, event, expect, makeProtocol, SnapshotRestorer, takeSnapshot, wait } from "./helper/helpers";
import { BigNumber, Signature } from "ethers";
import { CometExtension, CometHarness, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const types = {
  Authorization: [
    { name: "owner", type: "address" },
    { name: "manager", type: "address" },
    { name: "asset", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

describe("13. allowBySig — SandboxComet / CometExtension", function () {
  let snapshot: SnapshotRestorer;

  let comet: CometHarness;
  let cometExt: CometExtension;

  let users: SignerWithAddress[];
  let signer: SignerWithAddress;
  let manager: SignerWithAddress;
  let tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>;
  let unsupportedToken: FaucetToken;
  let domain: { name: string; version: string; chainId: number; verifyingContract: string };

  let now: number;

  let signatureArgs: {
    owner: string;
    manager: string;
    asset: string;
    amount: BigNumber;
    nonce: BigNumber;
    expiry: number;
  };

  let signature: Signature;

  before(async function () {
    ({ comet, users, tokens, unsupportedToken } = await makeProtocol());
    cometExt = (await ethers.getContractAt("CometExtension", comet.address)) as CometExtension;
    [signer, manager] = users;

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
      asset: tokens["COMP"].address,
      amount: BigNumber.from(100),
      nonce: await cometExt.userNonce(signer.address),
      expiry: now + 10,
    };

    const rawSignature = await signer._signTypedData(domain, types, signatureArgs);
    signature = ethers.utils.splitSignature(rawSignature);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  it("authorizes with a valid signature", async function () {
    expect(await cometExt.allowance(signatureArgs.owner, signatureArgs.manager, signatureArgs.asset)).to.equal(0);

    const tx = await wait(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    );

    expect(await cometExt.allowance(signer.address, manager.address, signatureArgs.asset)).to.equal(signatureArgs.amount);
    expect(await cometExt.userNonce(signer.address)).to.equal(signatureArgs.nonce.add(1));

    expect(event(tx, 0)).to.deep.equal({
      Approval: {
        owner: signer.address,
        spender: manager.address,
        asset: signatureArgs.asset,
        amount: signatureArgs.amount,
      },
    });
  });

  it("fails if owner argument is altered", async function () {
    const invalidOwnerAddress = ethers.Wallet.createRandom().address;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          invalidOwnerAddress,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          invalidManagerAddress,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
      .allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.asset,
        signatureArgs.amount,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s
      );

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          expiredArgs.owner,
          expiredArgs.manager,
          expiredArgs.asset,
          expiredArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.asset,
          signatureArgs.amount,
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
        .allowBySig(
          ethers.constants.AddressZero,
          manager.address,
          signatureArgs.asset,
          signatureArgs.amount,
          await cometExt.userNonce(ethers.constants.AddressZero),
          now + 100,
          invalidSig.v,
          invalidSig.r,
          invalidSig.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if token is asset is not base asset or collateral", async function () {
    const rawSignature = await signer._signTypedData(domain, types, { ...signatureArgs, asset: unsupportedToken.address });
    signature = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          manager.address,
          unsupportedToken.address,
          signatureArgs.amount,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    )
      .to.be.revertedWithCustomError(cometExt, "WrongToken")
      .withArgs(unsupportedToken.address);
  });

  it("fails if manager is zero address", async function () {
    const zeroAddress = ethers.constants.AddressZero;
    const rawSignature = await signer._signTypedData(domain, types, { ...signatureArgs, manager: zeroAddress });
    signature = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          zeroAddress,
          signatureArgs.asset,
          signatureArgs.amount,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'ZeroAddress()'");
  });

  it("fails if asset is zero address", async function () {
    const zeroAddress = ethers.constants.AddressZero;
    const rawSignature = await signer._signTypedData(domain, types, { ...signatureArgs, asset: zeroAddress });
    signature = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          zeroAddress,
          signatureArgs.amount,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWithCustomError(cometExt, "ZeroAddress");
  });
});
