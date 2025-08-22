import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ConfigController,
  FaucetToken,
  FaucetToken__factory,
  ICometExtension,
  ISandboxController,
  ManagedSimplePriceFeed,
  SandboxComet,
} from "../build/types";
import {
  createComet,
  defaultAssets,
  defaultCollateralConfig,
  ethers,
  exp,
  expect,
  makeConfigController,
  makeMockERC20,
  makePriceFeed,
  mulFactor,
  mulPrice,
  sandboxListCollateralAsset,
  SnapshotRestorer,
  takeSnapshot,
} from "./helper/helpers";

describe("10. isLiquidatable", function () {
  let snapshot: SnapshotRestorer;

  let owner, dao, curator, treasury, guardian, alice: SignerWithAddress;

  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  const baseTokenDecimals: number = 6;
  let baseToken: FaucetToken;
  let collaterals: { [symbol: string]: FaucetToken } = {};

  before(async function () {
    [owner, dao, treasury, curator, guardian, alice] = await ethers.getSigners();

    const assets = defaultAssets();
    assets["USDC"].factory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
    assets["WETH"].factory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
    assets["COMP"].factory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
    assets["WBTC"].factory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;

    assets["WETH"].collateralConfig = {
      ...defaultCollateralConfig(),
      borrowCF: exp(0.65, 18),
      supplyCap: exp(50000, 18),
    };
    assets["COMP"].collateralConfig = {
      ...defaultCollateralConfig(),
      borrowCF: exp(0.75, 18),
      supplyCap: exp(50000, 18),
    };
    assets["WBTC"].collateralConfig = {
      ...defaultCollateralConfig(),
      borrowCF: exp(0.7, 18),
      supplyCap: exp(50000, 8),
    };
    assets["USDC"].collateralConfig = {
      ...defaultCollateralConfig(),
      borrowCF: exp(0.7, 18),
      supplyCap: exp(50000, 6),
    };

    const opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury.address,
      curator: curator,
      guardian: guardian,
      assets: assets,
    });

    configController = opts.configController;
    sandboxController = opts.sandboxController;
    baseToken = opts.baseToken as FaucetToken;

    comet = await createComet(owner, opts.opts.assets, opts.configController, opts.sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
    }

    // drop tokens
    await baseToken.allocateTo(alice.address, exp(1e10, baseTokenDecimals));
    await collaterals["COMP"].allocateTo(alice.address, exp(1000, 18));
    await collaterals["WETH"].allocateTo(alice.address, exp(1000, 18));
    await collaterals["WBTC"].allocateTo(alice.address, exp(1000, 8));

    // approvals
    await baseToken.connect(alice).approve(comet.address, exp(1e10, baseTokenDecimals));
    await collaterals["COMP"].connect(alice).approve(comet.address, exp(1000, 18));
    await collaterals["WETH"].connect(alice).approve(comet.address, exp(1000, 18));
    await collaterals["WBTC"].connect(alice).approve(comet.address, exp(1000, 8));

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("happy cases: not liquidatable", function () {
    it("when user has no activity, returns false", async () => {
      const aliceBasic = await cometExtension.userBasic(alice.address);
      expect(aliceBasic.principal).to.equal(0);

      expect(await comet.isLiquidatable(alice.address)).to.be.false;
    });

    it("when user has deposited collaterals without borrowing, returns false", async () => {
      // check that user has 0 principal before
      expect((await cometExtension.userBasic(alice.address)).principal).to.equal(0);

      const COMP = collaterals["COMP"];
      const WETH = collaterals["WETH"];

      // supply collateral
      const amount = exp(1, 18);
      await comet.connect(alice).supply(COMP.address, amount);
      await comet.connect(alice).supply(WETH.address, amount);

      expect(await comet.userCollateral(alice.address, WETH.address)).to.be.eq(amount);
      expect(await comet.userCollateral(alice.address, COMP.address)).to.be.eq(amount);
      expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

      expect(await comet.isLiquidatable(alice.address)).to.be.false;
    });

    it("cannot be liquidatable with one deposited collateral that cover borrowing", async () => {
      expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

      const COMP = collaterals["COMP"];

      const amountToBorrow = exp(1, 6);
      const supplyAmount = exp(20, 18);

      // Calculate expected liquidity
      const expectedPrincipal = -amountToBorrow;
      const baseTokenLiquidity = mulPrice(
        expectedPrincipal,
        await comet.getPrice(await comet.baseTokenPriceFeed()),
        exp(1, BigInt(await baseToken.decimals()))
      );
      const collateralInfo = await comet.getAssetInfo(0);
      let collateralLiquidity = mulFactor(
        mulPrice(supplyAmount, await comet.getPrice(collateralInfo.priceFeed), exp(1, 18)),
        collateralInfo.borrowCollateralFactor
      );

      // check that liquidity will be >= 0, which means borrower is collateralized
      expect(collateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

      // Supply collateral and withdraw base token
      await comet.connect(alice).supply(COMP.address, supplyAmount);
      await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

      collateralLiquidity = mulFactor(
        mulPrice(supplyAmount, await comet.getPrice(collateralInfo.priceFeed), exp(1, 18)),
        collateralInfo.liquidateCollateralFactor
      );

      expect(collateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

      expect(await comet.isLiquidatable(alice.address)).to.be.false;

      const actualPrincipal = (await cometExtension.userBasic(alice.address)).principal;
      expect(actualPrincipal).to.eq(expectedPrincipal);
      expect(actualPrincipal).to.be.lessThan(0);
    });

    describe("multiple collaterals involved", function () {
      it("first collateral cover borrowing", async () => {
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

        const COMP = collaterals["COMP"];
        const WETH = collaterals["WETH"];
        const WBTC = collaterals["WBTC"];

        const amountToBorrow = exp(1, 6);
        const compSupplyAmount = exp(10, 18);
        const wethSupplyAmount = exp(1, 18);
        const wbtcSupplyAmount = exp(1, 8);

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet.getPrice(await comet.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        const compCollateralInfo = await comet.getAssetInfo(0);
        let compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will be >= 0, which means not liquidatable
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Supply collateral and withdraw base token
        await comet.connect(alice).supply(COMP.address, compSupplyAmount);
        await comet.connect(alice).supply(WETH.address, wethSupplyAmount);
        await comet.connect(alice).supply(WBTC.address, wbtcSupplyAmount);

        await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

        compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity will be >= 0, which means not liquidatable
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        expect(await comet.isLiquidatable(alice.address)).to.be.false;
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(expectedPrincipal);
      });

      it("2 collaterals cover borrowing", async () => {
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

        const COMP = collaterals["COMP"];
        const WETH = collaterals["WETH"];
        const WBTC = collaterals["WBTC"];

        const amountToBorrow = exp(100, 6);
        const compSupplyAmount = exp(0.2, 18);
        const wethSupplyAmount = exp(0.05, 18);
        const wbtcSupplyAmount = exp(1, 8);

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet.getPrice(await comet.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        const compCollateralInfo = await comet.getAssetInfo(0);
        let compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity is still < 0, which means borrower can be liquidated
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wethCollateralInfo = await comet.getAssetInfo(1);
        let wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity >= 0, which means borrower is collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Supply collateral and withdraw base token
        await comet.connect(alice).supply(COMP.address, compSupplyAmount);
        await comet.connect(alice).supply(WETH.address, wethSupplyAmount);
        await comet.connect(alice).supply(WBTC.address, wbtcSupplyAmount);

        await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

        compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity is still < 0, which means borrower can be liquidated
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity >= 0, which means borrower is collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        expect(await comet.isLiquidatable(alice.address)).to.be.false;
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(expectedPrincipal);
      });

      it("last collateral from available collaterals cover borrowing", async () => {
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

        const COMP = collaterals["COMP"];
        const WETH = collaterals["WETH"];
        const WBTC = collaterals["WBTC"];

        const amountToBorrow = exp(1000, 6);
        const compSupplyAmount = exp(0.2, 18);
        const wethSupplyAmount = exp(0.05, 18);
        const wbtcSupplyAmount = exp(0.04, 8);

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet.getPrice(await comet.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        const compCollateralInfo = await comet.getAssetInfo(0);
        let compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is liquidatable
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wethCollateralInfo = await comet.getAssetInfo(1);
        let wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is liquidatable
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wbtcCollateralInfo = await comet.getAssetInfo(2);
        let wbtcCollateralLiquidity = mulFactor(
          mulPrice(wbtcSupplyAmount, await comet.getPrice(wbtcCollateralInfo.priceFeed), exp(1, 8)),
          wbtcCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity >= 0, which means borrower is collateralized and can't be liquidated
        expect(compCollateralLiquidity + wethCollateralLiquidity + wbtcCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(
          0
        );

        // Supply collateral and withdraw base token
        await comet.connect(alice).supply(COMP.address, compSupplyAmount);
        await comet.connect(alice).supply(WETH.address, wethSupplyAmount);
        await comet.connect(alice).supply(WBTC.address, wbtcSupplyAmount);
        await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

        // recalculate
        compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.liquidateCollateralFactor
        );

        wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.liquidateCollateralFactor
        );

        wbtcCollateralLiquidity = mulFactor(
          mulPrice(wbtcSupplyAmount, await comet.getPrice(wbtcCollateralInfo.priceFeed), exp(1, 8)),
          wbtcCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity >= 0, which means borrower is collateralized and can't be liquidated
        expect(compCollateralLiquidity + wethCollateralLiquidity + wbtcCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(
          0
        );

        expect(await comet.isLiquidatable(alice.address)).to.be.false;
        expect((await cometExtension.userBasic(alice.address)).principal).to.be.closeTo(expectedPrincipal, 3);
      });

      it("comet with 24 collaterals allows borrowing against different collaterals", async () => {
        const maxAssets = await comet.MAX_ASSETS();

        // Create 24 collateral tokens
        const collateralTokens24: { [symbol: string]: FaucetToken } = {};
        const assets24: { [symbol: string]: any } = {};

        for (let i = 0; i < maxAssets; i++) {
          const symbol = `COL${i}`;
          const token = await makeMockERC20({
            name: `Collateral${i}`,
            symbol: symbol,
            supply: exp(1e9, 18),
          });
          const priceFeed = await makePriceFeed(token.address);

          await sandboxListCollateralAsset(sandboxController as any, token, priceFeed.address);

          collateralTokens24[symbol] = token;
          assets24[symbol] = {
            factory: (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory,
            collateralConfig: {
              ...defaultCollateralConfig(),
              borrowCF: exp(0.7, 18),
              supplyCap: exp(50000, 18),
            },
          };
        }

        // Create a new comet with all 24 collaterals
        const comet24 = await createComet(owner, assets24, configController, sandboxController, collateralTokens24, baseToken);
        const cometExtension24 = (await ethers.getContractAt("CometExtension", comet24.address)) as ICometExtension;

        // Amounts to supply to different collaterals
        const amountToBorrow = exp(100, 6); // Borrow 100 base tokens
        const col2SupplyAmount = exp(5, 18); // 2nd collateral (index 1) - small amount
        const col5SupplyAmount = exp(10, 18); // 5th collateral (index 4) - medium amount
        const col24SupplyAmount = exp(200, 18); // 24th collateral (index 23) - large amount to make it sufficient

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet24.getPrice(await comet24.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        // Calculate liquidity from 2nd collateral (index 1)
        const col2Info = await comet24.getAssetInfo(1);
        let col2Liquidity = mulFactor(
          mulPrice(col2SupplyAmount, await comet24.getPrice(col2Info.priceFeed), exp(1, 18)),
          col2Info.borrowCollateralFactor
        );

        // Calculate liquidity from 5th collateral (index 4)
        const col5Info = await comet24.getAssetInfo(4);
        let col5Liquidity = mulFactor(
          mulPrice(col5SupplyAmount, await comet24.getPrice(col5Info.priceFeed), exp(1, 18)),
          col5Info.borrowCollateralFactor
        );

        // Calculate liquidity from 24th collateral (index 23)
        const col24Info = await comet24.getAssetInfo(23);
        let col24Liquidity = mulFactor(
          mulPrice(col24SupplyAmount, await comet24.getPrice(col24Info.priceFeed), exp(1, 18)),
          col24Info.borrowCollateralFactor
        );

        // Verify that individual collaterals are not enough but combined they are sufficient
        expect(col2Liquidity + baseTokenLiquidity).to.be.lessThan(0);
        expect(col2Liquidity + col5Liquidity + baseTokenLiquidity).to.be.lessThan(0);
        expect(col2Liquidity + col5Liquidity + col24Liquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Supply collaterals
        const COL2 = collateralTokens24["COL1"]; // 2nd collateral (index 1)
        const COL5 = collateralTokens24["COL4"]; // 5th collateral (index 4)
        const COL24 = collateralTokens24["COL23"]; // 24th collateral (index 23)

        await COL2.allocateTo(alice.address, col2SupplyAmount);
        await COL2.connect(alice).approve(comet24.address, col2SupplyAmount);
        await comet24.connect(alice).supply(COL2.address, col2SupplyAmount);

        await COL5.allocateTo(alice.address, col5SupplyAmount);
        await COL5.connect(alice).approve(comet24.address, col5SupplyAmount);
        await comet24.connect(alice).supply(COL5.address, col5SupplyAmount);

        await COL24.allocateTo(alice.address, col24SupplyAmount);
        await COL24.connect(alice).approve(comet24.address, col24SupplyAmount);
        await comet24.connect(alice).supply(COL24.address, col24SupplyAmount);

        // Withdraw base token (borrow)
        await comet24.connect(alice).withdraw(baseToken.address, amountToBorrow);

        col2Liquidity = mulFactor(
          mulPrice(col2SupplyAmount, await comet24.getPrice(col2Info.priceFeed), exp(1, 18)),
          col2Info.liquidateCollateralFactor
        );

        // Calculate liquidity from 5th collateral (index 4)
        col5Liquidity = mulFactor(
          mulPrice(col5SupplyAmount, await comet24.getPrice(col5Info.priceFeed), exp(1, 18)),
          col5Info.liquidateCollateralFactor
        );

        // Calculate liquidity from 24th collateral (index 23)
        col24Liquidity = mulFactor(
          mulPrice(col24SupplyAmount, await comet24.getPrice(col24Info.priceFeed), exp(1, 18)),
          col24Info.liquidateCollateralFactor
        );

        // Verify that individual collaterals are not enough but combined they are sufficient
        expect(col2Liquidity + baseTokenLiquidity).to.be.lessThan(0);
        expect(col2Liquidity + col5Liquidity + baseTokenLiquidity).to.be.lessThan(0);
        expect(col2Liquidity + col5Liquidity + col24Liquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Verify that the borrow is collateralized
        expect(await comet24.isLiquidatable(alice.address)).to.be.false;
        expect((await cometExtension24.userBasic(alice.address)).principal).to.be.closeTo(expectedPrincipal, 1);
      });
    });
  });

  describe("unhappy cases: is liquidatable", function () {
    it("when 1 collateral can't cover existing borrowing", async () => {
      expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

      const COMP = collaterals["COMP"];

      const amountToBorrow = exp(120, 6);
      const supplyAmount = exp(1, 18);

      // Calculate expected liquidity
      const expectedPrincipal = -amountToBorrow;
      const baseTokenLiquidity = mulPrice(
        expectedPrincipal,
        await comet.getPrice(await comet.baseTokenPriceFeed()),
        exp(1, BigInt(await baseToken.decimals()))
      );
      const collateralInfo = await comet.getAssetInfo(0);
      let collateralLiquidity = mulFactor(
        mulPrice(supplyAmount, await comet.getPrice(collateralInfo.priceFeed), exp(1, 18)),
        collateralInfo.borrowCollateralFactor
      );

      // check that liquidity will be >= 0, which means borrower is collateralized
      expect(collateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

      // Supply collateral and withdraw base token
      await comet.connect(alice).supply(COMP.address, supplyAmount);
      await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

      // Price on collateral dropped
      const priceFeed = (await ethers.getContractAt("ManagedSimplePriceFeed", collateralInfo.priceFeed)) as ManagedSimplePriceFeed;
      const oldPrice = await priceFeed.latestRoundData();
      await priceFeed.setRoundData(0, oldPrice[1].mul(85).div(100), 0, 0, 0); // simulate 15% price drop

      collateralLiquidity = mulFactor(
        mulPrice(supplyAmount, await comet.getPrice(collateralInfo.priceFeed), exp(1, 18)),
        collateralInfo.liquidateCollateralFactor
      );

      // check that liquidity will be >= 0, which means borrower is collateralized
      expect(collateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

      expect(await comet.isLiquidatable(alice.address)).to.be.true;
    });

    describe("multiple collaterals involved", function () {
      it("last collateral can not cover existing borrowing", async () => {
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

        const COMP = collaterals["COMP"];
        const WETH = collaterals["WETH"];
        const WBTC = collaterals["WBTC"];

        const amountToBorrow = exp(10000, 6);
        const compSupplyAmount = exp(0.2, 18);
        const wethSupplyAmount = exp(0.05, 18);
        const wbtcSupplyAmount = exp(0.35, 8);

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet.getPrice(await comet.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        const compCollateralInfo = await comet.getAssetInfo(0);
        let compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wethCollateralInfo = await comet.getAssetInfo(1);
        let wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wbtcCollateralInfo = await comet.getAssetInfo(2);
        let wbtcCollateralLiquidity = mulFactor(
          mulPrice(wbtcSupplyAmount, await comet.getPrice(wbtcCollateralInfo.priceFeed), exp(1, 8)),
          wbtcCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + wbtcCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(
          0
        );

        // Supply collateral and withdraw base token
        await comet.connect(alice).supply(COMP.address, compSupplyAmount);
        await comet.connect(alice).supply(WETH.address, wethSupplyAmount);
        await comet.connect(alice).supply(WBTC.address, wbtcSupplyAmount);

        await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

        // Drop price of last collateral (WBTC)
        const priceFeed = (await ethers.getContractAt("ManagedSimplePriceFeed", wbtcCollateralInfo.priceFeed)) as ManagedSimplePriceFeed;
        const oldPrice = await priceFeed.latestRoundData();
        await priceFeed.setRoundData(0, oldPrice[1].mul(75).div(100), 0, 0, 0); // simulate 25% price drop

        // recalculate
        compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        wbtcCollateralLiquidity = mulFactor(
          mulPrice(wbtcSupplyAmount, await comet.getPrice(wbtcCollateralInfo.priceFeed), exp(1, 8)),
          wbtcCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + wbtcCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        expect(await comet.isLiquidatable(alice.address)).to.be.true;
      });

      it("seconds collateral can not cover existing borrowing", async () => {
        expect((await cometExtension.userBasic(alice.address)).principal).to.eq(0);

        const COMP = collaterals["COMP"];
        const WETH = collaterals["WETH"];

        const amountToBorrow = exp(1000, 6);
        const compSupplyAmount = exp(0.2, 18);
        const wethSupplyAmount = exp(0.5, 18);

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet.getPrice(await comet.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        const compCollateralInfo = await comet.getAssetInfo(0);
        let compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        const wethCollateralInfo = await comet.getAssetInfo(1);
        let wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.borrowCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Supply collateral and withdraw base token
        await comet.connect(alice).supply(COMP.address, compSupplyAmount);
        await comet.connect(alice).supply(WETH.address, wethSupplyAmount);
        await comet.connect(alice).withdraw(baseToken.address, amountToBorrow);

        // drop price feed on 2nd collateral
        const priceFeed = await ethers.getContractAt("ManagedSimplePriceFeed", wethCollateralInfo.priceFeed);
        const oldPrice = await priceFeed.latestRoundData();
        await priceFeed.setRoundData(1, oldPrice[1].mul(80).div(100), 0, 0, 1);

        compCollateralLiquidity = mulFactor(
          mulPrice(compSupplyAmount, await comet.getPrice(compCollateralInfo.priceFeed), exp(1, 18)),
          compCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        wethCollateralLiquidity = mulFactor(
          mulPrice(wethSupplyAmount, await comet.getPrice(wethCollateralInfo.priceFeed), exp(1, 18)),
          wethCollateralInfo.liquidateCollateralFactor
        );

        // check that liquidity will is still < 0, which means borrower is not collateralized
        expect(compCollateralLiquidity + wethCollateralLiquidity + baseTokenLiquidity).to.be.lessThan(0);

        expect(await comet.isLiquidatable(alice.address)).to.be.true;
      });

      it("when 24 collaterals on comet, and last collateral can't cover borrowing", async () => {
        const maxAssets = await comet.MAX_ASSETS();

        // Create 24 collateral tokens
        const collateralTokens24: { [symbol: string]: FaucetToken } = {};
        const assets24: { [symbol: string]: any } = {};

        for (let i = 0; i < maxAssets; i++) {
          const symbol = `COL${i}`;
          const token = await makeMockERC20({
            name: `Collateral${i}`,
            symbol: symbol,
            supply: exp(1e9, 18),
          });
          const priceFeed = await makePriceFeed(token.address);

          await sandboxListCollateralAsset(sandboxController as any, token, priceFeed.address);

          collateralTokens24[symbol] = token;
          assets24[symbol] = {
            factory: (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory,
            collateralConfig: {
              ...defaultCollateralConfig(),
              borrowCF: exp(0.7, 18),
              supplyCap: exp(50000, 18),
            },
          };
        }

        // Create a new comet with all 24 collaterals
        const comet24 = await createComet(owner, assets24, configController, sandboxController, collateralTokens24, baseToken);

        // Amounts to supply to different collaterals
        const amountToBorrow = exp(100, 6); // Borrow 100 base tokens

        const col24SupplyAmount = exp(145, 18); // 24th collateral (index 23) - small amount

        // Calculate expected liquidity
        const expectedPrincipal = -amountToBorrow;
        const baseTokenLiquidity = mulPrice(
          expectedPrincipal,
          await comet24.getPrice(await comet24.baseTokenPriceFeed()),
          exp(1, BigInt(await baseToken.decimals()))
        );

        // Calculate liquidity from 24th collateral (index 23)
        const col24Info = await comet24.getAssetInfo(23);
        let col24Liquidity = mulFactor(
          mulPrice(col24SupplyAmount, await comet24.getPrice(col24Info.priceFeed), exp(1, 18)),
          col24Info.borrowCollateralFactor
        );

        // Verify that individual collaterals are not enough
        expect(col24Liquidity + baseTokenLiquidity).to.be.greaterThanOrEqual(0);

        // Supply collaterals
        const COL24 = collateralTokens24["COL23"]; // 24th collateral (index 23)

        await COL24.allocateTo(alice.address, col24SupplyAmount);
        await COL24.connect(alice).approve(comet24.address, col24SupplyAmount);
        await comet24.connect(alice).supply(COL24.address, col24SupplyAmount);

        // Withdraw base token (borrow)
        await comet24.connect(alice).withdraw(baseToken.address, amountToBorrow);

        // drop price feed on 24th collateral
        const priceFeed = await ethers.getContractAt("ManagedSimplePriceFeed", col24Info.priceFeed);
        const oldPrice = await priceFeed.latestRoundData();
        await priceFeed.setRoundData(1, oldPrice[1].mul(80).div(100), 0, 0, 1);

        col24Liquidity = mulFactor(
          mulPrice(col24SupplyAmount, await comet24.getPrice(col24Info.priceFeed), exp(1, 18)),
          col24Info.liquidateCollateralFactor
        );

        // Verify that individual collaterals are not enough
        expect(col24Liquidity + baseTokenLiquidity).to.be.lessThan(0);

        expect(await comet24.isLiquidatable(alice.address)).to.be.true;
      });
    });

    it("reverts when one of price feed started to return price <= 0", async () => {
      const supplyAmount = exp(100, 18);
      const borrowAmount = exp(1, 6);

      const collateralToken = collaterals["COMP"];
      const priceFeed = await ethers.getContractAt("ManagedSimplePriceFeed", (await comet.getAssetInfo(0)).priceFeed);

      // Supply collateral and borrow
      await comet.connect(alice).supply(collateralToken.address, supplyAmount);
      await comet.connect(alice).withdraw(baseToken.address, borrowAmount);

      // Set price to 0 (which should cause revert)
      await priceFeed.setRoundData(1, 0, 0, 0, 1);

      // Function should revert with BadPrice when price is <= 0
      await expect(comet.isLiquidatable(alice.address)).to.be.revertedWithCustomError(comet, "BadPrice");
    });

    it("returns false, then after price feed drops and block is mined, returns true", async () => {
      const supplyAmount = exp(100, 18);
      const borrowAmount = exp(1, 6);

      const collateralToken = collaterals["COMP"];
      const priceFeed = await ethers.getContractAt("ManagedSimplePriceFeed", (await comet.getAssetInfo(0)).priceFeed);

      // Supply collateral and borrow
      await comet.connect(alice).supply(collateralToken.address, supplyAmount);
      await comet.connect(alice).withdraw(baseToken.address, borrowAmount);

      // Verify the position is initially collateralized
      expect(await comet.isLiquidatable(alice.address)).to.be.false;

      // Set price to 0 (which should cause revert)
      await priceFeed.setRoundData(1, 1, 0, 0, 1);

      // Function should revert with BadPrice when price is <= 0
      expect(await comet.isLiquidatable(alice.address)).to.be.true;
    });
  });

  it("returns data in boolean type", async () => {
    // Test that the function returns boolean type regardless of the result
    const result = await comet.isLiquidatable(alice.address);
    expect(result).to.be.a("boolean");
    expect(typeof result).to.equal("boolean");
  });
});
