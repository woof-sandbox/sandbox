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
    ConfigControllerFactory,
    SandboxComet,
    SandboxCometFactory,
    ConfigControllerFactory__factory,
    ConfigController__factory,
    SandboxComet__factory,
    SandboxCometFactory__factory,
    FaucetToken,
    SandboxController,
} from "../build/types";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";
import { BigNumber } from "ethers";

describe.only("2. System Params Validation", function() {
    // Factories
    let _ConfigControllerFactory: ConfigControllerFactory__factory;
    let _ConfigController: ConfigController__factory;
    let _Comet: SandboxComet__factory;
    let _SandboxCometFactory: SandboxCometFactory__factory;

    let configControllerImpl: ConfigController;
    let sandboxCometImpl: SandboxComet;

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
    let sandboxController: SandboxController;

    let collateralTokens: CollateralTokenConfigStruct[] = [];
    let baseToken;
    let marketConfig: CometConfigStruct;

    before(async function() {
        _ConfigControllerFactory = (await ethers.getContractFactory(
            "ConfigControllerFactory"
        )) as ConfigControllerFactory__factory;
        _ConfigController = (await ethers.getContractFactory("ConfigController")) as ConfigController__factory;
        _Comet = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
        _SandboxCometFactory = (await ethers.getContractFactory("SandboxCometFactory")) as SandboxCometFactory__factory;

        configControllerImpl = (await _ConfigController.deploy()) as ConfigController;
        sandboxCometImpl = (await _Comet.deploy()) as SandboxComet;

        signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];

        sandboxController = (await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }))).sandboxController;

        const configControllerFactory = await _ConfigControllerFactory.deploy(
            sandboxController.address,
            configControllerImpl.address
        );
        sandboxCometFactory = await _SandboxCometFactory.deploy(
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
            "ConfigController",
            configControllerAddress
        )) as ConfigController;

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
            priceFeed: priceFeedCol.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.7, 18),
            liquidationFactor: exp(0.8, 18),
            supplyCap: exp(1e9, 18),
            scale: 15,
        });

        marketConfig = {
            baseToken: baseToken.address,
            collateralTokens: collateralTokens.map(obj => ({...obj})),
            baseTokenCurveId: 0n,
            options: {
                baseTrackingSupplySpeed: 1e15,
                baseTrackingBorrowSpeed: 1e15,
                trackingIndexScale: 1e15,
                baseMinForRewards: 1e15,
            },
        };
    });

    describe("ConfigController", function() {
        beforeEach(async function() {
            marketConfig = {
                baseToken: baseToken.address,
                collateralTokens: collateralTokens.map(obj => ({...obj})),
                baseTokenCurveId: 0n,
                options: {
                    baseTrackingSupplySpeed: 1e15,
                    baseTrackingBorrowSpeed: 1e15,
                    trackingIndexScale: 1e15,
                    baseMinForRewards: 1e15,
                },
            };
        });
        describe("Comet parameters validation", function() {
            it("should revert if the base token is zero address", async () => {
                marketConfig.baseToken = ethers.constants.AddressZero;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "ZeroAddress"
                );
            });

            it("should revert if the collateral token is zero address", async () => {
                marketConfig.collateralTokens[0].collateralToken = ethers.constants.AddressZero;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "ZeroAddress"
                );
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

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the collateral token borrow collateral factor is zero", async () => {
                marketConfig.collateralTokens[0].borrowCollateralFactor = 0;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the collateral token liquidate collateral factor is zero", async () => {
                marketConfig.collateralTokens[0].liquidateCollateralFactor = 0;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the collateral token liquidation factor is zero", async () => {
                marketConfig.collateralTokens[0].liquidationFactor = 0;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
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
                marketConfig.collateralTokens[0].borrowCollateralFactor = exp(1.1, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the borrow collateral factor is less than min borrow collateral factor", async () => {
                marketConfig.collateralTokens[0].borrowCollateralFactor = exp(0.4, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the liquidate collateral factor is greater than the max liquidate collateral factor", async () => {
                marketConfig.collateralTokens[0].liquidateCollateralFactor = exp(1.1, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the liquidate collateral factor is less than min liquidate collateral factor", async () => {
                marketConfig.collateralTokens[0].liquidateCollateralFactor = exp(0.4, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the liquidation factor is less than min liquidation factor", async () => {
                marketConfig.collateralTokens[0].liquidationFactor = exp(0.4, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if the liquidation factor is greater than max liquidation factor", async () => {
                marketConfig.collateralTokens[0].liquidationFactor = exp(1.1, 18);

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCollateralTokenSettings"
                );
            });

            it("should revert if token base token curve id is greater than base asset curve length", async () => {
                const baseAssets = await sandboxController.baseAssets(marketConfig.baseToken);
                const baseAssetsCurveLength = baseAssets.baseAssetCurves.length;

                marketConfig.baseTokenCurveId = baseAssetsCurveLength + 1;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "WrongCurveParams"
                );
            });

            it("should revert if base token is not whitelisted in sandbox comet", async () => {
                const unsupportedToken = await makeToken({
                    symbol: "BASE",
                    initialMint: ethers.utils.parseEther("50000").toString(),
                });

                marketConfig.baseToken = unsupportedToken.address;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "BaseTokenNotWhitelisted"
                );
            });

            it("should revert if collateral tokens list is zero length", async () => {
                marketConfig.collateralTokens = [];

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    configController,
                    "ZeroCollateralAssets"
                );
            });
        });
        describe("Comet creation, happy cases", function() {
            it("should be possible to create two comets with the same configuration", async () => {
                baseToken = (await ethers.getContractAt("FaucetToken", marketConfig.baseToken)) as FaucetToken;
                await baseToken.allocateTo(
                    owner.address,
                    (await sandboxController.config()).suggestedAmountOfSeedReserves
                );
                await baseToken.allocateTo(
                    owner.address,
                    (await sandboxController.config()).suggestedAmountOfSeedReserves
                );

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

    describe("SandboxComet", function() {
        describe("initialize validations", function() {
            beforeEach(async function() {
                marketConfig = {
                    baseToken: baseToken.address,
                    collateralTokens: collateralTokens.map(obj => ({...obj})),
                    baseTokenCurveId: 0n,
                    options: {
                        baseTrackingSupplySpeed: 1e15,
                        baseTrackingBorrowSpeed: 1e15,
                        trackingIndexScale: 1e15,
                        baseMinForRewards: 1e15,
                    },
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

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    sandboxCometImpl,
                    "BadDecimals"
                );
            });

            it("should revert if price feed decimals is not equal to PRICE FEED DECIMALS", async () => {
                const baseToken = await makeToken({
                    symbol: "BASE",
                    initialMint: ethers.utils.parseEther("50000").toString(),
                    decimals: 18,
                });
                const invalidPriceFeed = await makePriceFeed(baseToken.address, '100000000', 7);

                await sandboxListBaseAsset(sandboxController, baseToken, invalidPriceFeed.address);

                marketConfig.baseToken = baseToken.address;

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    sandboxCometImpl,
                    "BadDecimals"
                );
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

                await expect(configController.createComet(marketConfig)).to.be.revertedWithCustomError(
                    sandboxCometImpl,
                    "BadDecimals"
                );
            });
        });
        describe("Comet creation: happy cases", function() {
            let comet: SandboxComet;
            before(async function() {
                marketConfig = {
                    baseToken: baseToken.address,
                    collateralTokens: collateralTokens.map(obj => ({...obj})),
                    baseTokenCurveId: 0n,
                    options: {
                        baseTrackingSupplySpeed: 1e15,
                        baseTrackingBorrowSpeed: 1e15,
                        trackingIndexScale: 1e15,
                        baseMinForRewards: 1e15,
                    },
                };
                const cometAddress = await configController.callStatic.createComet(marketConfig);
                await configController.createComet(marketConfig);

                comet = (await ethers.getContractAt("SandboxComet", cometAddress)) as SandboxComet;
            });
            it("should set storage properly after deploment and initialization", async function() {
                const currentBlock = await ethers.provider.getBlock("latest");
                const currentTimestamp = BigNumber.from(currentBlock.timestamp);

                expect(await comet.sandboxController()).to.eq(sandboxController.address);
                expect(await comet.baseTokenPriceFeed()).to.eq(
                    await sandboxController.tokenToPriceFeed(marketConfig.baseToken)
                );
                expect(await comet.baseToken()).to.eq(marketConfig.baseToken);
                expect(await comet.trackingIndexScale()).to.eq(marketConfig.options.trackingIndexScale);
                expect(await comet.baseTrackingSupplySpeed()).to.eq(marketConfig.options.baseTrackingSupplySpeed);
                expect(await comet.baseTrackingBorrowSpeed()).to.eq(marketConfig.options.baseTrackingBorrowSpeed);
                expect(await comet.storeFrontPriceFactor()).to.eq(
                    (await sandboxController.config()).storeFrontPriceFactor
                );
                expect(await comet.baseBorrowMin()).to.eq(
                    (await sandboxController.baseAssets(marketConfig.baseToken)).minBorrow
                );
                expect(await comet.targetPercent()).to.eq((await sandboxController.config()).targetPercent);
                expect(await comet.seedReserves()).to.eq(
                    (await sandboxController.config()).suggestedAmountOfSeedReserves
                );
                expect(await comet.unlockTimestamp()).to.be.closeTo(
                    currentTimestamp.add((await sandboxController.config()).suggestedLockTimeOfSeedReserves),
                    10
                );
            });

            it("should set collateral assets properly after initialization", async function() {
                expect((await comet.collateralAssets(0)).priceFeed).to.deep.eq(
                    marketConfig.collateralTokens[0].priceFeed
                );
                expect(await comet.collateralAssetIndex(marketConfig.collateralTokens[0].collateralToken)).to.eq(0);
                expect(await comet.numAssets()).to.eq(marketConfig.collateralTokens.length);
            });

            it("should set curve parameters properly after initialization", async function() {
                const curve = (await sandboxController.baseAssets(marketConfig.baseToken)).baseAssetCurves[0];
                const secondsPerYear = BigNumber.from(31_536_000);

                // Supply
                expect(await comet.supplyKink()).to.eq(curve.supplyKink);
                expect(await comet.supplyPerSecondInterestRateSlopeLow()).to.eq(
                    curve.supplyPerYearInterestRateSlopeLow.div(secondsPerYear)
                );
                expect(await comet.supplyPerSecondInterestRateSlopeHigh()).to.eq(
                    curve.supplyPerYearInterestRateSlopeHigh.div(secondsPerYear)
                );
                expect(await comet.supplyPerSecondInterestRateBase()).to.eq(
                    curve.supplyPerYearInterestRateBase.div(secondsPerYear)
                );

                // Borrow
                expect(await comet.borrowKink()).to.eq(curve.borrowKink);
                expect(await comet.borrowPerSecondInterestRateSlopeLow()).to.eq(
                    curve.borrowPerYearInterestRateSlopeLow.div(secondsPerYear)
                );
                expect(await comet.borrowPerSecondInterestRateSlopeHigh()).to.eq(
                    curve.borrowPerYearInterestRateSlopeHigh.div(secondsPerYear)
                );
                expect(await comet.borrowPerSecondInterestRateBase()).to.eq(
                    curve.borrowPerYearInterestRateBase.div(secondsPerYear)
                );
            });
        });
    });
});
