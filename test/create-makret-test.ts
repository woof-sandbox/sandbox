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
    setTotalsBasic,
} from './helper/helpers';
import { IConfigController } from '../build/types';
import { BaseAssetCurveStruct, MarketConfigStruct } from '../build/types/ConfigController';

describe('Create Market', () => {

    it('should create a market', async () => {
        const {
            configController,
            tokens,
            baseToken,
            unsupportedToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await baseToken.approve(configController.address, seedReserves);

        const createMarketTx = await configController.createMarket(marketConfig);
        const createMarketReceipt = await createMarketTx.wait();
        const [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        const marketAddress = createMarketEvents.args.market;
        const marketContract: ISandboxMarket = <ISandboxMarket>await ethers.getContractAt('ISandboxMarket', marketAddress);

        expect(await marketContract.baseToken()).to.eq(tokens[await baseToken.symbol()].address);
        const colTokens = await marketContract.getCollateralTokens();

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

        const unsupportedTokenConfig = colTokens.find(
            (collateralToken) => collateralToken === unsupportedToken.address
        );
        expect(unsupportedTokenConfig).to.be.undefined;

        const baseTokenConfig = colTokens.find(
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
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await baseToken.approve(configController.address, seedReserves);
        
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
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await baseToken.approve(configController.address, seedReserves);

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
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: ethers.constants.AddressZero,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }
        await baseToken.approve(configController.address, seedReserves);

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
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: ethers.constants.AddressZero,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: ethers.constants.AddressZero,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }
        await baseToken.approve(configController.address, seedReserves);
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
            curve
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: ethers.constants.AddressZero,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
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
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);
        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the collateral token price feed is not whitelisted', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            sandboxController,
            curve,
            seedReserves
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: ethers.constants.AddressZero,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await baseToken.approve(configController.address, seedReserves);

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
            curve,
            seedReserves
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
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
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'CollateralTokenAlreadyAdded'
        );
    });

    it('should revert if the collateral token is not whitelisted', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            unsupportedToken,
            curve,
            seedReserves
        } = await makeConfigController();


        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: unsupportedToken.address,
            config: {
                priceFeed: priceFeeds[await unsupportedToken.symbol()].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

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
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: 0
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the collateral token borrow collateral factor is zero', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: 0,
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the collateral token liquidate collateral factor is zero', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: 0,
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });


        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the collateral token liquidation factor is zero', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: 0,
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);
        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the collateral token borrow collateral factor is greater than liquidate collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the borrow collateral factor is greater than liquidate collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the borrow collateral factor is greater than max borrow collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();

        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(1.1),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the borrow collateral factor is less than min borrow collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.4),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the liquidate collateral factor is greater than the max liquidate collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.8),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the liquidate collateral factor is less than min liquidate collateral factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.59),
                liquidationFactor: factor(0.8),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the liquidation factor is less than min liquidation factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.79),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('should revert if the liquidation factor is greater than max liquidation factor', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        marketConfig.collateralTokens.push({
            collateralToken: tokens['COMP'].address,
            config: {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.6),
                liquidateCollateralFactor: factor(0.7),
                liquidationFactor: factor(0.91),
                supplyCap: exp(1_000_000, 6)
            }
        });

        await baseToken.approve(configController.address, seedReserves);

        await expect(configController.createMarket(marketConfig)).to.be.revertedWithCustomError(
            configController,
            'InvalidFactors'
        );
    });

    it('it should be possible to create two markets with the same configuration', async () => {
        const {
            configController,
            tokens,
            baseToken,
            priceFeeds,
            curve,
            seedReserves
        } = await makeConfigController();



        let marketConfig: MarketConfigStruct = {
            baseToken: baseToken.address,
            config: {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve
            },
            collateralTokens: []
        };

        for (let token in tokens) {
            if (token != await baseToken.symbol()) {
                marketConfig.collateralTokens.push({
                    collateralToken: tokens[token].address,
                    config: {
                        priceFeed: priceFeeds[token].address,
                        decimals: 18,
                        borrowCollateralFactor: factor(0.6),
                        liquidateCollateralFactor: factor(0.7),
                        liquidationFactor: factor(0.8),
                        supplyCap: exp(1_000_000, 6)
                    }
                });
            }
        }

        await baseToken.approve(configController.address, seedReserves);
        let createMarketTx = await configController.createMarket(marketConfig);
        let createMarketReceipt = await createMarketTx.wait();
        let [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        let marketAddress = createMarketEvents.args.market;
            

        await baseToken.approve(configController.address, seedReserves);
        createMarketTx = await configController.createMarket(marketConfig);
        createMarketReceipt = await createMarketTx.wait();
        [createMarketEvents] = createMarketReceipt.events?.filter((event) => event.event === 'MarketConfigurationCreated');
        marketAddress = createMarketEvents.args.market;

        expect(await configController.markets(1)).to.eq(marketAddress);
        expect(await configController.marketsLength()).to.eq(2);
    });

    describe('Setters', () => {
        it('should allow updating the base token config', async () => {
            const { configController, tokens, baseToken, priceFeeds } = await makeConfigController();
            const curve: BaseAssetCurveStruct = {
                supplyKink: 1,
                supplyPerYearInterestRateSlopeLow: 2,
                supplyPerYearInterestRateSlopeHigh: 3,
                supplyPerYearInterestRateBase: 4,
                borrowKink: 5,
                borrowPerYearInterestRateSlopeLow: 6,
                borrowPerYearInterestRateSlopeHigh: 7,
                borrowPerYearInterestRateBase: 8
            };
            let marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[await baseToken.symbol()].address,
                    decimals: 18,
                    curve
                },
                collateralTokens: []
            };
            const createMarketTx = await configController.createMarket(marketConfig);
            await createMarketTx.wait();

            const newCurve: BaseAssetCurveStruct = {
                supplyKink: 99,
                supplyPerYearInterestRateSlopeLow: 199,
                supplyPerYearInterestRateSlopeHigh: 299,
                supplyPerYearInterestRateBase: 399,
                borrowKink: 499,
                borrowPerYearInterestRateSlopeLow: 599,
                borrowPerYearInterestRateSlopeHigh: 699,
                borrowPerYearInterestRateBase: 799
            };
            let market = await configController.markets(0);
            await configController.setBaseAssetConfig(market, {
                priceFeed: priceFeeds[await baseToken.symbol()].address,
                decimals: 18,
                curve: newCurve
            });

            const marketContract = await ethers.getContractAt('SandboxMarket', market) as SandboxMarket;
            const info = await marketContract.baseTokenConfig();
            expect(info.priceFeed).to.eq(priceFeeds[await baseToken.symbol()].address);
            expect(info.decimals).to.eq(18);
            expect(info.curve.supplyKink).to.eq(99);
            expect(info.curve.supplyPerYearInterestRateSlopeLow).to.eq(199);
            expect(info.curve.supplyPerYearInterestRateSlopeHigh).to.eq(299);
            expect(info.curve.supplyPerYearInterestRateBase).to.eq(399);
            expect(info.curve.borrowKink).to.eq(499);
            expect(info.curve.borrowPerYearInterestRateSlopeLow).to.eq(599);
            expect(info.curve.borrowPerYearInterestRateSlopeHigh).to.eq(699);
            expect(info.curve.borrowPerYearInterestRateBase).to.eq(799);
        });

        it('should allow updating the collateral token config', async () => {
            const { configController, tokens, baseToken, priceFeeds } = await makeConfigController();
            const curve: BaseAssetCurveStruct = {
                supplyKink: 1,
                supplyPerYearInterestRateSlopeLow: 2,
                supplyPerYearInterestRateSlopeHigh: 3,
                supplyPerYearInterestRateBase: 4,
                borrowKink: 5,
                borrowPerYearInterestRateSlopeLow: 6,
                borrowPerYearInterestRateSlopeHigh: 7,
                borrowPerYearInterestRateBase: 8
            };
            let marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[await baseToken.symbol()].address,
                    decimals: 18,
                    curve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens['COMP'].address,
                        config: {
                            priceFeed: priceFeeds['COMP'].address,
                            decimals: 18,
                            borrowCollateralFactor: factor(0.5),
                            liquidateCollateralFactor: factor(0.6),
                            liquidationFactor: factor(0.7),
                            supplyCap: exp(500000, 6)
                        }
                    }
                ]
            };
            const createMarketTx = await configController.createMarket(marketConfig);
            await createMarketTx.wait();

            let market = await configController.markets(0);

            await configController.setCollateralTokenConfig(market, tokens['COMP'].address, {
                priceFeed: priceFeeds['COMP'].address,
                decimals: 18,
                borrowCollateralFactor: factor(0.8),
                liquidateCollateralFactor: factor(0.85),
                liquidationFactor: factor(0.9),
                supplyCap: exp(2_000_000, 6)
            });

            const marketContract = await ethers.getContractAt('SandboxMarket', market) as SandboxMarket;

            const updated = await marketContract.collateralConfigs(tokens['COMP'].address);
            expect(updated.decimals).to.eq(18);
            expect(updated.borrowCollateralFactor).to.eq(factor(0.8));
            expect(updated.liquidateCollateralFactor).to.eq(factor(0.85));
            expect(updated.liquidationFactor).to.eq(factor(0.9));
            expect(updated.supplyCap).to.eq(exp(2_000_000, 6));
        });
    });
});
