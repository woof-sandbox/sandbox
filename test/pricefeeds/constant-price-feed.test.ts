import { ethers, exp, expect, getBlock, makeToken, SnapshotRestorer, takeSnapshot } from "../helper/helpers";
import { ConstantPriceFeed, ConstantPriceFeed__factory, FaucetToken } from "../../build/types";

describe("ConstantPriceFeed", function () {
  let snapshot: SnapshotRestorer;

  let priceFeed: ConstantPriceFeed;
  let underlyingToken: FaucetToken;

  const PRICE = exp(1, 8); // 1.00 with 8 decimals

  before(async () => {
    const ConstantPriceFeedFactory = (await ethers.getContractFactory("ConstantPriceFeed")) as ConstantPriceFeed__factory;

    underlyingToken = await makeToken({ name: "Underlying Token", symbol: "UTK", decimals: 18 });
    priceFeed = await ConstantPriceFeedFactory.deploy(18, PRICE, underlyingToken.address);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should deploy with correct parameters", async () => {
      expect(await priceFeed.decimals()).to.equal(18);
      expect(await priceFeed.CONSTANT_PRICE()).to.equal(PRICE);
      expect(await priceFeed.underlyingToken()).to.equal(underlyingToken.address);
    });
  });

  describe("latestRoundData", function () {
    it("returns constant price", async () => {
      const latestRoundData = await priceFeed.latestRoundData();

      expect(latestRoundData.answer).to.eq(PRICE);
    });

    it("returns expected roundId, startedAt, updatedAt and answeredInRound values", async () => {
      const { roundId, startedAt, updatedAt, answeredInRound } = await priceFeed.latestRoundData();

      const currentTimestamp = (await getBlock()).timestamp;

      expect(roundId).to.eq(1);
      expect(startedAt).to.eq(currentTimestamp);
      expect(updatedAt).to.eq(currentTimestamp);
      expect(answeredInRound).to.eq(1);
    });
  });
});
