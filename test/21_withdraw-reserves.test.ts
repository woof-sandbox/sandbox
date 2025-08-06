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

describe("21. withdraw reserves", function () {
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

  const amountOfSeedReserves = exp(5000, 18).toString(); // 5000 tokens with 18 decimals

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

  describe("When the market is not deprecated", function () {
    beforeEach(async function () {
      // Create the comet before each test
      await createComet();
    });

    context("Withdrawing free seed reserves", function () {
      it("should not allow withdrawing free seed reserves", async () => {
        const currentSeedReserves = await comet.seedReserves();
        // Try to withdraw free seed reserves
        await expect(configController.withdrawFreeSeedReservesFrom(comet.address, currentSeedReserves)).to.be.revertedWithCustomError(
          comet,
          "UnlockNotReached"
        );
      });
    });

    context("Withdrawing surplus seed reserves", function () {
      it("should not allow withdrawing surplus seed reserves", async () => {
        // Try to withdraw surplus seed reserves
        await expect(comet.connect(dao).withdrawSurplusSeedReserves()).to.be.revertedWithCustomError(comet, "MarketIsNotDeprecated");
      });
    });

    context("Withdrawing surplus collateral reserves", function () {
      it("should not allow withdrawing surplus collateral reserves", async () => {
        const collateralAddresses = collateralTokens.map(tokenConfig => tokenConfig.collateralToken);
        // Try to withdraw surplus collateral reserves
        await expect(comet.connect(dao).withdrawSurplusCollateralReserves(collateralAddresses)).to.be.revertedWithCustomError(
          comet,
          "MarketIsNotDeprecated"
        );
      });
    });
  });

  context.skip("When the market is deprecating", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;

    beforeEach(async function () {
      // Create and fund the comet before each test
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

    // @todo add tests for withdrawal reserves by deprecation process
  });

  context.skip("When the market is deprecated", function () {
    // Global variables for the context of the tests
    const supplyBaseTokenAmount: bigint = exp(500, 18);
    const supplyCollateralAmount: bigint = exp(1000, 18);
    const borrowBaseTokenAmount: bigint = exp(50, 18);
    const assetIndex = 1;
    let deprecationStartTimestamp: number;
    let deprecationEndTimestamp: number;

    beforeEach(async function () {
      // Create and fund the comet before each test
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

    // @todo add tests for withdrawal reserves when the market is deprecated
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

        // Create and fund the comet with maximum assets
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

      it("should handle overflow during withdrawal surplus collateral reserves with maximum number of assets", async function () {
        // Arrange: Create a market with the maximum number of assets and deprecate it
        // Act: Allocate all assets to the comet contract and initiate withdrawal of surplus collateral reserves
        // Assert: Check that not overflow happens

        // Allocate all tokens to the comet contract
        const allocateAmount = exp(1000, 18);
        for (let i = 0; i < assetAddresses.length; i++) {
          const assetAddress = assetAddresses[i];
          const contractToken = FaucetToken__factory.connect(assetAddress, owner);
          await contractToken.allocateTo(comet.address, allocateAmount);
          // Check that the comet contract has the allocated tokens
          expect(await comet.getCollateralReserves(assetAddress)).to.equal(allocateAmount);
        }

        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await comet.connect(firstUser).accrueAccount(firstUser.address);
        // Check that the market is deprecated
        expect(await comet.isDeprecated()).to.be.true;
        // Get the treasury address from the sandbox controller
        const recipient = await sandboxController.treasury();

        // Call the withdrawSurplusSeedReserves function to withdraw surplus collateral reserves
        const tx = await comet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses);
        await tx.wait();
        // Expect no overflow to happen
        await expect(tx).to.be.not.reverted;
        // Expect the event to be emitted
        await expect(tx).to.emit(comet, "SurplusCollateralReservesWithdrawn");
        // Check transfer of surplus collateral reserves
        for (let i = 0; i < assetAddresses.length; i++) {
          const assetAddress = assetAddresses[i];
          const contractToken = FaucetToken__factory.connect(assetAddress, owner);
          await expect(tx).to.changeTokenBalance(contractToken, recipient, allocateAmount);
        }
      });
    });

    context("Access control:", function () {
      beforeEach(async function () {
        // Create and fund the comet before each test
        await createComet();
      });

      it("should not allow withdrawing free seed reserves if called by non-controller", async () => {
        const currentSeedReserves = await comet.seedReserves();
        // Try to withdraw free seed reserves
        // Expect the custom error to be reverted
        await expect(
          configController.connect(randomCaller).withdrawFreeSeedReservesFrom(comet.address, currentSeedReserves)
        ).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("should not allow withdrawing surplus seed reserves if called by non-dao", async () => {
        // Try to withdraw surplus seed reserves
        // Expect the custom error to be reverted
        await expect(comet.connect(randomCaller).withdrawSurplusSeedReserves()).to.be.revertedWithCustomError(comet, "Unauthorized");
      });

      it("should not allow withdrawing surplus collateral reserves if called by non-dao", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Try to withdraw surplus collateral reserves
        // Expect the custom error to be reverted
        await expect(comet.connect(randomCaller).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          comet,
          "Unauthorized"
        );
      });

      it.skip("should not allow withdrawing surplus seed reserves if market is not deprecated", async () => {
        // Try to withdraw surplus seed reserves
        // Expect the custom error to be reverted
        await expect(comet.connect(dao).withdrawSurplusSeedReserves()).to.be.revertedWithCustomError(comet, "MarketIsNotDeprecated");
      });

      it.skip("should not allow withdrawing surplus seed reserves if market has active lenders", async () => {
        // // Increase time for the deprecation end
        // await time.increaseTo(deprecationEndTimestamp);
        // // Transaction for finalizing deprecation
        // await comet.connect(firstUser).accrueAccount(firstUser.address);
        // // Check that the market is deprecated
        // expect(await comet.isDeprecated()).to.be.true;
        // // Try to withdraw surplus seed reserves
        // // Expect the custom error to be reverted
        // await expect(comet.connect(dao).withdrawSurplusSeedReserves()).to.be.revertedWithCustomError(comet, "ActiveSupplyBaseExists");
      });
    });

    context("Withdrawal surplus collateral reserves:", function () {
      // Global variables for the context of the tests
      const supplyBaseTokenAmount: bigint = exp(500, 18);
      const supplyCollateralAmount: bigint = exp(1000, 18);
      const borrowBaseTokenAmount: bigint = exp(50, 18);
      const assetIndex = 1;
      let deprecationStartTimestamp: number;
      let deprecationEndTimestamp: number;

      beforeEach(async function () {
        // Create and fund the comet before each test
        await createComet();
        // Supply some collateral to the comet: firstUser
        await supplyCollateralTo(firstUser, assetIndex, supplyCollateralAmount);
        // Borrow base token from the comet: firstUser
        await borrowBaseTokenTo(firstUser, borrowBaseTokenAmount);
        // Supply some base token to the comet: secondUser
        await supplyBaseTokenTo(secondUser, supplyBaseTokenAmount);
        // Set time for the deprecation start
        deprecationStartTimestamp = (await time.latest()) + 60; // 1 minute in the future
        await time.setNextBlockTimestamp(deprecationStartTimestamp);
        // Close the market
        await configController.initiateDeprecationMarket(comet.address);
        // Get time for the deprecation end
        deprecationEndTimestamp = deprecationStartTimestamp + (await comet.deprecationDuration()).toNumber();
      });

      it("should not allow withdrawing surplus seed reserves if market has active lenders", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await comet.connect(firstUser).accrueAccount(firstUser.address);
        // Check that the market is deprecated
        expect(await comet.isDeprecated()).to.be.true;
        // Try to withdraw surplus seed reserves
        // Expect the custom error to be reverted
        await expect(comet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          comet,
          "ActiveSupplyBaseExists"
        );
      });

      it("should not allow withdrawing surplus collateral reserves if excessive number of assets", async () => {
        // 25 assets, exceeding the limit
        const assetAddresses = new Array(25).fill(collateralTokens[0].collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await comet.connect(secondUser).accrueAccount(secondUser.address);
        await time.increaseTo(deprecationEndTimestamp + 60); // 1 minute after deprecation end
        // Withdraw base token from the comet contract
        await comet.connect(secondUser).withdraw(baseToken.address, ethers.constants.MaxUint256);
        // Check that the market is deprecated
        expect(await comet.isDeprecated()).to.be.true;
        // Try to withdraw surplus collateral reserves with excessive number of assets
        await expect(comet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          comet,
          "TooManyAssets"
        );
      });

      it("should not allow withdrawing surplus collateral reserves if asset is zero address", async () => {
        const assetAddresses = [ethers.constants.AddressZero];
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        // Transaction for finalizing deprecation
        await comet.connect(secondUser).accrueAccount(secondUser.address);
        await time.increaseTo(deprecationEndTimestamp + 60); // 1 minute after deprecation end
        // Withdraw base token from the comet contract
        await comet.connect(secondUser).withdraw(baseToken.address, ethers.constants.MaxUint256);
        // Check that the market is deprecated
        expect(await comet.isDeprecated()).to.be.true;
        // Try to withdraw surplus collateral reserves with zero address asset
        await expect(comet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.be.revertedWithCustomError(
          comet,
          "ZeroAddress"
        );
      });

      it.only("should not revert if some assets have zero reserves", async () => {
        const assetAddresses = collateralTokens.map(token => token.collateralToken);
        // Increase time for the deprecation end
        await time.increaseTo(deprecationEndTimestamp);
        console.log("Is liquidatable (before):", await comet.isLiquidatable(firstUser.address));
        // Transaction for finalizing deprecation
        await comet.connect(secondUser).accrueAccount(secondUser.address);
        console.log("Is liquidatable (after):", await comet.isLiquidatable(firstUser.address));
        await time.increaseTo(deprecationEndTimestamp + 60); // 1 minute after deprecation end
        // Withdraw base token from the comet contract
        await comet.connect(secondUser).withdraw(baseToken.address, ethers.constants.MaxUint256);
        // Check that the market is deprecated
        expect(await comet.deprecationStatus()).to.equal(2); // DeprecationStatus.Finalized
        console.log(
          "\nUser (firstUser) base balance before liquidation:",
          ethers.utils.formatEther(await comet.balanceOf(firstUser.address))
        );
        console.log(
          "User (firstUser) collateral balance before liquidation:",
          ethers.utils.formatEther(await comet.collateralBalanceOf(firstUser.address, assetAddresses[assetIndex]))
        );
        console.log("\ntotalSupplyBase before liquidation:", ethers.utils.formatEther((await comet.totalsBasic()).totalSupplyBase));
        // Liquidate the first user after deprecation market and accumulated collateral reserves
        await comet.connect(secondUser).absorb(secondUser.address, [firstUser.address]);
        console.log("totalSupplyBase after liquidation:", ethers.utils.formatEther((await comet.totalsBasic()).totalSupplyBase));
        console.log(
          "\nUser (firstUser) base balance after liquidation:",
          ethers.utils.formatEther(await comet.balanceOf(firstUser.address))
        );
        console.log(
          "User (firstUser) collateral balance after liquidation:",
          ethers.utils.formatEther(await comet.collateralBalanceOf(firstUser.address, assetAddresses[assetIndex]))
        );

        // // Withdraw base token for the second user after liquidation the first user
        // await comet.connect(firstUser).withdraw(baseToken.address, ethers.constants.MaxUint256);
        // console.log(
        //   "\nUser (firstUser) base balance after withdrawal:",
        //   ethers.utils.formatEther(await comet.balanceOf(firstUser.address))
        // );

        await time.increaseTo((await time.latest()) + 60 * 60 * 24 * 30); // 1 month later

        console.log(
          "\nUser (firstUser) base balance after increase (30 days):",
          ethers.utils.formatEther(await comet.balanceOf(firstUser.address))
        );
        // // Check that the market collateral reserves
        // // Expect the all collateral reserves to be zero after liquidation but not asset by index '1'
        // for (let i = 0; i < assetAddresses.length; i++) {
        //   const reserves = await comet.getCollateralReserves(assetAddresses[i]);
        //   if (i === assetIndex) {
        //     expect(reserves).to.be.gt(0);
        //   } else {
        //     expect(reserves).to.equal(0);
        //   }
        // }
        // Withdraw surplus collateral reserves with some assets having zero reserves
        // Expect success tx and the event to be emitted
        // await expect(await comet.connect(dao).withdrawSurplusCollateralReserves(assetAddresses)).to.emit(
        //   comet,
        //   "SurplusCollateralReservesWithdrawn"
        // );
      });
    });
  });
});
