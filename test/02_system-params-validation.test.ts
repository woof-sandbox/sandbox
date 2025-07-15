import {
  ethers,
  exp,
  expect,
  defaultSandboxControllerOpts,
  makeSandboxController,
  makeToken,
  makePriceFeed,
  sandboxListBaseAsset,
  sandboxListCollateralAsset,
} from "./helper/helpers";
import {
  ConfigController,
  SandboxComet,
  SandboxCometFactory,
  ConfigControllerFactory__factory,
  ConfigController__factory,
  SandboxComet__factory,
  SandboxCometFactory__factory,
  SandboxControllerNoCurvesTest__factory,
  SandboxControllerNoCurvesTest,
  FaucetToken,
} from "../build/types";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";
import { BigNumber } from "ethers";

describe("2. System Params Validation", function () {
  // Factories
  let _ConfigControllerFactory: ConfigControllerFactory__factory;
  let _ConfigController: ConfigController__factory;
  let _Comet: SandboxComet__factory;
  let _SandboxCometFactory: SandboxCometFactory__factory;

  let configControllerImpl: ConfigController;
  let sandboxCometImpl: SandboxComet;
  // TODO: Merge in the constant.
  const _minUpdateTime = 7 * 24 * 60 * 60;

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60,
  };

  let signers;
  let owner, curator, guardian;

  let configControllerAddress;
  let configController: ConfigController;
  let sandboxCometFactory: SandboxCometFactory;
  let sandboxController;

  let collateralTokens: CollateralTokenConfigStruct[] = [];
  let baseToken;
  let marketConfig: CometConfigStruct;

  before(async function () {
    _ConfigControllerFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;
    _ConfigController = (await ethers.getContractFactory("ConfigController")) as ConfigController__factory;
    _Comet = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
    _SandboxCometFactory = (await ethers.getContractFactory("SandboxCometFactory")) as SandboxCometFactory__factory;

    configControllerImpl = (await _ConfigController.deploy()) as ConfigController;
    sandboxCometImpl = (await _Comet.deploy()) as SandboxComet;

    signers = await ethers.getSigners();
    owner = signers[0];
    curator = signers[1];
    guardian = signers[2];

    const SandboxControllerFactoryTest = (await ethers.getContractFactory(
      "SandboxControllerNoCurvesTest"
    )) as SandboxControllerNoCurvesTest__factory;
    sandboxController = (
      await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }), SandboxControllerFactoryTest)
    ).sandboxController;

    const configControllerFactory = await _ConfigControllerFactory.deploy(sandboxController.address, configControllerImpl.address);
    sandboxCometFactory = await _SandboxCometFactory.deploy(sandboxCometImpl.address, configControllerFactory.address);

    configControllerAddress = await configControllerFactory.callStatic.createConfigController(
      curator.address,
      guardian.address,
      sandboxCometFactory.address,
      configControllerOpts._curatorFee,
      configControllerOpts._name,
      configControllerOpts._curatorProposalDuration,
      configControllerOpts._proposalDuration
    );

    // deploy config controller
    await configControllerFactory.createConfigController(
      curator.address,
      guardian.address,
      sandboxCometFactory.address,
      configControllerOpts._curatorFee,
      configControllerOpts._name,
      configControllerOpts._curatorProposalDuration,
      configControllerOpts._proposalDuration
    );
    configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;

    baseToken = await makeToken({
      symbol: "BASE",
      initialMint: ethers.utils.parseEther("50000").toString(),
    });
    const collateralToken = await makeToken({ symbol: "COL" });
    const priceFeedBase = await makePriceFeed(baseToken.address);
    const priceFeedCol = await makePriceFeed(collateralToken.address);

    await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);
    await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

    collateralTokens.push({
      collateralToken: collateralToken.address,
      borrowCollateralFactor: exp(0.6, 18),
      liquidateCollateralFactor: exp(0.75, 18),
      liquidationFactor: exp(0.85, 18),
      supplyCap: exp(1e9, 18),
    });

    marketConfig = {
      baseToken: baseToken.address,
      collateralTokens: collateralTokens.map(obj => ({ ...obj })),
      baseTokenCurveId: 0n,
    };
  });

  describe("ConfigController", function () {
    beforeEach(async function () {
      marketConfig = {
        baseToken: baseToken.address,
        collateralTokens: collateralTokens.map(obj => ({ ...obj })),
        baseTokenCurveId: 0n,
      };
    });
    describe("Comet parameters validation", function () {
      it("should revert if the base token is zero address", async () => {
        marketConfig.baseToken = ethers.constants.AddressZero;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "ZeroAddress");
      });

      it("should revert if no curve is registered for a base asset", async () => {
        const fakeBaseToken = await makeToken({ symbol: "FAKEBASE" });
        const priceFeedFakeBase = await makePriceFeed(fakeBaseToken.address);

        const sandboxControllerTest = (await ethers.getContractAt(
          "SandboxControllerNoCurvesTest",
          sandboxController.address
        )) as SandboxControllerNoCurvesTest;
        await sandboxControllerTest.whitelistBaseAssetWithNoCurve(fakeBaseToken.address, priceFeedFakeBase.address);

        marketConfig.baseToken = fakeBaseToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "NoCurveRegistered");
      });

      it("should revert if the collateral token is zero address", async () => {
        marketConfig.collateralTokens[0].collateralToken = ethers.constants.AddressZero;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "ZeroAddress");
      });

      it("should revert if the collateral token is the base token", async () => {
        marketConfig.collateralTokens[0].collateralToken = marketConfig.baseToken;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "WrongCollateralTokenSettings"
        );
      });

      it("should revert if the collateral token already exists in the config", async () => {
        let newCollateralTokens = marketConfig.collateralTokens;
        newCollateralTokens.push({ ...newCollateralTokens[0] });
        marketConfig.collateralTokens = newCollateralTokens;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "CollateralTokenAlreadyAdded"
        );
      });

      it("should revert if the collateral token is not whitelisted", async () => {
        const unsupportedToken = await makeToken({
          symbol: "BASE",
          initialMint: ethers.utils.parseEther("50000").toString(),
        });

        marketConfig.collateralTokens[0].collateralToken = unsupportedToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "CollateralTokenNotWhitelisted"
        );
      });

      it("should revert if the collateral token supply cap is zero", async () => {
        marketConfig.collateralTokens[0].supplyCap = 0;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "SupplyCapCantBeZero");
      });

      it("should revert if the collateral token borrow collateral factor is greater than liquidate collateral factor", async () => {
        marketConfig.collateralTokens[0].borrowCollateralFactor = exp(0.8, 18);
        marketConfig.collateralTokens[0].liquidateCollateralFactor = exp(0.7, 18);

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "WrongCollateralTokenSettings"
        );
      });

      it("should revert if the borrow collateral factor is greater than liquidate collateral factor", async () => {
        marketConfig.collateralTokens[0].borrowCollateralFactor = exp(0.8, 18);
        marketConfig.collateralTokens[0].liquidateCollateralFactor = exp(0.7, 18);

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "WrongCollateralTokenSettings"
        );
      });

      it("should revert if the borrow collateral factor is greater than max borrow collateral factor", async () => {
        const maxBorrowFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .maxBorrowCollateralFactor;
        marketConfig.collateralTokens[0].borrowCollateralFactor = maxBorrowFactor.add(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "BorrowCollateralFactorTooHigh"
        );
      });

      it("should revert if the borrow collateral factor is less than min borrow collateral factor", async () => {
        const minBorrowFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .minBorrowCollateralFactor;
        marketConfig.collateralTokens[0].borrowCollateralFactor = minBorrowFactor.sub(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "BorrowCollateralFactorTooLow"
        );
      });

      it("should revert if the liquidate collateral factor is greater than the max liquidate collateral factor", async () => {
        const maxLiqColFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .maxLiquidateCollateralFactor;
        marketConfig.collateralTokens[0].liquidateCollateralFactor = maxLiqColFactor.add(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "LiquidateCollateralFactorTooHigh"
        );
      });

      it("should revert if the liquidate collateral factor is less than min liquidate collateral factor", async () => {
        const minLiqColFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .minLiquidateCollateralFactor;
        marketConfig.collateralTokens[0].liquidateCollateralFactor = minLiqColFactor.sub(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "LiquidateCollateralFactorTooLow"
        );
      });

      it("should revert if the liquidation factor is less than min liquidation factor", async () => {
        const maxLiqFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .maxLiquidationFactor;
        marketConfig.collateralTokens[0].liquidationFactor = maxLiqFactor.add(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
          configController,
          "LiquidationFactorTooHigh"
        );
      });

      it("should revert if the liquidation factor is greater than max liquidation factor", async () => {
        const minLiqFactor = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken))
          .minLiquidationFactor;
        marketConfig.collateralTokens[0].liquidationFactor = minLiqFactor.sub(exp(0.05, 18));

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "LiquidationFactorTooLow");
      });

      it("should revert if token base token curve id is greater than base asset curve length", async () => {
        const baseAssets = await sandboxController.baseAssets(marketConfig.baseToken);
        const baseAssetsCurveLength = baseAssets.baseAssetCurves.length;

        marketConfig.baseTokenCurveId = baseAssetsCurveLength + 1;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "InvalidCurveId");
      });

      it("should revert if base token is not whitelisted in sandbox comet", async () => {
        const unsupportedToken = await makeToken({
          symbol: "BASE",
          initialMint: ethers.utils.parseEther("50000").toString(),
        });

        marketConfig.baseToken = unsupportedToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "BaseTokenNotWhitelisted");
      });

      it("should revert if collateral tokens list is zero length", async () => {
        marketConfig.collateralTokens = [];

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(configController, "ZeroCollateralAssets");
      });
    });
    describe("Comet creation, happy cases", function () {
      it("should be possible to create two comets with the same configuration", async () => {
        baseToken = (await ethers.getContractAt("FaucetToken", marketConfig.baseToken)) as FaucetToken;
        await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
        await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);

        const cometAddress1 = await configController.callStatic.createComet(marketConfig);
        await configController.createComet(marketConfig);

        const cometAddress2 = await configController.callStatic.createComet(marketConfig);
        await configController.createComet(marketConfig);

        expect(await configController.comets(0)).to.eq(cometAddress1);
        expect(await configController.comets(1)).to.eq(cometAddress2);
        expect(await configController.cometsLength()).to.eq(2);
      });
    });
  });

  describe("SandboxComet", function () {
    describe("initialize validations", function () {
      beforeEach(async function () {
        marketConfig = {
          baseToken: baseToken.address,
          collateralTokens: collateralTokens.map(obj => ({ ...obj })),
          baseTokenCurveId: 0n,
        };
      });
      it("should revert if token decimals is greater than max base decimals", async () => {
        const unsupportedToken = await makeToken({
          symbol: "BASE",
          initialMint: ethers.utils.parseEther("50000").toString(),
          decimals: 19,
        });
        const priceFeedUnsupportedToken = await makePriceFeed(unsupportedToken.address);

        await sandboxListBaseAsset(sandboxController, unsupportedToken, priceFeedUnsupportedToken.address);

        marketConfig.baseToken = unsupportedToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(sandboxCometImpl, "BadDecimals");
      });

      it("should revert if price feed decimals is not equal to PRICE FEED DECIMALS", async () => {
        const baseToken = await makeToken({
          symbol: "BASE",
          initialMint: ethers.utils.parseEther("50000").toString(),
          decimals: 18,
        });
        const invalidPriceFeed = await makePriceFeed(baseToken.address, "100000000", 7);

        await sandboxListBaseAsset(sandboxController, baseToken, invalidPriceFeed.address);

        marketConfig.baseToken = baseToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(sandboxCometImpl, "BadDecimals");
      });

      it("should revert if base scale is less than base accrual scale", async () => {
        const unsupportedToken = await makeToken({
          symbol: "BASE",
          initialMint: ethers.utils.parseEther("50000").toString(),
          decimals: 5,
        });
        const unsupportedPriceFeed = await makePriceFeed(unsupportedToken.address);

        await sandboxListBaseAsset(sandboxController, unsupportedToken, unsupportedPriceFeed.address);

        marketConfig.baseToken = unsupportedToken.address;

        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(sandboxCometImpl, "BadDecimals");
      });

      it("should revert if more than max collaterals assigned", async () => {
        const maxAssets = await sandboxCometImpl.MAX_ASSETS();
        for (let i = 0; i < maxAssets; i++) {
          const extraCollateral = await makeToken({ symbol: "COLL" + i });
          const priceFeedCol = await makePriceFeed(extraCollateral.address);

          await sandboxListCollateralAsset(sandboxController, extraCollateral, priceFeedCol.address);
          marketConfig.collateralTokens.push({
            collateralToken: extraCollateral.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.75, 18),
            liquidationFactor: exp(0.85, 18),
            supplyCap: exp(1e9, 18),
          });
        }
        await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(sandboxCometImpl, "TooManyAssets");
      });
    });
    describe("Comet creation: happy cases", function () {
      let comet: SandboxComet;
      before(async function () {
        marketConfig = {
          baseToken: baseToken.address,
          collateralTokens: collateralTokens.map(obj => ({ ...obj })),
          baseTokenCurveId: 0n,
        };
        const cometAddress = await configController.callStatic.createComet(marketConfig);
        await configController.createComet(marketConfig);

        comet = (await ethers.getContractAt("SandboxComet", cometAddress)) as SandboxComet;
      });
      it("should set storage properly after deploment and initialization", async function () {
        const currentBlock = await ethers.provider.getBlock("latest");
        const currentTimestamp = BigNumber.from(currentBlock.timestamp);

        expect(await comet.sandboxController()).to.eq(sandboxController.address);
        expect(await comet.baseTokenPriceFeed()).to.eq(await sandboxController.tokenToPriceFeed(marketConfig.baseToken));
        expect(await comet.baseToken()).to.eq(marketConfig.baseToken);
        expect(await comet.storeFrontPriceFactor()).to.eq((await sandboxController.config()).storeFrontPriceFactor);
        expect(await comet.baseBorrowMin()).to.eq((await sandboxController.baseAssets(marketConfig.baseToken)).minBorrow);
        expect(await comet.targetPercent()).to.eq((await sandboxController.config()).targetPercent);
        expect(await comet.seedReserves()).to.eq((await sandboxController.config()).suggestedAmountOfSeedReserves);
        expect(await comet.unlockTimestamp()).to.be.closeTo(
          currentTimestamp.add((await sandboxController.config()).suggestedLockTimeOfSeedReserves),
          10
        );
      });

      it("should set collateral assets properly after initialization", async function () {
        const colPriceFeed = (await sandboxController.collateralAssets(marketConfig.collateralTokens[0].collateralToken)).priceFeed;

        expect((await comet.collateralAssets(0)).priceFeed).to.deep.eq(colPriceFeed);
        expect(await comet.collateralAssetIndex(marketConfig.collateralTokens[0].collateralToken)).to.eq(0);
        expect(await comet.numAssets()).to.eq(marketConfig.collateralTokens.length);
      });

      it("should set curve parameters properly after initialization", async function () {
        const curve = (await sandboxController.baseAssets(marketConfig.baseToken)).baseAssetCurves[0];
        const secondsPerYear = BigNumber.from(31_536_000);

        // Supply
        expect(await comet.supplyKink()).to.eq(curve.supplyKink);
        expect(await comet.supplyPerSecondInterestRateSlopeLow()).to.eq(curve.supplyPerYearInterestRateSlopeLow.div(secondsPerYear));
        expect(await comet.supplyPerSecondInterestRateSlopeHigh()).to.eq(curve.supplyPerYearInterestRateSlopeHigh.div(secondsPerYear));
        expect(await comet.supplyPerSecondInterestRateBase()).to.eq(curve.supplyPerYearInterestRateBase.div(secondsPerYear));

        // Borrow
        expect(await comet.borrowKink()).to.eq(curve.borrowKink);
        expect(await comet.borrowPerSecondInterestRateSlopeLow()).to.eq(curve.borrowPerYearInterestRateSlopeLow.div(secondsPerYear));
        expect(await comet.borrowPerSecondInterestRateSlopeHigh()).to.eq(curve.borrowPerYearInterestRateSlopeHigh.div(secondsPerYear));
        expect(await comet.borrowPerSecondInterestRateBase()).to.eq(curve.borrowPerYearInterestRateBase.div(secondsPerYear));
      });

      it("should set disabled rewards during initialization", async function () {
        const UINT104_MAX = 20282409603651670423947251286015n;
        expect(await comet.baseMinForRewards()).to.eq(UINT104_MAX);
        expect(await comet.trackingIndexScale()).to.eq(1);
        expect(await comet.baseTrackingSupplySpeed()).to.eq(0);
        expect(await comet.baseTrackingBorrowSpeed()).to.eq(0);
      });
    });
  });
});
