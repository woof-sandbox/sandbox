import { ethers } from 'hardhat';
// import { hre } from './helpers';
import { 
    hre,
    event, 
    expect, 
    exp, 
    factor, 
    defaultAssets, 
    makeConfigController, 
    mulPrice, 
    portfolio, 
    totalsAndReserves, 
    wait, 
    bumpTotalsCollateral, 
    setTotalsBasic 
} from './helper/helpers';
import { MarketConfigStruct, ConfigController, CollateralTokenConfigStruct } from '../build/types/ConfigController';
import { FaucetToken, IMarket, SimplePriceFeed, NonStandardFaucetFeeToken } from '../build/types';
// import { exec } from 'child_process';

describe('ConfigController', () => {
    describe('Constructor', () => {
        it('should initialize with correct values', async () => {
            const {
                configController,
                owner,
                curator,
                guardian,
                sandboxController,
                marketFactory
            } = await makeConfigController();

            expect(await configController.owner()).to.equal(owner.address);
            expect(await configController.curator()).to.equal(curator.address);
            expect(await configController.guardian()).to.equal(guardian.address);
            expect(await configController.sandboxController()).to.equal(sandboxController.address);
            expect(await configController.marketFactory()).to.equal(marketFactory.address);
            expect(await configController.curatorFee()).to.equal(1000); // 10%
            expect(await configController.name()).to.equal("ConfigController");
        });

        it('should revert if owner is zero address', async () => {
            const ConfigController = await ethers.getContractFactory('ConfigController');
            await expect(
                ConfigController.deploy(
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    1000,
                    "ConfigController"
                )
            ).to.be.revertedWithCustomError(ConfigController, 'ZeroAddress');
        });

        it('should revert if curator fee is greater than 100%', async () => {
            const ConfigController = await ethers.getContractFactory('ConfigController');
            const [owner] = await ethers.getSigners();
            await expect(
                ConfigController.deploy(
                    owner.address,
                    owner.address,
                    owner.address,
                    owner.address,
                    owner.address,
                    10001,
                    "ConfigController"
                )
            ).to.be.revertedWithCustomError(ConfigController, 'InvalidFeePercentage');
        });
    });

describe('Create Market', () => {
        it('should create a market', async () => { 
        const {
            configController, 
            tokens, 
            baseToken,
            unsupportedToken,
            priceFeeds,
            owner,
            sandboxController
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
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

        const createMarketTx = await configController.connect(owner).createMarket(marketConfig);
        const createMarketReceipt = await createMarketTx.wait();
        const [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        const marketAddress = createMarketEvents.args.market;
        const marketContract: IMarket = <IMarket>await ethers.getContractAt("IMarket", marketAddress);
        // -- Base token --
        expect(await marketContract.baseToken()).to.eq(tokens[await baseToken.symbol()].address);
        expect(await marketContract.priceFeed()).to.eq(priceFeeds[await baseToken.symbol()].address);
        // Get base asset configuration from sandbox controller
        const baseAssetConfig = await sandboxController.baseAssets(baseToken.address);
        const curve = baseAssetConfig.baseAssetCurves[0];

        // Verify curve parameters
        const marketCurveParams = await marketContract.getBaseCurveParams();
        expect(marketCurveParams.supplyKink).to.equal(curve.supplyKink);
        expect(marketCurveParams.supplyPerYearInterestRateSlopeLow).to.equal(curve.supplyPerYearInterestRateSlopeLow);
        expect(marketCurveParams.supplyPerYearInterestRateSlopeHigh).to.equal(curve.supplyPerYearInterestRateSlopeHigh);
        expect(marketCurveParams.supplyPerYearInterestRateBase).to.equal(curve.supplyPerYearInterestRateBase);
        expect(marketCurveParams.borrowKink).to.equal(curve.borrowKink);
        expect(marketCurveParams.borrowPerYearInterestRateSlopeLow).to.equal(curve.borrowPerYearInterestRateSlopeLow);
        expect(marketCurveParams.borrowPerYearInterestRateSlopeHigh).to.equal(curve.borrowPerYearInterestRateSlopeHigh);
        expect(marketCurveParams.borrowPerYearInterestRateBase).to.equal(curve.borrowPerYearInterestRateBase);

        // -- Collaterals tokens --
        expect(await marketContract.collateralTokensCount()).to.eq(Object.keys(tokens).length - 1);
        const collateralTokens: CollateralTokenConfigStruct[] = await marketContract.getAllCollateralTokenConfigs();
        // -- check whitelisted collaterals --
        const whitelistedCollateralAddresses = Array.from(
            collateralTokens, token => token.collateralToken);
        const baseTokenSymbol = await baseToken.symbol();
        const unsupportedTokenSymbol = await unsupportedToken.symbol();
        let index = 0;
        for (let token in tokens) {
            // Check if token is not base token or unsupported token.
            if (token !== baseTokenSymbol && token !== unsupportedTokenSymbol) {
                // Check that token is whitelisted only one time.
                expect(whitelistedCollateralAddresses.filter(addr => addr === tokens[token].address).length).to.equal(1);
                // Default check for collateral token config.
                expect(marketConfig.collateraTokens[index].collateralToken).to.eq(tokens[token].address);
                expect(marketConfig.collateraTokens[index].priceFeed).to.eq(priceFeeds[token].address);
                expect(marketConfig.collateraTokens[index].borrowCollateralFactor).to.eq(factor(0.6));
                expect(marketConfig.collateraTokens[index].liquidateCollateralFactor).to.eq(factor(0.7));
                expect(marketConfig.collateraTokens[index].liquidationFactor).to.eq(factor(0.8));
                expect(marketConfig.collateraTokens[index].supplyCap).to.eq(exp(1_000_000, 6));
                index++;
            }
        }
        // Check that unsupported token is not in the collateral token config
        const unsupportedTokenConfig = collateralTokens.find(
            (collateralToken) => collateralToken.collateralToken === unsupportedToken.address
        );
        expect(unsupportedTokenConfig).to.be.undefined;

        // Check that base token is not in the collateral token config
        const baseTokenConfig = collateralTokens.find(
            (collateralToken) => collateralToken.collateralToken === baseToken.address
        );
        expect(baseTokenConfig).to.be.undefined;

        expect(await configController.markets(0)).to.eq(marketAddress);
        expect(await configController.marketsLength()).to.eq(1);    
    });

    it('should emit an event when creating a market', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
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

        await expect(configController.createMarket(marketConfig)).to.emit(configController, 'MarketConfigurationCreated').withArgs(
            await configController.markets(0),baseToken.address, priceFeeds[await baseToken.symbol()].address, 1
        );
    });

    it('should revert if the caller is not the owner', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
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

        await expect(configController.connect(ethers.provider.getSigner(2)).createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it('should revert if the base token is zero address', async () => {
        const {
            configController,
            tokens,
            baseToken, 
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: ethers.constants.AddressZero,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
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

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "ZeroAddress");
    });

    it('should revert if the price feed is not whitelisted', async () => {
        const {
            configController,
            tokens, 
            baseToken,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: ethers.constants.AddressZero,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
                    {
                        collateralToken: tokens[token].address,
                        priceFeed: ethers.constants.AddressZero,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                );
            }
        }

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongPriceFeed");
    });

    it('should revert if the collateral token is zero address', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
                    {
                        collateralToken: ethers.constants.AddressZero,
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                );
            }
        }

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "ZeroAddress");
    });

    it('should revert if the collateral token is the base token', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
                    {
                        collateralToken: baseToken.address,
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                );
            }
        }

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the collateral token price feed is not whitelisted', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
                    {
                        collateralToken: tokens[token].address,
                        priceFeed: ethers.constants.AddressZero,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                );
            }
        }

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongPriceFeed");
    });

    it('should revert if the collateral token already exists in the config', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );
        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "CollateralTokenAlreadyAdded");
    });

    it('should revert if the collateral token is not whitelisted', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
            unsupportedToken
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }
        
        marketConfig.collateraTokens.push(
            {
                collateralToken: unsupportedToken.address,
                priceFeed: priceFeeds[await unsupportedToken.symbol()].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "CollateralTokenNotWhitelisted");
    });

    it('should revert if the collateral token supply cap is zero', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
            unsupportedToken
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }
        
        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: 0
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the collateral token borrow collateral factor is zero', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }
        
        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: 0,
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });
    
    it('should revert if the collateral token liquidate collateral factor is zero', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: 0,
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the collateral token liquidation factor is zero', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: 0,
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the collateral token borrow collateral factor is greater than liquidate collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the borrow collateral factor is greater than liquidate collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the borrow collateral factor is greater than max borrow collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(1.1),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the borrow collateral factor is less than min borrow collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.4),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the liquidate collateral factor is greater than the max liquidate collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.8),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the liquidate collateral factor is less than min liquidate collateral factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.59),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the liquidation factor is less than min liquidation factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.79),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });

    it('should revert if the liquidation factor is greater than max liquidation factor', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
        }

        marketConfig.collateraTokens.push(
            {
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.91),
                supplyCap: exp(1_000_000, 6)
            }
        );

        await expect(configController.createMarket(marketConfig))
            .to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
    });
    
    it('it should be possible to create two markets with the same configuration', async () => {
        const {
            configController,
            tokens, 
            baseToken,
            priceFeeds,
        } = await makeConfigController();
        
        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                    collateraTokens: [],
                    baseTokenCurveId: 0n
        }

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateraTokens.push(
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
        let createMarketTx = await configController.createMarket(marketConfig);
        let createMarketReceipt = await createMarketTx.wait();
        let [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        let marketAddress = createMarketEvents.args.market;
        
        createMarketTx = await configController.createMarket(marketConfig);
        createMarketReceipt = await createMarketTx.wait();
        [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        marketAddress = createMarketEvents.args.market;

        expect(await configController.markets(1)).to.eq(marketAddress);
        expect(await configController.marketsLength()).to.eq(2);
        });
    });

    describe('setCuratorFee', () => {
        it('should set curator fee', async () => {
            const { configController } = await makeConfigController();
            await expect(configController.setCuratorFee(2000))
                .to.emit(configController, 'CuratorFeeUpdated')
                .withArgs(1000, 2000);
            expect(await configController.curatorFee()).to.equal(2000);
        });

        it('should revert if not owner', async () => {
            const { configController } = await makeConfigController();
            const [_, nonOwner] = await ethers.getSigners();
            await expect(configController.connect(nonOwner).setCuratorFee(2000))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it('should revert if fee is greater than 100%', async () => {
            const { configController } = await makeConfigController();
            await expect(configController.setCuratorFee(10001))
                .to.be.revertedWithCustomError(configController, 'InvalidFeePercentage');
        });
    });

    describe('accumulateRevenue', () => {
        it('should accumulate revenue with curator fee', async () => {
            const { configController, tokens, users } = await makeConfigController();
            const token = tokens['USDC'];
            const amount = exp(1000, 6); // 1000 USDC

            await token.connect(users[4]).approve(configController.address, amount);
            await token.allocateTo(users[4].address, amount);
            await expect(configController.connect(users[4]).accumulateRevenue(token.address, amount))
                .to.emit(configController, 'RevenueAccumulated')
                .withArgs(token.address, amount);

            const ownerAmount = (amount * 9000n) / 10000n; // 90%
            const curatorAmount = (amount * 1000n) / 10000n; // 10%

            expect(await configController.getUnclaimedRevenue(token.address, await configController.owner()))
                .to.equal(ownerAmount);
            expect(await configController.getUnclaimedRevenue(token.address, await configController.curator()))
                .to.equal(curatorAmount);
        });

        it('should accumulate all revenue to owner when curator fee is 0', async () => {
            const { configController, tokens, users } = await makeConfigController();
            await configController.setCuratorFee(0);
            
            const token = tokens['USDC'];
            const amount = exp(1000, 6); // 1000 USDC

            await token.connect(users[4]).approve(configController.address, amount);
            await token.allocateTo(users[4].address, amount);
            await expect(configController.connect(users[4]).accumulateRevenue(token.address, amount))
                .to.emit(configController, 'RevenueAccumulated')
                .withArgs(token.address, amount);

            expect(await configController.getUnclaimedRevenue(token.address, await configController.owner()))
                .to.equal(amount);
            expect(await configController.getUnclaimedRevenue(token.address, await configController.curator()))
                .to.equal(0);
        });

        it('should revert if token is zero address', async () => {
            const { configController } = await makeConfigController();
            await expect(configController.accumulateRevenue(ethers.constants.AddressZero, 1000))
                .to.be.revertedWithCustomError(configController, 'ZeroAddress');
        });

        it('should revert if amount is zero', async () => {
            const { configController, tokens } = await makeConfigController();
            await expect(configController.accumulateRevenue(tokens['USDC'].address, 0))
                .to.be.revertedWithCustomError(configController, 'ZeroAmount');
        });
    });

    describe('claimRevenue', () => {
        it('should allow owner to claim revenue', async () => {
            const { configController, tokens, users, owner } = await makeConfigController();
            const token = tokens['USDC'];
            const amount = exp(1000, 6); // 1000 USDC

            await token.connect(users[4]).approve(configController.address, amount);
            await token.connect(users[4]).allocateTo(users[4].address, amount);
            await configController.connect(users[4]).accumulateRevenue(token.address, amount);
            
            const ownerAmount = (amount * 9000n) / 10000n; // 90%
            const balanceBefore = await token.balanceOf(owner.address);
            
            await expect(configController.connect(owner).claimRevenue(token.address))
                .to.emit(configController, 'RevenueClaimed')
                .withArgs(token.address, owner.address, ownerAmount);
            
            expect(await token.balanceOf(owner.address)).to.equal(balanceBefore.add(ownerAmount));
            expect(await configController.getUnclaimedRevenue(token.address, owner.address)).to.equal(0);
        });

        it('should allow curator to claim revenue', async () => {
            const { configController, tokens, users, curator } = await makeConfigController();
            const token = tokens['USDC'];
            const amount = exp(1000, 6); // 1000 USDC

            await token.connect(users[4]).approve(configController.address, amount);
            await token.connect(users[4]).allocateTo(users[4].address, amount);
            await configController.connect(users[4]).accumulateRevenue(token.address, amount);
          
            const curatorAmount = (amount * 1000n) / 10000n; // 10%
            const balanceBefore = await token.balanceOf(curator.address);

            await expect(configController.connect(curator).claimRevenue(token.address))
                .to.emit(configController, 'RevenueClaimed')
                .withArgs(token.address, curator.address, curatorAmount);

            expect(await token.balanceOf(curator.address)).to.equal(balanceBefore.add(curatorAmount));
            expect(await configController.getUnclaimedRevenue(token.address, curator.address)).to.equal(0);
        });

        it('should revert if token is zero address', async () => {
            const { configController } = await makeConfigController();
            await expect(configController.claimRevenue(ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(configController, 'ZeroAddress');
        });

        it('should revert if no revenue to claim', async () => {
            const { configController, tokens } = await makeConfigController();
            await expect(configController.claimRevenue(tokens['USDC'].address))
                .to.be.revertedWithCustomError(configController, 'InsufficientBalance');
        });

        it('should allow old curator to claim revenue after curator change', async () => {
            const { configController, tokens, users, curator } = await makeConfigController();
            const token = tokens['USDC'];
            const amount = exp(1000, 6); // 1000 USDC
            const newCurator = users[4];

            // Accumulate revenue with old curator
            await token.connect(users[5]).approve(configController.address, amount);
            await token.connect(users[5]).allocateTo(users[5].address, amount);
            await configController.connect(users[5]).accumulateRevenue(token.address, amount);

            const oldCuratorAmount = (amount * 1000n) / 10000n; // 10%
            const oldCuratorBalanceBefore = await token.balanceOf(curator.address);

            // Change curator
            await configController.proposeCurator(newCurator.address);
            await configController.connect(newCurator).acceptCuratorRole();

            // Old curator claims revenue
            await expect(configController.connect(curator).claimRevenue(token.address))
                .to.emit(configController, 'RevenueClaimed')
                .withArgs(token.address, curator.address, oldCuratorAmount);

            expect(await token.balanceOf(curator.address)).to.equal(oldCuratorBalanceBefore.add(oldCuratorAmount));
            expect(await configController.getUnclaimedRevenue(token.address, curator.address)).to.equal(0);
            expect(await configController.curator()).to.equal(newCurator.address);
        });
    });

    describe('grantOwnership', () => {
        it('should transfer ownership', async () => {
            const { configController, users } = await makeConfigController();

            await configController.grantOwnership(users[4].address);
            expect(await configController.owner()).to.equal(users[4].address);
        });

        it('should revert if not owner', async () => {
            const { configController, users } = await makeConfigController();

            await expect(configController.connect(users[4]).grantOwnership(users[5].address))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });
    });

    describe('Curator Role Proposal', () => {
        it('should allow owner to propose new curator', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await expect(configController.proposeCurator(proposedCurator))
                .to.emit(configController, 'CuratorProposed')
                .withArgs(await configController.curator(), proposedCurator, await configController.curatorProposalExpiry());

            expect(await configController.proposedCurator()).to.equal(proposedCurator);
            expect(await configController.curatorProposalExpiry()).to.be.gt(0);
        });

        it('should allow proposed curator to accept the role', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;
            const currentCurator = await configController.curator();

            await configController.proposeCurator(proposedCurator);

            await expect(configController.connect(users[4]).acceptCuratorRole())
                .to.emit(configController, 'CuratorAccepted')
                .withArgs(currentCurator, proposedCurator);

            expect(await configController.curator()).to.equal(proposedCurator);
            expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
            expect(await configController.curatorProposalExpiry()).to.equal(0);
        });

        it('should allow owner to cancel curator proposal', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await configController.proposeCurator(proposedCurator);

            await expect(configController.cancelCuratorProposal())
                .to.emit(configController, 'CuratorProposalCancelled')
                .withArgs(proposedCurator);

            expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
            expect(await configController.curatorProposalExpiry()).to.equal(0);
        });

        it('should revert if non-owner tries to propose curator', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await expect(configController.connect(users[4]).proposeCurator(proposedCurator))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it('should revert if non-proposed curator tries to accept role', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await configController.proposeCurator(proposedCurator);

            await expect(configController.connect(users[5]).acceptCuratorRole())
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it('should revert if non-owner tries to cancel proposal', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await configController.proposeCurator(proposedCurator);

            await expect(configController.connect(users[4]).cancelCuratorProposal())
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it('should revert if proposing zero address as curator', async () => {
            const { configController } = await makeConfigController();

            await expect(configController.proposeCurator(ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(configController, 'ZeroAddress');
        });

        it('should revert if proposing current curator as new curator', async () => {
            const { configController } = await makeConfigController();
            const currentCurator = await configController.curator();

            await expect(configController.proposeCurator(currentCurator))
                .to.be.revertedWithCustomError(configController, 'InvalidCurator');
        });

        it('should revert if trying to accept expired proposal', async () => {
            const { configController, users } = await makeConfigController();
            const proposedCurator = users[4].address;

            await configController.proposeCurator(proposedCurator);

            // Fast forward time past the proposal expiration
            await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send('evm_mine', []);

            await expect(configController.connect(users[4]).acceptCuratorRole())
                .to.be.revertedWithCustomError(configController, 'ProposalExpired');
        });

        it('should revert if trying to cancel non-existent proposal', async () => {
            const { configController } = await makeConfigController();

            await expect(configController.cancelCuratorProposal())
                .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
        });

        it('should allow owner to remove curator', async () => {
            const { configController, users } = await makeConfigController();
            const currentCurator = await configController.curator();

            await expect(configController.removeCurator())
                .to.emit(configController, 'CuratorCanceled')
                .withArgs(currentCurator);

            expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
        });

        it('should revert if non-owner tries to remove curator', async () => {
            const { configController, users } = await makeConfigController();

            await expect(configController.connect(users[4]).removeCurator())
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });
    });

    describe('setGuardian', () => {
        it('should allow owner to set new guardian', async () => {
            const { configController, users } = await makeConfigController();
            const newGuardian = users[4].address;
            const currentGuardian = await configController.guardian();

            await expect(configController.setGuardian(newGuardian))
                .to.emit(configController, 'GuardianUpdated')
                .withArgs(currentGuardian, newGuardian);

            expect(await configController.guardian()).to.equal(newGuardian);
        });

        it('should allow owner to set guardian to zero address', async () => {
            const { configController } = await makeConfigController();
            const currentGuardian = await configController.guardian();

            await expect(configController.setGuardian(ethers.constants.AddressZero))
                .to.emit(configController, 'GuardianUpdated')
                .withArgs(currentGuardian, ethers.constants.AddressZero);

            expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
        });

        it('should revert if non-owner tries to set guardian', async () => {
            const { configController, users } = await makeConfigController();
            const newGuardian = users[4].address;

            await expect(configController.connect(users[4]).setGuardian(newGuardian))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });
    });

    describe('Market Configuration Proposals', () => {
        async function createMarket(
            configController: ConfigController,
            tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>,
            baseToken: FaucetToken | NonStandardFaucetFeeToken,
            priceFeeds: Record<string, SimplePriceFeed>
        ) {
            let marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                collateraTokens: [],
                baseTokenCurveId: 0n
            }

            for (let token in tokens) {
                if (token != await baseToken.symbol()) {
                    marketConfig.collateraTokens.push(
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

            return marketAddress;
        }

        it('should allow owner to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, owner } = await makeConfigController();
            const market = await createMarket(configController, tokens, baseToken, priceFeeds);

            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }];
            
            await expect(configController.connect(owner).proposeMarketCollateralTokens(market, collateralTokens))
                .to.emit(configController, 'MarketConfigProposed')
                .withArgs(market, await configController.owner(), await configController.marketProposals(market).then(p => p.expiration));

            const proposal = await configController.marketProposals(market);
            expect(proposal.isActive).to.be.true;
            expect(proposal.proposer).to.equal(await configController.owner());
        });

        it('should allow curator to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, curator } = await makeConfigController();
            const market = await createMarket(configController, tokens, baseToken, priceFeeds);
            
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }];

            
            const tx = await configController.connect(curator).proposeMarketCollateralTokens(market, collateralTokens);
            const receipt = await tx.wait();
            
            const proposal = await configController.marketProposals(market);
            
            const events = receipt.events?.filter((event) => event.event === 'MarketConfigProposed');
            expect(events[0].args.market).to.equal(market);
            expect(events[0].args.proposer).to.equal(curator.address);
            expect(events[0].args.expiration).to.equal(proposal.expiration);

            expect(proposal.isActive).to.be.true;
            expect(proposal.proposer).to.equal(curator.address);
            expect(proposal.market).to.equal(market);
            expect(proposal.collateralTokens[0].collateralToken).to.equal(
                collateralTokens[0].collateralToken);
            expect(proposal.collateralTokens[0].priceFeed).to.equal(
                collateralTokens[0].priceFeed);
            expect(proposal.collateralTokens[0].borrowCollateralFactor).to.equal(
                collateralTokens[0].borrowCollateralFactor);
            expect(proposal.collateralTokens[0].liquidateCollateralFactor).to.equal(
                collateralTokens[0].liquidateCollateralFactor);
        });

        it('should not allow guardian to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, guardian } = await makeConfigController();
            const market = await createMarket(configController, tokens, baseToken, priceFeeds);
            
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }];

            await expect(configController.connect(guardian).proposeMarketCollateralTokens(market, collateralTokens))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it('should not allow non-owner/curator to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, users } = await makeConfigController();
            const market = await createMarket(configController, tokens, baseToken, priceFeeds);
            
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                priceFeed: priceFeeds["COMP"].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }];

            await expect(configController.connect(users[4]).proposeMarketCollateralTokens(market, collateralTokens))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });
    });
});