import {
  ethers,
  exp,
  expect,
  defaultSandboxControllerOpts,
  makeSandboxController,
  makeMockERC20,
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
  FaucetToken,
  FaucetToken__factory,
  SimplePriceFeed,
} from "../build/types";

const { Zero } = ethers.constants;
import { time, takeSnapshot, SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";

enum DeprecationStatus {
  NotStarted,
  InProgress,
  Finalized,
}

describe("28. withdraw reserves", function () {
  // Global variables for the all tests
  let configControllerImpl: ConfigControllerTest;
  let sandboxCometImpl: SandboxComet;

  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let dao: SignerWithAddress;
  let treasury: SignerWithAddress;
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

  let globalComet: CombinedComet;
  let snapshot: SnapshotRestorer;

  let priceFeedBase: SimplePriceFeed;

  const provider = ethers.provider;

  const _minUpdateTime = time.duration.days(7);

  const amountOfSeedReserves = exp(5000, 18).toString(); // 5000 tokens with 18 decimals

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: time.duration.days(7),
    _proposalDuration: time.duration.days(7),
  };

  before(async function () {
    [owner, curator, dao, treasury, guardian, firstUser, secondUser, randomCaller] = await ethers.getSigners();

    const configControllerFactory_factory = new ConfigControllerFactory__factory(owner);
    const configController_factory = new ConfigControllerTest__factory(owner);
    const comet_factory = new SandboxComet__factory(owner);
    const sandboxCometFactory_factory = new SandboxCometFactory__factory(owner);

    configControllerImpl = (await configController_factory.deploy()) as ConfigControllerTest;
    sandboxCometImpl = (await comet_factory.deploy()) as SandboxComet;

    /// Options of the sandbox controller
    const opts = defaultSandboxControllerOpts({ admin: owner.address, dao: dao.address, treasury: treasury.address, feeEnabled: true });

    sandboxController = await makeSandboxController(opts);

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

    baseToken = await makeMockERC20({
      name: "Base",
      symbol: "WETH",
      supply: ethers.utils.parseEther("50000").toString(),
    });

    priceFeedBase = await makePriceFeed(baseToken.address, ethers.utils.parseUnits("3200", 8).toString());
    await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);

    const tokenSymbolList = ["USDT", "DAI", "USDC"];

    for (const symbol of tokenSymbolList) {
      const collateralToken: FaucetToken = await makeMockERC20({ name: `Collateral ${symbol}`, symbol: symbol });
      const priceFeedCol: SimplePriceFeed = await makePriceFeed(collateralToken.address, ethers.utils.parseUnits("1600", 8).toString());

      await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

      collateralTokens.push({
        collateralToken: collateralToken.address,
        borrowCollateralFactor: exp(0.6, 18),
        liquidateCollateralFactor: exp(0.75, 18),
        liquidationFactor: exp(0.85, 18),
        supplyCap: exp(1e9, 18),
      });
    }
    // Create a new comet instance with the current market configuration
    globalComet = await createComet(collateralTokens);

    // Take snapshot after initial setup
    snapshot = await takeSnapshot();
  });

  async function createComet(collateralTokenConfig?: CollateralTokenConfigStruct[]): Promise<CombinedComet> {
    // Set the market configuration with all collateral tokens
    marketConfig = {
      baseToken: baseToken.address,
      collateralTokens: collateralTokenConfig ? collateralTokenConfig : collateralTokens.map(obj => ({ ...obj })),
      baseTokenCurveId: 0n,
      name: "Comet",
      amountOfSeedReserves: amountOfSeedReserves,
    };
    // Create a new comet instance with the current market configuration
    await baseToken.connect(owner).approve(configController.address, amountOfSeedReserves);
    const cometAddress = await configController.callStatic.createComet(marketConfig);
    await configController.createComet(marketConfig);
    // Connect to the combined comet instance: SandboxComet and CometExtension
    return getCombinedComet(cometAddress, provider);
  }

  async function supplyCollateralTo(cometContract: CombinedComet, user: SignerWithAddress, assetIndex: number, amount: bigint) {
    const collateralToken: string = collateralTokens[assetIndex].collateralToken;

    const contractToken: FaucetToken = FaucetToken__factory.connect(collateralToken, provider);
    // Create a balance for the user for the collateral token
    await contractToken.connect(user).allocateTo(user.address, amount);
    // Approve the comet contract to spend the user's collateral token
    await contractToken.connect(user).approve(cometContract.address, amount);
    // Deposit collateral into the comet contract
    await cometContract.connect(user).supply(collateralToken, amount);
  }

  async function supplyBaseTokenTo(cometContract: CombinedComet, user: SignerWithAddress, amount: bigint) {
    // Create a balance for the user for the base token
    await baseToken.connect(user).allocateTo(user.address, amount);
    // Approve the comet contract to spend the user's base token
    await baseToken.connect(user).approve(cometContract.address, amount);
    // Deposit base token into the comet contract
    await cometContract.connect(user).supply(baseToken.address, amount);
  }

  async function borrowBaseTokenTo(cometContract: CombinedComet, user: SignerWithAddress, amount: bigint) {
    // Borrow base token from the comet contract
    await cometContract.connect(user).withdraw(baseToken.address, amount);
  }

  describe("When the market is not deprecated", function () {
    beforeEach(async function () {
      // Restore the snapshot before each test
      await snapshot.restore();
    });

    context("Withdrawing free seed reserves", function () {
      it("should not allow withdrawing free seed reserves", async () => {
        const currentSeedReserves = await globalComet.seedReserves();
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(globalComet.address, currentSeedReserves)).to.be.revertedWithCustomError(
          globalComet,
          "UnlockNotReached"
        );
      });
    });

    context("Withdrawing surplus seed reserves", function () {
      it("should not allow withdrawing surplus seed reserves", async () => {
        // Try to withdraw surplus seed reserves
        await expect(globalComet.connect(dao).withdrawSurplusSeedReserves())
          .to.be.revertedWithCustomError(globalComet, "InvalidDeprecationState")
          .withArgs(DeprecationStatus.NotStarted);
      });
    });

    context("Withdrawing surplus collateral reserves", function () {
      it("should not allow withdrawing surplus collateral reserves", async () => {
        const collateralAddresses = collateralTokens.map(tokenConfig => tokenConfig.collateralToken);
        // Try to withdraw surplus collateral reserves
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(collateralAddresses))
          .to.be.revertedWithCustomError(globalComet, "InvalidDeprecationState")
          .withArgs(DeprecationStatus.NotStarted);
      });
    });
  });

  describe("When the market is deprecating", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;

    beforeEach(async function () {
      // Restore the snapshot before each test
      await snapshot.restore();
      // Supply some collateral to the comet: firstUser
      await supplyCollateralTo(globalComet, firstUser, assetIndex, supplyCollateralAmount);
      // Supply some base token to the comet: firstUser
      await supplyBaseTokenTo(globalComet, firstUser, supplyBaseTokenAmount);
      // Supply some collateral to the comet: secondUser
      await supplyCollateralTo(globalComet, secondUser, assetIndex, supplyCollateralAmount);
      // Borrow base token from the comet: secondUser
      await borrowBaseTokenTo(globalComet, secondUser, borrowBaseTokenAmount);
      // Set time for the deprecation start
      deprecationStartTimestamp = (await time.latest()) + time.duration.minutes(1);
      await time.setNextBlockTimestamp(deprecationStartTimestamp);
      // Close the market
      await configController.initiateDeprecationMarket(globalComet.address);
      // Initiating transactions to promote the progress of depreciation
      await globalComet.connect(firstUser).accrueAccount(firstUser.address);
    });

    context("Withdrawing free seed reserves", function () {
      it("should not allow withdrawing free seed reserves", async () => {
        const currentSeedReserves = await globalComet.seedReserves();
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(globalComet.address, currentSeedReserves)).to.be.revertedWithCustomError(
          globalComet,
          "UnlockNotReached"
        );
      });
    });

    context("Withdrawing surplus seed reserves", function () {
      it("should not allow withdrawing surplus seed reserves", async () => {
        // Try to withdraw surplus seed reserves
        await expect(globalComet.connect(dao).withdrawSurplusSeedReserves())
          .to.be.revertedWithCustomError(globalComet, "InvalidDeprecationState")
          .withArgs(DeprecationStatus.InProgress);
      });
    });

    context("Withdrawing surplus collateral reserves", function () {
      it("should not allow withdrawing surplus collateral reserves", async () => {
        const collateralAddresses = collateralTokens.map(tokenConfig => tokenConfig.collateralToken);
        // Try to withdraw surplus collateral reserves
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(collateralAddresses))
          .to.be.revertedWithCustomError(globalComet, "InvalidDeprecationState")
          .withArgs(DeprecationStatus.InProgress);
      });
    });
  });

  describe("When the market is deprecated", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;
    let deprecationEndTimestamp: number;

    beforeEach(async function () {
      // Restore the snapshot before each test
      await snapshot.restore();

      // Supply some collateral to the comet: firstUser
      await supplyCollateralTo(globalComet, firstUser, assetIndex, supplyCollateralAmount);
      // Supply some base token to the comet: firstUser
      await supplyBaseTokenTo(globalComet, firstUser, supplyBaseTokenAmount);
      // Supply some collateral to the comet: secondUser
      await supplyCollateralTo(globalComet, secondUser, assetIndex, supplyCollateralAmount);
      // Borrow base token from the comet: secondUser
      await borrowBaseTokenTo(globalComet, secondUser, borrowBaseTokenAmount);
      // Set time for the deprecation start
      deprecationStartTimestamp = (await time.latest()) + time.duration.minutes(1);
      await time.setNextBlockTimestamp(deprecationStartTimestamp);
      // Close the market
      await configController.initiateDeprecationMarket(globalComet.address);
      // Set time for the deprecation end
      deprecationEndTimestamp = deprecationStartTimestamp + (await globalComet.deprecationDuration()).toNumber();
      await time.increaseTo(deprecationEndTimestamp);
      // Transaction for finalizing deprecation
      await globalComet.connect(firstUser).accrueAccount(firstUser.address);
      // Liquidate secondUser's collateral
      await globalComet.connect(firstUser).absorb(firstUser.address, [secondUser.address]);
      // Withdraw all base token from the comet: firstUser
      await globalComet.connect(firstUser).withdrawAllFrom(firstUser.address, firstUser.address);
    });

    context("Withdrawing free seed reserves", function () {
      it("should not allow withdrawing free seed reserves if not enough reserves", async () => {
        const currentReserves = await globalComet.getReserves();
        const currentSeedReserves = await globalComet.seedReserves();
        // Check that current reserves are less than seed reserves
        expect(currentReserves).to.be.below(currentSeedReserves);
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(globalComet.address, currentSeedReserves)).to.be.revertedWithCustomError(
          globalComet,
          "InsufficientFreeReserves"
        );
      });

      it("should allow withdrawing half amount of free seed reserves", async () => {
        // Fund the comet with seed reserves for imitating the accumulation of seed reserves
        await baseToken.connect(owner).allocateTo(globalComet.address, amountOfSeedReserves);
        const currentReserves = await globalComet.getReserves();
        const halfCurrentSeedReserves = (await globalComet.seedReserves()).div(2);
        // Check that current reserves are above seed reserves
        expect(currentReserves).to.be.above(halfCurrentSeedReserves);
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(globalComet.address, halfCurrentSeedReserves))
          .to.emit(globalComet, "FreeSeedReservesWithdrawn")
          .withArgs(configController.address, halfCurrentSeedReserves);

        expect(await globalComet.seedReserves()).to.equal(halfCurrentSeedReserves);
      });

      it("should allow withdrawing all amount of free seed reserves", async () => {
        // Fund the comet with seed reserves for imitating the accumulation of seed reserves
        await baseToken.connect(owner).allocateTo(globalComet.address, amountOfSeedReserves);
        const currentReserves = await globalComet.getReserves();
        const allCurrentSeedReserves = await globalComet.seedReserves();
        // Check that current reserves are above seed reserves
        expect(currentReserves).to.be.above(allCurrentSeedReserves);
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(globalComet.address, allCurrentSeedReserves))
          .to.emit(globalComet, "FreeSeedReservesWithdrawn")
          .withArgs(configController.address, allCurrentSeedReserves);

        expect(await globalComet.seedReserves()).to.equal(Zero);
      });
    });

    context("Withdrawing surplus seed reserves", function () {
      it("should allow withdrawing surplus seed reserves", async () => {
        // Fund the comet with seed reserves for imitating the accumulation of seed reserves
        await baseToken.connect(owner).allocateTo(globalComet.address, amountOfSeedReserves);

        const currentReserves = await globalComet.getReserves();
        const currentSeedReserves = await globalComet.seedReserves();
        const expectedSurplusSeedReserves = currentReserves.sub(currentSeedReserves);

        const treasury = await sandboxController.treasury();
        // Try to withdraw surplus seed reserves
        await expect(globalComet.connect(dao).withdrawSurplusSeedReserves())
          .to.emit(globalComet, "SurplusSeedReservesWithdrawn")
          .withArgs(treasury, expectedSurplusSeedReserves);
      });
    });

    context("Withdrawing surplus collateral reserves", function () {
      it("should allow withdrawing surplus collateral reserves", async () => {
        const collateralAddresses = collateralTokens.map(tokenConfig => tokenConfig.collateralToken);
        expect(await globalComet.getCollateralReserves(collateralAddresses[assetIndex])).to.be.above(Zero);
        // Try to withdraw surplus collateral reserves
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(collateralAddresses)).to.emit(
          globalComet,
          "SurplusCollateralReservesWithdrawn"
        );
        expect(await globalComet.getCollateralReserves(collateralAddresses[assetIndex])).to.equal(Zero);
      });
    });
  });

  describe("Edge Cases", function () {
    // Temporarily disabled this test on GitHub Actions.
    // Fails with "The operation was canceled" — likely due to timeouts or flaky behavior under CI load.
    // Works locally. Needs stabilization before re-enabling.
    context.skip("Overflow:", function () {
      // Global variables for the context of the tests
      let thisComet: CombinedComet;
      let thisSnapshot: SnapshotRestorer;

      let deprecationStartTimestamp: number;
      let deprecationEndTimestamp: number;
      const assetAddresses: string[] = [];

      before(async function () {
        // It is constant value in comet contract
        const maxAssets = 24;
        const collateralTokensConfig: CollateralTokenConfigStruct[] = [];
        // Create collateral tokens and price feeds
        for (let i = 0; i < maxAssets; i++) {
          const collateralToken: FaucetToken = await makeMockERC20({ name: `Collateral ${i}`, symbol: `TOKEN_${i}` });
          const priceFeedCol: SimplePriceFeed = await makePriceFeed(collateralToken.address, "2");

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

        // Create and fund the comet with maximum assets
        thisComet = await createComet(collateralTokensConfig);
        // Check that the comet has the maximum number of assets
        expect(await thisComet.numAssets()).to.equal(maxAssets);

        // Initiate deprecation of the market
        await configController.initiateDeprecationMarket(thisComet.address);
        // Check that the market is deprecating
        expect(await thisComet.deprecationStatus()).to.equal(DeprecationStatus.InProgress);
        // Set time for the deprecation start
        deprecationStartTimestamp = (await time.latest()) + time.duration.minutes(1);
        await time.setNextBlockTimestamp(deprecationStartTimestamp);
        // Get time for the deprecation end
        deprecationEndTimestamp = deprecationStartTimestamp + (await thisComet.deprecationDuration()).toNumber();
        // Take snapshot before the tests
        thisSnapshot = await takeSnapshot();
      });

      beforeEach(async function () {
        // Restore the snapshot before each test
        await thisSnapshot.restore();
      });

      it("should handle overflow during withdrawal surplus collateral reserves with maximum number of assets", async function () {
        // Arrange: Create a market with the maximum number of assets and deprecate it
        // Act: Allocate all assets to the comet contract and initiate withdrawal of surplus collateral reserves
        // Assert: Check that not overflow happens

        // Allocate all tokens to the comet contract
        const allocateAmount = exp(1000, 18);
        for (let i = 0; i < assetAddresses.length; i++) {
          const assetAddress: string = assetAddresses[i];
          const contractToken: FaucetToken = FaucetToken__factory.connect(assetAddress, owner);
          await contractToken.allocateTo(thisComet.address, allocateAmount);
          // Check that the comet contract has the allocated tokens
          expect(await thisComet.getCollateralReserves(assetAddress)).to.equal(allocateAmount);
        }

        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await thisComet.connect(firstUser).accrueAccount(firstUser.address);
        // Check that the market is deprecated
        expect(await thisComet.deprecationStatus()).to.equal(DeprecationStatus.Finalized);
        // Get the treasury address from the sandbox controller
        const recipient = await sandboxController.treasury();

        // Call the withdrawSurplusSeedReserves function to withdraw surplus collateral reserves
        const tx = await thisComet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses);
        await tx.wait();
        // Expect no overflow to happen
        await expect(tx).to.be.not.reverted;
        // Expect the event to be emitted
        await expect(tx).to.emit(thisComet, "SurplusCollateralReservesWithdrawn");
        // Check transfer of surplus collateral reserves
        for (let i = 0; i < assetAddresses.length; i++) {
          const assetAddress: string = assetAddresses[i];
          const contractToken: FaucetToken = FaucetToken__factory.connect(assetAddress, owner);
          await expect(tx).to.changeTokenBalance(contractToken, recipient, allocateAmount);
        }
      });
    });

    context("Access control:", function () {
      beforeEach(async function () {
        // Restore the snapshot before each test
        await snapshot.restore();
      });

      it("should not allow withdrawing free seed reserves if called by non-controller", async () => {
        const currentSeedReserves = await globalComet.seedReserves();
        // Try to withdraw free seed reserves
        // Expect the custom error to be reverted
        await expect(
          configController.connect(randomCaller).withdrawFreeSeedReservesFrom(globalComet.address, currentSeedReserves)
        ).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("should not allow withdrawing surplus seed reserves if called by non-dao", async () => {
        // Try to withdraw surplus seed reserves
        // Expect the custom error to be reverted
        await expect(globalComet.connect(randomCaller).withdrawSurplusSeedReserves()).to.be.revertedWithCustomError(
          globalComet,
          "Unauthorized"
        );
      });

      it("should not allow withdrawing surplus collateral reserves if called by non-dao", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Try to withdraw surplus collateral reserves
        // Expect the custom error to be reverted
        await expect(globalComet.connect(randomCaller).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          globalComet,
          "Unauthorized"
        );
      });
    });

    context("Withdrawal surplus collateral reserves:", function () {
      // Global variables for the context of the tests
      const supplyBaseTokenAmount: bigint = exp(500, 18);
      const supplyCollateralAmount: bigint = exp(1000, 18);
      const borrowBaseTokenAmount: bigint = exp(400, 18);
      const assetIndexes = [1, 2];
      let deprecationStartTimestamp: number;
      let deprecationEndTimestamp: number;

      beforeEach(async function () {
        // Restore the snapshot before each test
        await snapshot.restore();
        // Supply some collateral to the comet: firstUser
        await supplyCollateralTo(globalComet, firstUser, assetIndexes[0], supplyCollateralAmount / 2n);
        await time.setNextBlockTimestamp((await time.latest()) + time.duration.years(1)); // 1 year in the future
        await supplyCollateralTo(globalComet, firstUser, assetIndexes[1], supplyCollateralAmount);
        // Borrow base token from the comet: firstUser
        await borrowBaseTokenTo(globalComet, firstUser, borrowBaseTokenAmount);
        // Supply some base token to the comet: secondUser
        await supplyBaseTokenTo(globalComet, secondUser, supplyBaseTokenAmount);
        // Set time for the deprecation start
        deprecationStartTimestamp = (await time.latest()) + time.duration.minutes(1);
        await time.setNextBlockTimestamp(deprecationStartTimestamp);
        // Close the market
        await configController.initiateDeprecationMarket(globalComet.address);
        // Get time for the deprecation end
        deprecationEndTimestamp = deprecationStartTimestamp + (await globalComet.deprecationDuration()).toNumber();
      });

      it("should not allow withdrawing surplus seed reserves if market has active lenders", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await globalComet.connect(firstUser).accrueAccount(firstUser.address);
        // Check that the market is deprecated
        expect(await globalComet.deprecationStatus()).to.equal(DeprecationStatus.Finalized);
        // Try to withdraw surplus seed reserves
        // Expect the custom error to be reverted
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          globalComet,
          "ActiveSupplyBaseExists"
        );
      });

      it("should not allow withdrawing surplus collateral reserves if excessive number of assets", async () => {
        // 25 assets, exceeding the limit
        const assetAddresses = new Array(25).fill(collateralTokens[0].collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await globalComet.connect(secondUser).accrueAccount(secondUser.address);
        await time.increaseTo(deprecationEndTimestamp + time.duration.minutes(1)); // 1 minute after deprecation end
        // Withdraw base token from the comet contract
        await globalComet.connect(secondUser).withdrawAllFrom(secondUser.address, secondUser.address);
        // Check that the market is deprecated
        expect(await globalComet.deprecationStatus()).to.equal(DeprecationStatus.Finalized);
        // Try to withdraw surplus collateral reserves with excessive number of assets
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          globalComet,
          "TooManyAssets"
        );
      });

      it("should not allow withdrawing surplus collateral reserves if asset is zero address", async () => {
        const assetAddresses = [ethers.constants.AddressZero];
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await globalComet.connect(secondUser).accrueAccount(secondUser.address);
        await time.increaseTo(deprecationEndTimestamp + time.duration.minutes(1)); // 1 minute after deprecation end
        // Withdraw base token from the comet contract
        await globalComet.connect(secondUser).withdrawAllFrom(secondUser.address, secondUser.address);
        // Check that the market is deprecated
        expect(await globalComet.deprecationStatus()).to.equal(DeprecationStatus.Finalized);
        // Try to withdraw surplus collateral reserves with zero address asset
        await expect(globalComet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          globalComet,
          "ZeroAddress"
        );
      });

      it("should not revert if some assets have zero reserves", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await globalComet.connect(secondUser).accrueAccount(secondUser.address);
        await time.increaseTo(deprecationEndTimestamp + time.duration.minutes(1));
        // Withdraw base token from the comet contract
        await globalComet.connect(secondUser).withdrawAllFrom(secondUser.address, secondUser.address);
        // Check that the market is deprecated
        expect(await globalComet.deprecationStatus()).to.equal(2); // DeprecationStatus.Finalized
        // Liquidate the first user after deprecation market and accumulated collateral reserves
        await globalComet.connect(secondUser).absorb(secondUser.address, [firstUser.address]);

        // Check that the market collateral reserves
        // Expect the all collateral reserves to be zero after liquidation but not asset by index '1' and '2'
        for (let i = 0; i < assetAddresses.length; i++) {
          const reserves = await globalComet.getCollateralReserves(assetAddresses[i]);
          if (i === assetIndexes[0] || i === assetIndexes[1]) {
            expect(reserves).to.be.gt(0);
          } else {
            expect(reserves).to.equal(0);
          }
        }
        // Withdraw surplus collateral reserves with some assets having zero reserves
        // Expect success tx and the event to be emitted
        await expect(await globalComet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.emit(
          globalComet,
          "SurplusCollateralReservesWithdrawn"
        );
      });
    });
  });
});
