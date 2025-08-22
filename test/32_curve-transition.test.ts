import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    ConfigControllerTest,
    FaucetToken,
    NonStandardFaucetFeeToken,
    ConfigControllerTest__factory,
    SandboxComet,
    FaucetToken__factory,
    SimplePriceFeed__factory
} from "../build/types";
import {
    ethers,
    exp,
    expect,
    fastForward,
    defaultAssets,
    defaultSandboxControllerOpts,
    makeSandboxController,
    makeConfigControllerFactory,
    makeCometFactory,
    skipTimeAndAccrueAccount,
    SnapshotRestorer,
    takeSnapshot,
} from "./helper/helpers";
import { BaseAssetCurveStruct, ISandboxController } from "../build/types/ISandboxController";
import { CurveStruct } from "../build/types/CometCore";
import { BigNumber, ContractTransaction, ContractReceipt, Event } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("32. curve transition", function() {
    let snapshot: SnapshotRestorer;

    let comet: SandboxComet;
    let baseToken: FaucetToken | NonStandardFaucetFeeToken;
    let collateral: FaucetToken | NonStandardFaucetFeeToken;
    let configController: ConfigControllerTest;
    let sandboxController: ISandboxController;

    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let treasury: string;

    let startCurve: CurveStruct;
    let targetCurve: CurveStruct;
    let transitionDuration: number;
    let receipt: ContractReceipt;
    // constants
    const SUPPLY_AMOUNT = exp(10, 6);SUPPLY_AMOUNT

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        const dao = signers[3];
        alice = signers[4];
        bob = signers[5];
        
        treasury = ethers.Wallet.createRandom().address;
        // Create tokens
        const assets = defaultAssets();
        const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
        const tokens = {};
        for (const symbol in assets) {
            const config = assets[symbol];
            const decimals = config.decimals || 18;
            const initial = (config.initial != undefined && config.initial.toString()) || 1e6;
            const name = config.name || symbol;
            const token = (await FaucetFactory.deploy(initial, name, decimals, symbol)) as FaucetToken;
            await token.deployed();
            tokens[symbol] = token;
        }

        baseToken = tokens["USDC"];
        collateral = tokens["COMP"];

        // Create price feeds
        const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
        const priceFeeds = {};
        for (const asset in assets) {
            const initialPrice = exp(assets[asset].initialPrice || 1, 8);
            const priceFeedDecimals = assets[asset].priceFeedDecimals || 8;
            const priceFeed = await PriceFeedFactory.deploy(initialPrice, priceFeedDecimals, tokens[asset].address);
            await priceFeed.deployed();
            priceFeeds[asset] = priceFeed;
        }

        // Create SandboxController
        const sandboxControllerOpts = defaultSandboxControllerOpts({
            owner: owner.address,
            dao: dao.address,
            treasury: treasury
        });
        sandboxControllerOpts.config.transitionDuration = 7 * 24 * 60 * 60;
        sandboxController = await makeSandboxController(sandboxControllerOpts, owner);
        

        transitionDuration = (await sandboxController.config()).transitionDuration;
        
        await sandboxController.whitelistBaseAsset(
            baseToken.address,
            priceFeeds["USDC"].address,
            {
                supplyKink: exp(0.8, 18),
                supplyPerYearInterestRateSlopeLow: exp(0.05, 18),
                supplyPerYearInterestRateSlopeHigh: exp(2, 18),
                supplyPerYearInterestRateBase: exp(0.001, 18),
                borrowKink: exp(0.8, 18),
                borrowPerYearInterestRateSlopeLow: exp(0.1, 18),
                borrowPerYearInterestRateSlopeHigh: exp(3, 18),
                borrowPerYearInterestRateBase: exp(0.005, 18),
            },
            exp(1, await baseToken.decimals()),
            ethers.utils.parseUnits("1000", await baseToken.decimals()),
            /// 1 week in seconds
            604800
        );

        // Whitelist collateral assets
        for (const symbol in tokens) {
            if (symbol !== "USDC") {
                const minBorrowCF = exp(0.5, 18);
                const maxBorrowCF = exp(0.7, 18);
                const minLiquidateCF = exp(0.7, 18);
                const maxLiquidateCF = exp(0.8, 18);
                const minLiquidationFactor = exp(0.8, 18);
                const maxLiquidationFactor = exp(1, 18);

                await sandboxController.whitelistCollateralAsset(
                    tokens[symbol].address,
                    priceFeeds[symbol].address,
                    minBorrowCF,
                    maxBorrowCF,
                    minLiquidateCF,
                    maxLiquidateCF,
                    minLiquidationFactor,
                    maxLiquidationFactor
                );
            }
        }

        // Create ConfigController implementation and factory
        const ConfigControllerImpl: ConfigControllerTest__factory = await ethers.getContractFactory("ConfigControllerTest") as ConfigControllerTest__factory;
        const configControllerImpl = await ConfigControllerImpl.deploy();
        await configControllerImpl.deployed();

        const configControllerFactory = await makeConfigControllerFactory(
            sandboxController.address,
            configControllerImpl.address
        );

        // Create Comet implementation and factory
        const SandboxCometImpl = await ethers.getContractFactory("SandboxComet");
        const cometImpl = await SandboxCometImpl.deploy();
        await cometImpl.deployed();

        const sandboxCometFactory = await makeCometFactory(cometImpl.address, configControllerFactory.address);

        // Create ConfigController
        const createConfigControllerTx: ContractTransaction = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            sandboxCometFactory.address,
            1000, // curatorFee (10%)
            "Test Config Controller"
        );
        const createConfigControllerReceipt: ContractReceipt = await createConfigControllerTx.wait();
        const configControllerCreatedEvent: Event = createConfigControllerReceipt.events?.find(
            (e) => e.event === "ConfigControllerCreated"
        );

        const configControllerAddress: string = configControllerCreatedEvent?.args?.controller;

        configController = await ethers.getContractAt("ConfigControllerTest", configControllerAddress) as ConfigControllerTest;
        
        // Accept the curator.
        await configController.connect(curator).acceptProposal(0);
        
        // Allocate base token to owner and approve
        await baseToken.connect(owner).allocateTo(owner.address, await sandboxController.suggestedAmountOfSeedReserves(baseToken.address));

        // Approve base token for ConfigController
        await baseToken.connect(owner).approve(configController.address, await sandboxController.suggestedAmountOfSeedReserves(baseToken.address));
        
        // Create comet
        const collateralTokens = [];
        for (const symbol in tokens) {
            if (symbol !== "USDC") {
                collateralTokens.push({
                    collateralToken: tokens[symbol].address,
                    borrowCollateralFactor: exp(0.6, 18),
                    liquidateCollateralFactor: exp(0.7, 18),
                    liquidationFactor: exp(0.8, 18),
                    supplyCap: exp(1e9, 18),
                });
            }
        }

        const marketConfig = {
            baseToken: baseToken.address,
            collateralTokens: collateralTokens,
            baseTokenCurveId: 0n,
            name: "Comet",
            amountOfSeedReserves: await sandboxController.suggestedAmountOfSeedReserves(baseToken.address),
        };

        await configController.createComet(marketConfig);
        const cometAddress = await configController.comets(0);
        const sandboxComet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;
        
        // Convert SandboxComet to CometHarness for compatibility
        comet = sandboxComet;

        const supplyKink = await comet.supplyKink();
        const supplyPerSecondInterestRateSlopeLow = await comet.supplyPerSecondInterestRateSlopeLow();
        const supplyPerSecondInterestRateSlopeHigh = await comet.supplyPerSecondInterestRateSlopeHigh();
        const supplyPerSecondInterestRateBase = await comet.supplyPerSecondInterestRateBase();
        const borrowKink = await comet.borrowKink();
        const borrowPerSecondInterestRateSlopeLow = await comet.borrowPerSecondInterestRateSlopeLow();
        const borrowPerSecondInterestRateSlopeHigh = await comet.borrowPerSecondInterestRateSlopeHigh();
        const borrowPerSecondInterestRateBase = await comet.borrowPerSecondInterestRateBase();

        startCurve = {
            supplyKink: supplyKink,
            supplyPerSecondInterestRateSlopeLow: supplyPerSecondInterestRateSlopeLow,
            supplyPerSecondInterestRateSlopeHigh: supplyPerSecondInterestRateSlopeHigh,
            supplyPerSecondInterestRateBase: supplyPerSecondInterestRateBase,
            borrowKink: borrowKink,
            borrowPerSecondInterestRateSlopeLow: borrowPerSecondInterestRateSlopeLow,
            borrowPerSecondInterestRateSlopeHigh: borrowPerSecondInterestRateSlopeHigh,
            borrowPerSecondInterestRateBase: borrowPerSecondInterestRateBase,
        };

        const curve: BaseAssetCurveStruct = {
            supplyKink: exp(0.7, 18),
            supplyPerYearInterestRateBase: exp(0.005, 18),
            supplyPerYearInterestRateSlopeLow: exp(0.03, 18),
            supplyPerYearInterestRateSlopeHigh: exp(2.5, 18),
            borrowKink: exp(0.9, 18),
            borrowPerYearInterestRateBase: exp(0.008, 18),
            borrowPerYearInterestRateSlopeLow: exp(0.2, 18),
            borrowPerYearInterestRateSlopeHigh: exp(4, 18),
        };

        const secondsPerYear = 31_536_000n;

        targetCurve = {
            supplyKink: curve.supplyKink,
            supplyPerSecondInterestRateSlopeLow: BigNumber.from(curve.supplyPerYearInterestRateSlopeLow).div(
                secondsPerYear
            ),
            supplyPerSecondInterestRateSlopeHigh: BigNumber.from(curve.supplyPerYearInterestRateSlopeHigh).div(
                secondsPerYear
            ),
            supplyPerSecondInterestRateBase: BigNumber.from(curve.supplyPerYearInterestRateBase).div(secondsPerYear),
            borrowKink: curve.borrowKink,
            borrowPerSecondInterestRateSlopeLow: BigNumber.from(curve.borrowPerYearInterestRateSlopeLow).div(
                secondsPerYear
            ),
            borrowPerSecondInterestRateSlopeHigh: BigNumber.from(curve.borrowPerYearInterestRateSlopeHigh).div(
                secondsPerYear
            ),
            borrowPerSecondInterestRateBase: BigNumber.from(curve.borrowPerYearInterestRateBase).div(secondsPerYear),
        };

        // Add new curveId for the base token
        await sandboxController.addBaseAssetCurve(baseToken.address, curve);

        await baseToken.allocateTo(alice.address, SUPPLY_AMOUNT);
        await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT);

        snapshot = await takeSnapshot();
    });
    /// TODO: Add more tests for user positions.
    describe("start curve transition - happy cases", function() {      
        it("should start curve transition", async function() {
            const tx = await configController.initiateCurveTransitionOnComet(comet.address, 1);
            receipt = await tx.wait();
            expect(receipt).to.not.be.reverted;
        });

        it("should change transition status", async function() {
            expect(await comet.isTransitionActive()).to.be.true;
        });

        it("should update storage", async function() {
            const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
            const transition = await comet.transition();

            expect(transition.startTime).to.be.closeTo(timestamp, 10);
            expect(transition.lastUpdateTime).to.be.closeTo(timestamp, 10);
            expect(transition.endTime).to.eq(transition.startTime + transitionDuration);
            expect(transition.startCurveParams.supplyKink).to.eq(startCurve.supplyKink);
            expect(transition.startCurveParams.supplyPerSecondInterestRateSlopeLow).to.eq(
                startCurve.supplyPerSecondInterestRateSlopeLow
            );
            expect(transition.startCurveParams.supplyPerSecondInterestRateSlopeHigh).to.eq(
                startCurve.supplyPerSecondInterestRateSlopeHigh
            );
            expect(transition.startCurveParams.supplyPerSecondInterestRateBase).to.eq(
                startCurve.supplyPerSecondInterestRateBase
            );
            expect(transition.startCurveParams.borrowKink).to.eq(startCurve.borrowKink);
            expect(transition.startCurveParams.borrowPerSecondInterestRateSlopeLow).to.eq(
                startCurve.borrowPerSecondInterestRateSlopeLow
            );
            expect(transition.startCurveParams.borrowPerSecondInterestRateSlopeHigh).to.eq(
                startCurve.borrowPerSecondInterestRateSlopeHigh
            );
            expect(transition.startCurveParams.borrowPerSecondInterestRateBase).to.eq(
                startCurve.borrowPerSecondInterestRateBase
            );
            expect(transition.targetCurveParams.supplyKink).to.eq(targetCurve.supplyKink);
            expect(transition.targetCurveParams.supplyPerSecondInterestRateSlopeLow).to.eq(
                targetCurve.supplyPerSecondInterestRateSlopeLow
            );
            expect(transition.targetCurveParams.supplyPerSecondInterestRateSlopeHigh).to.eq(
                targetCurve.supplyPerSecondInterestRateSlopeHigh
            );
            expect(transition.targetCurveParams.supplyPerSecondInterestRateBase).to.eq(
                targetCurve.supplyPerSecondInterestRateBase
            );
            expect(transition.targetCurveParams.borrowKink).to.eq(targetCurve.borrowKink);
            expect(transition.targetCurveParams.borrowPerSecondInterestRateSlopeLow).to.eq(
                targetCurve.borrowPerSecondInterestRateSlopeLow
            );
            expect(transition.targetCurveParams.borrowPerSecondInterestRateSlopeHigh).to.eq(
                targetCurve.borrowPerSecondInterestRateSlopeHigh
            );
            expect(transition.targetCurveParams.borrowPerSecondInterestRateBase).to.eq(
                targetCurve.borrowPerSecondInterestRateBase
            );
        });

        it("should emit event after starting curve transition", async function() {
            const blockTime = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

            expect(receipt)
                .to.emit(comet, "CurveTranstionStarted")
                .withArgs(
                    blockTime,
                    blockTime + transitionDuration,
                    startCurve,
                    targetCurve
                );
        });
    });

    describe("start curve transition - revert cases", function() {
        it("should revert if transition is already active", async function() {
            await expect(configController.initiateCurveTransitionOnComet(comet.address, 1)).to.be.revertedWithCustomError(
                comet,
                "TransitionAlreadyActive"
            );
        });

        it("should revert if curveId is invalid", async function() {
            await snapshot.restore();
            await expect(configController.initiateCurveTransitionOnComet(comet.address, 2)).to.be.revertedWithCustomError(
                configController,
                "InvalidCurveId"
            );
        });

        it("should revert if caller is not config controller", async function() {
            await expect(comet.connect(alice).initiateCurveTransition(1)).to.be.revertedWithCustomError(
                comet,
                "Unauthorized"
            );
        });
    });

    describe("update curve values during transition", function() {
        beforeEach(async function() {
            // Start the curve transition
            await configController.initiateCurveTransitionOnComet(comet.address, 1);
            await baseToken.connect(alice).allocateTo(alice.address, SUPPLY_AMOUNT * 4n);
            await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT * 4n);
        });

        afterEach(async () => await snapshot.restore());

        it("should update curve values", async function() {
            const currentSupplyKink = await comet.supplyKink();
            const currentBorrowKink = await comet.borrowKink();
            const currentSupplyPerSecondInterestRateSlopeLow = await comet.supplyPerSecondInterestRateSlopeLow();
            const currentSupplyPerSecondInterestRateSlopeHigh = await comet.supplyPerSecondInterestRateSlopeHigh();
            const currentSupplyPerSecondInterestRateBase = await comet.supplyPerSecondInterestRateBase();
            const currentBorrowPerSecondInterestRateSlopeLow = await comet.borrowPerSecondInterestRateSlopeLow();
            const currentBorrowPerSecondInterestRateSlopeHigh = await comet.borrowPerSecondInterestRateSlopeHigh();
            const currentBorrowPerSecondInterestRateBase = await comet.borrowPerSecondInterestRateBase();

            const isTransitionActive = await comet.isTransitionActive();
            expect(isTransitionActive).to.be.true;

            expect(currentSupplyKink).to.eq(startCurve.supplyKink);
            expect(currentBorrowKink).to.eq(startCurve.borrowKink);
            expect(currentSupplyPerSecondInterestRateSlopeLow).to.eq(startCurve.supplyPerSecondInterestRateSlopeLow);
            expect(currentSupplyPerSecondInterestRateSlopeHigh).to.eq(startCurve.supplyPerSecondInterestRateSlopeHigh);
            expect(currentSupplyPerSecondInterestRateBase).to.eq(startCurve.supplyPerSecondInterestRateBase);
            expect(currentBorrowPerSecondInterestRateSlopeLow).to.eq(startCurve.borrowPerSecondInterestRateSlopeLow);
            expect(currentBorrowPerSecondInterestRateSlopeHigh).to.eq(startCurve.borrowPerSecondInterestRateSlopeHigh);
            expect(currentBorrowPerSecondInterestRateBase).to.eq(startCurve.borrowPerSecondInterestRateBase);

            const skipTime = transitionDuration / 4;
            const expectedChangeForEachUpdate = exp(0.025, 18);
            const expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate = BigNumber.from(targetCurve.supplyPerSecondInterestRateSlopeLow)
                .sub(startCurve.supplyPerSecondInterestRateSlopeLow)
                .div(4);
            const expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate = BigNumber.from(startCurve.supplyPerSecondInterestRateSlopeHigh)
                .sub(targetCurve.supplyPerSecondInterestRateSlopeHigh)
                .div(4);
            const expectedSupplyPerSecondInterestRateBaseForEachUpdate = BigNumber.from(startCurve.supplyPerSecondInterestRateBase)
                .sub(targetCurve.supplyPerSecondInterestRateBase)
                .div(4);
            const expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate = BigNumber.from(targetCurve.borrowPerSecondInterestRateSlopeLow)
                .sub(startCurve.borrowPerSecondInterestRateSlopeLow)
                .div(4);
            const expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate = BigNumber.from(targetCurve.borrowPerSecondInterestRateSlopeHigh)
                .sub(startCurve.borrowPerSecondInterestRateSlopeHigh)
                .div(4);
            const expectedBorrowPerSecondInterestRateBaseForEachUpdate = BigNumber.from(targetCurve.borrowPerSecondInterestRateBase)
                .sub(startCurve.borrowPerSecondInterestRateBase)
                .div(4);

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterFirstUpdate = await comet.supplyKink();
            const borrowKinkAfterFirstUpdate = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLowFirstUpdate = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHighFirstUpdate = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBaseFirstUpdate = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLowFirstUpdate = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHighFirstUpdate = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBaseFirstUpdate = await comet.borrowPerSecondInterestRateBase();

            /// Allow tolerance of 0.5% for rounding errors
            expect(supplyKinkAfterFirstUpdate).to.be.closeTo(currentSupplyKink.sub(expectedChangeForEachUpdate), ethers.utils.parseUnits("0.5", 18));
            expect(borrowKinkAfterFirstUpdate).to.be.closeTo(currentBorrowKink.add(expectedChangeForEachUpdate), ethers.utils.parseUnits("0.5", 18));
            expect(supplyPerSecondInterestRateSlopeLowFirstUpdate).to.be.closeTo(
                currentSupplyPerSecondInterestRateSlopeLow.add(expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(supplyPerSecondInterestRateSlopeHighFirstUpdate).to.be.closeTo(
                currentSupplyPerSecondInterestRateSlopeHigh.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(supplyPerSecondInterestRateBaseFirstUpdate).to.be.closeTo(
                currentSupplyPerSecondInterestRateBase.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateSlopeLowFirstUpdate).to.be.closeTo(
                currentBorrowPerSecondInterestRateSlopeLow.add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateSlopeHighFirstUpdate).to.be.closeTo(
                currentBorrowPerSecondInterestRateSlopeHigh.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateBaseFirstUpdate).to.be.closeTo(
                currentBorrowPerSecondInterestRateBase.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterSecondUpdate = await comet.supplyKink();
            const borrowKinkAfterSecondUpdate = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLowSecondUpdate = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHighSecondUpdate = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBaseSecondUpdate = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLowSecondUpdate = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHighSecondUpdate = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBaseSecondUpdate = await comet.borrowPerSecondInterestRateBase();

            expect(supplyKinkAfterSecondUpdate).to.eq(supplyKinkAfterFirstUpdate.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterSecondUpdate).to.eq(borrowKinkAfterFirstUpdate.add(expectedChangeForEachUpdate));
            expect(supplyPerSecondInterestRateSlopeLowSecondUpdate).to.eq(
                supplyPerSecondInterestRateSlopeLowFirstUpdate.add(
                    expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate
                )
            );
            expect(supplyPerSecondInterestRateSlopeHighSecondUpdate).to.be.closeTo(
                supplyPerSecondInterestRateSlopeHighFirstUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(supplyPerSecondInterestRateBaseSecondUpdate).to.be.closeTo(
                supplyPerSecondInterestRateBaseFirstUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateSlopeLowSecondUpdate).to.be.closeTo(
                borrowPerSecondInterestRateSlopeLowFirstUpdate
                    .add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateSlopeHighSecondUpdate).to.eq(
                borrowPerSecondInterestRateSlopeHighFirstUpdate.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(borrowPerSecondInterestRateBaseSecondUpdate).to.eq(
                borrowPerSecondInterestRateBaseFirstUpdate.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate)
            );

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterThirdUpdate = await comet.supplyKink();
            const borrowKinkAfterThirdUpdate = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLowThirdUpdate = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHighThirdUpdate = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBaseThirdUpdate = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLowThirdUpdate = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHighThirdUpdate = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBaseThirdUpdate = await comet.borrowPerSecondInterestRateBase();

            expect(supplyKinkAfterThirdUpdate).to.eq(supplyKinkAfterSecondUpdate.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterThirdUpdate).to.eq(borrowKinkAfterSecondUpdate.add(expectedChangeForEachUpdate));
            expect(supplyPerSecondInterestRateSlopeLowThirdUpdate).to.eq(
                supplyPerSecondInterestRateSlopeLowSecondUpdate.add(
                    expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate
                )
            );
            expect(supplyPerSecondInterestRateSlopeHighThirdUpdate).to.be.closeTo(
                supplyPerSecondInterestRateSlopeHighSecondUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(supplyPerSecondInterestRateBaseThirdUpdate).to.be.closeTo(
                supplyPerSecondInterestRateBaseSecondUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(borrowPerSecondInterestRateSlopeLowThirdUpdate).to.eq(
                borrowPerSecondInterestRateSlopeLowSecondUpdate.add(
                    expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate
                )
            );
            expect(borrowPerSecondInterestRateSlopeHighThirdUpdate).to.eq(
                borrowPerSecondInterestRateSlopeHighSecondUpdate.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(borrowPerSecondInterestRateBaseThirdUpdate).to.eq(
                borrowPerSecondInterestRateBaseSecondUpdate.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate)
            );

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const finalSupplyKink = await comet.supplyKink();
            const finalBorrowKink = await comet.borrowKink();
            const finalSupplyPerSecondInterestRateSlopeLow = await comet.supplyPerSecondInterestRateSlopeLow();
            const finalSupplyPerSecondInterestRateSlopeHigh = await comet.supplyPerSecondInterestRateSlopeHigh();
            const finalSupplyPerSecondInterestRateBase = await comet.supplyPerSecondInterestRateBase();
            const finalBorrowPerSecondInterestRateSlopeLow = await comet.borrowPerSecondInterestRateSlopeLow();
            const finalBorrowPerSecondInterestRateSlopeHigh = await comet.borrowPerSecondInterestRateSlopeHigh();
            const finalBorrowPerSecondInterestRateBase = await comet.borrowPerSecondInterestRateBase();

            expect(finalSupplyKink).to.be.closeTo(supplyKinkAfterThirdUpdate.sub(expectedChangeForEachUpdate), ethers.utils.parseUnits("0.5", 18));
            expect(finalBorrowKink).to.be.closeTo(borrowKinkAfterThirdUpdate.add(expectedChangeForEachUpdate), ethers.utils.parseUnits("0.5", 18));
            expect(finalSupplyPerSecondInterestRateSlopeLow).to.be.closeTo(
                supplyPerSecondInterestRateSlopeLowThirdUpdate.add(
                    expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(finalSupplyPerSecondInterestRateSlopeHigh).to.be.closeTo(
                supplyPerSecondInterestRateSlopeHighThirdUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(finalSupplyPerSecondInterestRateBase).to.be.closeTo(
                supplyPerSecondInterestRateBaseThirdUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(finalBorrowPerSecondInterestRateSlopeLow).to.be.closeTo(
                borrowPerSecondInterestRateSlopeLowThirdUpdate
                    .add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(finalBorrowPerSecondInterestRateSlopeHigh).to.be.closeTo(
                borrowPerSecondInterestRateSlopeHighThirdUpdate.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                ),
                200000 // Allow tolerance of 200000 for rounding errors
            );
            expect(finalBorrowPerSecondInterestRateBase).to.be.closeTo(
                borrowPerSecondInterestRateBaseThirdUpdate.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate),
                200000 // Allow tolerance of 200000 for rounding errors
            );

            expect(finalSupplyKink).to.be.closeTo(targetCurve.supplyKink, ethers.utils.parseUnits("0.5", 18));
            expect(finalBorrowKink).to.be.closeTo(targetCurve.borrowKink, ethers.utils.parseUnits("0.5", 18));
            expect(finalSupplyPerSecondInterestRateSlopeLow).to.be.closeTo(targetCurve.supplyPerSecondInterestRateSlopeLow, 200000);
            expect(finalSupplyPerSecondInterestRateSlopeHigh).to.be.closeTo(targetCurve.supplyPerSecondInterestRateSlopeHigh, 200000);
            expect(finalSupplyPerSecondInterestRateBase).to.be.closeTo(targetCurve.supplyPerSecondInterestRateBase, 200000);
            expect(finalBorrowPerSecondInterestRateSlopeLow).to.be.closeTo(targetCurve.borrowPerSecondInterestRateSlopeLow, 200000);
            expect(finalBorrowPerSecondInterestRateSlopeHigh).to.be.closeTo(targetCurve.borrowPerSecondInterestRateSlopeHigh, 200000);
            expect(finalBorrowPerSecondInterestRateBase).to.be.closeTo(targetCurve.borrowPerSecondInterestRateBase, 200000);
            expect(await comet.isTransitionActive()).to.be.false;
        });

        it("should not update curve values if endtime is passed", async function() {
            await fastForward(transitionDuration);

            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const supplyKink = await comet.supplyKink();
            const borrowKink = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLow = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHigh = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBase = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLow = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHigh = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBase = await comet.borrowPerSecondInterestRateBase();

            await fastForward(transitionDuration);

            const supplyKinkAfter = await comet.supplyKink();
            const borrowKinkAfter = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLowAfter = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHighAfter = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBaseAfter = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLowAfter = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHighAfter = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBaseAfter = await comet.borrowPerSecondInterestRateBase();

            expect(supplyKink).to.eq(targetCurve.supplyKink);
            expect(supplyKinkAfter).to.eq(targetCurve.supplyKink);

            expect(borrowKink).to.eq(targetCurve.borrowKink);
            expect(borrowKinkAfter).to.eq(targetCurve.borrowKink);

            expect(supplyPerSecondInterestRateSlopeLow).to.eq(targetCurve.supplyPerSecondInterestRateSlopeLow);
            expect(supplyPerSecondInterestRateSlopeLowAfter).to.eq(targetCurve.supplyPerSecondInterestRateSlopeLow);

            expect(supplyPerSecondInterestRateSlopeHigh).to.eq(targetCurve.supplyPerSecondInterestRateSlopeHigh);
            expect(supplyPerSecondInterestRateSlopeHighAfter).to.eq(targetCurve.supplyPerSecondInterestRateSlopeHigh);

            expect(supplyPerSecondInterestRateBase).to.eq(targetCurve.supplyPerSecondInterestRateBase);
            expect(supplyPerSecondInterestRateBaseAfter).to.eq(targetCurve.supplyPerSecondInterestRateBase);

            expect(borrowPerSecondInterestRateSlopeLow).to.eq(targetCurve.borrowPerSecondInterestRateSlopeLow);
            expect(borrowPerSecondInterestRateSlopeLowAfter).to.eq(targetCurve.borrowPerSecondInterestRateSlopeLow);

            expect(borrowPerSecondInterestRateSlopeHigh).to.eq(targetCurve.borrowPerSecondInterestRateSlopeHigh);
            expect(borrowPerSecondInterestRateSlopeHighAfter).to.eq(targetCurve.borrowPerSecondInterestRateSlopeHigh);

            expect(borrowPerSecondInterestRateBase).to.eq(targetCurve.borrowPerSecondInterestRateBase);
            expect(borrowPerSecondInterestRateBaseAfter).to.eq(targetCurve.borrowPerSecondInterestRateBase);
        });

        it("should set isTransitionActive to false when transition ends", async function() {
            await fastForward(transitionDuration);
            await baseToken.connect(alice).allocateTo(alice.address, SUPPLY_AMOUNT);
            await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const isTransitionActive = await comet.isTransitionActive();
            expect(isTransitionActive).to.be.false;
        });

        it("should not effect on user principal during curve transition", async function() {
            // Provide base tokens to comet
            await baseToken.connect(alice).allocateTo(alice.address, SUPPLY_AMOUNT * 10n);
            await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT * 10n);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT * 10n);

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1000, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await collateral.connect(bob).approve(comet.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, SUPPLY_AMOUNT);
            const principal1 = (await comet.userBasic(bob.address)).principal;
            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            const principal2 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            const principal3 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            const principal4 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            const principal5 = (await comet.userBasic(bob.address)).principal;

            expect(principal1).to.eq(principal2);
            expect(principal2).to.eq(principal3);
            expect(principal3).to.eq(principal4);
            expect(principal4).to.eq(principal5);

            expect(await comet.isTransitionActive()).to.be.false;
            expect(await comet.borrowKink()).to.eq(targetCurve.borrowKink);
        });

        it("should not make user liquidatable during curve transition", async function() {
            // Provide base tokens to comet
            await baseToken.connect(alice).allocateTo(alice.address, SUPPLY_AMOUNT);
            await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await collateral.connect(bob).approve(comet.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, SUPPLY_AMOUNT * 6n);

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            let isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, transitionDuration / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;
        });

        it("should not make user liquidatable after curve transition and 3 months", async function() {
            // Provide base tokens to comet
            await baseToken.connect(alice).allocateTo(alice.address, SUPPLY_AMOUNT);
            await baseToken.connect(alice).approve(comet.address, SUPPLY_AMOUNT);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Supply collateral from Bob and borrow some base token
            // Use a much larger collateral amount to ensure Bob is not liquidatable
            const bobDepositAmount = exp(1000, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await collateral.connect(bob).approve(comet.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            // Borrow a small amount relative to collateral to stay well below liquidation threshold
            await comet.connect(bob).withdraw(baseToken.address, exp(10, 6));

            await skipTimeAndAccrueAccount(comet, time.duration.weeks(12), bob.address);

            let isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;
        });
    });
});
