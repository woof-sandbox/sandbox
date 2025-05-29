import { ethers, expect, makeProtocol } from './helper/helpers';


function assetsWithInitial(symbols: string[]) {
  return Object.fromEntries(symbols.map((s) => [s, { initial: 1e6 }]));
}

describe('updateAssetsIn', function () {
  it("adds asset to user's asset list when initialUserBalance = 0 and finalUserBalance > 0", async () => {
    const { comet, tokens, users } = await makeProtocol();
    const [user] = users;

    const compAddress = tokens['COMP'].address;
    const wethAddress = tokens['WETH'].address;
    const wbtcAddress = tokens['WBTC'].address;

    expect(await comet.getAssetList(user.address)).to.be.empty;

    await comet.updateAssetsInExternal(user.address, compAddress, 0, 1);
    expect(await comet.getAssetList(user.address)).to.deep.equal([compAddress]);

    await comet.updateAssetsInExternal(user.address, wethAddress, 0, 100_000);
    expect(await comet.getAssetList(user.address)).to.deep.equal([
      compAddress,
      wethAddress,
    ]);

    await comet.updateAssetsInExternal(user.address, wbtcAddress, 0, 100_000_000);
    expect(await comet.getAssetList(user.address)).to.deep.equal([
      compAddress,
      wethAddress,
      wbtcAddress,
    ]);
  });

  it('works for up to 24 collateral assets', async () => {
    const symbols = ['USDC', ...Array.from({ length: 24 }, (_, i) => `ASSET${i + 1}`)];

    const { comet, tokens, users } = await makeProtocol({ assets: assetsWithInitial(symbols) });
    const [user] = users;

    const asset12Address = tokens['ASSET24'].address;

    await comet.updateAssetsInExternal(user.address, asset12Address, 0, 1);
    expect(await comet.getAssetList(user.address)).to.deep.equal([asset12Address]);
  });

  it('does not change state when both initialUserBalance and finalUserBalance are 0', async () => {
    const { comet, tokens, users } = await makeProtocol();
    const [user] = users;

    const compAddress = tokens['COMP'].address;
    expect(await comet.getAssetList(user.address)).to.be.empty;

    await comet.updateAssetsInExternal(user.address, compAddress, 0, 0);
    expect(await comet.getAssetList(user.address)).to.be.empty;
  });

  it('does not change state when both initialUserBalance and finalUserBalance > 0', async () => {
    const { comet, tokens, users } = await makeProtocol();
    const [user] = users;

    const wethAddress = tokens['WETH'].address;

    await comet.updateAssetsInExternal(user.address, wethAddress, 0, 100_000);
    expect(await comet.getAssetList(user.address)).to.deep.equal([wethAddress]);

    await comet.updateAssetsInExternal(user.address, wethAddress, 100_000, 999);
    expect(await comet.getAssetList(user.address)).to.deep.equal([wethAddress]);
  });

  it('removes asset from asset list when initialUserBalance > 0 and finalUserBalance = 0', async () => {
    const { comet, tokens, users } = await makeProtocol();
    const [user] = users;

    const compAddress = tokens['COMP'].address;

    await comet.updateAssetsInExternal(user.address, compAddress, 0, 1);
    expect(await comet.getAssetList(user.address)).to.deep.equal([compAddress]);

    await comet.updateAssetsInExternal(user.address, compAddress, 1, 0);
    expect(await comet.getAssetList(user.address)).to.be.empty;
  });

  it('reverts for non-existent asset address', async () => {
    const { comet, users } = await makeProtocol();
    const [user] = users;

    const randomAddress = ethers.Wallet.createRandom().address;

    await expect(
      comet.updateAssetsInExternal(user.address, randomAddress, 0, 100),
    ).to.be.revertedWith("custom error 'BadAsset()'");
  });
});
