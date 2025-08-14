import { expect, exp, makeProtocol } from "./helper/helpers";

function mulDiv(a: bigint, b: bigint, denom: bigint): bigint {
  return (a * b) / denom;
}

/// TODO: Fix this.
describe.skip("15. quoteCollateral", function () {
  it("quotes the collateral correctly for a positive base amount", async () => {
    const { comet, tokens } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 200,
          liquidationFactor: exp(0.6, 18),

          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),

          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),

          minLiquidationFactor: exp(0.6, 18),
          maxLiquidationFactor: exp(0.8, 18),

          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = exp(200, 6);
    const q0 = await comet.quoteCollateral(COMP.address, baseAmount);

    // Store front discount is 0.5 * (1 - 0.6) = 0.2 = 20%
    // Discounted COMP price is 200 * 0.8 = 160
    // 200 USDC should give 200 * (1/160) COMP
    const assetPriceDiscounted = exp(160, 8);
    const basePrice = exp(1, 8);
    const assetScale = exp(1, 18);
    const assetWeiPerUnitBase = (assetScale * basePrice) / assetPriceDiscounted;
    const baseScale = exp(1, 6);
    expect(q0.amountOut.toBigInt()).to.be.equal((assetWeiPerUnitBase * baseAmount) / baseScale);
    expect(q0.amountOut).to.be.equal(exp(1.25, 18));
  });

  it("quotes the collateral correctly for a zero base amount", async () => {
    const { comet, tokens } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 200,

          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),
          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),
          minLiquidationFactor: exp(0.8, 18),
          maxLiquidationFactor: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = 0n;
    const q0 = await comet.quoteCollateral(COMP.address, baseAmount);

    expect(q0.amountOut.toBigInt()).to.be.equal(0n);
  });

  // todo: fix test with correct storefront factor
  it.skip("quotes the collateral at market price when storeFrontPriceFactor is 0%", async () => {
    const { comet, tokens } = await makeProtocol({
      //storeFrontPriceFactor: exp(0, 18),
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 200,
          liquidationFactor: exp(0.6, 18),

          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),
          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),
          minLiquidationFactor: exp(0.6, 18),
          maxLiquidationFactor: exp(0.8, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = exp(200, 6);
    const q0 = await comet.quoteCollateral(COMP.address, baseAmount);

    // Store front discount is 0 * (1 - 0.6) = 0 = 0%
    // Discounted COMP price is 200 * 1 = 200
    // 200 USDC should give 200 * (1/200) COMP
    const assetPriceDiscounted = exp(200, 8);
    const basePrice = exp(1, 8);
    const assetScale = exp(1, 18);
    const assetWeiPerUnitBase = (assetScale * basePrice) / assetPriceDiscounted;
    const baseScale = exp(1, 6);
    expect(q0.amountOut.toBigInt()).to.be.equal((assetWeiPerUnitBase * baseAmount) / baseScale);
    expect(q0.amountOut.toBigInt()).to.be.equal(exp(1, 18));
  });

  // Should fail before PR 303
  it("properly calculates price without truncating integer during intermediate calculations", async () => {
    const { comet, tokens } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 9,
          liquidationFactor: exp(0.8, 18),

          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),
          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),
          minLiquidationFactor: exp(0.8, 18),
          maxLiquidationFactor: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = exp(810, 6);
    const q0 = await comet.quoteCollateral(COMP.address, baseAmount);

    // Store front discount is 0.5 * (1 - 0.8) = 0.1 = 10%
    // Discounted COMP price is 9 * 0.9 = 8.1
    // 810 USDC should give 810 / (0.9 * 9) = 100 COMP
    expect(q0.amountOut.toBigInt()).to.be.equal(exp(100, 18));
  });

  // todo: check storefront factor
  it.skip("does not overflow for large amounts", async () => {
    const { comet, tokens } = await makeProtocol({
      //storeFrontPriceFactor: exp(0.8, 18),
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 200,
          liquidationFactor: exp(0.75, 18),
          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),
          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),
          minLiquidationFactor: exp(0.75, 18),
          maxLiquidationFactor: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = exp(1e15, 6); // 1 quadrillion USDC
    const q0 = await comet.quoteCollateral(COMP.address, baseAmount);

    // Store front discount is 0.8 * (1 - 0.75) = 0.2 = 20%
    // Discounted COMP price is 200 * 0.8 = 160
    // 1e18 USDC should give 1e15 / (0.8 * 200) = 6.25e12 COMP
    expect(q0.amountOut.toBigInt()).to.be.equal(exp(6.25, 12 + 18));
  });

  it("sets both fees to zero when delt=0", async () => {
    const { comet, tokens } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 200,
          liquidationFactor: exp(0.6, 18),
          borrowCF: exp(1, 18),
          liquidateCF: exp(1, 18),
          minBorrowCF: exp(0.9, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(1, 18),
          maxLiquidateCF: exp(1, 18),
          minLiquidationFactor: exp(0.6, 18),
          maxLiquidationFactor: exp(0.8, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    const baseAmount = exp(200, 6);
    const q = await comet.quoteCollateral(COMP.address, baseAmount);

    expect(q.controllerFee).to.equal(0);
    expect(q.protocolFee).to.equal(0);
  });

  // todo: fix test with correct storefront factor
  it.skip("returns correct controller/protocol fees when delta > 0", async () => {
    const { comet, tokens, sandboxController } = await makeProtocol({
      //storeFrontPriceFactor: exp(1, 18) / 3n, // fix for linter, a previously used value 0.333333333333333333
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 123,
          liquidationFactor: exp(0.8, 18),
        },
      },
    });
    const { COMP } = tokens;

    const pctReserve = exp(0.05, 18);
    const pctProtocol = exp(0.03, 18);
    await sandboxController.setMarketStateCommissions(0, pctReserve, pctProtocol);
    await sandboxController.setMarketStateCommissions(1, pctReserve, pctProtocol);
    await sandboxController.setMarketStateCommissions(2, pctReserve, pctProtocol);

    const baseAmount = exp(100_000_000, 6);
    const assetScale = exp(1, 18);

    exp(1, 8);
    const assetPrice = exp(123, 8);
    const SFP = exp(1, 18) / 3n;
    const LF = exp(0.8, 18);

    const discountFactor = mulDiv(SFP, exp(1, 18) - LF, exp(1, 18));
    const discountedPrice = mulDiv(assetPrice, exp(1, 18) - discountFactor, exp(1, 18));

    const deltaBase = mulDiv(baseAmount, discountFactor, exp(1, 18));

    const reserveBase = mulDiv(deltaBase, pctReserve, exp(1, 18));
    const protocolBase = mulDiv(deltaBase, pctProtocol, exp(1, 18));
    const controllerBase = deltaBase - reserveBase - protocolBase;

    const expectedProt = mulDiv(protocolBase * assetScale, 1n, discountedPrice);
    const expectedCtrl = mulDiv(controllerBase * assetScale, 1n, discountedPrice);
    const expectedResv = mulDiv(reserveBase * assetScale, 1n, discountedPrice);

    const q = await comet.quoteCollateral(COMP.address, baseAmount);

    const totalFromContract = q.protocolFee.toBigInt() + q.controllerFee.toBigInt() + expectedResv;
    const totalExpected = mulDiv(deltaBase * assetScale, 1n, discountedPrice);
    expect(totalFromContract >= totalExpected ? totalFromContract - totalExpected : totalExpected - totalFromContract).to.be.lte(1n);
    expect(q.protocolFee.toBigInt()).to.equal(expectedProt);
    expect(q.controllerFee.toBigInt()).to.equal(expectedCtrl);
  });
});
