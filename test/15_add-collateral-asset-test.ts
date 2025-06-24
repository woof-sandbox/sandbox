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
    setTotalsBasic
} from "./helper/helpers";
import {
    SandboxController,
    SandboxComet,
    CometExtension,
    CometExtension__factory,
    SandboxCometFactory,
    ConfigControllerFactory__factory,
    ConfigControllerCallerTest,
    ConfigControllerCallerTest__factory,
    SandboxComet__factory,
    SandboxCometFactory__factory,
    SandboxControllerNoCurvesTest__factory,
    FaucetToken,
    FaucetToken__factory,
    SimplePriceFeed__factory
} from '../build/types';


import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";



describe('15. addCollateralAsset', function () {
    let configControllerImpl: ConfigControllerCallerTest;
    let sandboxCometImpl: SandboxComet;

    const _minUpdateTime = 7 * 24 * 60 * 60;

    const configControllerOpts = {
        _curatorFee: 1000,
        _name: "ConfigController",
        _curatorProposalDuration: 7 * 24 * 60 * 60,
        _proposalDuration: 7 * 24 * 60 * 60,
    };

    let owner, curator, guardian, user;

    let configControllerAddress;
    let configController: ConfigControllerCallerTest;
    let sandboxCometFactory: SandboxCometFactory;
    let sandboxController: SandboxController;

    let collateralTokens: CollateralTokenConfigStruct[] = [];
    let baseToken: FaucetToken;
    let marketConfig: CometConfigStruct;

    let comet: SandboxComet;
    let cometExtension: CometExtension;

    const provider = ethers.provider;

    before(async function () {
        [owner, curator, guardian, user] = await ethers.getSigners();

        const configControllerFactory_factory = new ConfigControllerFactory__factory(owner);
        const configController_factory = new ConfigControllerCallerTest__factory(owner);
        const comet_factory = new SandboxComet__factory(owner);
        const sandboxCometFactory_factory = new SandboxCometFactory__factory(owner);

        configControllerImpl = (await configController_factory.deploy()) as ConfigControllerCallerTest;
        sandboxCometImpl = (await comet_factory.deploy()) as SandboxComet;


        const SandboxControllerFactoryTest = (await ethers.getContractFactory(
            'SandboxControllerNoCurvesTest'
        )) as SandboxControllerNoCurvesTest__factory;

        sandboxController = (await makeSandboxController(
            defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }),
            SandboxControllerFactoryTest
        )
        ).sandboxController;

        const configControllerFactory = await configControllerFactory_factory.deploy(
            sandboxController.address,
            configControllerImpl.address
        );
        sandboxCometFactory = await sandboxCometFactory_factory.deploy(
            sandboxCometImpl.address,
            configControllerFactory.address
        );

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
        configController = (await ethers.getContractAt(
            "ConfigControllerCallerTest",
            configControllerAddress
        )) as ConfigControllerCallerTest;

        baseToken = await makeToken({
            symbol: "WETH",
            initialMint: ethers.utils.parseEther("50000").toString(),
        });
        let collateralToken = await makeToken({ symbol: "DAI" });
        let priceFeedCol = await makePriceFeed(collateralToken.address, "2");
        const priceFeedBase = await makePriceFeed(baseToken.address, "2");

        await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);
        await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

        collateralTokens.push({
            collateralToken: collateralToken.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.75, 18),
            liquidationFactor: exp(0.85, 18),
            supplyCap: exp(1e9, 18)
        });

        collateralToken = await makeToken({ symbol: "USDC" });
        priceFeedCol = await makePriceFeed(collateralToken.address, "2");
        await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

        collateralTokens.push({
            collateralToken: collateralToken.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.75, 18),
            liquidationFactor: exp(0.85, 18),
            supplyCap: exp(1e9, 18)
        });
    });

    context('Adding new collateral asset:', function () {
        let newCollateralToken: FaucetToken;
        let newCollateralTokenConfig: CollateralTokenConfigStruct;
        let scale: bigint;
        let priceFeed: string;

        before(async function () {
            newCollateralToken = await makeToken({ symbol: "USDT" });
            const priceFeedCol = await makePriceFeed(newCollateralToken.address, "2");
            // List the new collateral token in the sandbox controller
            await sandboxListCollateralAsset(sandboxController, newCollateralToken, priceFeedCol.address);
            // Calculate the scale factor for the new collateral token
            scale = exp(1, await newCollateralToken.decimals());
            // Get the current collateral tokens
            priceFeed = await sandboxController.tokenToPriceFeed(newCollateralToken.address);
            // Create the new collateral token configuration
            newCollateralTokenConfig = {
                collateralToken: newCollateralToken.address,
                supplyCap: exp(1e9, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.75, 18),
                liquidationFactor: exp(0.85, 18),
            };
        });

        beforeEach(async function () {
            // Reset the market configuration with all collateral tokens
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

        it('should add a new collateral asset', async () => {
            // Check numAssets before adding
            const initialNumAssets = collateralTokens.length;
            expect(await comet.numAssets()).to.equal(initialNumAssets);
            // Add the new collateral asset
            const tx = await configController.addCollateralAsset(
                comet.address,
                newCollateralTokenConfig
            );
            // Check event emission
            await expect(tx).to.emit(comet, 'CollateralAssetAdded').withArgs(
                newCollateralTokenConfig.collateralToken,
                priceFeed,
                newCollateralTokenConfig.supplyCap,
                newCollateralTokenConfig.borrowCollateralFactor,
                newCollateralTokenConfig.liquidateCollateralFactor,
                newCollateralTokenConfig.liquidationFactor,
                scale
            );

            // Check numAssets after adding
            const newNumAssets = await comet.numAssets();
            expect(newNumAssets).to.equal(initialNumAssets + 1);

            // Check asset info for the new collateral asset
            const newAssetIndex = newNumAssets - 1;
            const assetInfo = await comet.getAssetInfo(newAssetIndex);
            expect(assetInfo).to.deep.equal([
                newCollateralTokenConfig.collateralToken,
                priceFeed,
                newCollateralTokenConfig.supplyCap,
                newCollateralTokenConfig.borrowCollateralFactor,
                newCollateralTokenConfig.liquidateCollateralFactor,
                newCollateralTokenConfig.liquidationFactor,
                scale
            ]);

        });

        it('should provide the user a loan secured by new collateral assets', async () => {
            // Add the new collateral asset
            await configController.addCollateralAsset(
                comet.address,
                newCollateralTokenConfig
            );
            await newCollateralToken.allocateTo(user.address, exp(1000, 18));

            // Approve the comet contract to spend the user's collateral token
            await newCollateralToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);

            // Deposit collateral into the comet contract
            const supplyAmount = await newCollateralToken.balanceOf(user.address);
            await comet.connect(user).supply(newCollateralToken.address, supplyAmount);

            // Check the user's balance after supplying collateral
            expect(await cometExtension.collateralBalanceOf(user.address, newCollateralToken.address))
                .to.equal(supplyAmount);

            // Borrow against the collateral
            const borrowAmount = exp(50, 18);
            await comet.connect(user).withdraw(baseToken.address, borrowAmount);

            // Check the user's balance after borrowing
            const userBalance = await comet.borrowBalanceOf(user.address);
            expect(userBalance).to.be.equal(borrowAmount);
        });

        it('should prevent liquidation by allowing user to deposit newly added collateral asset', async () => {
            let collateralAddress = collateralTokens[0].collateralToken;
            let contractToken = FaucetToken__factory.connect(collateralAddress, provider);
            // We change the price feed to the first collateral token
            const priceFeedAddress = await sandboxController.tokenToPriceFeed(collateralAddress);
            const contractPriceFeed = SimplePriceFeed__factory.connect(priceFeedAddress, owner);
            // Create a balance for the user for the first collateral token
            await contractToken.connect(user).allocateTo(user.address, exp(1000, 18));
            // Approve the comet contract to spend the user's collateral token
            await contractToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);
            // Deposit first collateral into the comet contract
            let supplyAmount = await contractToken.balanceOf(user.address);
            await comet.connect(user).supply(collateralAddress, supplyAmount);
            // Check the user's balance after supplying first collateral
            expect(await cometExtension.collateralBalanceOf(user.address, collateralAddress))
                .to.equal(supplyAmount);

            collateralAddress = collateralTokens[1].collateralToken;
            contractToken = FaucetToken__factory.connect(collateralAddress, provider);
            // Create a balance for the user for the second collateral token
            await contractToken.connect(user).allocateTo(user.address, exp(1000, 18));
            // Approve the comet contract to spend the user's collateral token
            await contractToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);
            // Deposit second collateral into the comet contract
            supplyAmount = await contractToken.balanceOf(user.address);
            await comet.connect(user).supply(collateralAddress, supplyAmount);
            // Check the user's balance after supplying second collateral
            expect(await cometExtension.collateralBalanceOf(user.address, collateralAddress))
                .to.equal(supplyAmount);

            // Borrow base token 
            const borrowAmount = exp(1200, 18);
            await comet.connect(user).withdraw(baseToken.address, borrowAmount);
            // Check the user's balance after borrowing
            const userBalance = await comet.connect(user).borrowBalanceOf(user.address);
            expect(userBalance).to.be.equal(borrowAmount);

            // Check the liquidation status before update the collateral price feed
            expect(await comet.isLiquidatable(user.address)).to.be.false;

            // Update the price feed to simulate a price drop
            const latestRoundData = await contractPriceFeed.latestRoundData();
            const newPrice = latestRoundData[1].div(2); // Halve the price
            // Set the new price in the price feed
            await contractPriceFeed.setRoundData(latestRoundData[0], newPrice, latestRoundData[2], latestRoundData[3], latestRoundData[4]);

            // Check the liquidation status after price drop
            expect(await comet.isLiquidatable(user.address)).to.be.true;

            // Add the new collateral asset
            expect(await configController.addCollateralAsset(
                comet.address,
                newCollateralTokenConfig
            )).to.emit(comet, 'CollateralAssetAdded');

            // Deposit the new collateral asset to cover the liquidation
            await newCollateralToken.connect(user).allocateTo(user.address, exp(1000, 18));
            // Approve the comet contract to spend the user's new collateral token
            await newCollateralToken.connect(user).approve(comet.address, ethers.constants.MaxUint256);
            supplyAmount = await newCollateralToken.balanceOf(user.address);
            await comet.connect(user).supply(newCollateralToken.address, supplyAmount);
            // Check the user's balance after supplying new collateral
            expect(await cometExtension.collateralBalanceOf(user.address, newCollateralToken.address))
                .to.equal(supplyAmount);
            // Check the liquidation status after adding new collateral
            expect(await comet.isLiquidatable(user.address)).to.be.false;

        });

    });

    context('Edge cases:', function () {
        before(async function () {
            const maxAssets = 24;
            // Create a collateral token configuration for each asset
            // Start with 2 collateral tokens already added
            for (let i = 2; i < maxAssets; i++) {
                const symbol = `ANY_ASSET${i + 1}`;
                const collateralToken = await makeToken({ symbol });
                const priceFeedCol = await makePriceFeed(collateralToken.address);

                await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

                collateralTokens.push({
                    collateralToken: collateralToken.address,
                    borrowCollateralFactor: exp(0.6, 18),
                    liquidateCollateralFactor: exp(0.75, 18),
                    liquidationFactor: exp(0.85, 18),
                    supplyCap: exp(1e9, 18)
                });

            }
            // Reset the market configuration with all collateral tokens
            marketConfig = {
                baseToken: baseToken.address,
                collateralTokens: collateralTokens.map(obj => ({ ...obj })),
                baseTokenCurveId: 0n,
            };

            const cometAddress = await configController.callStatic.createComet(marketConfig);
            await configController.createComet(marketConfig);
            // Connect to the newly created comet instance
            comet = SandboxComet__factory.connect(cometAddress, provider);
            // Connect to the comet as an extension contract
            cometExtension = CometExtension__factory.connect(cometAddress, provider);
        });

        it('should revert when trying to add more than max of collateral assets', async () => {
            const newCollateralToken = await makeToken({ symbol: "USDT" });
            const priceFeed = await makePriceFeed(newCollateralToken.address);

            await sandboxListCollateralAsset(sandboxController, newCollateralToken, priceFeed.address);

            const newCollateralTokenConfig = {
                collateralToken: newCollateralToken.address,
                supplyCap: exp(1e9, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.75, 18),
                liquidationFactor: exp(0.85, 18),
            };
            // Check numAssets before adding
            const initialNumAssets = collateralTokens.length;
            expect(await comet.numAssets()).to.equal(initialNumAssets);
            // Add the new collateral asset
            await expect(configController.addCollateralAsset(
                comet.address,
                newCollateralTokenConfig
            )).to.be.revertedWithCustomError(comet, 'TooManyAssets');

            // Check numAssets after trying to add
            expect(await comet.numAssets()).to.equal(initialNumAssets);
        });

        it('should revert when trying to add a collateral asset if called by non-controller', async () => {
            const newCollateralToken = await makeToken({ symbol: "USDT" });
            const priceFeed = await makePriceFeed(newCollateralToken.address);

            await sandboxListCollateralAsset(sandboxController, newCollateralToken, priceFeed.address);

            const newCollateralTokenConfig = {
                collateralToken: newCollateralToken.address,
                supplyCap: exp(1e9, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.75, 18),
                liquidationFactor: exp(0.85, 18),
            };

            // Attempt to add the new collateral asset from a non-controller account
            await expect(comet.connect(owner).addCollateralAsset(
                newCollateralTokenConfig
            )).to.be.revertedWithCustomError(comet, 'Unauthorized');
        }
        );

    });
});