import hre from "hardhat";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  CometHarness__factory,
  EvilToken__factory,
  FaucetToken,
  FaucetToken__factory,
  FaucetWETH__factory,
  SimplePriceFeed,
  SimplePriceFeed__factory,
  ConfigController__factory,
  ConfigController,
  NonStandardFaucetFeeToken,
  NonStandardFaucetFeeToken__factory,
  ISandboxController,
  ISandboxCometFactory,
  ConfigControllerFactory,
  ConfigControllerFactory__factory,
  SandboxComet,
  ISandboxComet,
} from "../../build/types";

import { SandboxCometFactory } from "../../build/types/SandboxCometFactory";
import { SandboxCometFactory__factory } from "../../build/types/factories/SandboxCometFactory__factory";
import { SandboxController, BaseAssetCurveStruct, SandboxControllerConfigurationStruct } from "../../build/types/SandboxController";
import { SandboxController__factory } from "../../build/types/factories/SandboxController__factory";
import { BigNumber, Contract, ContractReceipt, ContractTransaction } from "ethers";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import { CometHarness, TotalsBasicStructOutput } from "../../build/types/CometHarness";
import { CometConfigStruct } from "../../build/types/ConfigController";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Snapshot
export type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
export { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

export { ethers, expect, hre };

export type Numeric = number | bigint;

export enum ReentryAttack {
  TransferFrom = 0,
  WithdrawFrom = 1,
  SupplyFrom = 2,
  BuyCollateral = 3,
}

export type TokenOpts = {
  symbol?: string;
  name?: string;
  decimals?: Numeric;
  initialMint?: string;
};

export type ProtocolOpts = {
  start?: number;
  assets?: {
    [symbol: string]: {
      name?: string;
      initial?: Numeric;
      decimals?: Numeric;
      minBorrowCF?: Numeric;
      maxBorrowCF?: Numeric;
      minLiquidateCF?: Numeric;
      maxLiquidateCF?: Numeric;
      minLiquidationFactor?: Numeric;
      maxLiquidationFactor?: Numeric;
      borrowCF?: Numeric;
      liquidateCF?: Numeric;
      liquidationFactor?: Numeric;
      supplyCap?: Numeric;
      initialPrice?: number;
      priceFeedDecimals?: number;
      factory?: FaucetToken__factory | EvilToken__factory | FaucetWETH__factory | NonStandardFaucetFeeToken__factory;
    };
  };
  feeEnabled?: boolean;
  name?: string;
  symbol?: string;
  owner?: SignerWithAddress;
  curator?: SignerWithAddress;
  guardian?: SignerWithAddress;
  dao?: SignerWithAddress;
  base?: string;
  supplyKink?: Numeric;
  supplyInterestRateBase?: Numeric;
  supplyInterestRateSlopeLow?: Numeric;
  supplyInterestRateSlopeHigh?: Numeric;
  borrowKink?: Numeric;
  borrowInterestRateBase?: Numeric;
  borrowInterestRateSlopeLow?: Numeric;
  borrowInterestRateSlopeHigh?: Numeric;
  storeFrontPriceFactor?: Numeric;
  trackingIndexScale?: Numeric;
  baseTrackingSupplySpeed?: Numeric;
  baseTrackingBorrowSpeed?: Numeric;
  baseMinForRewards?: Numeric;
  baseBorrowMin?: Numeric;
  targetPercent?: Numeric;
  baseTokenBalance?: Numeric;
  suggestedAmountOfSeedReserves?: number | bigint;
  suggestedLockTimeOfSeedReserves?: number | bigint;
  reserveCommissions?: [bigint, bigint, bigint];
  protocolCommissions?: [bigint, bigint, bigint];
};

export type Protocol = {
  opts: ProtocolOpts;
  users: SignerWithAddress[];
  base: string;
  comet: SandboxComet;
  tokens: {
    [symbol: string]: FaucetToken | NonStandardFaucetFeeToken;
  };
  baseToken: FaucetToken | NonStandardFaucetFeeToken;
  assets: {
    [symbol: string]: {
      name?: string;
      initial?: Numeric;
      decimals?: Numeric;
      minBorrowCF?: Numeric;
      maxBorrowCF?: Numeric;
      minLiquidateCF?: Numeric;
      maxLiquidateCF?: Numeric;
      minLiquidationFactor?: Numeric;
      maxLiquidationFactor?: Numeric;
      borrowCF?: Numeric;
      liquidateCF?: Numeric;
      liquidationFactor?: Numeric;
      supplyCap?: Numeric;
      initialPrice?: number;
      priceFeedDecimals?: number;
      factory?: FaucetToken__factory | EvilToken__factory | FaucetWETH__factory | NonStandardFaucetFeeToken__factory;
    };
  };
  unsupportedToken: FaucetToken;
  priceFeeds: {
    [symbol: string]: SimplePriceFeed;
  };
  configControllerFactory: ConfigControllerFactory;
  configController: ConfigController;
  sandboxController: ISandboxController;
  cometImpl: ISandboxComet;
  cometFactory: ISandboxCometFactory;
  owner: SignerWithAddress;
  curator: SignerWithAddress;
  guardian: SignerWithAddress;
  dao: SignerWithAddress;
  curve: any;
  seedReserves: string;
};

export interface SandboxControllerOpts {
  admin?: any;
  dao?: any;
  treasury?: any;
  feeEnabled?: boolean;
  config?: SandboxControllerConfigurationStruct;
  reserveCommissions?: [bigint, bigint, bigint];
  protocolCommissions?: [bigint, bigint, bigint];
}

export type SandboxControllerInfo = {
  opts: SandboxControllerOpts;
  sandboxController: SandboxController;
};

interface MockERC20Params {
  name: string;
  symbol: string;
}

export function dfn<T>(x: T | undefined | null, dflt: T): T {
  return x == undefined ? dflt : x;
}

export function exp(i: number, d: Numeric = 0, r: Numeric = 6): bigint {
  return (BigInt(Math.floor(i * 10 ** Number(r))) * 10n ** BigInt(d)) / 10n ** BigInt(r);
}

export function factor(f: number): bigint {
  return exp(f, factorDecimals);
}

export function defactor(f: bigint | BigNumber): number {
  return Number(toBigInt(f)) / 1e18;
}

// Truncates a factor to a certain number of decimals
export function truncateDecimals(factor: bigint | BigNumber, decimals = 4) {
  const descaleFactor = factorScale / exp(1, decimals);
  return (toBigInt(factor) / descaleFactor) * descaleFactor;
}

export function mulPrice(n: bigint, price: bigint | BigNumber, fromScale: bigint | BigNumber): bigint {
  return (n * toBigInt(price)) / toBigInt(fromScale);
}

function toBigInt(f: bigint | BigNumber): bigint {
  if (typeof f === "bigint") {
    return f;
  } else {
    return f.toBigInt();
  }
}

export function annualize(n: bigint | BigNumber, secondsPerYear = 31536000n): number {
  return defactor(toBigInt(n) * secondsPerYear);
}

export function toYears(seconds: number, secondsPerYear = 31536000): number {
  return seconds / secondsPerYear;
}

export function defaultAssets(overrides = {}, perAssetOverrides = {}) {
  return {
    COMP: Object.assign(
      {
        initial: 1e7,
        decimals: 18,
        initialPrice: 175,
      },
      overrides,
      perAssetOverrides["COMP"] || {}
    ),
    USDC: Object.assign(
      {
        initial: 1e6,
        decimals: 6,
      },
      overrides,
      perAssetOverrides["USDC"] || {}
    ),
    WETH: Object.assign(
      {
        initial: 1e4,
        decimals: 18,
        initialPrice: 3000,
      },
      overrides,
      perAssetOverrides["WETH"] || {}
    ),
    WBTC: Object.assign(
      {
        initial: 1e3,
        decimals: 8,
        initialPrice: 41000,
      },
      overrides,
      perAssetOverrides["WBTC"] || {}
    ),
  };
}

export const factorDecimals = 18;
export const factorScale = factor(1);
export const ONE = factorScale;
export const ZERO = factor(0);

export const DEFAULT_UPDATE_TIME = 7 * 24 * 60 * 60;
export const MIN_UPDATE_TIME = 300;

export async function getBlock(n?: number, ethers_ = ethers): Promise<Block> {
  const blockNumber = n == undefined ? await ethers_.provider.getBlockNumber() : n;
  return ethers_.provider.getBlock(blockNumber);
}

export async function fastForward(seconds: number, ethers_ = ethers): Promise<Block> {
  const block = await getBlock();
  await ethers_.provider.send("evm_setNextBlockTimestamp", [block.timestamp + seconds]);
  return block;
}

export async function makeMockComet(): Promise<CometHarness> {
  const CometHarness_factory: CometHarness__factory = (await ethers.getContractFactory("CometHarness")) as CometHarness__factory;
  const cometHarness: CometHarness = await CometHarness_factory.deploy();
  await cometHarness.deployed();

  return cometHarness;
}

export async function makeConfigControllerFactory(
  sandboxController: string,
  configControllerImpl: string
): Promise<ConfigControllerFactory> {
  const ConfigControllerFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;
  const configControllerFactory = await ConfigControllerFactory.deploy(sandboxController, configControllerImpl);
  await configControllerFactory.deployed();
  return configControllerFactory;
}

export async function makeCometFactory(cometImpl: Contract, configController: Contract): Promise<SandboxCometFactory> {
  const CometFactory_factory: SandboxCometFactory__factory = (await ethers.getContractFactory(
    "SandboxCometFactory"
  )) as SandboxCometFactory__factory;
  const cometFactory: SandboxCometFactory = await CometFactory_factory.deploy(cometImpl.address, configController.address);
  await cometFactory.deployed();

  return cometFactory;
}

export async function makeConfigController(opts: ProtocolOpts = {}): Promise<Partial<Protocol>> {
  const signers = await ethers.getSigners();

  const assets = opts.assets || defaultAssets();
  const owner = opts.owner || signers[0];
  const curator = opts.curator || signers[1];
  const guardian = opts.guardian || signers[2];
  const dao = opts.dao || signers[3];
  const users = signers.slice(4);
  const base = opts.base || "USDC";

  const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
  const tokens = {};
  for (const symbol in assets) {
    const config = assets[symbol];
    const decimals = config.decimals || 18;
    const initial = (config.initial != undefined && config.initial.toString()) || 1e6;
    const name = config.name || symbol;
    const factory = config.factory || FaucetFactory;
    let token: FaucetToken;
    token = tokens[symbol] = (await factory.deploy(initial, name, decimals, symbol)) as FaucetToken;
    await token.deployed();
  }

  const unsupportedToken = await FaucetFactory.deploy(1e6, "Unsupported Token", 6, "USUP");
  // --- Price feeds ---
  let priceFeeds = {};
  const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
  for (const asset in assets) {
    const initialPrice = exp(assets[asset].initialPrice || 1, 8);
    const priceFeedDecimals = assets[asset].priceFeedDecimals || 8;
    const priceFeed = await PriceFeedFactory.deploy(initialPrice, priceFeedDecimals, tokens[asset].address);
    await priceFeed.deployed();
    priceFeeds[asset] = priceFeed;
  }

  const priceFeed = await PriceFeedFactory.deploy(1, 6, unsupportedToken.address);
  await priceFeed.deployed();
  priceFeeds["USUP"] = priceFeed;

  // --- Parameters ---
  const supplyKink = dfn(opts.supplyKink, exp(0.8, 18));
  const supplyPerYearInterestRateBase = dfn(opts.supplyInterestRateBase, exp(0.001, 18));
  const supplyPerYearInterestRateSlopeLow = dfn(opts.supplyInterestRateSlopeLow, exp(0.05, 18));
  const supplyPerYearInterestRateSlopeHigh = dfn(opts.supplyInterestRateSlopeHigh, exp(2, 18));
  const borrowKink = dfn(opts.borrowKink, exp(0.8, 18));
  const borrowPerYearInterestRateBase = dfn(opts.borrowInterestRateBase, exp(0.005, 18));
  const borrowPerYearInterestRateSlopeLow = dfn(opts.borrowInterestRateSlopeLow, exp(0.1, 18));
  const borrowPerYearInterestRateSlopeHigh = dfn(opts.borrowInterestRateSlopeHigh, exp(3, 18));
  const baseBorrowMin = dfn(opts.baseBorrowMin, exp(1, assets[base].decimals));
  const baseToken: FaucetToken = tokens[base];
  const suggestedAmountOfSeedReserves = dfn(opts.suggestedAmountOfSeedReserves, 100000000n);
  const suggestedLockTimeOfSeedReserves = dfn(opts.suggestedLockTimeOfSeedReserves, time.duration.weeks(1));

  const sandboxControllerOpts = defaultSandboxControllerOpts({
    admin: owner,
    dao: dao,
    feeEnabled: false,
    config: {
      storeFrontPriceFactor: (opts.storeFrontPriceFactor ?? exp(0.1, 18)).toString(),
      minUpdateTime: MIN_UPDATE_TIME,
      maxUpdateTime: DEFAULT_UPDATE_TIME,
      targetPercent: opts.targetPercent
        ? ethers.utils.parseEther(opts.targetPercent.toString()).toString()
        : ethers.utils.parseEther("0.4").toString(),
    },
    reserveCommissions: opts.reserveCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
    protocolCommissions: opts.protocolCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
  });

  const sandboxController = (await makeSandboxController(sandboxControllerOpts)).sandboxController;
  await baseToken.allocateTo(owner.address, suggestedAmountOfSeedReserves);
  // --- Whitelist the base token ---
  await sandboxController.whitelistBaseAsset(
    tokens[base].address,
    priceFeeds[base].address,
    {
      supplyKink,
      supplyPerYearInterestRateBase,
      supplyPerYearInterestRateSlopeLow,
      supplyPerYearInterestRateSlopeHigh,
      borrowKink,
      borrowPerYearInterestRateBase,
      borrowPerYearInterestRateSlopeLow,
      borrowPerYearInterestRateSlopeHigh,
    },
    baseBorrowMin,
    suggestedAmountOfSeedReserves,
    suggestedLockTimeOfSeedReserves
  );
  // --- Whitelist the collateral assets ---
  for (const asset in assets) {
    const priceFeed = priceFeeds[asset];
    // Price feed is not deployed, deploy it
    if (!priceFeed) {
      priceFeeds[asset] = await PriceFeedFactory.deploy(1, 6, assets[asset].address);
    }
    // Skip the base token
    if (asset == base) continue;
    await sandboxController.whitelistCollateralAsset(
      tokens[asset].address,
      priceFeeds[asset].address,
      opts.assets?.[asset].minBorrowCF ?? exp(0.5, 18),
      opts.assets?.[asset].maxBorrowCF ?? exp(0.6, 18),
      opts.assets?.[asset].minLiquidateCF ?? exp(0.6, 18),
      opts.assets?.[asset].maxLiquidateCF ?? exp(0.7, 18),
      opts.assets?.[asset].minLiquidationFactor ?? exp(0.8, 18),
      opts.assets?.[asset].maxLiquidationFactor ?? exp(1, 18)
    );
  }

  const ConfigControllerFactoryFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;
  const CometFactory = (await ethers.getContractFactory("CometHarness")) as CometHarness__factory;
  const cometImpl = await CometFactory.deploy();

  const ConfigControllerFactory = (await ethers.getContractFactory("ConfigController")) as ConfigController__factory;

  const configControllerImpl = await ConfigControllerFactory.deploy();
  const configControllerFactory = await ConfigControllerFactoryFactory.deploy(sandboxController.address, configControllerImpl.address);

  const cometFactory = await makeCometFactory(cometImpl, configControllerFactory);

  await configControllerFactory.createConfigController(
    curator.address,
    guardian.address,
    cometFactory.address,
    1000,
    "ConfigController",
    DEFAULT_UPDATE_TIME,
    DEFAULT_UPDATE_TIME
  );

  const configController = (await ConfigControllerFactory.attach(await configControllerFactory.controllerAddresses(0))) as ConfigController;

  await configController.connect(curator).acceptCuratorRole();

  const curve = {
    supplyKink,
    supplyPerYearInterestRateBase,
    supplyPerYearInterestRateSlopeLow,
    supplyPerYearInterestRateSlopeHigh,
    borrowKink,
    borrowPerYearInterestRateBase,
    borrowPerYearInterestRateSlopeLow,
    borrowPerYearInterestRateSlopeHigh,
  };

  return {
    opts,
    base: await baseToken.symbol(),
    users,
    tokens,
    baseToken,
    assets,
    unsupportedToken,
    priceFeeds,
    configControllerFactory,
    configController,
    sandboxController,
    cometImpl,
    cometFactory,
    owner,
    curator,
    guardian,
    dao,
    curve,
    seedReserves: suggestedAmountOfSeedReserves.toString(),
  };
}

async function createComet2(
  opts: ProtocolOpts,
  configController: ConfigController,
  tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>,
  baseToken: FaucetToken | NonStandardFaucetFeeToken
) {
  const baseSymbol = await baseToken.symbol();

  const collateralTokens: CometConfigStruct["collateralTokens"] = [];
  for (let token of Object.keys(tokens)) {
    if (token !== baseSymbol) {
      const assetConfig = opts.assets?.[token];

      collateralTokens.push({
        collateralToken: tokens[token].address,
        borrowCollateralFactor: assetConfig?.borrowCF ?? exp(0.6, 18),
        liquidateCollateralFactor: assetConfig?.liquidateCF ?? exp(0.7, 18),
        liquidationFactor: assetConfig?.liquidationFactor ?? exp(0.8, 18),
        supplyCap: assetConfig?.supplyCap ?? exp(1e9, 18),
      });
    }
  }

  let marketConfig: CometConfigStruct = {
    baseToken: baseToken.address,
    collateralTokens: collateralTokens,
    baseTokenCurveId: 0n,
    name: opts.name || "Comet",
  };

  await configController.createComet(marketConfig);

  return configController.comets(0);
}

export async function createComet(
  configController: ConfigController,
  tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>,
  baseToken: FaucetToken | NonStandardFaucetFeeToken
): Promise<string> {
  let marketConfig: CometConfigStruct = {
    baseToken: baseToken.address,
    collateralTokens: [],
    baseTokenCurveId: 0n,
    name: "Comet",
  };

  for (let token in tokens) {
    if (token != (await baseToken.symbol())) {
      marketConfig.collateralTokens.push({
        collateralToken: tokens[token].address,
        borrowCollateralFactor: factor(0.6),
        liquidateCollateralFactor: factor(0.7),
        liquidationFactor: factor(0.8),
        supplyCap: exp(1e9, 18),
      });
    }
  }

  const createCometTx: ContractTransaction = await configController.createComet(marketConfig);
  const createCometReceipt: ContractReceipt = await createCometTx.wait();
  const [createCometEvents] = createCometReceipt.events.filter(event => event.event === "MarketCreated");
  const marketAddress: string = createCometEvents.args.market;
  return marketAddress;
}

export const makeProtocol = async (opts: ProtocolOpts = {}) => {
  const {
    configController,
    tokens,
    baseToken,
    priceFeeds,
    dao,
    sandboxController,
    seedReserves,
    users,
    guardian,
    owner,
    unsupportedToken,
  } = await makeConfigController(opts);

  await baseToken.allocateTo(owner.address, seedReserves);
  await baseToken.approve(configController.address, seedReserves);

  const market = await createComet2(opts, configController, tokens, baseToken);

  const comet = (await ethers.getContractAt("CometHarness", market)) as CometHarness;
  return {
    comet,
    configController,
    tokens,
    baseToken,
    base: opts.base,
    priceFeeds,
    dao,
    market,
    users,
    guardian,
    owner,
    unsupportedToken,
    seedReserves,
    sandboxController,
  };
};

export async function makeMockERC20({ name, symbol }: MockERC20Params): Promise<FaucetToken> {
  const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
  const token = await FaucetFactory.deploy(1e12, name, 18, symbol);
  await token.deployed();
  return token;
}

export function makeValidCurve(): BaseAssetCurveStruct {
  return {
    supplyKink: ethers.utils.parseEther("0.5").toString(),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateBase: ethers.BigNumber.from("100"),
    borrowKink: ethers.utils.parseEther("0.5").toString(),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
    borrowPerYearInterestRateBase: ethers.BigNumber.from("1"),
  };
}

/// TODO: add opts when testing curves
export async function sandboxListBaseAsset(
  sandboxController: SandboxController,
  baseAsset: FaucetToken,
  priceFeed: string,
  suggestedAmountOfSeedReserves: number | bigint,
  suggestedLockTimeOfSeedReserves: number | bigint
) {
  const baseBorrowMin = exp(1, await baseAsset.decimals());

  // --- Whitelist the base token ---
  await sandboxController.whitelistBaseAsset(
    baseAsset.address,
    priceFeed,
    makeValidCurve(),
    baseBorrowMin,
    suggestedAmountOfSeedReserves,
    suggestedLockTimeOfSeedReserves
  );
}

/// TODO: add opts when testing curves
export async function sandboxListCollateralAsset(sandboxController: SandboxController, collateralAsset: FaucetToken, priceFeed: string) {
  const minBorrowCF = exp(0.5, 18);
  const maxBorrowCF = exp(0.7, 18);
  const minLiquidateCF = exp(0.7, 18);
  const maxLiquidateCF = exp(0.8, 18);
  const minLiquidationFactor = exp(0.8, 18);
  const maxLiquidationFactor = exp(1, 18);

  await sandboxController.whitelistCollateralAsset(
    collateralAsset.address,
    priceFeed,
    minBorrowCF,
    maxBorrowCF,
    minLiquidateCF,
    maxLiquidateCF,
    minLiquidationFactor,
    maxLiquidationFactor
  );
}

export async function makePriceFeed(underlyingToken: string, amount?: string, decimals?: number): Promise<SimplePriceFeed> {
  const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
  const priceFeed = await PriceFeedFactory.deploy(amount ?? "100000000", decimals ?? 8, underlyingToken);
  await priceFeed.deployed();
  return priceFeed;
}

export async function makeToken(opts: TokenOpts = {}): Promise<FaucetToken> {
  const decimals = opts.decimals || 18;
  const name = opts.name || "TestToken";
  const symbol = opts.symbol || "TKN";
  const initial = opts.initialMint || "0";

  const factory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;

  let token = await factory.deploy(initial, name, decimals, symbol);
  await token.deployed();

  return token;
}

export function defaultSandboxControllerOpts(partial?: Partial<SandboxControllerOpts>): SandboxControllerOpts {
  return {
    admin: partial?.admin,
    dao: partial?.dao,
    treasury: partial?.treasury,
    feeEnabled: partial?.feeEnabled ?? false,
    config: {
      targetPercent: partial?.config?.targetPercent ?? ethers.utils.parseEther("0.5").toString(),
      storeFrontPriceFactor: partial?.config?.storeFrontPriceFactor ?? ethers.utils.parseEther("0.6").toString(),
      minUpdateTime: partial?.config?.minUpdateTime ?? MIN_UPDATE_TIME,
      maxUpdateTime: partial?.config?.maxUpdateTime ?? DEFAULT_UPDATE_TIME,
      // suggestedAmountOfSeedReserves: partial?.config?.suggestedAmountOfSeedReserves ?? ethers.utils.parseEther("500").toString(),
      // suggestedLockTimeOfSeedReserves: partial?.config?.suggestedLockTimeOfSeedReserves ?? 86400,
    },
    reserveCommissions: partial?.reserveCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
    protocolCommissions: partial?.protocolCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
  };
}

export async function makeOnlyConfigController(
  curator: string,
  guardian: string,
  cometFactory: string,
  configControllerFactoryAddress: string
): Promise<string> {
  const configControllerFactory: ConfigControllerFactory = (await ethers.getContractAt(
    "ConfigControllerFactory",
    configControllerFactoryAddress
  )) as ConfigControllerFactory;

  const tx: ContractTransaction = await configControllerFactory.createConfigController(
    curator,
    guardian,
    cometFactory,
    1000,
    "ConfigController",
    DEFAULT_UPDATE_TIME,
    DEFAULT_UPDATE_TIME
  );
  const receipt: ContractReceipt = await tx.wait();
  const [createConfigControllerEvent] = receipt.events.filter(event => event.event === "ConfigControllerCreated");
  const configControllerAddress: string = createConfigControllerEvent.args.controller;

  return configControllerAddress;
}

export async function makeSandboxController(opts: SandboxControllerOpts, factory?): Promise<SandboxControllerInfo> {
  const signers = await ethers.getSigners();
  const admin = opts.admin || signers[0];
  const dao = opts.dao || signers[1];
  const treasury = opts.treasury || signers[2];

  let SandboxControllerFactory;
  if (factory) {
    SandboxControllerFactory = factory;
  } else {
    SandboxControllerFactory = (await ethers.getContractFactory("SandboxController")) as SandboxController__factory;
  }

  const sandboxController = await SandboxControllerFactory.deploy(
    admin.address || admin,
    dao.address || dao,
    treasury.address || treasury,
    opts.feeEnabled,
    opts.config,
    opts.reserveCommissions,
    opts.protocolCommissions
  );
  await sandboxController.deployed();

  return {
    opts,
    sandboxController,
  };
}

export async function bumpTotalsCollateral(
  comet: CometHarness,
  token: FaucetToken | NonStandardFaucetFeeToken,
  delta: bigint
): Promise<BigNumber> {
  const totalCollateralBefore = await comet.totalsCollateral(token.address);

  const totalCollateralAfter = totalCollateralBefore.add(delta);
  await token.allocateTo(comet.address, delta);
  await wait(comet.setTotalsCollateral(token.address, totalCollateralAfter));

  return totalCollateralAfter;
}

export async function setTotalsBasic(comet: CometHarness, overrides = {}): Promise<TotalsBasicStructOutput> {
  const t0 = await comet.totalsBasic();
  const t1 = Object.assign({}, t0, overrides);
  await wait(comet.setTotalsBasic(t1));
  return t1;
}

export function objectify(arrayObject) {
  const obj = {};
  for (const key in arrayObject) {
    if (isNaN(Number(key))) {
      const value = arrayObject[key];
      if (value._isBigNumber) {
        obj[key] = BigInt(value);
      } else {
        obj[key] = value;
      }
    }
  }
  return obj;
}

export async function baseBalanceOf(comet: ISandboxComet, account: string): Promise<bigint> {
  const balanceOf = await comet.balanceOf(account);
  const borrowBalanceOf = await comet.borrowBalanceOf(account);
  return balanceOf.sub(borrowBalanceOf).toBigInt();
}

type Portfolio = {
  internal: {
    [symbol: string]: bigint;
  };
  external: {
    [symbol: string]: bigint;
  };
};

type TotalsAndReserves = {
  totals: {
    [symbol: string]: bigint;
  };
  reserves: {
    [symbol: string]: bigint;
  };
};

export async function portfolio({ comet, base, tokens }, account): Promise<Portfolio> {
  const internal = { [base]: await baseBalanceOf(comet, account) };
  const external = { [base]: BigInt(await tokens[base].balanceOf(account)) };
  for (const symbol in tokens) {
    if (symbol != base) {
      internal[symbol] = BigInt(await comet.collateralBalanceOf(account, tokens[symbol].address));
      external[symbol] = BigInt(await tokens[symbol].balanceOf(account));
    }
  }
  return { internal, external };
}

export async function totalsAndReserves({ comet, base, tokens }): Promise<TotalsAndReserves> {
  const totals = {
    [base]: BigInt((await comet.totalsBasic()).totalSupplyBase),
  };
  const reserves = { [base]: BigInt(await comet.getReserves()) };
  for (const symbol in tokens) {
    if (symbol != base) {
      totals[symbol] = BigInt((await comet.totalsCollateral(tokens[symbol].address)).totalSupplyAsset);
      reserves[symbol] = BigInt(await comet.getCollateralReserves(tokens[symbol].address));
    }
  }
  return { totals, reserves };
}

export interface TransactionResponseExt extends TransactionResponse {
  receipt: TransactionReceipt;
}

export async function wait(tx: TransactionResponse | Promise<TransactionResponse>): Promise<TransactionResponseExt> {
  const tx_ = await tx;
  let receipt = await tx_.wait();
  return {
    ...tx_,
    receipt,
  };
}

export function event(tx, index) {
  const ev = tx.receipt.events[index],
    args = {};
  for (const k in ev.args) {
    const v = ev.args[k];
    if (isNaN(Number(k))) {
      if (v._isBigNumber) {
        args[k] = BigInt(v);
      } else if (Array.isArray(v)) {
        args[k] = convertToBigInt(v);
      } else {
        args[k] = v;
      }
    }
  }
  return { [ev.event]: args };
}

// Convert all BigNumbers in an array into BigInts
function convertToBigInt(arr) {
  const newArr = [];
  for (const v of arr) {
    if (Array.isArray(v)) {
      newArr.push(convertToBigInt(v));
    } else {
      newArr.push(v._isBigNumber ? BigInt(v) : v);
    }
  }
  return newArr;
}

export function getGasUsed(tx: TransactionResponseExt): bigint {
  return tx.receipt.gasUsed.mul(tx.receipt.effectiveGasPrice).toBigInt();
}
