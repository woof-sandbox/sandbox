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
  SandboxComet__factory,
  ISandboxComet,
} from "../../build/types";

import { SandboxCometFactory } from "../../build/types/SandboxCometFactory";
import { SandboxCometFactory__factory } from "../../build/types/factories/SandboxCometFactory__factory";
import { SandboxController, BaseAssetCurveStruct, SandboxControllerConfigurationStruct } from "../../build/types/SandboxController";
import { SandboxController__factory } from "../../build/types/factories/SandboxController__factory";
import { BigNumber, BigNumberish, ContractReceipt, ContractTransaction } from "ethers";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import { CometHarness, TotalsBasicStructOutput } from "../../build/types/CometHarness";
import { CometConfigStruct } from "../../build/types/ConfigController";

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
  owner: SignerWithAddress;
  treasury: SignerWithAddress;
  curator: SignerWithAddress;
  guardian: SignerWithAddress;
  dao: SignerWithAddress;

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
  base?: string;
  curve?: BaseAssetCurveStruct;
  trackingIndexScale?: Numeric;
  baseTrackingSupplySpeed?: Numeric;
  baseTrackingBorrowSpeed?: Numeric;
  baseMinForRewards?: Numeric;
  baseBorrowMin?: Numeric;
  baseTokenBalance?: Numeric;
  config?: SandboxControllerConfigurationStruct;
  reserveCommissions?: [bigint, bigint, bigint];
  protocolCommissions?: [bigint, bigint, bigint];
};

export type Protocol = {
  opts: ProtocolOpts;
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
  curve: any;
  seedReserves: string;
};

export interface SandboxControllerOpts {
  admin: string;
  dao: string;
  treasury: string;
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
  configControllerImpl?: string
): Promise<ConfigControllerFactory> {
  const _configControllerFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;

  let configControllerImplAddress: string;
  if (configControllerImpl) {
    configControllerImplAddress = configControllerImpl;
  } else {
    const _configController = (await ethers.getContractFactory("ConfigController")) as ConfigController__factory;
    configControllerImplAddress = (await _configController.deploy()).address;
  }

  const configControllerFactory = await _configControllerFactory.deploy(sandboxController, configControllerImplAddress);
  await configControllerFactory.deployed();

  return configControllerFactory;
}

export async function makeCometFactory(cometImpl: string, configControllerFactory: string): Promise<SandboxCometFactory> {
  const CometFactory_factory: SandboxCometFactory__factory = (await ethers.getContractFactory(
    "SandboxCometFactory"
  )) as SandboxCometFactory__factory;
  const cometFactory: SandboxCometFactory = await CometFactory_factory.deploy(cometImpl, configControllerFactory);
  await cometFactory.deployed();

  return cometFactory;
}

export async function makeConfigController(opts: ProtocolOpts, acceptCurator?: boolean, harness?: boolean): Promise<Partial<Protocol>> {
  const assets = opts.assets || defaultAssets();
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
  const baseBorrowMin = dfn(opts.baseBorrowMin, exp(1, assets[base].decimals));
  const baseToken: FaucetToken = tokens[base];
  const curve = opts.curve || makeValidCurve();

  /// --- Deploy sandbox controller
  const sandboxControllerOpts = defaultSandboxControllerOpts({
    admin: opts.owner.address,
    dao: opts.dao.address,
    treasury: opts.treasury.address,
    feeEnabled: false,
    config: opts.config,
    reserveCommissions: opts.reserveCommissions,
    protocolCommissions: opts.protocolCommissions,
  });

  const sandboxController = (await makeSandboxController(sandboxControllerOpts)).sandboxController;
  await baseToken.allocateTo(opts.owner.address, sandboxControllerOpts.config.suggestedAmountOfSeedReserves);

  // --- Whitelist the base token ---
  await sandboxController.whitelistBaseAsset(tokens[base].address, priceFeeds[base].address, curve, baseBorrowMin);

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

  // --- deploy config controller ---
  let cometFactory_;

  if (harness) {
    cometFactory_ = (await ethers.getContractFactory("CometHarness")) as CometHarness__factory;
  } else {
    cometFactory_ = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
  }
  const cometImpl = await cometFactory_.deploy();
  await cometImpl.deployed();

  const configControllerFactory: ConfigControllerFactory = await makeConfigControllerFactory(sandboxController.address);
  const cometFactory = await makeCometFactory(cometImpl.address, configControllerFactory.address);

  await configControllerFactory.createConfigController(
    opts.curator.address,
    opts.guardian.address,
    cometFactory.address,
    1000,
    "ConfigController",
    DEFAULT_UPDATE_TIME,
    DEFAULT_UPDATE_TIME
  );

  const configController: ConfigController = (await ethers.getContractAt(
    "ConfigController",
    await configControllerFactory.controllerAddresses(0)
  )) as ConfigController;

  if (acceptCurator) {
    await configController.connect(opts.curator).acceptCuratorRole();
  }

  return {
    opts,
    base: await baseToken.symbol(),
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
    curve,
    seedReserves: sandboxControllerOpts.config.suggestedAmountOfSeedReserves.toString(),
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

export const makeProtocol = async (opts: ProtocolOpts) => {
  const { configController, tokens, baseToken, priceFeeds, sandboxController, seedReserves, unsupportedToken } = await makeConfigController(
    opts,
    true,
    true
  );

  await baseToken.allocateTo(opts.owner.address, seedReserves);
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
    market,
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
    supplyKink: ethers.utils.parseEther("0.8").toString(),
    supplyPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.05").toString(),
    supplyPerYearInterestRateSlopeHigh: ethers.utils.parseEther("2").toString(),
    supplyPerYearInterestRateBase: ethers.utils.parseEther("0.001").toString(),
    borrowKink: ethers.utils.parseEther("0.8").toString(),
    borrowPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.1").toString(),
    borrowPerYearInterestRateSlopeHigh: ethers.utils.parseEther("3").toString(),
    borrowPerYearInterestRateBase: ethers.utils.parseEther("0.005").toString(),
  };
}

export async function sandboxListBaseAsset(
  sandboxController: SandboxController,
  baseAsset: FaucetToken,
  priceFeed: string,
  baseBorrowMin?: BigNumberish,
  curve?: BaseAssetCurveStruct
) {
  const baseBorrowMin_ = baseBorrowMin || exp(1, await baseAsset.decimals());
  const curve_ = curve || makeValidCurve();

  // --- Whitelist the base token ---
  await sandboxController.whitelistBaseAsset(baseAsset.address, priceFeed, curve_, baseBorrowMin_);
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
      suggestedAmountOfSeedReserves: partial?.config?.suggestedAmountOfSeedReserves ?? ethers.utils.parseEther("500").toString(),
      suggestedLockTimeOfSeedReserves: partial?.config?.suggestedLockTimeOfSeedReserves ?? 86400,
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
  let SandboxControllerFactory;
  if (factory) {
    SandboxControllerFactory = factory;
  } else {
    SandboxControllerFactory = (await ethers.getContractFactory("SandboxController")) as SandboxController__factory;
  }

  const sandboxController = await SandboxControllerFactory.deploy(
    opts.admin,
    opts.dao,
    opts.treasury,
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
