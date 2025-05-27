import { expect } from 'chai';
import { ethers } from 'hardhat';
import { 
  makeConfigController,
  factor,
  exp
} from './helper/helpers';
import { MarketConfigStruct } from '../build/types/ConfigController';

const marketFactoryAbi = [
  'event MarketCreated(address indexed market, address indexed configController)'
];

describe('MarketFactory', () => {
  describe('implementation', () => {
    it('should return the correct implementation address', async () => {
      const {
        marketFactory,  
        configControllerFactory,
        marketImpl,
      } = await makeConfigController();
      const implementation = await marketFactory.implementation();
      expect(implementation).to.equal(marketImpl.address);
      expect(await marketFactory.getMarketLength()).to.equal(0);
      expect(await marketFactory.configControllerFactory()).to.equal(configControllerFactory.address);
      expect(await marketFactory.marketToController(ethers.constants.AddressZero)).to.equal(ethers.constants.AddressZero);
    });
  });

  describe('createMarket', () => {
    it('should create a new market and store the config controller', async () => {
      const {
        marketFactory, 
        configController, 
        baseToken,
        priceFeeds,
        tokens
      } = await makeConfigController();
      // Create market
      let marketConfig: MarketConfigStruct = {
        baseToken: baseToken.address,
        priceFeed: priceFeeds[await baseToken.symbol()].address,
        collateralTokens: [],
        baseTokenCurveId: 0n
      };
    
      for (let token in tokens) {
        if (token != await baseToken.symbol()) {
          marketConfig.collateralTokens.push(
            {
              collateralToken: tokens[token].address,
              priceFeed: priceFeeds[token].address,
              borrowCollateralFactor: factor(0.6),
              liquidateCollateralFactor: factor(0.7),
              liquidationFactor: factor(0.8),
              supplyCap: exp(1_000_000, 6)
            }
          );
        }
      }
            
      const createMarketTx = await configController.createMarket(marketConfig);
      const createMarketReceipt = await createMarketTx.wait();
      const [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
      const marketAddress = createMarketEvents.args.market;
      // Verify config controller mapping
      const configControllerAddress: string = await marketFactory.marketToController(marketAddress);
      expect(configControllerAddress).to.equal(configController.address);
    });

    it('should initialize the market with correct config', async () => {
      const { 
        configController, 
        baseToken,
        priceFeeds,
        tokens
      } = await makeConfigController();
      // Create market
      let marketConfig: MarketConfigStruct = {
        baseToken: baseToken.address,
        priceFeed: priceFeeds[await baseToken.symbol()].address,
        collateralTokens: [],
        baseTokenCurveId: 0n
      };
    
      for (let token in tokens) {
        if (token != await baseToken.symbol()) {
          marketConfig.collateralTokens.push(
            {
              collateralToken: tokens[token].address,
              priceFeed: priceFeeds[token].address,
              borrowCollateralFactor: factor(0.6),
              liquidateCollateralFactor: factor(0.7),
              liquidationFactor: factor(0.8),
              supplyCap: exp(1_000_000, 6)
            }
          );
        }
      }
      const createMarketTx = await configController.createMarket(marketConfig);
      const createMarketReceipt = await createMarketTx.wait();
      const [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
      const marketAddress = createMarketEvents.args.market;

      // Get the market contract
      const market = await ethers.getContractAt('MarketMock', marketAddress);
            
      // Verify initialization
      expect(await market.baseToken()).to.equal(baseToken.address);
      expect(await market.priceFeed()).to.equal(priceFeeds[await baseToken.symbol()].address);
      expect(await market.configControllerAddress()).to.equal(configController.address);
    });

    it('should emit MarketCreated event', async () => {
      const { 
        configController, 
        baseToken,
        priceFeeds,
        tokens
      } = await makeConfigController();
      // Create market
      let marketConfig: MarketConfigStruct = {
        baseToken: baseToken.address,
        priceFeed: priceFeeds[await baseToken.symbol()].address,
        collateralTokens: [],
        baseTokenCurveId: 0n
      };
    
      for (let token in tokens) {
        if (token != await baseToken.symbol()) {
          marketConfig.collateralTokens.push(
            {
              collateralToken: tokens[token].address,
              priceFeed: priceFeeds[token].address,
              borrowCollateralFactor: factor(0.6),
              liquidateCollateralFactor: factor(0.7),
              liquidationFactor: factor(0.8),
              supplyCap: exp(1_000_000, 6)
            }
          );
        }
      }
      const createMarketTx = await configController.createMarket(marketConfig);
      const createMarketReceipt = await createMarketTx.wait();
            
      const marketFactoryInterface = new ethers.utils.Interface(marketFactoryAbi);
      const marketCreatedEvent = marketFactoryInterface.parseLog(createMarketReceipt.events[1]);
      const [marketConfigEvent] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
      const marketAddress = marketConfigEvent.args.market;
      // Verify event
      expect(marketCreatedEvent.args.market).to.equal(marketAddress);
      expect(marketCreatedEvent.args.configController).to.equal(configController.address);
    });
  });

  describe('markets array', () => {

    it('should store created markets', async () => {
      const { 
        configController, 
        baseToken,
        priceFeeds,
        tokens,
        marketFactory
      } = await makeConfigController();
      // Create market
      let marketConfig: MarketConfigStruct = {
        baseToken: baseToken.address,
        priceFeed: priceFeeds[await baseToken.symbol()].address,
        collateralTokens: [],
        baseTokenCurveId: 0n
      };
    
      for (let token in tokens) {
        if (token != await baseToken.symbol()) {
          marketConfig.collateralTokens.push(
            {
              collateralToken: tokens[token].address,
              priceFeed: priceFeeds[token].address,
              borrowCollateralFactor: factor(0.6),
              liquidateCollateralFactor: factor(0.7),
              liquidationFactor: factor(0.8),
              supplyCap: exp(1_000_000, 6)
            }
          );
        }
      }
      const createMarketTx = await configController.createMarket(marketConfig);
      const createMarketReceipt = await createMarketTx.wait();

      const marketFactoryInterface = new ethers.utils.Interface(marketFactoryAbi);
      const marketCreatedEvent = marketFactoryInterface.parseLog(createMarketReceipt.events[1]);
      expect(await marketFactory.markets(0)).to.equal(marketCreatedEvent.args.market);
      expect(await marketFactory.marketToController(marketCreatedEvent.args.market)).to.equal(configController.address);
      // Create second market
      const createMarketTx2 = await configController.createMarket(marketConfig);
      const createMarketReceipt2 = await createMarketTx2.wait();
      const marketCreatedEvent2 = marketFactoryInterface.parseLog(createMarketReceipt2.events[1]);

      expect(await marketFactory.markets(1)).to.equal(marketCreatedEvent2.args.market);
      expect(await marketFactory.marketToController(marketCreatedEvent2.args.market)).to.equal(configController.address);
    });
  });
});