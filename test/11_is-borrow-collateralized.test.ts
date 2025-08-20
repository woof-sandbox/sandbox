import { ethers, expect, exp, makeConfigController, createComet, SnapshotRestorer, takeSnapshot, Protocol } from "./helper/helpers";
import { SandboxComet, ConfigController, FaucetToken, ISandboxController } from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { Zero } = ethers.constants;

describe("11. isBorrowCollateralized", function () {
  let owner: SignerWithAddress,
    dao: SignerWithAddress,
    curator: SignerWithAddress,
    treasury: SignerWithAddress,
    guardian: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress,
    charlie: SignerWithAddress;
  let comet: SandboxComet;
  let configController: ConfigController;
  let sandboxController: ISandboxController;
  const collateralSymbols: string[] = [];

  let baseToken: FaucetToken;
  let baseTokenDecimals: number;
  let collaterals: { [symbol: string]: FaucetToken } = {};
  let opts: Protocol;

  let snapshot: SnapshotRestorer;

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

    for (let asset in opts.collaterals) {
      collaterals[asset] = opts.collaterals[asset] as FaucetToken;
      collateralSymbols.push(asset);
    }

    // Take snapshot after initial setup
    snapshot = await takeSnapshot();
  });

  let collateralAmount: bigint;
  let collateralSymbol: string;

  async function getMaxAvailableBorrow(user: SignerWithAddress): Promise<bigint> {
    let totalLiquidity: bigint = 0n;
    for (const [index, symbol] of collateralSymbols.entries()) {
      const assetInfo = await comet.getAssetInfo(index);
      const borrowCollateralFactor = assetInfo.borrowCollateralFactor.toBigInt();
      const priceFeeds = opts.priceFeeds[symbol];
      const price = (await priceFeeds.latestRoundData())[1].toBigInt();
      const collateral = collaterals[symbol];
      const collateralDecimals = await collateral.decimals();
      const collateralAmount = (await comet.userCollateral(user.address, collateral.address)).toBigInt();
      const collateralLiquidity = (collateralAmount / exp(1, collateralDecimals)) * price;
      totalLiquidity += (collateralLiquidity * borrowCollateralFactor) / exp(1, 18);
    }
    const priceFeeds = opts.priceFeeds[await baseToken.symbol()];
    const baseDecimals = await baseToken.decimals();
    const price = (await priceFeeds.latestRoundData())[1].toBigInt();
    const baseAmount = (totalLiquidity / price) * exp(1, baseDecimals);

    return baseAmount;
  }

  beforeEach(async function () {
    // Setup borrowing position for bob
    collateralSymbol = collateralSymbols[0];
    const collateral = collaterals[collateralSymbol];
    const collateralDecimals = await collateral.decimals();
    collateralAmount = exp(10, collateralDecimals);

    await collateral.connect(bob).allocateTo(bob.address, collateralAmount);
    await collateral.connect(bob).approve(comet.address, collateralAmount);
    await comet.connect(bob).supply(collateral.address, collateralAmount);
    const maxBorrowAmount = await getMaxAvailableBorrow(bob);
    await comet.connect(bob).withdraw(baseToken.address, maxBorrowAmount);

    // Setup collateral for alice
    await collateral.connect(alice).allocateTo(alice.address, collateralAmount);
    await collateral.connect(alice).approve(comet.address, collateralAmount);
    await comet.connect(alice).supply(collateral.address, collateralAmount);

    // Setup borrowing position for charlie
    const borrowAmount = exp(1000, baseTokenDecimals);
    await collateral.connect(charlie).allocateTo(charlie.address, collateralAmount);
    await collateral.connect(charlie).approve(comet.address, collateralAmount);
    await comet.connect(charlie).supply(collateral.address, collateralAmount);
    await comet.connect(charlie).withdraw(baseToken.address, borrowAmount);
  });

  afterEach(async function () {
    // Restore snapshot after each test
    snapshot.restore();
  });

  it("should not allow borrowing when fully collateralized", async () => {
    // Checks that the user cannot borrow more when their debt equals the maximum allowed by their collateral value.
    expect(await comet.isBorrowCollateralized(bob.address)).to.be.false;
  });

  it("should allow borrowing when collateral exceeds debt", async () => {
    // Checks that the user can still borrow more if their collateral value exceeds their current debt.
    expect(await comet.borrowBalanceOf(charlie.address)).to.be.greaterThan(Zero);
    expect(await comet.isBorrowCollateralized(charlie.address)).to.be.true;
  });

  it("should allow borrowing when user has only collateral", async () => {
    // Checks that the user can borrow since they have collateral but no existing debt.
    expect(await comet.borrowBalanceOf(alice.address)).to.equal(Zero);
    expect(await comet.isBorrowCollateralized(alice.address)).to.be.true;
  });

  it("should lose borrowability after collateral price drop", async () => {
    // Checks that changing the collateral price directly affects the user's ability to borrow:
    // before the price drop, the user can borrow; after the price drop, borrowability is lost due to insufficient collateral value.
    expect(await comet.borrowBalanceOf(charlie.address)).to.be.greaterThan(Zero);
    expect(await comet.isBorrowCollateralized(charlie.address)).to.be.true;

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

    expect(await comet.isBorrowCollateralized(charlie.address)).to.be.false;
  });

  it("should lose borrowability after base token price increase", async () => {
    // Checks that changing the base token price directly affects the user's ability to borrow:
    // before the price increase, the user can borrow; after the base token price rises, borrowability is lost due to increased debt value.
    expect(await comet.borrowBalanceOf(charlie.address)).to.be.greaterThan(Zero);
    expect(await comet.isBorrowCollateralized(charlie.address)).to.be.true;

    const priceFeeds = opts.priceFeeds[await baseToken.symbol()];
    const initPrice = (await priceFeeds.latestRoundData())[1].toBigInt();
    // Simulate a price up by x2
    const newPrice = initPrice * 2n;
    await priceFeeds.setRoundData(
      Zero, // roundId
      newPrice, // answer
      Zero, // startedAt
      Zero, // updatedAt
      Zero // answeredInRound
    );

    expect(await comet.isBorrowCollateralized(charlie.address)).to.be.false;
  });
});
