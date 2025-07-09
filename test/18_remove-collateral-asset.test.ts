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
  SandboxController,
  SandboxComet,
  CometExtension,
  CometExtension__factory,
  SandboxCometFactory,
  ConfigControllerFactory__factory,
  ConfigControllerTest,
  ConfigControllerTest__factory,
  SandboxComet__factory,
  SandboxCometFactory__factory,
  SandboxControllerNoCurvesTest__factory,
  FaucetToken,
  FaucetToken__factory,
} from "../build/types";

import { time } from "@nomicfoundation/hardhat-network-helpers";

import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";

describe("18. initiateCollateralRemoval", function () {
  let configControllerImpl: ConfigControllerTest;
  let sandboxCometImpl: SandboxComet;

  const _minUpdateTime = 7 * 24 * 60 * 60;

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60,
  };

  let owner, curator, guardian, user, randomCaller;

  let configControllerAddress;
  let configController: ConfigControllerTest;
  let sandboxCometFactory: SandboxCometFactory;
  let sandboxController: SandboxController;

  let collateralTokens: CollateralTokenConfigStruct[] = [];
  let baseToken: FaucetToken;
  let marketConfig: CometConfigStruct;

  let comet: SandboxComet;
  let cometExtension: CometExtension; // @todo remove

  const provider = ethers.provider;

  before(async function () {
    [owner, curator, guardian, user, randomCaller] = await ethers.getSigners();

    const configControllerFactory_factory = new ConfigControllerFactory__factory(owner);
    const configController_factory = new ConfigControllerTest__factory(owner);
    const comet_factory = new SandboxComet__factory(owner);
    const sandboxCometFactory_factory = new SandboxCometFactory__factory(owner);

    configControllerImpl = (await configController_factory.deploy()) as ConfigControllerTest;
    sandboxCometImpl = (await comet_factory.deploy()) as SandboxComet;

    const SandboxControllerFactoryTest = (await ethers.getContractFactory(
      "SandboxControllerNoCurvesTest"
    )) as SandboxControllerNoCurvesTest__factory;

    sandboxController = (
      await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }), SandboxControllerFactoryTest)
    ).sandboxController;

    const configControllerFactory = await configControllerFactory_factory.deploy(sandboxController.address, configControllerImpl.address);
    sandboxCometFactory = await sandboxCometFactory_factory.deploy(sandboxCometImpl.address, configControllerFactory.address);

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
    configController = (await ethers.getContractAt("ConfigControllerTest", configControllerAddress)) as ConfigControllerTest;

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

  context("Removing collateral asset:", function () {
    beforeEach(async function () {
      // Set the market configuration with all collateral tokens
      marketConfig = {
        baseToken: baseToken.address,
        collateralTokens: collateralTokens.map(obj => ({ ...obj })),
        baseTokenCurveId: 0n,
      };
      // Create a new comet instance with the current market configuration
      const cometAddress = await configController.callStatic.createComet(marketConfig);
      await configController.createComet(marketConfig);
      // Connect to the newly created comet instance
      comet = SandboxComet__factory.connect(cometAddress, provider);
      // Connect to the comet as an extension contract
      cometExtension = CometExtension__factory.connect(cometAddress, provider);

      await baseToken.allocateTo(comet.address, exp(5000, 18));
    });

    it("should initiate the process of collateral asset removal", async () => {
      expect(await comet.isCollateralRemovalInProgress()).to.be.false;
      const numAssetsBefore = await comet.numAssets();

      const removalDuration = 7 * 24 * 60 * 60; // 7 days in seconds
      const assetIndex = 0; // Index of the collateral asset to be removed
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      const timestamp = await time.latest();
      const txTimestamp = timestamp + 600; // Add 10 minutes to the current timestamp
      const startTime = txTimestamp;
      const endTime = txTimestamp + removalDuration;
      await time.setNextBlockTimestamp(txTimestamp);

      const tx = await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);

      await expect(tx).to.emit(comet, "CollateralRemovalInitiated").withArgs(assetIndex, removalCollateralToken, startTime, endTime);

      expect(await comet.isCollateralRemovalInProgress()).to.be.true;
      expect(await comet.numAssets()).to.equal(numAssetsBefore);
    });

    it("should not allow initiating collateral removal if already in progress", async () => {
      const removalDuration = 7 * 24 * 60 * 60; // 7 days in seconds

      const timestamp = await time.latest();
      const txTimestamp = timestamp + 600; // Add 10 minutes to the current timestamp
      const startTime = txTimestamp;
      const endTime = txTimestamp + removalDuration;

      await time.setNextBlockTimestamp(txTimestamp);

      const assetIndex = 0; // Index of the collateral asset to be removed
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);

      await expect(configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken))
        .to.be.revertedWithCustomError(comet, "CollateralRemovalInProgress")
        .withArgs(removalCollateralToken, startTime, endTime);
    });

    it("should not allow initiating collateral removal if called by non-controller", async () => {
      const assetIndex = 0; // Index of the collateral asset to be removed
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await expect(comet.connect(randomCaller).initiateCollateralRemoval(removalCollateralToken)).to.be.revertedWithCustomError(
        comet,
        "Unauthorized"
      );
    });

    it.skip("should finalize collateral removal after the removal period", async () => {
      const removalDuration = 7 * 24 * 60 * 60; // 7 days in seconds

      const timestamp = await time.latest();
      const txTimestamp = timestamp + 600; // Add 10 minutes to the current timestamp

      await time.setNextBlockTimestamp(txTimestamp);

      const assetIndex = 0; // Index of the collateral asset to be removed
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);
      expect(await comet.isCollateralRemovalInProgress()).to.be.true;

      const numAssets = await comet.numAssets();
      const numRemovedAssets = await comet.numRemovedAssets();
      const removedAssetIndex = numRemovedAssets;

      const collateralAddress = collateralTokens[1].collateralToken;
      const contractToken = FaucetToken__factory.connect(collateralAddress, provider);
      // Create a balance for the user for the second collateral token
      await contractToken.connect(user).allocateTo(user.address, exp(1000, 18));
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit second collateral into the comet contract
      const supplyAmount = await contractToken.balanceOf(user.address);

      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(txTimestamp + removalDuration);

      const tx = await comet.connect(user).supply(collateralAddress, supplyAmount);
      // Check the user's balance after supplying the collateral
      expect(await cometExtension.collateralBalanceOf(user.address, collateralAddress)).to.equal(supplyAmount);

      await expect(tx).to.emit(comet, "CollateralRemovalFinalized").withArgs(removedAssetIndex, removalCollateralToken);
      expect(await comet.numAssets()).to.equal(numAssets - 1);
      expect(await comet.numRemovedAssets()).to.equal(numRemovedAssets + 1);
    });
  });

  // context('Edge cases:', function () {});
});
