import { expect, exp, makeProtocol, ONE } from "./helper/helpers";
import { ethers } from "hardhat";

describe("9. asset info — SandboxComet", () => {
  it("initializes protocol with 3 collateral assets", async () => {
    const { comet, tokens } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6 },
        ASSET1: { initial: 1e6 },
        ASSET2: { initial: 1e6 },
        ASSET3: { initial: 1e6 },
      },
    });

    //expect(await comet.maxAssets()).to.equal(24);
    expect(await comet.numAssets()).to.equal(3);

    const info0 = await comet.getAssetInfo(0);
    expect(info0.collateralToken).to.equal(tokens.ASSET1.address);
    expect(info0.borrowCollateralFactor).to.equal(exp(0.6, 18));
    expect(info0.liquidateCollateralFactor).to.equal(exp(0.7, 18));

    const info1 = await comet.getAssetInfo(1);
    expect(info1.collateralToken).to.equal(tokens.ASSET2.address);

    const info2 = await comet.getAssetInfo(2);
    expect(info2.collateralToken).to.equal(tokens.ASSET3.address);
  });

  it("reverts if more than 24 collateral assets are passed", async () => {
    const assets = Object.fromEntries(
      ["USDC", ...Array.from({ length: 25 }, (_, i) => `ASSET${i + 1}`)].map(sym => [sym, { initial: 1e6 }])
    );

    await expect(makeProtocol({ base: "USDC", assets })).to.be.revertedWith("custom error 'TooManyAssets()'");
  });

  it("reverts if index ≥ numAssets", async () => {
    const { comet } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6 },
        ASSET1: { initial: 1e6 },
        ASSET2: { initial: 1e6 },
      },
    });

    await expect(comet.getAssetInfo(3)).to.be.revertedWith("custom error 'BadAsset()'");
  });

  it("reverts if collateral factors are out of range", async () => {
    await expect(
      makeProtocol({
        assets: {
          USDC: { initial: 1e6 },
          ASSET1: { initial: 1e6, borrowCF: exp(0.9, 18), liquidateCF: exp(0.9, 18) },
          ASSET2: { initial: 1e6 },
        },
      })
    ).to.be.revertedWith("custom error 'WrongCollateralTokenSettings()'");

    await expect(
      makeProtocol({
        assets: {
          USDC: { initial: 1e6 },
          ASSET1: { initial: 1e6, borrowCF: exp(0.8, 18), liquidateCF: exp(1, 18) },
          ASSET2: { initial: 1e6 },
        },
      })
    ).to.be.revertedWith("custom error 'WrongCollateralTokenSettings()'");
  });
});
