import {
  ethers,
  exp,
  expect,
  defaultSandboxControllerOpts,
  makeSandboxController,
  makePriceFeed,
  sandboxListBaseAsset,
  sandboxListCollateralAsset,
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
import { BigNumber } from "ethers";

describe("18. initiateCollateralRemoval", function () {
  // Global variables for the all tests
  let configControllerImpl: ConfigControllerTest;
  let sandboxCometImpl: SandboxComet;

  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
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
    const configController_factory = new ConfigControllerTest__factory(owner);
    const comet_factory = new SandboxComet__factory(owner);
    const sandboxCometFactory_factory = new SandboxCometFactory__factory(owner);

    configControllerImpl = (await configController_factory.deploy()) as ConfigControllerTest;
    sandboxCometImpl = (await comet_factory.deploy()) as SandboxComet;

    const SandboxControllerFactoryTest = (await ethers.getContractFactory(
      "SandboxControllerNoCurvesTest"
    )) as SandboxControllerNoCurvesTest__factory;

    // Fix: Provide required parameters to defaultSandboxControllerOpts
    const sandboxControllerOpts = defaultSandboxControllerOpts({
      owner: owner.address,
      dao: curator.address,
      treasury: ethers.Wallet.createRandom().address
    });
    
    sandboxController = await makeSandboxController(sandboxControllerOpts, owner, SandboxControllerFactoryTest);

    const configControllerFactory = await configControllerFactory_factory.deploy(sandboxController.address, configControllerImpl.address);
    sandboxCometFactory = await sandboxCometFactory_factory.deploy(sandboxCometImpl.address, configControllerFactory.address);

    const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
      curator.address,
      guardian.address,
      sandboxCometFactory.address,
      configControllerOpts._curatorFee,
      configControllerOpts._name
    );

    // deploy config controller
    await configControllerFactory.createConfigController(
      curator.address,
      guardian.address,
      sandboxCometFactory.address,
      configControllerOpts._curatorFee,
      configControllerOpts._name
    );
    configController = (await ethers.getContractAt("ConfigControllerTest", configControllerAddress)) as ConfigControllerTest;

    // Accept the curator proposal
    await configController.connect(curator).acceptProposal(0);
    
    // Fix: Replace makeToken with proper token creation
    const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
    baseToken = (await FaucetFactory.deploy(
      ethers.utils.parseEther("50000").toString(),
      "WETH",
      18,
      "WETH"
    )) as FaucetToken;
    await baseToken.deployed();
    
    // Allocate base token to owner and approve for ConfigController
    const seedReservesAmount = await sandboxController.suggestedAmountOfSeedReserves(baseToken.address);
    await baseToken.connect(owner).allocateTo(owner.address, seedReservesAmount);
    await baseToken.connect(owner).approve(configController.address, seedReservesAmount);

    const priceFeedBase = await makePriceFeed(baseToken.address, "2");
    await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);

    // Add base asset curve - this is required before creating a comet
    await sandboxController.addBaseAssetCurve(baseToken.address, {
      supplyKink: exp(0.8, 18),
      supplyPerYearInterestRateSlopeLow: exp(0.05, 18),
      supplyPerYearInterestRateSlopeHigh: exp(2, 18),
      supplyPerYearInterestRateBase: exp(0.001, 18),
      borrowKink: exp(0.8, 18),
      borrowPerYearInterestRateSlopeLow: exp(0.1, 18),
      borrowPerYearInterestRateSlopeHigh: exp(3, 18),
      borrowPerYearInterestRateBase: exp(0.005, 18),
    });

    const tokenSymbolList = ["USDT", "DAI", "USDC"];

    for (const symbol of tokenSymbolList) {
      // Fix: Replace makeToken with proper token creation
      const collateralToken = (await FaucetFactory.deploy(
        exp(1e9, 18).toString(),
        symbol,
        18,
        symbol
      )) as FaucetToken;
      await collateralToken.deployed();
      
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
      baseTokenCurveId: 0n, // Revert back to 0 as used in working test
      name: "Comet",
      amountOfSeedReserves: await sandboxController.suggestedAmountOfSeedReserves(baseToken.address),
    };
    // Create a new comet instance with the current market configuration
    const cometAddress = await configController.callStatic.createComet(marketConfig);
    await configController.createComet(marketConfig);
    // Connect to the newly created comet instance
    comet = getCombinedComet(cometAddress, provider);

    await baseToken.allocateTo(comet.address, exp(100000, 18));
  }

  context("Initiating the removal of collateral assets:", function () {
    // Global variablesfor the context of the tests
    let removalDuration: number;
    let timestamp: number;
    let timestampOfNextTx: number;

    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      removalDuration = await sandboxController.removalCollateralDuration();
      timestamp = await time.latest();
      timestampOfNextTx = timestamp + 60; // Add 1 minute to the current timestamp
    });

    it("should initiate the process of collateral asset removal", async () => {
      expect(await comet.removalInProgress()).to.be.false;
      // Index of the collateral asset to be removed
      const assetIndex = 0;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      const startTime = timestampOfNextTx;
      const endTime = timestampOfNextTx + removalDuration;
      await time.setNextBlockTimestamp(timestampOfNextTx);

      const tx = await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);

      await expect(tx).to.emit(comet, "CollateralRemovalInitiated").withArgs(assetIndex, removalCollateralToken, startTime, endTime);

      expect(await comet.removalInProgress()).to.be.true;
    });

    it("should not change the number of assets when initiating collateral removal", async () => {
      expect(await comet.removalInProgress()).to.be.false;
      const numAssetsBefore = await comet.numAssets();

      // Index of the collateral asset to be removed
      const assetIndex = 0;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);
      expect(await comet.removalInProgress()).to.be.true;

      expect(await comet.numAssets()).to.equal(numAssetsBefore);
    });

    it("should set the supply cap to 0 for the collateral asset after initiating removal", async () => {
      // Index of the collateral asset to be removed
      const assetIndex = 1;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);
      expect(await comet.removalInProgress()).to.be.true;

      const assetInfo = await comet.collateralAssets(assetIndex);
      expect(assetInfo.supplyCap).to.equal(ethers.constants.Zero);
    });

    it("should not allow re-initiating collateral removal", async () => {
      const removalDuration = await sandboxController.removalCollateralDuration();

      const startTime = timestampOfNextTx;
      const endTime = timestampOfNextTx + removalDuration;

      // Index of the collateral asset to be removed
      const assetIndex = 0;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      await time.setNextBlockTimestamp(timestampOfNextTx);
      // Initiate the collateral removal
      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);
      // Try to re-initiate the collateral removal.
      // Expect the custom error to be reverted
      await expect(configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken))
        .to.be.revertedWithCustomError(comet, "CollateralRemovalInProgress")
        .withArgs(removalCollateralToken, startTime, endTime);
    });

    it("should not allow initiating collateral removal if called by non-controller", async () => {
      const assetIndex = 0; // Index of the collateral asset to be removed
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;
      // Expect the custom error to be reverted
      await expect(comet.connect(randomCaller).initiateCollateralRemoval(removalCollateralToken)).to.be.revertedWithCustomError(
        comet,
        "Unauthorized"
      );
    });

    it("should not allow supplying collateral after removal is initiated", async () => {
      // Index of the collateral asset to be removed
      const assetIndex = 1;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      const contractToken = FaucetToken__factory.connect(removalCollateralToken, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, exp(1000, 18));
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit collateral into the comet contract
      const supplyAmount = await contractToken.balanceOf(firstUser.address);

      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken);
      expect(await comet.removalInProgress()).to.be.true;
      // Expect the custom error to be reverted
      await expect(comet.connect(firstUser).supply(removalCollateralToken, supplyAmount)).to.be.revertedWithCustomError(
        comet,
        "SupplyCapExceeded"
      );
    });
  });

  context("The process of removing collateral assets:", function () {
    // Global variables for the context of the tests
    let halfOfRemovalDuration: number;
    let removalCollateralTokenAddress: string;
    let timestamp: number;
    let timestampOfNextTx: number;
    let baseTokenAddress: string;
    let supplyAmount: BigNumber;
    let assetIndex: number;
    let targetBorrowCollateralFactor: BigNumber;
    let targetLiquidateCollateralFactor: BigNumber;

    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      halfOfRemovalDuration = (await sandboxController.removalCollateralDuration()) / 2;
      targetBorrowCollateralFactor = await comet.targetBorrowCollateralFactor();
      targetLiquidateCollateralFactor = await comet.targetLiquidateCollateralFactor();

      timestamp = await time.latest();
      timestampOfNextTx = timestamp + 60; // Add 1 minute to the current timestamp

      // Index of the collateral asset to be removed
      assetIndex = 0;
      removalCollateralTokenAddress = collateralTokens[assetIndex].collateralToken;

      await time.setNextBlockTimestamp(timestampOfNextTx);
      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralTokenAddress);
      expect(await comet.removalInProgress()).to.be.true;
      // Get the base token address from the comet contract
      baseTokenAddress = await comet.baseToken();
      const contractToken = FaucetToken__factory.connect(baseTokenAddress, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, exp(1000, 18));
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit collateral into the comet contract
      supplyAmount = await contractToken.balanceOf(firstUser.address);
    });

    it("should be update the borrow collateral factor for the removed asset in the asset list", async () => {
      const assetInfoBefore = await comet.collateralAssets(assetIndex);
      // Move time forward to the half of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + halfOfRemovalDuration);
      // Supply the base token to update the borrow collateral factor
      const tx = await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Expect the event to be not emitted
      await expect(tx).to.not.emit(comet, "CollateralRemovalFinalized");
      const assetInfoAfter = await comet.collateralAssets(assetIndex);
      expect(assetInfoAfter.borrowCollateralFactor).to.be.below(assetInfoBefore.borrowCollateralFactor);
      expect(assetInfoAfter.borrowCollateralFactor).to.be.above(targetBorrowCollateralFactor);
    });

    it("should be update the liquidate collateral factor for the removed asset in the asset list", async () => {
      const assetInfoBefore = await comet.collateralAssets(assetIndex);
      // Move time forward to the half of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + halfOfRemovalDuration);
      // Supply the base token to update the liquidate collateral factor
      const tx = await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Expect the event to be not emitted
      await expect(tx).to.not.emit(comet, "CollateralRemovalFinalized");
      const assetInfoAfter = await comet.collateralAssets(assetIndex);
      expect(assetInfoAfter.liquidateCollateralFactor).to.be.below(assetInfoBefore.liquidateCollateralFactor);
      expect(assetInfoAfter.liquidateCollateralFactor).to.be.above(targetLiquidateCollateralFactor);
    });

    it("should not allow initiating collateral removal if already in progress", async () => {
      const removalDuration = await sandboxController.removalCollateralDuration();

      const startTime = timestampOfNextTx;
      const endTime = timestampOfNextTx + removalDuration;

      // Index of the collateral asset to be removed
      const assetIndex = 0;
      const removalCollateralToken = collateralTokens[assetIndex].collateralToken;

      // Try to initiate the new collateral removal process
      // Expect the custom error to be reverted
      await expect(configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralToken))
        .to.be.revertedWithCustomError(comet, "CollateralRemovalInProgress")
        .withArgs(removalCollateralToken, startTime, endTime);
    });
  });

  context("Finalization of collateral asset removal:", function () {
    // Global variables for the context of the tests
    let removalDuration: number;
    let removalCollateralTokenAddress: string;
    let timestamp: number;
    let timestampOfNextTx: number;
    let baseTokenAddress: string;
    let supplyAmount: bigint;
    let targetBorrowCollateralFactor: BigNumber;
    let targetLiquidateCollateralFactor: BigNumber;

    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      removalDuration = await sandboxController.removalCollateralDuration();
      targetBorrowCollateralFactor = await comet.targetBorrowCollateralFactor();
      targetLiquidateCollateralFactor = await comet.targetLiquidateCollateralFactor();

      timestamp = await time.latest();
      timestampOfNextTx = timestamp + 60; // Add 1 minute to the current timestamp

      supplyAmount = exp(1000, 18);
      // Index of the collateral asset to be removed
      const assetIndex = 0;
      removalCollateralTokenAddress = collateralTokens[assetIndex].collateralToken;

      let contractToken = FaucetToken__factory.connect(removalCollateralTokenAddress, provider);
      // Create a balance for the second user for the collateral token
      await contractToken.connect(secondUser).allocateTo(secondUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(secondUser).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit collateral into the comet contract
      await comet.connect(secondUser).supply(removalCollateralTokenAddress, supplyAmount);

      await time.setNextBlockTimestamp(timestampOfNextTx);
      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralTokenAddress);
      expect(await comet.removalInProgress()).to.be.true;
      // Get the base token address from the comet contract
      baseTokenAddress = await comet.baseToken();
      contractToken = FaucetToken__factory.connect(baseTokenAddress, provider);
      // Create a balance for the first user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, supplyAmount);
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
    });

    it("should finalize collateral removal after the removal period", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      const tx = await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Get the index of the removed asset
      const removedAssetIndex = (await comet.numRemovedAssets()) - 1;
      // Expect the event to be emitted
      await expect(tx).to.emit(comet, "CollateralRemovalFinalized").withArgs(removedAssetIndex, removalCollateralTokenAddress);
      // Check the user's balance after supplying the collateral
      const tolerance = 5;
      expect((await comet.balanceOf(firstUser.address)).sub(supplyAmount).abs().lte(tolerance)).to.be.true;
    });

    it("should remove the collateral asset from the asset list after finalization", async () => {
      const numAssetsBefore = await comet.numAssets();
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      const tx = await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Get the index of the removed asset
      const removedAssetIndex = (await comet.numRemovedAssets()) - 1;
      // Expect the event to be emitted
      await expect(tx).to.emit(comet, "CollateralRemovalFinalized").withArgs(removedAssetIndex, removalCollateralTokenAddress);
      // Check the user's balance after supplying the collateral
      const tolerance = 5;
      expect((await comet.balanceOf(firstUser.address)).sub(supplyAmount).abs().lte(tolerance)).to.be.true;
      // Check that the number of assets has decreased by 1
      expect(await comet.numAssets()).to.equal(numAssetsBefore - 1);
    });

    it("should be set the removed asset to the removed assets list after finalization", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      const tx = await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Expect the event to be emitted
      await expect(tx).to.emit(comet, "CollateralRemovalFinalized").withArgs(0, removalCollateralTokenAddress);
      // Get the index of the removed asset
      const removedAssetIndex = (await comet.numRemovedAssets()) - 1;
      // Check that the removed asset is in the removed assets list
      expect((await comet.removedCollateralAssets(removedAssetIndex)).collateralToken).to.equal(removalCollateralTokenAddress);
    });

    it("should be set the removalInProgress to false after finalization", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Check that the removal is not in progress anymore
      expect(await comet.removalInProgress()).to.be.false;
    });

    it("should be set the borrow collateral factor to 0% for the removed asset after finalization", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Check that the borrow collateral factor is 0 for the removed asset
      const removedAssetIndex = (await comet.numRemovedAssets()) - 1;
      const removedAssetInfo = await comet.removedCollateralAssets(removedAssetIndex);
      expect(removedAssetInfo.borrowCollateralFactor).to.equal(targetBorrowCollateralFactor);
    });

    it("should be set the liquidate collateral factor to 0% for the removed asset after finalization", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration);
      // Supply the base token to finalize the removal
      await comet.connect(firstUser).supply(baseTokenAddress, supplyAmount);
      // Check that the liquidate collateral factor is 0% for the removed asset
      const removedAssetIndex = (await comet.numRemovedAssets()) - 1;
      const removedAssetInfo = await comet.removedCollateralAssets(removedAssetIndex);
      expect(removedAssetInfo.liquidateCollateralFactor).to.equal(targetLiquidateCollateralFactor);
    });

    it("should allow to withdraw the removed collateral asset after finalization", async () => {
      // Move time forward to the end of the removal period
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration + 60); // Add 1 minute to the current timestamp
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the user's balance before withdrawing the collateral
      expect(await comet.userCollateral(secondUser.address, removalCollateralTokenAddress)).to.equal(supplyAmount);
      // Withdraw the removed collateral asset
      const tx = await comet.connect(secondUser).withdraw(removalCollateralTokenAddress, supplyAmount);
      // Expect the event to be emitted
      await expect(tx)
        .to.emit(comet, "WithdrawCollateral")
        .withArgs(secondUser.address, secondUser.address, removalCollateralTokenAddress, supplyAmount);
      // Check the user's balance after withdrawing the collateral
      expect(await comet.userCollateral(secondUser.address, removalCollateralTokenAddress)).to.equal(ethers.constants.Zero);
    });
  });

  context("Impact of collateral removal on user positions:", function () {
    // Global variables for the context of the tests
    let removalDuration: number;
    let removalCollateralTokenAddress: string;
    let timestamp: number;
    let timestampOfNextTx: number;
    let baseTokenAddress: string;
    let supplyAmount: BigNumber;

    beforeEach(async function () {
      // Create and fund the comet before each test
      await createAndFundComet();
      removalDuration = await sandboxController.removalCollateralDuration();

      // Index of the collateral asset to be removed
      const assetIndex = 0;
      removalCollateralTokenAddress = collateralTokens[assetIndex].collateralToken;

      // Get the base token address from the comet contract
      baseTokenAddress = await comet.baseToken();
      const contractToken = FaucetToken__factory.connect(removalCollateralTokenAddress, provider);
      // Create a balance for the user for the collateral token
      await contractToken.connect(firstUser).allocateTo(firstUser.address, exp(2000, 18));
      // Approve the comet contract to spend the user's collateral token
      await contractToken.connect(firstUser).approve(comet.address, ethers.constants.MaxUint256);
      // Deposit collateral into the comet contract
      supplyAmount = await contractToken.balanceOf(firstUser.address);
      // Set the borrow amount to half of the supply amount

      await comet.connect(firstUser).supply(removalCollateralTokenAddress, supplyAmount);

      timestamp = await time.latest();
      timestampOfNextTx = timestamp + 60; // Add 1 minute to the current timestamp
    });

    it("should gradually reduce the liquidate collateral factor for a user with active debt during removal", async () => {
      const borrowAmount = supplyAmount.mul(15).div(100); // 15% of the supply amount
      // Open a borrow position
      await comet.connect(firstUser).withdraw(baseTokenAddress, borrowAmount);

      await time.setNextBlockTimestamp(timestampOfNextTx);
      // Initiate the collateral removal
      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralTokenAddress);
      expect(await comet.removalInProgress()).to.be.true;
      // Check the user's collateral balance and borrow balance
      expect(await comet.userCollateral(firstUser.address, removalCollateralTokenAddress)).to.equal(supplyAmount);
      const tolerance = borrowAmount.div(1000); // 0.1% tolerance
      expect((await comet.borrowBalanceOf(firstUser.address)).sub(borrowAmount).abs().lte(tolerance)).to.be.true;

      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after initiating the removal collateral
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 30% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.3);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 45% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.45);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 60% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.6);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 75% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.75);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.false;

      // Move time forward to the 90% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.9);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Check the liquidation status after half of the removal duration
      expect(await comet.isLiquidatable(firstUser.address)).to.be.true;
    });

    it("should reduce user's borrow limit over time during collateral removal", async () => {
      await time.setNextBlockTimestamp(timestampOfNextTx);
      // Initiate the collateral removal
      await configController.initiateCollateralRemovalOnComet(comet.address, removalCollateralTokenAddress);
      // Check the user's collateral balance and borrow balance
      expect(await comet.userCollateral(firstUser.address, removalCollateralTokenAddress)).to.equal(supplyAmount);
      // Try to open a borrow position
      const borrowAmount = exp(150, 18);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.not.reverted;

      // Move time forward to the 10% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.1);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.not.reverted;

      // Move time forward to the 20% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.2);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.not.reverted;

      // Move time forward to the 50% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.5);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.not.reverted;

      // Move time forward to the 80% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.8);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.not.reverted;

      // Move time forward to the 90% of the removal duration
      await time.setNextBlockTimestamp(timestampOfNextTx + removalDuration * 0.9);
      // Update accrue interest and rewards for an account
      await comet.connect(firstUser).accrueAccount(firstUser.address);
      // Try to open a borrow position
      // Expect the custom error to be reverted
      await expect(comet.connect(firstUser).callStatic.withdraw(baseTokenAddress, borrowAmount)).to.be.revertedWithCustomError(
        comet,
        "NotCollateralized"
      );
    });
  });
});
