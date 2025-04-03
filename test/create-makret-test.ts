import { ethers } from 'hardhat';
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
import { MarketConfigStruct } from '../build/types/ConfigController';
import { ISandboxMarket } from '../build/types';

describe('Create Market', () => {
    it('should create a market', async () => {
        const {
            configController,
            tokens,
            baseToken,
            unsupportedToken,
            
            priceFeeds,
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }
        const createMarketTx = await configController.createMarket(marketConfig);
        const createMarketReceipt = await createMarketTx.wait();
        const [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        const marketAddress = createMarketEvents.args.market;
        const marketContract: ISandboxMarket = <ISandboxMarket>await ethers.getContractAt('ISandboxMarket', marketAddress);

        expect(await marketContract.baseToken()).to.eq(tokens[await baseToken.symbol()].address);
        expect(await marketContract.priceFeed()).to.eq(priceFeeds[await baseToken.symbol()].address);
        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                const collateralTokenConfig = await marketContract.getCollateralTokenConfig(tokens[token].address);
                expect(collateralTokenConfig.priceFeed).to.eq(priceFeeds[token].address);
                expect(collateralTokenConfig.borrowCollateralFactor).to.eq(factor(0.6));
                expect(collateralTokenConfig.liquidateCollateralFactor).to.eq(factor(0.7));
                expect(collateralTokenConfig.liquidationFactor).to.eq(factor(0.8));
                expect(collateralTokenConfig.supplyCap).to.eq(exp(1_000_000, 6));
            }
        }

        const collateralTokens = await marketContract.getCollateralTokens();

        const unsupportedTokenConfig = collateralTokens.find(
            (collateralToken) => collateralToken === unsupportedToken.address
        );
        expect(unsupportedTokenConfig).to.be.undefined;

        const baseTokenConfig = collateralTokens.find(
            (collateralToken) => collateralToken === baseToken.address
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(configController.createMarket(marketConfig))
            .to.emit(configController, 'MarketConfigurationCreated')
            .withArgs(
                await configController.markets(0),
                baseToken.address,
                priceFeeds[await baseToken.symbol()].address,
                1
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(
            configController.connect(ethers.provider.getSigner(2)).createMarket(marketConfig)
        ).to.be.revertedWithCustomError(configController, 'Unauthorized');
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'ZeroAddress'
        );
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: ethers.constants.AddressZero,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'ZeroAddress'
        );
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: ethers.constants.AddressZero,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'ZeroAddress'
        );
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
            collateralTokens: []
        };

                marketConfig.collateralTokens.push({
                    collateralToken: baseToken.address,
                    config: {
                        priceFeed: priceFeeds[await baseToken.symbol()].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });


        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: ethers.constants.AddressZero,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'ZeroAddress'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });
        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'CollateralTokenAlreadyAdded'
        );
    });

    it.skip('should revert if the collateral token is not whitelisted', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            unsupportedToken,
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: unsupportedToken.address,
            config: {
                priceFeed: priceFeeds[await unsupportedToken.symbol()].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'CollateralTokenNotWhitelisted'
        );
    });

    it('should revert if the collateral token supply cap is zero', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            unsupportedToken,
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            priceFeed: priceFeeds[await baseToken.symbol()].address,
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: 0
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: 0,
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: 0,
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: 0,
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(1.1),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.4),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.8),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.59),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.79),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.91),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'WrongCollateralTokenSettings'
        );
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
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
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
