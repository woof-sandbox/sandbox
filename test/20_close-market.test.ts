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
  ZERO,
} from "./helper/helpers";
import {
  SandboxController,
  SandboxComet,
  SandboxComet__factory,
  SandboxCometFactory,
  ConfigControllerFactory__factory,
  ConfigController,
  ConfigController__factory,
  SandboxCometFactory__factory,
  SandboxControllerNoCurvesTest__factory,
  FaucetToken,
  FaucetToken__factory,
  CometHarness,
  CometHarness__factory,
} from "../build/types";

import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";
import { BigNumber } from "ethers";

describe("20. close", function () {
  // Global variables for the all tests
  let configControllerImpl: ConfigController;
  let sandboxCometImpl: SandboxComet;

  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let guardian: SignerWithAddress;
  let firstUser: SignerWithAddress;
  let secondUser: SignerWithAddress;
  let randomCaller: SignerWithAddress;

  let configController: ConfigController;
  let sandboxCometFactory: SandboxCometFactory;
  let sandboxController: SandboxController;

  let collateralTokens: CollateralTokenConfigStruct[] = [];
  let baseToken: FaucetToken;
  let marketConfig: CometConfigStruct;

  let comet: CometHarness;

  const _minUpdateTime = 7 * 24 * 60 * 60;

  const amountOfSeedReserves = exp(500, 18).toString(); // 500 tokens with 18 decimals

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60,
  };

  const provider = ethers.provider;

  before(async function () {
    [owner, curator, guardian, firstUser, secondUser, randomCaller] = await ethers.getSigners();

    const configControllerFactory_factory = new ConfigControllerFactory__factory(owner);
    const configController_factory = new ConfigController__factory(owner);
    const comet_factory = new SandboxComet__factory(owner);
    const sandboxCometFactory_factory = new SandboxCometFactory__factory(owner);

    configControllerImpl = (await configController_factory.deploy()) as ConfigController;
    sandboxCometImpl = (await comet_factory.deploy()) as SandboxComet;

    const SandboxControllerFactoryTest = (await ethers.getContractFactory(
      "SandboxControllerNoCurvesTest"
    )) as SandboxControllerNoCurvesTest__factory;

    sandboxController = (
      await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }), SandboxControllerFactoryTest)
    ).sandboxController;

    const configControllerFactory = await configControllerFactory_factory.deploy(sandboxController.address, configControllerImpl.address);
    sandboxCometFactory = await sandboxCometFactory_factory.deploy(sandboxCometImpl.address, configControllerFactory.address);

    const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
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
    configController = (await ethers.getContractAt("ConfigControllerTest", configControllerAddress)) as ConfigController;

    baseToken = await makeToken({
      symbol: "WETH",
      initialMint: ethers.utils.parseEther("50000").toString(),
    });

    const priceFeedBase = await makePriceFeed(baseToken.address, "2");
    await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);

    const tokenSymbolList = ["USDT", "DAI", "USDC"];

    for (const symbol of tokenSymbolList) {
      const collateralToken = await makeToken({ symbol: symbol });
      const priceFeedCol = await makePriceFeed(collateralToken.address, "2");

      await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

      collateralTokens.push({
        collateralToken: collateralToken.address,
        borrowCollateralFactor: exp(0.6, 18),
        liquidateCollateralFactor: exp(0.75, 18),
        liquidationFactor: exp(0.85, 18),
        supplyCap: exp(1e9, 18),
      });
    }
  });

  async function createAndFundComet() {
    // Set the market configuration with all collateral tokens
    marketConfig = {
      baseToken: baseToken.address,
      collateralTokens: collateralTokens.map(obj => ({ ...obj })),
      baseTokenCurveId: 0n,
      name: "Comet",
      amountOfSeedReserves: amountOfSeedReserves,
    };
    // Create a new comet instance with the current market configuration
    const cometAddress = await configController.callStatic.createComet(marketConfig);
    await configController.createComet(marketConfig);
    // Connect to the newly created comet instance
    comet = CometHarness__factory.connect(cometAddress, provider) as CometHarness;

    await baseToken.allocateTo(comet.address, exp(100000, 18));
  }

  async function supplyCollateral(user: SignerWithAddress, assetIndex: string, amount: bigint): Promise<BigNumber> {
    const collateralToken = collateralTokens[assetIndex].collateralToken;

    const contractToken = FaucetToken__factory.connect(collateralToken, provider);
    // Create a balance for the user for the collateral token
    await contractToken.connect(user).allocateTo(user.address, amount);
    // Approve the comet contract to spend the user's collateral token
    await contractToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);
    // Deposit collateral into the comet contract
    const supplyAmount = await contractToken.balanceOf(user.address);
    // Return the supply amount
    return supplyAmount;
  }

  context("Closing of Market", function () {
    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      // Set pause status for the comet
      await configController.pauseMarket(comet.address, true, true, true, true, true);
    });

    it("should change the market closing status flag", async () => {
      expect(await comet.isClosed()).to.be.false;
      await configController.closeMarket(comet.address);
      expect(await comet.isClosed()).to.be.true;
    });

    it("should emit the corresponding market closing event", async () => {
      await expect(configController.closeMarket(comet.address)).to.emit(comet, "MarketClosed");
    });

    it("should clear the market's pause status", async () => {
      expect(await comet.isSupplyPaused()).to.be.true;
      expect(await comet.isTransferPaused()).to.be.true;
      expect(await comet.isWithdrawPaused()).to.be.true;
      expect(await comet.isAbsorbPaused()).to.be.true;
      expect(await comet.isBuyPaused()).to.be.true;

      await configController.closeMarket(comet.address);

      expect(await comet.isSupplyPaused()).to.be.false;
      expect(await comet.isTransferPaused()).to.be.false;
      expect(await comet.isWithdrawPaused()).to.be.false;
      expect(await comet.isAbsorbPaused()).to.be.false;
      expect(await comet.isBuyPaused()).to.be.false;
    });

    it("should not allow close market if called by non-controller", async () => {
      await expect(comet.connect(randomCaller).close()).to.be.revertedWithCustomError(configController, "Unauthorized");
    });
  });

  context("Market is closed", function () {
    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      // Supply some collateral to the comet
      await supplyCollateral(firstUser, "0", exp(1000, 18));
      // Close the market
      await configController.closeMarket(comet.address);
    });

    it("should not allow close market again", async () => {
      await expect(configController.closeMarket(comet.address)).to.be.revertedWithCustomError(comet, "MarketIsClosed");
    });

    it("should not allow changing pause status", async () => {
      await expect(configController.pauseMarket(comet.address, true, true, true, true, true)).to.be.revertedWithCustomError(
        comet,
        "MarketIsClosed"
      );
    });

    it("should not allow supply collateral", async () => {
      // Index of the collateral asset to be removed
      const assetIndex = 1;
      const collateralToken = collateralTokens[assetIndex].collateralToken;

      const contractToken = FaucetToken__factory.connect(collateralToken, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, exp(1000, 18));
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit collateral into the comet contract
      const supplyAmount = await contractToken.balanceOf(firstUser.address);

      // Expect the custom error to be reverted
      await expect(comet.connect(firstUser).supply(collateralToken, supplyAmount)).to.be.revertedWithCustomError(
        comet,
        "MarketIsClosed"
      );
    });
  });
});
