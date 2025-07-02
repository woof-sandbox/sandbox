import { ethers, event, expect, makeProtocol, wait } from "./helper/helpers";

const types = {
  Authorization: [
    { name: "owner", type: "address" },
    { name: "manager", type: "address" },
    { name: "isAllowed", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

async function buildFixture() {
  const { comet, users } = await makeProtocol();
  const cometExt = await ethers.getContractAt("CometExtension", comet.address);
  const [signer, manager] = users;

  const domain = {
    name: await cometExt.name(),
    version: await cometExt.version(),
    chainId: 1337,
    verifyingContract: comet.address,
  };

  const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;

  const signatureArgs = {
    owner: signer.address,
    manager: manager.address,
    isAllowed: true,
    nonce: await cometExt.userNonce(signer.address),
    expiry: now + 10,
  } as const;

  const rawSignature = await signer._signTypedData(domain, types, signatureArgs);
  const signature = ethers.utils.splitSignature(rawSignature);

  return {
    cometExt,
    signer,
    manager,
    domain,
    signatureArgs,
    signature,
  } as const;
}

describe("13. allowBySig — SandboxComet / CometExtension", function () {
  type Fixture = Awaited<ReturnType<typeof buildFixture>>;

  beforeEach(async function () {
    this.fixture = await buildFixture();
  });

  it("authorizes with a valid signature", async function () {
    const { cometExt, signatureArgs, signature, signer, manager } = this.fixture as Fixture;

    expect(await cometExt.isAllowed(signer.address, manager.address)).to.be.false;

    const tx = await wait(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    );

    expect(await cometExt.isAllowed(signer.address, manager.address)).to.be.true;
    expect(await cometExt.userNonce(signer.address)).to.equal(signatureArgs.nonce.add(1));

    expect(event(tx, 0)).to.deep.equal({
      Approval: {
        owner: signer.address,
        spender: manager.address,
        amount: ethers.constants.MaxUint256.toBigInt(),
      },
    });
  });

  it("fails if owner argument is altered", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;
    const invalidOwnerAddress = ethers.Wallet.createRandom().address;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          invalidOwnerAddress,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if manager argument is altered", async function () {
    const { cometExt, signatureArgs, signature, manager, signer } = this.fixture as Fixture;
    const invalidManagerAddress = ethers.Wallet.createRandom().address;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          invalidManagerAddress,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");

    expect(await cometExt.isAllowed(signer.address, invalidManagerAddress)).to.be.false;
  });

  it("fails if isAllowed argument is altered", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          !signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if nonce argument is altered", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce.add(1),
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if expiry argument is altered", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry + 100,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it("fails if signature contains invalid nonce", async function () {
    const { cometExt, signatureArgs, manager, domain } = this.fixture as Fixture;

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
          signatureArgs.isAllowed,
          invalidNonce,
          signatureArgs.expiry,
          sigBad.v,
          sigBad.r,
          sigBad.s
        )
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });

  it("rejects a repeated message", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    await cometExt
      .connect(manager)
      .allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
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
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });

  it("fails if signature expiry has passed", async function () {
    const { cometExt, signatureArgs, manager, domain } = this.fixture as Fixture;

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
          expiredArgs.isAllowed,
          expiredArgs.nonce,
          expiredArgs.expiry,
          expiredSignature.v,
          expiredSignature.r,
          expiredSignature.s
        )
    ).to.be.revertedWith("custom error 'SignatureExpired()'");
  });

  it("fails if v not in {27,28}", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          26,
          signature.r,
          signature.s
        )
    ).to.be.revertedWith("custom error 'InvalidValueV()'");
  });

  it("fails if s is too high", async function () {
    const { cometExt, signatureArgs, signature, manager } = this.fixture as Fixture;

    const invalidS = "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1";

    await expect(
      cometExt
        .connect(manager)
        .allowBySig(
          signatureArgs.owner,
          signatureArgs.manager,
          signatureArgs.isAllowed,
          signatureArgs.nonce,
          signatureArgs.expiry,
          signature.v,
          signature.r,
          invalidS
        )
    ).to.be.revertedWith("custom error 'InvalidValueS()'");
  });

  it("fails if owner is zero address", async function () {
    const { cometExt, manager } = this.fixture as Fixture;

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
          true,
          await cometExt.userNonce(ethers.constants.AddressZero),
          now + 100,
          invalidSig.v,
          invalidSig.r,
          invalidSig.s
        )
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });
});
