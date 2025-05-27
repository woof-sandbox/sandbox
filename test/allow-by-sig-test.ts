import {
  Comet,
  ethers,
  event,
  expect,
  makeProtocol,
  wait,
} from './helper/helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Signature } from 'ethers';


const types = {
  Authorization: [
    { name: 'owner',    type: 'address' },
    { name: 'manager',  type: 'address' },
    { name: 'isAllowed',type: 'bool'    },
    { name: 'nonce',    type: 'uint256' },
    { name: 'expiry',   type: 'uint256' },
  ],
};


let comet      : Comet;
let cometExt   : any;
let admin      : SignerWithAddress;
let pauseGuard : SignerWithAddress;
let signer     : SignerWithAddress;
let manager    : SignerWithAddress;

let domain       : any;
let signature    : Signature;
let signatureArgs: {
  owner   : string;
  manager : string;
  isAllowed: boolean;
  nonce   : BigNumber;
  expiry  : number;
};

describe('allowBySig — SandboxComet / CometExtension', function () {

  beforeEach(async () => {

    ({ comet } = await makeProtocol());

    cometExt = await ethers.getContractAt('CometExtension', comet.address);

    [admin, pauseGuard, signer, manager] = await ethers.getSigners();

    domain = {
      name:    await cometExt.name(),
      version: await cometExt.version(),
      chainId: 1337,
      verifyingContract: comet.address,
    };

    const now = (await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    )).timestamp;

    signatureArgs = {
      owner   : signer.address,
      manager : manager.address,
      isAllowed: true,
      nonce   : await cometExt.userNonce(signer.address),
      expiry  : now + 10,
    };

    const rawSignature = await signer._signTypedData(domain, types, signatureArgs);
    signature = ethers.utils.splitSignature(rawSignature);
  });


  it('authorizes with a valid signature', async () => {
    expect(await cometExt.isAllowed(signer.address, manager.address)).to.be
      .false;

    const tx = await wait(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    );

    expect(await cometExt.isAllowed(signer.address, manager.address)).to.be
      .true;
    expect(await cometExt.userNonce(signer.address)).to.equal(
      signatureArgs.nonce.add(1),
    );

    expect(event(tx, 0)).to.deep.equal({
      Approval: {
        owner : signer.address,
        spender: manager.address,
        amount : ethers.constants.MaxUint256.toBigInt(),
      },
    });
  });

  it('fails if owner argument is altered', async () => {
    const invalidOwnerAddress = pauseGuard.address;

    await expect(
      cometExt.connect(manager).allowBySig(
        invalidOwnerAddress,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");

    expect(await cometExt.isAllowed(invalidOwnerAddress, manager.address)).to.be.false;
    expect(await cometExt.userNonce(signer.address)).to.equal(
      signatureArgs.nonce,
    );
  });

  it('fails if manager argument is altered', async () => {
    const invalidManagerAddress = pauseGuard.address;

    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        invalidManagerAddress,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");

    expect(await cometExt.isAllowed(signer.address, wrongManager)).to.be.false;
  });

  it('fails if isAllowed argument is altered', async () => {
    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        !signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });

  it('fails if nonce argument is altered', async () => {
    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce.add(1),
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });


  it('fails if expiry argument is altered', async () => {
    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry + 100,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });


  it('fails if signature contains invalid nonce', async () => {
    const invalidNonce = signatureArgs.nonce.add(1);
    const rawSignature   = await signer._signTypedData(domain, types, {
      ...signatureArgs,
      nonce: invalidNonce,
    });
    const sigBad   = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        invalidNonce,
        signatureArgs.expiry,
        sigBad.v,
        sigBad.r,
        sigBad.s,
      ),
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });


  it('rejects a repeated message', async () => {

    await cometExt.connect(manager).allowBySig(
      signatureArgs.owner,
      signatureArgs.manager,
      signatureArgs.isAllowed,
      signatureArgs.nonce,
      signatureArgs.expiry,
      signature.v,
      signature.r,
      signature.s,
    );

    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'BadNonce()'");
  });

  it('fails if signature expiry has passed', async () => {
    const past = (await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    )).timestamp - 1;

    const expiredSignatureArgs  = { ...signatureArgs, expiry: past };
    const rawSignature   = await signer._signTypedData(domain, types, expiredSignatureArgs);
    const expiredSignature   = ethers.utils.splitSignature(rawSignature);

    await expect(
      cometExt.connect(manager).allowBySig(
        expiredSignatureArgs.owner,
        expiredSignatureArgs.manager,
        expiredSignatureArgs.isAllowed,
        expiredSignatureArgs.nonce,
        expiredSignatureArgs.expiry,
        expiredSignature.v,
        expiredSignature.r,
        expiredSignature.s,
      ),
    ).to.be.revertedWith("custom error 'SignatureExpired()'");
  });

  it('fails if v not in {27,28}', async () => {
    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        26,
        signature.r,
        signature.s,
      ),
    ).to.be.revertedWith("custom error 'InvalidValueV()'");
  });

  it('fails if s is too high', async () => {
    const invalidS =
      '0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1';

    await expect(
      cometExt.connect(manager).allowBySig(
        signatureArgs.owner,
        signatureArgs.manager,
        signatureArgs.isAllowed,
        signatureArgs.nonce,
        signatureArgs.expiry,
        signature.v,
        signature.r,
        invalidS,
      ),
    ).to.be.revertedWith("custom error 'InvalidValueS()'");
  });

  it('fails if owner is zero address', async () => {
    const now = (await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    )).timestamp;

    const invalidSignature = {
      v: 27,
      r: '0x0000000000000000000000000000000000000000000000000000000000000000',
      s: '0x36b99b3646118e24ca7c0c698792ebaf25a4bfa08c1cd6778c335a537b0eb43c',
    };

    await expect(
      cometExt.connect(manager).allowBySig(
        ethers.constants.AddressZero,
        manager.address,
        true,
        await cometExt.userNonce(ethers.constants.AddressZero),
        now + 100,
        invalidSignature.v,
        invalidSignature.r,
        invalidSignature.s,
      ),
    ).to.be.revertedWith("custom error 'BadSignatory()'");
  });
});
