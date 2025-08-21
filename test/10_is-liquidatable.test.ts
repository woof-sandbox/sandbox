import { ethers, expect, exp, makeConfigController, createComet, SnapshotRestorer, takeSnapshot, time, Protocol } from "./helper/helpers";
import { SandboxComet, ConfigController, FaucetToken, ICometExtension, ISandboxController } from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { Zero } = ethers.constants;

describe("10. isLiquidatable", function () {
  let owner: SignerWithAddress,
    dao: SignerWithAddress,
    curator: SignerWithAddress,
    treasury: SignerWithAddress,
    guardian: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress,
    charlie: SignerWithAddress;
  let comet: SandboxComet;
  let cometExtension: ICometExtension;
  let configController: ConfigController;
  let sandboxController: ISandboxController;
  const collateralSymbols: string[] = [];

  let baseToken: FaucetToken;
  let baseTokenDecimals: number;
  let collaterals: { [symbol: string]: FaucetToken } = {};

  let opts: Protocol;

  before(async function () {
    [owner, dao, curator, guardian, treasury, bob, alice, charlie] = await ethers.getSigners();

    opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury.address,
      curator: curator,
      guardian: guardian,
    });
    configController = opts.configController;
    sandboxController = opts.sandboxController;
    baseToken = opts.baseToken as FaucetToken;
    baseTokenDecimals = await baseToken.decimals();

    comet = await createComet(owner, opts.opts.assets, configController, sandboxController, opts.collaterals, baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as ICometExtension;

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
      collateralSymbols.push(asset);
    }
  });

  let collateralAmount: bigint;
  let collateralSymbol: string;
  let borrowAmount: bigint;
  let snapshot: SnapshotRestorer;

  before(async function () {
    // Setup borrowing position for bob
    collateralSymbol = collateralSymbols[0];
    const collateral = collaterals[collateralSymbol];
    const collateralDecimals = await collateral.decimals();
    collateralAmount = exp(10, collateralDecimals); // 10 * 175 = 1750

    await collateral.connect(bob).allocateTo(bob.address, collateralAmount);
    await collateral.connect(bob).approve(comet.address, collateralAmount);
    await comet.connect(bob).supply(collateral.address, collateralAmount);
    borrowAmount = exp(1000, baseTokenDecimals);
    await comet.connect(bob).withdraw(baseToken.address, borrowAmount);

    // Setup collateral for alice
    await collateral.connect(alice).allocateTo(alice.address, collateralAmount);
    await collateral.connect(alice).approve(comet.address, collateralAmount);
    await comet.connect(alice).supply(collateral.address, collateralAmount);

    // Setup borrowing position for charlie
    await collateral.connect(charlie).allocateTo(charlie.address, collateralAmount);
    await collateral.connect(charlie).approve(comet.address, collateralAmount);
    await comet.connect(charlie).supply(collateral.address, collateralAmount);
    await comet.connect(charlie).withdraw(baseToken.address, borrowAmount);

    // Take snapshot after setup
    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    // Restore snapshot after each test
    await snapshot.restore();
  });

  it("should not be liquidatable", async () => {
    expect(await comet.isLiquidatable(bob.address)).to.be.false;
  });

  it("should not be liquidatable after long holding period if collateral sufficient", async () => {
    // Checks that the user is not liquidatable even after a very long holding period, as long as the collateral remains sufficient to secure the debt.
    const percent = 1n; // 0.0001%
    const allowedDelta = (borrowAmount * percent) / exp(100, 4);

    expect(await comet.borrowBalanceOf(charlie.address)).to.be.closeTo(borrowAmount, allowedDelta);
    await time.increase(time.duration.years(500));
    expect(await comet.borrowBalanceOf(charlie.address)).to.be.greaterThan(borrowAmount * 3n);

    expect(await comet.isLiquidatable(charlie.address)).to.be.false;
  });

  it("should not be liquidatable when collateral value remains sufficient after price drop", async () => {
    const priceFeeds = opts.priceFeeds[collateralSymbol];
    const initPrice = (await priceFeeds.latestRoundData())[1].toBigInt();
    // Simulate a price drop by 20%
    const newPrice = (initPrice * 80n) / 100n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    expect(await comet.isLiquidatable(bob.address)).to.be.false;
  });

  it("should be liquidatable when collateral value becomes insufficient after price drop", async () => {
    const priceFeeds = opts.priceFeeds[collateralSymbol];
    const initPrice = (await priceFeeds.latestRoundData())[1].toBigInt();
    // Simulate a price drop by 75%
    const newPrice = (initPrice * 25n) / 100n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    expect(await comet.isLiquidatable(bob.address)).to.be.true;
  });

  it("should not be liquidatable if user has no debt and collateral is worthless", async () => {
    // Checks that a user cannot be liquidated if they have no debt, even when their collateral price drops almost to zero.
    const priceFeeds = opts.priceFeeds[collateralSymbol];
    // Simulate a price drop
    const newPrice = 1n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    for (const symbol of collateralSymbols) {
      expect(await cometExtension.userCollateral(alice.address, collaterals[symbol].address)).to.equal(
        symbol === collateralSymbol ? collateralAmount : Zero
      );
    }
    expect(await comet.borrowBalanceOf(alice.address)).to.equal(Zero);
    expect(await comet.isLiquidatable(alice.address)).to.be.false;
  });

  it("should handle additional collateral after price drop", async () => {
    // User becomes liquidatable after collateral price drop, then adds new collateral and becomes non-liquidatable
    const priceFeeds = opts.priceFeeds[collateralSymbol];
    const initPrice = (await priceFeeds.latestRoundData())[1].toBigInt();
    // Simulate a price drop
    const newPrice = initPrice / 4n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    expect(await comet.isLiquidatable(bob.address)).to.be.true;

    const _collateral = collaterals[collateralSymbols[1]];
    const _collateralDecimals = await _collateral.decimals();
    const _collateralAmount = exp(10, _collateralDecimals);

    await _collateral.connect(bob).allocateTo(bob.address, _collateralAmount);
    await _collateral.connect(bob).approve(comet.address, _collateralAmount);
    await comet.connect(bob).supply(_collateral.address, _collateralAmount);

    expect(await comet.isLiquidatable(bob.address)).to.be.false;
  });

  it("should not be liquidatable if other collateral sufficient", async () => {
    // Checks that the user is not liquidatable if one of their collaterals becomes nearly worthless, but other collateral remains sufficient to secure the debt.
    const _collateral = collaterals[collateralSymbols[1]];
    const _collateralDecimals = await _collateral.decimals();
    const _collateralAmount = exp(10, _collateralDecimals);

    await _collateral.connect(bob).allocateTo(bob.address, _collateralAmount);
    await _collateral.connect(bob).approve(comet.address, _collateralAmount);
    await comet.connect(bob).supply(_collateral.address, _collateralAmount);

    const priceFeeds = opts.priceFeeds[collateralSymbols[0]];
    // Simulate a price drop
    const newPrice = 1n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    expect(await comet.isLiquidatable(bob.address)).to.be.false;
  });
});
