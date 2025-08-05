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
  CombinedComet,
  getCombinedComet,
} from "./helper/helpers";
import {
  SandboxController,
  SandboxComet,
  SandboxComet__factory,
  SandboxCometFactory,
  ConfigControllerFactory__factory,
  ConfigControllerTest,
  ConfigControllerTest__factory,
  SandboxCometFactory__factory,
  SandboxControllerNoCurvesTest__factory,
  FaucetToken,
  FaucetToken__factory,
} from "../build/types";

import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";

describe("20. market depreciation", function () {
  // Global variables for the all tests
  let configControllerImpl: ConfigControllerTest;
  let sandboxCometImpl: SandboxComet;

  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let dao: SignerWithAddress;
  let guardian: SignerWithAddress;
  let firstUser: SignerWithAddress;
  let secondUser: SignerWithAddress;
  let randomCaller: SignerWithAddress;

  let configController: ConfigControllerTest;
  let sandboxCometFactory: SandboxCometFactory;
  let sandboxController: SandboxController;

  let collateralTokens: CollateralTokenConfigStruct[] = [];
  let baseToken: FaucetToken;
  let marketConfig: CometConfigStruct;

  let comet: CombinedComet;

  const provider = ethers.provider;

  const _minUpdateTime = 7 * 24 * 60 * 60;

  const amountOfSeedReserves = exp(500, 18).toString(); // 500 tokens with 18 decimals

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60,
  };

  before(async function () {
    [owner, curator, dao, guardian, firstUser, secondUser, randomCaller] = await ethers.getSigners();

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
      await makeSandboxController(
        defaultSandboxControllerOpts({ dao: dao.address, minUpdateTime: _minUpdateTime }),
        SandboxControllerFactoryTest
      )
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
    configController = ConfigControllerTest__factory.connect(configControllerAddress, owner);

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

  async function createComet(collateralTokenConfig?: CollateralTokenConfigStruct[]) {
    // Set the market configuration with all collateral tokens
    marketConfig = {
      baseToken: baseToken.address,
      collateralTokens: collateralTokenConfig ? collateralTokenConfig : collateralTokens.map(obj => ({ ...obj })),
      baseTokenCurveId: 0n,
      name: "Comet",
      amountOfSeedReserves: amountOfSeedReserves,
    };
    // Create a new comet instance with the current market configuration
    const cometAddress = await configController.callStatic.createComet(marketConfig);
    await configController.createComet(marketConfig);
    // Connect to the combined comet instance: SandboxComet and CometExtension
    comet = getCombinedComet(cometAddress, provider);
  }

  async function supplyCollateralTo(user: SignerWithAddress, assetIndex: number, amount: bigint) {
    const collateralToken = collateralTokens[assetIndex].collateralToken;

    const contractToken = FaucetToken__factory.connect(collateralToken, provider);
    // Create a balance for the user for the collateral token
    await contractToken.connect(user).allocateTo(user.address, amount);
    // Approve the comet contract to spend the user's collateral token
    await contractToken.connect(user).approve(comet.address, amount);
    // Deposit collateral into the comet contract
    await comet.connect(user).supply(collateralToken, amount);
  }

  async function supplyBaseTokenTo(user: SignerWithAddress, amount: bigint) {
    // Create a balance for the user for the base token
    await baseToken.connect(user).allocateTo(user.address, amount);
    // Approve the comet contract to spend the user's base token
    await baseToken.connect(user).approve(comet.address, amount);
    // Deposit base token into the comet contract
    await comet.connect(user).supply(baseToken.address, amount);
  }

  async function borrowBaseTokenTo(user: SignerWithAddress, amount: bigint) {
    // Borrow base token from the comet contract
    await comet.connect(user).withdraw(baseToken.address, amount);
  }

  context("Initiating the deprecation of market", function () {
    beforeEach(async function () {
      // Create the comet before each test
      await createComet();
      // Set pause status for the comet
      await configController.pauseMarket(comet.address, true, true, true, true, true);
    });

    it("should change the market deprecation status flag", async () => {
      expect(await comet.isDeprecating()).to.be.false;
      await configController.initiateDeprecationMarket(comet.address);
      expect(await comet.isDeprecating()).to.be.true;
    });

    it("should not change the market deprecated status flag", async () => {
      expect(await comet.isDeprecated()).to.be.false;
      await configController.initiateDeprecationMarket(comet.address);
      expect(await comet.isDeprecated()).to.be.false;
    });

    it("should emit the corresponding market closing event", async () => {
      const deprecationDuration = await comet.deprecationDuration();
      const txTimestamp = (await time.latest()) + 60; // 1 minute in the future
      await time.setNextBlockTimestamp(txTimestamp);
      // Expect the event to be emitted of the deprecation initiation
      await expect(configController.initiateDeprecationMarket(comet.address))
        .to.emit(comet, "DeprecationInitiated")
        .withArgs(txTimestamp, deprecationDuration.add(txTimestamp));
    });

    it("should clear the market's pause status", async () => {
      expect(await comet.isSupplyPaused()).to.be.true;
      expect(await comet.isTransferPaused()).to.be.true;
      expect(await comet.isWithdrawPaused()).to.be.true;
      expect(await comet.isAbsorbPaused()).to.be.true;
      expect(await comet.isBuyPaused()).to.be.true;

      await configController.initiateDeprecationMarket(comet.address);

      expect(await comet.isSupplyPaused()).to.be.false;
      expect(await comet.isTransferPaused()).to.be.false;
      expect(await comet.isWithdrawPaused()).to.be.false;
      expect(await comet.isAbsorbPaused()).to.be.false;
      expect(await comet.isBuyPaused()).to.be.false;
    });
  });

  context("When the market is deprecating", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;

    beforeEach(async function () {
      // Create the comet before each test
      await createComet();
      // Supply some collateral to the comet: firstUser
      await supplyCollateralTo(firstUser, assetIndex, supplyCollateralAmount);
      // Supply some base token to the comet: firstUser
      await supplyBaseTokenTo(firstUser, supplyBaseTokenAmount);
      // Supply some collateral to the comet: secondUser
      await supplyCollateralTo(secondUser, assetIndex, supplyCollateralAmount);
      // Borrow base token from the comet: secondUser
      await borrowBaseTokenTo(secondUser, borrowBaseTokenAmount);
      // Set time for the deprecation start
      deprecationStartTimestamp = (await time.latest()) + 60; // 1 minute in the future
      await time.setNextBlockTimestamp(deprecationStartTimestamp);
      // Close the market
      await configController.initiateDeprecationMarket(comet.address);
    });

    it("should not allow initiating deprecation market again", async () => {
      await expect(configController.initiateDeprecationMarket(comet.address)).to.be.revertedWithCustomError(comet, "DeprecationInProgress");
    });

    it("should not allow changing pause status", async () => {
      // Try to change pause status
      await expect(configController.pauseMarket(comet.address, true, true, true, true, true)).to.be.revertedWithCustomError(
        comet,
        "DeprecationInProgress"
      );
    });

    it("should not allow supply collateral", async () => {
      const assetIndex = 0;
      const collateralToken = collateralTokens[assetIndex].collateralToken;
      const supplyAmount = exp(1000, 18);

      const contractToken = FaucetToken__factory.connect(collateralToken, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Try to supply collateral
      await expect(comet.connect(firstUser).supply(collateralToken, supplyAmount)).to.be.revertedWithCustomError(
        comet,
        "DeprecationInProgress"
      );
    });

    it("should not allow transfer base token", async () => {
      // Try to transfer base token
      await expect(comet.connect(firstUser).transfer(secondUser.address, supplyBaseTokenAmount)).to.be.revertedWithCustomError(
        comet,
        "DeprecationInProgress"
      );
    });

    it("should not allow get borrow", async () => {
      const borrowAmount = exp(100, 18);
      // Try to withdraw base token
      await expect(
        comet.connect(firstUser).withdraw(baseToken.address, supplyBaseTokenAmount + borrowAmount)
      ).to.be.revertedWithCustomError(comet, "DeprecationInProgress");
    });

    it("should allow withdraw collateral", async () => {
      const contractToken = FaucetToken__factory.connect(collateralTokens[assetIndex].collateralToken, provider);
      // Withdraw collateral from the comet contract
      await comet.connect(firstUser).withdraw(collateralTokens[assetIndex].collateralToken, supplyCollateralAmount);
      // Check the user's balance after withdrawal
      const userBalance = await contractToken.balanceOf(firstUser.address);
      // Expect the user's balance to be equal to the supplied collateral amount
      expect(userBalance).to.equal(supplyCollateralAmount);
    });

    it("should allow withdraw base token", async () => {
      // Withdraw base token from the comet contract
      await comet.connect(firstUser).withdraw(baseToken.address, supplyBaseTokenAmount);
      // Check the user's balance after withdrawal
      const userBalance = await baseToken.balanceOf(firstUser.address);
      // Expect the user's balance to be equal to the supplied base token amount
      expect(userBalance).to.equal(supplyBaseTokenAmount);
    });

    it("should allow close borrow position", async () => {
      // Supply amount: debt + 0.001 base token (0.001 amount to cover interest)
      const supplyAmount = borrowBaseTokenAmount + exp(0.001, 18);
      // Create a balance for the user for the base token
      await baseToken.connect(firstUser).allocateTo(firstUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await baseToken.connect(firstUser).approve(comet.address, supplyAmount);

      // Close the borrow position by repaying the borrowed base token amount
      await comet.connect(secondUser).supply(baseToken.address, supplyAmount);
      // Check the user's borrow balance after repayment
      expect(await comet.borrowBalanceOf(secondUser.address)).to.equal(ZERO);
    });

    it("should change the liquidation factor of the collaterals", async () => {
      const halfDeprecationDuration = (await comet.deprecationDuration()).div(2);
      await time.setNextBlockTimestamp(halfDeprecationDuration.add(deprecationStartTimestamp));
      // Accrue interest during the half deprecation period
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      for (const [index, collateralInfo] of collateralTokens.entries()) {
        const initialLiquidationFactor = collateralInfo.liquidationFactor;
        const currentLiquidationFactor = await comet.getAssetInfo(index).then(info => info.liquidationFactor);
        // Expect the liquidation factor to be above the initial liquidation factor
        expect(currentLiquidationFactor).to.be.above(initialLiquidationFactor);
      }
    });

    it("should change the liquidation collateral factor of the collaterals", async () => {
      const halfDeprecationDuration = (await comet.deprecationDuration()).div(2);
      await time.setNextBlockTimestamp(halfDeprecationDuration.add(deprecationStartTimestamp));
      // Accrue interest during the half deprecation period
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      for (const [index, collateralInfo] of collateralTokens.entries()) {
        const initialLiquidateCollateralFactor = collateralInfo.liquidateCollateralFactor;
        const currentLiquidateCollateralFactor = await comet.getAssetInfo(index).then(info => info.liquidateCollateralFactor);
        // Expect the liquidation collateral factor to be less than the initial liquidation collateral factor
        expect(currentLiquidateCollateralFactor).to.be.below(initialLiquidateCollateralFactor);
      }
    });
  });

  context("When the market is deprecated", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;
    let deprecationEndTimestamp: number;

    beforeEach(async function () {
      // Create the comet before each test
      await createComet();
      // Supply some collateral to the comet: firstUser
      await supplyCollateralTo(firstUser, assetIndex, supplyCollateralAmount);
      // Supply some base token to the comet: firstUser
      await supplyBaseTokenTo(firstUser, supplyBaseTokenAmount);
      // Supply some collateral to the comet: secondUser
      await supplyCollateralTo(secondUser, assetIndex, supplyCollateralAmount);
      // Borrow base token from the comet: secondUser
      await borrowBaseTokenTo(secondUser, borrowBaseTokenAmount);
      // Set time for the deprecation start
      deprecationStartTimestamp = (await time.latest()) + 60; // 1 minute in the future
      await time.setNextBlockTimestamp(deprecationStartTimestamp);
      // Close the market
      await configController.initiateDeprecationMarket(comet.address);
      // Set time for the deprecation end
      deprecationEndTimestamp = deprecationStartTimestamp + (await comet.deprecationDuration()).toNumber();
      await time.increaseTo(deprecationEndTimestamp);
    });

    it("should emit event about the finalization deprecation of market", async () => {
      // Transaction for finalizing deprecation
      // Expect the event to be emitted of the deprecation finalization
      await expect(comet.connect(firstUser).accrueAccount(firstUser.address)).to.emit(comet, "DeprecationFinalized");
    });

    it("should change the market deprecating status flag", async () => {
      expect(await comet.isDeprecating()).to.be.true;
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      expect(await comet.isDeprecating()).to.be.false;
    });

    it("should change the market deprecated status flag", async () => {
      expect(await comet.isDeprecated()).to.be.false;
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      expect(await comet.isDeprecated()).to.be.true;
    });

    it("should not allow initiating deprecation market again", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to initiate deprecation market again
      await expect(configController.initiateDeprecationMarket(comet.address)).to.be.revertedWithCustomError(comet, "MarketIsDeprecated");
    });

    it("should not allow changing pause status", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to change pause status
      await expect(configController.pauseMarket(comet.address, true, true, true, true, true)).to.be.revertedWithCustomError(
        comet,
        "MarketIsDeprecated"
      );
    });

    it("should change the liquidation factor of collateral assets to target values", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation factor of collateral assets
      const targetLiquidationFactor = await comet.targetLiquidateFactor();
      for (const [index, _] of collateralTokens.entries()) {
        const currentLiquidationFactor = await comet.getAssetInfo(index).then(info => info.liquidationFactor);
        // Expect the liquidation factor to be equal to the target liquidation factor
        expect(currentLiquidationFactor).to.equal(targetLiquidationFactor);
      }
    });

    it("should change the liquidation collateral factor of collateral assets to target values", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation collateral factor of collateral assets
      const targetLiquidateCollateralFactor = await comet.targetLiquidateCollateralFactor();
      for (const [index, _] of collateralTokens.entries()) {
        const currentLiquidateCollateralFactor = await comet.getAssetInfo(index).then(info => info.liquidateCollateralFactor);
        // Expect the liquidation collateral factor to be equal to the target liquidation collateral factor
        expect(currentLiquidateCollateralFactor).to.equal(targetLiquidateCollateralFactor);
      }
    });

    it("should allow close borrow position", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(secondUser).accrueAccount(secondUser.address);
      // Supply amount: debt + 0.1 base token (0.1 amount to cover interest)
      const supplyAmount = borrowBaseTokenAmount + exp(0.1, 18);
      // Create a balance for the user for the base token
      await baseToken.connect(secondUser).allocateTo(secondUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await baseToken.connect(secondUser).approve(comet.address, supplyAmount);

      // Close the borrow position by repaying the borrowed base token amount
      await comet.connect(secondUser).supply(baseToken.address, supplyAmount);
      // Check the user's borrow balance after repayment
      expect(await comet.borrowBalanceOf(secondUser.address)).to.equal(ZERO);
    });

    it("should allow withdraw collateral", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      const contractToken = FaucetToken__factory.connect(collateralTokens[assetIndex].collateralToken, provider);
      // Check the user's balance before withdrawal
      const userBalanceBefore = await contractToken.balanceOf(firstUser.address);
      // Withdraw collateral from the comet contract
      await comet.connect(firstUser).withdraw(collateralTokens[assetIndex].collateralToken, supplyCollateralAmount);
      // Check the user's balance after withdrawal
      const userBalanceAfter = await contractToken.balanceOf(firstUser.address);
      // Expect the user's balance to increase by the supplied collateral amount
      expect(userBalanceAfter).to.equal(userBalanceBefore.add(supplyCollateralAmount));
    });

    it("should allow withdraw base token", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Withdraw base token from the comet contract
      await comet.connect(firstUser).withdraw(baseToken.address, supplyBaseTokenAmount);
      // Check the user's balance after withdrawal
      const userBalance = await baseToken.balanceOf(firstUser.address);
      // Expect the user's balance to be above the supplied base token amount
      expect(userBalance).to.be.above(supplyBaseTokenAmount);
    });

    it("should not allow supply collateral", async () => {
      const assetIndex = 0;
      const collateralToken = collateralTokens[assetIndex].collateralToken;
      const supplyAmount = exp(1000, 18);

      const contractToken = FaucetToken__factory.connect(collateralToken, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Supply collateral into the comet contract
      await expect(comet.connect(firstUser).supply(collateralToken, supplyAmount)).to.be.revertedWithCustomError(
        comet,
        "MarketIsDeprecated"
      );
    });

    it("should not allow transfer base token", async () => {
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to transfer base token
      await expect(comet.connect(firstUser).transfer(secondUser.address, supplyBaseTokenAmount)).to.be.revertedWithCustomError(
        comet,
        "MarketIsDeprecated"
      );
    });

    it("should not allow get borrow", async () => {
      const borrowAmount = exp(100, 18);
      // Transaction for finalizing deprecation
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to withdraw base token
      await expect(
        comet.connect(firstUser).withdraw(baseToken.address, supplyBaseTokenAmount + borrowAmount)
      ).to.be.revertedWithCustomError(comet, "MarketIsDeprecated");
    });

    it("should allow to liquidate accounts", async () => {
      // Check the liquidation status before finalizing deprecation
      expect(await comet.isLiquidatable(secondUser.address)).to.be.false;
      // Transaction for finalizing deprecation
      await comet.connect(secondUser).accrueAccount(firstUser.address);
      // Check the liquidation status after finalizing deprecation
      expect(await comet.isLiquidatable(secondUser.address)).to.be.true;
    });
  });

  context("Impact of market deprecation on user positions:", function () {
    // Global variables for the context of the tests
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(150, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;
    let deprecationDuration: number;

    beforeEach(async function () {
      // Create the comet before each test
      await createComet();
      // Supply some collateral to the comet
      await supplyCollateralTo(firstUser, assetIndex, supplyCollateralAmount);
      // Borrow base token from the comet
      await borrowBaseTokenTo(firstUser, borrowBaseTokenAmount);
      // Get the deprecation durations
      deprecationDuration = (await comet.deprecationDuration()).toNumber();
      // Set time for the deprecation start
      deprecationStartTimestamp = (await time.latest()) + 60; // 1 minute in the future
      await time.setNextBlockTimestamp(deprecationStartTimestamp);
      // Close the market
      await configController.initiateDeprecationMarket(comet.address);
    });

    it("should gradually reduce the liquidate collateral factor for a user with active debt during deprecation", async () => {
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status at the beginning of the deprecation process
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 15% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.15);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 30% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.3);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the deprecation duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 45% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.45);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the deprecation duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 60% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.6);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the deprecation duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 75% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.75);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the deprecation duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 90% of the deprecation duration
      await time.setNextBlockTimestamp(deprecationStartTimestamp + deprecationDuration * 0.9);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the deprecation duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    context("Overflow:", function () {
      // Global variables for the context of the tests
      let deprecationStartTimestamp: number;
      let deprecationEndTimestamp: number;
      const assetAddresses: string[] = [];

      beforeEach(async function () {
        // It is constant value in comet contract
        const maxAssets = 24;
        const collateralTokensConfig: CollateralTokenConfigStruct[] = [];
        // Create collateral tokens and price feeds
        for (let i = 0; i < maxAssets; i++) {
          const collateralToken = await makeToken({ symbol: `TOKEN${i}` });
          const priceFeedCol = await makePriceFeed(collateralToken.address, "2");

          await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

          collateralTokensConfig[i] = {
            collateralToken: collateralToken.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.75, 18),
            liquidationFactor: exp(0.85, 18),
            supplyCap: exp(1e9, 18),
          };
          assetAddresses[i] = collateralToken.address;
        }

        // Create the comet with maximum assets
        await createComet(collateralTokensConfig);
        // Check that the comet has the maximum number of assets
        expect(await comet.numAssets()).to.equal(maxAssets);

        // Initiate deprecation of the market
        await configController.initiateDeprecationMarket(comet.address);
        // Check that the market is deprecating
        expect(await comet.isDeprecating()).to.be.true;
        // Set time for the deprecation start
        deprecationStartTimestamp = (await time.latest()) + 60; // 1 minute in the future
        await time.setNextBlockTimestamp(deprecationStartTimestamp);
        // Get time for the deprecation end
        deprecationEndTimestamp = deprecationStartTimestamp + (await comet.deprecationDuration()).toNumber();
      });

      it("should handle overflow during market depreciation with maximum number of assets", async function () {
        // Arrange: Create a market with the maximum number of assets
        // Act: Initiate deprecation process of the market
        // Assert: Check that not overflow happens

        // Call the accrueAccount function to trigger the market depreciation process
        // Expect no overflow to happen
        expect(await comet.connect(firstUser).accrueAccount(firstUser.address)).to.not.be.reverted;
      });
    });

    context("Access control:", function () {
      it("should not allow close market if called by non-controller", async () => {
        // Try to initiate deprecation market
        await expect(comet.connect(randomCaller).initiateDeprecation()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });
    });
  });
});
