import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    CometExtension,
    CometHarness,
    ConfigControllerTest,
    FaucetToken,
    NonStandardFaucetFeeToken,
} from "../build/types";
import { ethers, exp, expect, fastForward, makeProtocol, skipTimeAndAccrueAccount, SnapshotRestorer, takeSnapshot } from "./helper/helpers";
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
    const SUPPLY_AMOUNT = exp(10, 18);

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
            const isTransitionActive = await comet.isTransitionActive();
            expect(isTransitionActive).to.be.true;

            expect(currentSupplyKink).to.eq(startCurve.supplyKink);
            expect(currentBorrowKink).to.eq(startCurve.borrowKink);

            const skipTime = TRANSITION_DURATION / 4;
            const expectedChangeForEachUpdate = exp(0.025, 18);

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterFirstUpdate = await comet.supplyKink();
            const borrowKinkAfterFirstUpdate = await comet.borrowKink();
            expect(supplyKinkAfterFirstUpdate).to.eq(currentSupplyKink.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterFirstUpdate).to.eq(currentBorrowKink.add(expectedChangeForEachUpdate));

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterSecondUpdate = await comet.supplyKink();
            const borrowKinkAfterSecondUpdate = await comet.borrowKink();
            expect(supplyKinkAfterSecondUpdate).to.eq(supplyKinkAfterFirstUpdate.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterSecondUpdate).to.eq(borrowKinkAfterFirstUpdate.add(expectedChangeForEachUpdate));

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const supplyKinkAfterThirdUpdate = await comet.supplyKink();
            const borrowKinkAfterThirdUpdate = await comet.borrowKink();
            expect(supplyKinkAfterThirdUpdate).to.eq(supplyKinkAfterSecondUpdate.sub(expectedChangeForEachUpdate));
            expect(borrowKinkAfterThirdUpdate).to.eq(borrowKinkAfterSecondUpdate.add(expectedChangeForEachUpdate));

            await fastForward(skipTime);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            // Check changes
            const finalSupplyKink = await comet.supplyKink();
            const finalBorrowKink = await comet.borrowKink();
            expect(finalSupplyKink).to.eq(supplyKinkAfterThirdUpdate.sub(expectedChangeForEachUpdate));
            expect(finalBorrowKink).to.eq(borrowKinkAfterThirdUpdate.add(expectedChangeForEachUpdate));

            expect(finalSupplyKink).to.eq(targetCurve.supplyKink);
            expect(finalBorrowKink).to.eq(targetCurve.borrowKink);
            expect(await comet.isTransitionActive()).to.be.false;
        });

        it("should not update curve values if endtime is passed", async function() {
            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const supplyKink = await comet.supplyKink();

            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const supplyKink2 = await comet.supplyKink();
            expect(supplyKink).to.eq(targetCurve.supplyKink);
            expect(supplyKink2).to.eq(targetCurve.supplyKink);
        });

        it("should set isTransitionActive to false when transition ends", async function() {
            await fastForward(TRANSITION_DURATION);
            await comet.connect(alice).supply(baseToken.address, SUPPLY_AMOUNT);

            const isTransitionActive = await comet.isTransitionActive();
            expect(isTransitionActive).to.be.false;
        });

        it("should not effect on user principal during curve transition", async function() {
            // Provide base tokens to comet
            await comet.connect(alice).supply(baseToken.address, exp(1000, 18));

            // Supply collateral from Bob and borrow some base token
            const bobDepositAmount = exp(1000, 18);
            await collateral.allocateTo(bob.address, bobDepositAmount);
            await comet.connect(bob).supply(collateral.address, bobDepositAmount);
            await comet.connect(bob).withdraw(baseToken.address, exp(10, 6));
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
            await comet.connect(bob).withdraw(baseToken.address, exp(60, 6));

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

        it('should not make user liquidatable after curve transition and 1 month', async function() {
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

        it('should not make user liquidatable after curve transition and 3 months', async function() {
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
