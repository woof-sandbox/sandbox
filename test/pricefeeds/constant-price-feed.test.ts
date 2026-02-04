import { ethers, exp, expect, time, makeMockERC20, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import {
  ConstantPriceFeed,
  ConstantPriceFeed__factory,
  FaucetToken,
  ManagedSimplePriceFeed,
  ManagedSimplePriceFeed__factory,
} from "../../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ConstantPriceFeed", function () {
  let snapshot: SnapshotRestorer;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let priceFeed: ConstantPriceFeed;
  let underlyingToken: FaucetToken;
  let sequencer: ManagedSimplePriceFeed;

  let ConstantPriceFeedFactory: ConstantPriceFeed__factory;
  let ManagedSimplePriceFeedFactory: ManagedSimplePriceFeed__factory;

  const PRICE = exp(1, 8); // 1.00 with 8 decimals

  before(async () => {
    [dao, attacker] = await ethers.getSigners();

    ConstantPriceFeedFactory = (await ethers.getContractFactory("ConstantPriceFeed")) as ConstantPriceFeed__factory;
    ManagedSimplePriceFeedFactory = (await ethers.getContractFactory("ManagedSimplePriceFeed")) as ManagedSimplePriceFeed__factory;

    underlyingToken = await makeMockERC20({ name: "Underlying Token", symbol: "UTK", decimals: 18 });

    // Sequencer with answer 0 (available)
    sequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
    await sequencer.deployed();

    priceFeed = await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 18, PRICE, underlyingToken.address);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should deploy with correct parameters", async () => {
      expect(await priceFeed.decimals()).to.equal(18);
      expect(await priceFeed.CONSTANT_PRICE()).to.equal(PRICE);
      expect(await priceFeed.underlyingToken()).to.equal(underlyingToken.address);
      expect(await priceFeed.version()).to.equal(1);
      expect(await priceFeed.description()).to.equal("Constant price feed");
      expect(await priceFeed.sequencer()).to.equal(sequencer.address);
      expect(await priceFeed.dao()).to.equal(dao.address);
    });

    it("emits SequencerUpdated event", async function () {
      expect(await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 18, PRICE, underlyingToken.address))
        .to.emit(priceFeed, "SequencerUpdated")
        .withArgs(sequencer.address);
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          0, // zero decimals
          PRICE,
          underlyingToken.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          19, // greater than 18
          PRICE,
          underlyingToken.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if constant price is zero", async function () {
      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          18,
          0, // zero price
          underlyingToken.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroValue");
    });

    it("reverts if constant price is negative", async function () {
      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          18,
          -1, // negative price
          underlyingToken.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroValue");
    });

    it("reverts if underlying token is zero address", async function () {
      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          18,
          PRICE,
          ZERO_ADDRESS // zero address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      // Skip on mainnet chain id (1)
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(
        ConstantPriceFeedFactory.deploy(
          dao.address,
          ZERO_ADDRESS,
          18,
          PRICE,
          underlyingToken.address // zero address
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });

    it("works with minimum decimals (1)", async function () {
      const ConstantPriceFeedFactory = (await ethers.getContractFactory("ConstantPriceFeed")) as ConstantPriceFeed__factory;

      const minDecimalPriceFeed = await ConstantPriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        1, // minimum decimals
        5, // positive price
        underlyingToken.address
      );
      await minDecimalPriceFeed.deployed();

      expect(await minDecimalPriceFeed.decimals()).to.equal(1);
      expect(await minDecimalPriceFeed.CONSTANT_PRICE()).to.equal(5);
    });

    it("works with maximum decimals (18)", async function () {
      const highPrecisionPrice = exp(12345, 18); // positive price with 18 decimals

      const maxDecimalPriceFeed = await ConstantPriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        18, // maximum decimals
        highPrecisionPrice,
        underlyingToken.address
      );
      await maxDecimalPriceFeed.deployed();

      expect(await maxDecimalPriceFeed.decimals()).to.equal(18);
      expect(await maxDecimalPriceFeed.CONSTANT_PRICE()).to.equal(highPrecisionPrice);
    });

    it("works with different decimal configurations", async function () {
      const testCases = [
        { decimals: 6, price: exp(1000000, 6) }, // 1.000000 with 6 decimals
        { decimals: 8, price: exp(50000000, 8) }, // 0.50000000 with 8 decimals
        { decimals: 12, price: exp(2500000000000, 12) }, // 2.500000000000 with 12 decimals
      ];

      for (const testCase of testCases) {
        const testPriceFeed = await ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          testCase.decimals,
          testCase.price,
          underlyingToken.address
        );
        await testPriceFeed.deployed();

        expect(await testPriceFeed.decimals()).to.equal(testCase.decimals);
        expect(await testPriceFeed.CONSTANT_PRICE()).to.equal(testCase.price);
      }
    });

    it("works with very large positive price values", async function () {
      const largePrice = 999999999999999999999999999n; // Very large positive number

      const largePriceFeed = await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 8, largePrice, underlyingToken.address);
      await largePriceFeed.deployed();

      expect(await largePriceFeed.CONSTANT_PRICE()).to.equal(largePrice);
    });

    it("works with minimum positive price (1 wei)", async function () {
      const minimumPrice = 1; // 1 wei (smallest positive value)

      const minimumPriceFeed = await ConstantPriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        18,
        minimumPrice,
        underlyingToken.address
      );
      await minimumPriceFeed.deployed();

      expect(await minimumPriceFeed.CONSTANT_PRICE()).to.equal(minimumPrice);
    });

    it("works with maximum int256 value", async function () {
      const maxInt256 = ethers.constants.MaxInt256; // 2^255 - 1

      const maxPriceFeed = await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 8, maxInt256, underlyingToken.address);
      await maxPriceFeed.deployed();

      expect(await maxPriceFeed.CONSTANT_PRICE()).to.equal(maxInt256);
    });
  });

  describe("setSequencer", function () {
    it("updates sequencer address", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await priceFeed.connect(dao).setSequencer(newSequencer.address);

      expect(await priceFeed.sequencer()).to.eq(newSequencer.address);
    });

    it("emits SequencerUpdated event", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await expect(priceFeed.connect(dao).setSequencer(newSequencer.address))
        .to.emit(priceFeed, "SequencerUpdated")
        .withArgs(newSequencer.address);
    });

    it("allows setting sequencer to zero address on mainnet", async function () {
      // we'll skip this test if not on mainnet
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId !== 1) {
        this.skip();
      }

      await priceFeed.connect(dao).setSequencer(ZERO_ADDRESS);
      expect(await priceFeed.sequencer()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if caller is not dao", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await expect(priceFeed.connect(attacker).setSequencer(newSequencer.address)).to.be.revertedWithCustomError(priceFeed, "NotDao");
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(priceFeed.connect(dao).setSequencer(ZERO_ADDRESS)).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });

    it("reverts if current sequencer is a new one", async function () {
      const newSequencer = sequencer.address;

      await expect(priceFeed.setSequencer(newSequencer)).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });
  });

  describe("latestRoundData", function () {
    it("returns constant price", async () => {
      const latestRoundData = await priceFeed.latestRoundData();

      expect(latestRoundData.answer).to.eq(PRICE);
    });

    it("returns expected roundId, startedAt, updatedAt and answeredInRound values", async () => {
      const { roundId, startedAt, updatedAt, answeredInRound } = await priceFeed.latestRoundData();

      const currentTimestamp = await time.latest();

      expect(roundId).to.eq(1);
      expect(startedAt).to.eq(currentTimestamp);
      expect(updatedAt).to.eq(currentTimestamp);
      expect(answeredInRound).to.eq(1);
    });

    it("always returns the same constant price regardless of time", async () => {
      const { answer: answer1 } = await priceFeed.latestRoundData();

      // Advance time
      await time.increase(time.duration.days(1));

      const { answer: answer2 } = await priceFeed.latestRoundData();

      expect(answer1).to.eq(PRICE);
      expect(answer2).to.eq(PRICE);
      expect(answer1).to.eq(answer2);
    });

    it("always returns roundId 1 and answeredInRound 1", async () => {
      const { roundId: roundId1, answeredInRound: answeredInRound1 } = await priceFeed.latestRoundData();

      // Advance time and mine blocks
      await time.increase(time.duration.days(1));

      const { roundId: roundId2, answeredInRound: answeredInRound2 } = await priceFeed.latestRoundData();

      expect(roundId1).to.eq(1);
      expect(answeredInRound1).to.eq(1);
      expect(roundId2).to.eq(1);
      expect(answeredInRound2).to.eq(1);
    });

    it("reverts when sequencer is down", async function () {
      await sequencer.setRoundData(3, 1, await time.latest(), await time.latest(), 3); // Sequencer down

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("returns current block timestamp for startedAt and updatedAt", async () => {
      const beforeTimestamp = await time.latest();

      // Mine a new block
      await ethers.provider.send("evm_mine", []);

      const { startedAt, updatedAt } = await priceFeed.latestRoundData();
      const afterTimestamp = await time.latest();

      expect(startedAt).to.eq(afterTimestamp);
      expect(updatedAt).to.eq(afterTimestamp);
      expect(startedAt).to.be.gt(beforeTimestamp);
      expect(startedAt).to.eq(updatedAt);
    });

    describe("different price feed configurations", function () {
      it("returns correct constant price for different decimal configurations", async function () {
        const testCases = [
          { decimals: 6, price: exp(1500000, 6) }, // 1.500000 with 6 decimals
          { decimals: 8, price: exp(250000000, 8) }, // 2.50000000 with 8 decimals
          { decimals: 18, price: exp(3750000000000000000, 18) }, // 3.750000000000000000 with 18 decimals
        ];

        for (const testCase of testCases) {
          const testPriceFeed = await ConstantPriceFeedFactory.deploy(
            dao.address,
            sequencer.address,
            testCase.decimals,
            testCase.price,
            underlyingToken.address
          );
          await testPriceFeed.deployed();

          const { answer } = await testPriceFeed.latestRoundData();
          expect(answer).to.eq(testCase.price);
        }
      });

      it("returns correct price for very large constant values", async function () {
        const largePrice = 999999999999999999999999999n;

        const largePriceFeed = await ConstantPriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          8,
          largePrice,
          underlyingToken.address
        );
        await largePriceFeed.deployed();

        const { answer } = await largePriceFeed.latestRoundData();
        expect(answer).to.eq(largePrice);
      });

      it("returns correct price for minimum positive value", async function () {
        const minPrice = 1n; // 1 wei

        const minPriceFeed = await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 18, minPrice, underlyingToken.address);
        await minPriceFeed.deployed();

        const { answer } = await minPriceFeed.latestRoundData();
        expect(answer).to.eq(minPrice);
      });

      it("returns correct price for maximum int256 value", async function () {
        const maxInt256 = ethers.constants.MaxInt256;

        const maxPriceFeed = await ConstantPriceFeedFactory.deploy(dao.address, sequencer.address, 8, maxInt256, underlyingToken.address);
        await maxPriceFeed.deployed();

        const { answer } = await maxPriceFeed.latestRoundData();
        expect(answer).to.eq(maxInt256);
      });
    });

    describe("multiple calls consistency", function () {
      it("returns different timestamps after mining new blocks", async function () {
        const { startedAt: startedAt1, updatedAt: updatedAt1 } = await priceFeed.latestRoundData();

        // Mine a new block
        await ethers.provider.send("evm_mine", []);

        const { startedAt: startedAt2, updatedAt: updatedAt2 } = await priceFeed.latestRoundData();

        // Timestamps should be different (newer)
        expect(startedAt2).to.be.gt(startedAt1);
        expect(updatedAt2).to.be.gt(updatedAt1);
        expect(startedAt2).to.eq(updatedAt2);
      });

      it("maintains constant price even after significant time passage", async function () {
        const { answer: initialAnswer } = await priceFeed.latestRoundData();

        // Advance time significantly (2 year)
        await time.increase(time.duration.years(2));

        const { answer: finalAnswer } = await priceFeed.latestRoundData();

        expect(initialAnswer).to.eq(PRICE);
        expect(finalAnswer).to.eq(PRICE);
        expect(initialAnswer).to.eq(finalAnswer);
      });
    });
  });
});
