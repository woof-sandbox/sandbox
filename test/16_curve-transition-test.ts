import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    CometExtension,
    CometHarness,
    ConfigControllerTest,
    FaucetToken,
    NonStandardFaucetFeeToken,
} from "../build/types";
import {
    ethers,
    exp,
    expect,
    fastForward,
    makeProtocol,
    skipTimeAndAccrueAccount,
    SnapshotRestorer,
    takeSnapshot,
} from "./helper/helpers";
import { BaseAssetCurveStruct, ISandboxController } from "../build/types/ISandboxController";
import { CurveStruct } from "../build/types/CometCore";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("16. curve transition", function() {
    let snapshot: SnapshotRestorer;

    let comet: CometHarness;
    let baseToken: FaucetToken | NonStandardFaucetFeeToken;
    let collateral: FaucetToken | NonStandardFaucetFeeToken;
    let configController: ConfigControllerTest;
    let sandboxController: ISandboxController;

    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    let startCurve: CurveStruct;
    let targetCurve: CurveStruct;

    // constants
    const TRANSITION_DURATION = 7 * 24 * 60 * 60; // 7 days
    const SUPPLY_AMOUNT = exp(10, 6);

    before(async () => {
        ({
            comet,
            baseToken,
            configController,
            sandboxController,
            users: [owner, alice, bob],
            tokens: { COMP: collateral },
        } = await makeProtocol({
            base: "USDC",
            assets: {
                USDC: { decimals: 6, initialPrice: 1 },
                COMP: {
                    decimals: 18,
                    initialPrice: 100,
                },
            },
        }));

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

        await baseToken.allocateTo(alice.address, exp(1000, 18));

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("start curve transition", function() {
        it("should start curve transition", async function() {
            await configController.startCurveTransitionOnComet(comet.address, 1);

            const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
            const transition = await comet.transition();

            expect(transition.startTime).to.be.closeTo(timestamp, 10);
            expect(transition.lastUpdateTime).to.be.closeTo(timestamp, 10);
            expect(transition.endTime).to.eq(transition.startTime + TRANSITION_DURATION);
            expect(await comet.isTransitionActive()).to.be.true;
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
            const tx = await configController.startCurveTransitionOnComet(comet.address, 1);

            const transition = await comet.transition();

            expect(tx)
                .to.emit(comet, "CurveTranstionStarted")
                .withArgs(
                    transition.startTime,
                    transition.endTime,
                    transition.startCurveParams,
                    transition.targetCurveParams
                );
        });

        it("should revert if caller is not config controller", async function() {
            await expect(comet.connect(alice).startCurveTransition(1)).to.be.revertedWithCustomError(
                comet,
                "Unauthorized"
            );
        });
    });

    describe("update curve values during transition", function() {
        beforeEach(async function() {
            // Start the curve transition
            await configController.startCurveTransitionOnComet(comet.address, 1);
        });

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

            const skipTime = TRANSITION_DURATION / 4;
            const expectedChangeForEachUpdate = exp(0.025, 18);
            const expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate = targetCurve.supplyPerSecondInterestRateSlopeLow
                .sub(startCurve.supplyPerSecondInterestRateSlopeLow)
                .div(4);
            const expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate = startCurve.supplyPerSecondInterestRateSlopeHigh
                .sub(targetCurve.supplyPerSecondInterestRateSlopeHigh)
                .div(4);
            const expectedSupplyPerSecondInterestRateBaseForEachUpdate = startCurve.supplyPerSecondInterestRateBase
                .sub(targetCurve.supplyPerSecondInterestRateBase)
                .div(4);
            const expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate = targetCurve.borrowPerSecondInterestRateSlopeLow
                .sub(startCurve.borrowPerSecondInterestRateSlopeLow)
                .div(4);
            const expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate = targetCurve.borrowPerSecondInterestRateSlopeHigh
                .sub(startCurve.borrowPerSecondInterestRateSlopeHigh)
                .div(4);
            const expectedBorrowPerSecondInterestRateBaseForEachUpdate = targetCurve.borrowPerSecondInterestRateBase
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

            expect(supplyKinkAfterFirstUpdate).to.eq(currentSupplyKink.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterFirstUpdate).to.eq(currentBorrowKink.add(expectedChangeForEachUpdate));
            expect(supplyPerSecondInterestRateSlopeLowFirstUpdate).to.eq(
                currentSupplyPerSecondInterestRateSlopeLow.add(expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate)
            );
            expect(supplyPerSecondInterestRateSlopeHighFirstUpdate).to.eq(
                currentSupplyPerSecondInterestRateSlopeHigh.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(supplyPerSecondInterestRateBaseFirstUpdate).to.eq(
                currentSupplyPerSecondInterestRateBase.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate)
            );
            expect(borrowPerSecondInterestRateSlopeLowFirstUpdate).to.eq(
                currentBorrowPerSecondInterestRateSlopeLow.add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate)
            );
            expect(borrowPerSecondInterestRateSlopeHighFirstUpdate).to.eq(
                currentBorrowPerSecondInterestRateSlopeHigh.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(borrowPerSecondInterestRateBaseFirstUpdate).to.eq(
                currentBorrowPerSecondInterestRateBase.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate)
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
            expect(supplyPerSecondInterestRateSlopeHighSecondUpdate).to.eq(
                supplyPerSecondInterestRateSlopeHighFirstUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(supplyPerSecondInterestRateBaseSecondUpdate).to.eq(
                supplyPerSecondInterestRateBaseFirstUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate)
            );
            expect(borrowPerSecondInterestRateSlopeLowSecondUpdate).to.eq(
                borrowPerSecondInterestRateSlopeLowFirstUpdate
                    .add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate)
                    .add(1)
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
            expect(supplyPerSecondInterestRateSlopeHighThirdUpdate).to.eq(
                supplyPerSecondInterestRateSlopeHighSecondUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(supplyPerSecondInterestRateBaseThirdUpdate).to.eq(
                supplyPerSecondInterestRateBaseSecondUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate)
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

            expect(finalSupplyKink).to.eq(supplyKinkAfterThirdUpdate.sub(expectedChangeForEachUpdate));
            expect(finalBorrowKink).to.eq(borrowKinkAfterThirdUpdate.add(expectedChangeForEachUpdate));
            expect(finalSupplyPerSecondInterestRateSlopeLow).to.eq(
                supplyPerSecondInterestRateSlopeLowThirdUpdate.add(
                    expectedSupplyPerSecondInterestRateSlopeLowForEachUpdate
                )
            );
            expect(finalSupplyPerSecondInterestRateSlopeHigh).to.eq(
                supplyPerSecondInterestRateSlopeHighThirdUpdate.sub(
                    expectedSupplyPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(finalSupplyPerSecondInterestRateBase).to.eq(
                supplyPerSecondInterestRateBaseThirdUpdate.sub(expectedSupplyPerSecondInterestRateBaseForEachUpdate)
            );
            expect(finalBorrowPerSecondInterestRateSlopeLow).to.eq(
                borrowPerSecondInterestRateSlopeLowThirdUpdate
                    .add(expectedBorrowPerSecondInterestRateSlopeLowForEachUpdate)
                    .add(1)
            );
            expect(finalBorrowPerSecondInterestRateSlopeHigh).to.eq(
                borrowPerSecondInterestRateSlopeHighThirdUpdate.add(
                    expectedBorrowPerSecondInterestRateSlopeHighForEachUpdate
                )
            );
            expect(finalBorrowPerSecondInterestRateBase).to.eq(
                borrowPerSecondInterestRateBaseThirdUpdate.add(expectedBorrowPerSecondInterestRateBaseForEachUpdate)
            );

            expect(finalSupplyKink).to.eq(targetCurve.supplyKink);
            expect(finalBorrowKink).to.eq(targetCurve.borrowKink);
            expect(finalSupplyPerSecondInterestRateSlopeLow).to.eq(targetCurve.supplyPerSecondInterestRateSlopeLow);
            expect(finalSupplyPerSecondInterestRateSlopeHigh).to.eq(targetCurve.supplyPerSecondInterestRateSlopeHigh);
            expect(finalSupplyPerSecondInterestRateBase).to.eq(targetCurve.supplyPerSecondInterestRateBase);
            expect(finalBorrowPerSecondInterestRateSlopeLow).to.eq(targetCurve.borrowPerSecondInterestRateSlopeLow);
            expect(finalBorrowPerSecondInterestRateSlopeHigh).to.eq(targetCurve.borrowPerSecondInterestRateSlopeHigh);
            expect(finalBorrowPerSecondInterestRateBase).to.eq(targetCurve.borrowPerSecondInterestRateBase);
            expect(await comet.isTransitionActive()).to.be.false;
        });

        it("should not update curve values if endtime is passed", async function() {
            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const supplyKink = await comet.supplyKink();
            const borrowKink = await comet.borrowKink();
            const supplyPerSecondInterestRateSlopeLow = await comet.supplyPerSecondInterestRateSlopeLow();
            const supplyPerSecondInterestRateSlopeHigh = await comet.supplyPerSecondInterestRateSlopeHigh();
            const supplyPerSecondInterestRateBase = await comet.supplyPerSecondInterestRateBase();
            const borrowPerSecondInterestRateSlopeLow = await comet.borrowPerSecondInterestRateSlopeLow();
            const borrowPerSecondInterestRateSlopeHigh = await comet.borrowPerSecondInterestRateSlopeHigh();
            const borrowPerSecondInterestRateBase = await comet.borrowPerSecondInterestRateBase();

            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

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
            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const isTransitionActive = await comet.isTransitionActive();
            expect(isTransitionActive).to.be.false;
        });

        it("should not effect on user principal during curve transition", async function() {
            // Provide base tokens to comet
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT * 10n);

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1000, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, SUPPLY_AMOUNT);
            const principal1 = (await comet.userBasic(bob.address)).principal;
            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            const principal2 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            const principal3 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            const principal4 = (await comet.userBasic(bob.address)).principal;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
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
            await comet.connect(alice).supply(baseToken.address, exp(1000, 18));

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, SUPPLY_AMOUNT * 6n);

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            let isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;

            await skipTimeAndAccrueAccount(comet, TRANSITION_DURATION / 4, bob.address);
            isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;
        });

        it("should not make user liquidatable after curve transition and 1 month", async function() {
            // Provide base tokens to comet
            await comet.connect(alice).supply(baseToken.address, exp(1000, 18));

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, exp(60, 6));

            await skipTimeAndAccrueAccount(comet, time.duration.weeks(5), bob.address);

            let isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;
        });

        it("should not make user liquidatable after curve transition and 3 months", async function() {
            // Provide base tokens to comet
            await comet.connect(alice).supply(baseToken.address, exp(1000, 18));

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, exp(60, 6));

            await skipTimeAndAccrueAccount(comet, time.duration.weeks(13), bob.address);

            let isLiquidatable = await comet.isLiquidatable(bob.address);
            expect(isLiquidatable).to.be.false;
        });
    });
});
