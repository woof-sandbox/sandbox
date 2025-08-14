import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, expect, makeConfigController, createComet, CollateralConfig, defaultCollateralConfig } from "./helper/helpers";
import { SandboxComet, FaucetToken } from "../build/types";

// TODO: extend the test - it does not cover all cases
describe.skip("18. asset info — SandboxComet", () => {
  let owner, dao, curator, treasury, guardian: SignerWithAddress;
  let comet: SandboxComet;

  let baseToken: FaucetToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};

  const config: CollateralConfig = defaultCollateralConfig();

  before(async function () {
    [owner, dao, treasury, curator, guardian] = await ethers.getSigners();

    const opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury.address,
      curator: curator,
      guardian: guardian,
    });
    baseToken = opts.baseToken as FaucetToken;

    const seedReserve = await opts.sandboxController.suggestedAmountOfSeedReserves(baseToken.address);
    comet = await createComet(
      owner,
      opts.opts.assets,
      opts.configController,
      opts.sandboxController,
      opts.collaterals,
      baseToken,
      seedReserve
    );

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }
  });

  // TODO split the test
  it("initializes protocol with 3 collateral assets", async () => {
    const symbols = Object.keys(collaterals);
    expect(await comet.numAssets()).to.equal(3);

    const info0 = await comet.getAssetInfo(0);
    expect(info0.collateralToken).to.equal(collaterals[symbols[0]].address);
    expect(info0.borrowCollateralFactor).to.equal(config.borrowCF);
    expect(info0.liquidateCollateralFactor).to.equal(config.liquidateCF);

    const info1 = await comet.getAssetInfo(1);
    expect(info1.collateralToken).to.equal(collaterals[symbols[1]].address);

    const info2 = await comet.getAssetInfo(2);
    expect(info2.collateralToken).to.equal(collaterals[symbols[2]].address);
  });

  it("reverts if index ≥ numAssets", async () => {
    await expect(comet.getAssetInfo(3)).to.be.revertedWith("custom error 'BadAsset()'");
  });
});
