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
import { FaucetToken, ISandboxMarket, SimplePriceFeed, NonStandardFaucetFeeToken, ISandboxController, SandboxComet } from '../build/types';
import { BigNumber } from 'ethers';
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
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 18)
                        }
                    });
                }
            }

            await baseToken.approve(configController.address, seedReserves);

            const tx = await configController.connect(owner).createMarket(marketConfig);
            const receipt = await tx.wait();
            const event = receipt.events?.find((e) => e.event === 'MarketConfigurationCreated');
            const marketAddress = event?.args?.market;
            const market = await ethers.getContractAt("SandboxComet", marketAddress) as SandboxComet;

            expect(await market.baseToken()).to.eq(tokens[baseTokenSymbol].address);

            const numAssets = await market.numAssets();
            const deployedCollateralTokens: string[] = [];

            for (let i = 0; i < numAssets; i++) {
                const assetInfo = await market.getAssetInfo(i);
                deployedCollateralTokens.push(assetInfo.asset);
            }

            const unsupportedTokenSymbol = await unsupportedToken.symbol();
            const expectedCollateralCount = Object.keys(tokens).filter(t => t !== baseTokenSymbol && t !== unsupportedTokenSymbol).length;

            expect(deployedCollateralTokens.length).to.eq(expectedCollateralCount);
            for (const token of deployedCollateralTokens) {
                const config = await market.getAssetInfoByAddress(token);
                const expected = marketConfig.collateralTokens.find(c => c.collateralToken === token);
                expect(expected).to.not.be.undefined;
                expect(config.priceFeed).to.eq(expected!.config.priceFeed);
                expect(config.borrowCollateralFactor).to.eq(expected!.config.borrowCollateralFactor);
                expect(config.liquidateCollateralFactor).to.eq(expected!.config.liquidateCollateralFactor);
                expect(config.liquidationFactor).to.eq(expected!.config.liquidationFactor);
                expect(config.supplyCap).to.eq(expected!.config.supplyCap);
            }

            expect(deployedCollateralTokens).to.not.include(baseToken.address);
            expect(deployedCollateralTokens).to.not.include(unsupportedToken.address);

            expect(await configController.markets(0)).to.eq(marketAddress);
            expect(await configController.marketsLength()).to.eq(1);
        });



        it('should emit an event when creating a market', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            let marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    });
                }
            }

            await baseToken.approve(configController.address, seedReserves);
            const tx = await configController.createMarket(marketConfig);
            const receipt = await tx.wait();

            const event = receipt.events?.find((e) => e.event === "MarketConfigurationCreated");

            expect(event?.args?.market).to.be.properAddress;
            expect(event?.args?.baseToken).to.equal(baseToken.address);
            expect(event?.args?.priceFeed).to.equal(priceFeeds[baseTokenSymbol].address);
        });

        it('should revert if the caller is not the owner', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            let marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    });
                }
            }

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.connect(ethers.provider.getSigner(2)).createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "Unauthorized");
        });


        it('should revert if the base token is zero address', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            let marketConfig: MarketConfigStruct = {
                baseToken: ethers.constants.AddressZero,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
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
                .to.be.revertedWithCustomError(configController, "ZeroAddress");
        });

        it('should revert if the price feed is not whitelisted', async () => {
            const {
                configController,
                tokens,
                baseToken,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: ethers.constants.AddressZero,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: ethers.constants.AddressZero,
                            decimals,
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
                .to.be.revertedWithCustomError(configController, "InvalidPriceFeed");
        });


        it('should revert if the collateral token is zero address', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: ethers.constants.AddressZero, // invalid token address
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
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
                .to.be.revertedWithCustomError(configController, "ZeroAddress");
        });

        it('should revert if the collateral token is the base token', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: baseToken.address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    });
                }
            }

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the collateral token price feed is not whitelisted', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            for (const token of Object.keys(tokens)) {
                if (token !== baseTokenSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    marketConfig.collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: ethers.constants.AddressZero,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    });
                }
            }

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidPriceFeed");
        });


        it('should revert if the collateral token already exists in the config', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    },
                    {
                        collateralToken: tokens["COMP"].address, // duplicate
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    },
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "CollateralTokenAlreadyAdded");
        });

        it('should revert if the collateral token is not whitelisted', async () => {
            const {
                configController,
                baseToken,
                priceFeeds,
                unsupportedToken,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const unsupportedTokenDecimals = await unsupportedToken.decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: unsupportedToken.address,
                        config: {
                            priceFeed: priceFeeds[await unsupportedToken.symbol()].address,
                            decimals: unsupportedTokenDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "CollateralTokenNotWhitelisted");
        });


        it('should revert if the collateral token supply cap is zero', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: 0
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };


            await baseToken.approve(configController.address, seedReserves);


            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the collateral token borrow collateral factor is zero', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: 0,
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the collateral token liquidate collateral factor is zero', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: 0,
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the collateral token liquidation factor is zero', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: 0,
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the collateral token borrow collateral factor is greater than liquidate collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseTokenSymbol = await baseToken.symbol();
            const baseTokenDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseTokenSymbol].address,
                    decimals: baseTokenDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.8),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the borrow collateral factor is greater than liquidate collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.8),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the borrow collateral factor is greater than max borrow collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(1.1),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);


            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the borrow collateral factor is less than min borrow collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.4),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the liquidate collateral factor is greater than the max liquidate collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.8),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    },
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);
            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the liquidate collateral factor is less than min liquidate collateral factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.59),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    },
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the liquidation factor is less than min liquidation factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve,
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.79),
                            supplyCap: exp(1_000_000, 6),
                        },
                    },
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should revert if the liquidation factor is greater than max liquidation factor', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];
            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve
                },
                collateralTokens: [
                    {
                        collateralToken: tokens["COMP"].address,
                        config: {
                            priceFeed: priceFeeds["COMP"].address,
                            decimals: compDecimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.91),
                            supplyCap: exp(1_000_000, 6)
                        }
                    }
                ],
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            await expect(configController.createMarket(marketConfig))
                .to.be.revertedWithCustomError(configController, "InvalidFactors");
        });


        it('should be possible to create two markets with the same configuration', async () => {
            const {
                configController,
                tokens,
                baseToken,
                priceFeeds,
                sandboxController,
                seedReserves
            } = await makeConfigController();

            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const collateralTokens: MarketConfigStruct['collateralTokens'] = [];
            for (let token of Object.keys(tokens)) {
                if (token !== baseSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;
                    collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6)
                        }
                    });
                }
            }

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve
                },
                collateralTokens,
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            await baseToken.approve(configController.address, seedReserves);

            const tx1 = await configController.createMarket(marketConfig);
            const receipt1 = await tx1.wait();
            const event1 = receipt1.events?.find(e => e.event === 'MarketConfigurationCreated');
            const market1 = event1?.args.market;

            await baseToken.approve(configController.address, seedReserves);
            const tx2 = await configController.createMarket(marketConfig);
            const receipt2 = await tx2.wait();
            const event2 = receipt2.events?.find(e => e.event === 'MarketConfigurationCreated');
            const market2 = event2?.args.market;

            expect(await configController.markets(0)).to.eq(market1);
            expect(await configController.markets(1)).to.eq(market2);
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
            await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60]);
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
            priceFeeds: Record<string, SimplePriceFeed>,
            sandboxController: ISandboxController
        ) {
            const baseSymbol = await baseToken.symbol();
            const baseDecimals = await baseToken.decimals?.() ?? 6;
            const baseCurve = (await sandboxController.baseAssets(baseToken.address)).baseAssetCurves[0];

            const collateralTokens: MarketConfigStruct["collateralTokens"] = [];

            for (let token of Object.keys(tokens)) {
                if (token !== baseSymbol) {
                    const decimals = await tokens[token].decimals?.() ?? 6;

                    collateralTokens.push({
                        collateralToken: tokens[token].address,
                        config: {
                            priceFeed: priceFeeds[token].address,
                            decimals,
                            borrowCollateralFactor: factor(0.6),
                            liquidateCollateralFactor: factor(0.7),
                            liquidationFactor: factor(0.8),
                            supplyCap: exp(1_000_000, 6),
                        },
                    });
                }
            }

            const marketConfig: MarketConfigStruct = {
                baseToken: baseToken.address,
                config: {
                    priceFeed: priceFeeds[baseSymbol].address,
                    decimals: baseDecimals,
                    curve: baseCurve,
                },
                collateralTokens,
                options: {
                    baseTrackingSupplySpeed: 0,
                    baseTrackingBorrowSpeed: 0,
                    trackingIndexScale: 0,
                    baseMinForRewards: 0,
                }
            };

            const createMarketTx = await configController.createMarket(marketConfig);
            const receipt = await createMarketTx.wait();
            const event = receipt.events?.find((e) => e.event === 'MarketConfigurationCreated');
            return event?.args.market;
        }

        it('should allow owner to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, owner, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            const tx = await configController.connect(owner).proposeMarketCollateralTokens(market, collateralTokens);
            const receipt = await tx.wait();

            const event = receipt.events?.find((e) => e.event === 'MarketConfigProposed');

            expect(event?.args.market).to.equal(market);
            expect(event?.args.proposer).to.equal(owner.address);
            const proposal = await configController.marketProposals(market);
            expect(proposal.expiration).to.equal(event?.args.expiration);
            expect(proposal.isActive).to.be.true;
            expect(proposal.proposer).to.equal(owner.address);

        });

        it('should allow curator to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            const tx = await configController.connect(curator).proposeMarketCollateralTokens(market, collateralTokens);
            const receipt = await tx.wait();

            const event = receipt.events?.find((e) => e.event === 'MarketConfigProposed');
            const proposal = await configController.marketProposals(market);

            expect(event?.args.market).to.equal(market);
            expect(event?.args.proposer).to.equal(curator.address);
            expect(event?.args.expiration).to.equal(proposal.expiration);

            expect(proposal.isActive).to.be.true;
            expect(proposal.proposer).to.equal(curator.address);
            expect(proposal.market).to.equal(market);
            const decoded = ethers.utils.defaultAbiCoder.decode(
                [
                    'tuple(address collateralToken, tuple(address priceFeed, uint256 decimals, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap))[]'
                ],
                ethers.utils.arrayify(proposal.callData).slice(4)
            );

            const firstDecoded = decoded[0][0];
            const decodedToken = firstDecoded.collateralToken;
            const decodedConfig = firstDecoded[1];
            expect(decodedToken).to.eq(collateralTokens[0].collateralToken);
            expect(decodedConfig.priceFeed).to.eq(collateralTokens[0].config.priceFeed);
            expect(decodedConfig.decimals).to.eq(collateralTokens[0].config.decimals);
            expect(decodedConfig.borrowCollateralFactor).to.eq(collateralTokens[0].config.borrowCollateralFactor);
            expect(decodedConfig.liquidateCollateralFactor).to.eq(collateralTokens[0].config.liquidateCollateralFactor);
            expect(decodedConfig.liquidationFactor).to.eq(collateralTokens[0].config.liquidationFactor);
            expect(decodedConfig.supplyCap).to.eq(collateralTokens[0].config.supplyCap);
        });

        it('should not allow guardian to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, guardian, sandboxController, seedReserves } = await makeConfigController();
            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            await expect(configController.connect(guardian).proposeMarketCollateralTokens(market, collateralTokens))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });

        it.skip("should execute proposal", async () => {
            const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            const tx = await configController.connect(curator).proposeMarketCollateralTokens(market, collateralTokens);
            const receipt = await tx.wait();
            const event = receipt.events?.find((e) => e.event === 'MarketConfigProposed');
            expect(event?.args.market).to.equal(market);
            expect(event?.args.proposer).to.equal(curator.address);
            expect(event?.args.expiration).to.equal(event?.args.expiration);

            await ethers.provider.send('evm_increaseTime', [86400 * 7]);
            await ethers.provider.send('evm_mine', []);

            await expect(configController.executeMarketConfigProposal(market))
                .to.emit(configController, 'MarketConfigExecuted')
                .withArgs(market);

        });

        it("should cancel proposal", async () => {
            const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            const tx = await configController.connect(curator).proposeMarketCollateralTokens(market, collateralTokens);
            const receipt = await tx.wait();
            const event = receipt.events?.find((e) => e.event === 'MarketConfigProposed');
            expect(event?.args.market).to.equal(market);
            expect(event?.args.proposer).to.equal(curator.address);
            expect(event?.args.expiration).to.equal(event?.args.expiration);

            await ethers.provider.send('evm_increaseTime', [86400]);
            await ethers.provider.send('evm_mine', []);

            await expect(configController.connect(curator).cancelMarketConfigProposal(market))
                .to.emit(configController, 'MarketConfigProposalCancelled')
                .withArgs(market, curator.address);

        });

        it('should not allow non-owner/curator to create proposal', async () => {
            const { configController, tokens, baseToken, priceFeeds, users, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);

            const compDecimals = await tokens["COMP"].decimals?.() ?? 6;
            const collateralTokens = [{
                collateralToken: tokens["COMP"].address,
                config: {
                    priceFeed: priceFeeds["COMP"].address,
                    decimals: compDecimals,
                    borrowCollateralFactor: factor(0.6),
                    liquidateCollateralFactor: factor(0.7),
                    liquidationFactor: factor(0.8),
                    supplyCap: exp(1_000_000, 6),
                },
            }];

            await expect(configController.connect(users[4]).proposeMarketCollateralTokens(market, collateralTokens))
                .to.be.revertedWithCustomError(configController, 'Unauthorized');
        });


        it("Should noy set speeds on market contract by not owner", async () => {
            const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);
            const comet = await ethers.getContractAt("SandboxComet", market) as SandboxComet;

            await expect(comet.connect(curator).setSpeeds(0, 0, false)).to.be.revertedWithCustomError(comet, "Unauthorized");
        });

        it("Should set speeds on market contract by owner", async () => {

            const { configController, tokens, baseToken, priceFeeds, owner, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);
            const comet = await ethers.getContractAt("SandboxComet", market) as SandboxComet;

            await expect(comet.connect(owner).setSpeeds(0, 0, false)).to.be.not.reverted;
        })

        it("Should noy set dao speeds on market contract by not dao", async () => {
            const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);
            const comet = await ethers.getContractAt("SandboxComet", market) as SandboxComet;

            await expect(comet.connect(curator).setSpeeds(0, 0, true)).to.be.revertedWithCustomError(comet, "Unauthorized");
        });

        it("Should set dao speeds on market contract by dao", async () => {

            const { configController, tokens, baseToken, priceFeeds, dao, sandboxController, seedReserves } = await makeConfigController();

            await baseToken.approve(configController.address, seedReserves);
            const market = await createMarket(configController, tokens, baseToken, priceFeeds, sandboxController);
            const comet = await ethers.getContractAt("SandboxComet", market) as SandboxComet;
            await expect(comet.connect(dao).setSpeeds(0, 0, true)).to.be.not.reverted;
        })
    });

    describe('ConfigControllerFactory', () => {

        it('should deploy with correct args', async () => {
            const { configControllerFactory, owner } = await makeConfigController();
            expect(await configControllerFactory.owner()).to.equal(owner.address);
        });
    });
});