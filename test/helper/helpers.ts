import hre from "hardhat";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  EvilToken__factory,
  FaucetToken,
  FaucetToken__factory,
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
import { BigNumber, BigNumberish } from "ethers";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import { CometConfigStruct, CollateralTokenConfigStruct } from "../../build/types/ConfigController";

// Snapshot
export type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
export { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

export { ethers, expect, hre };

export type Numeric = number | bigint;

export function exp(i: number, d: Numeric = 0, r: Numeric = 6): bigint {
  return (BigInt(Math.floor(i * 10 ** Number(r))) * 10n ** BigInt(d)) / 10n ** BigInt(r);
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

/// Exported constants
export const DEFAULT_UPDATE_TIME = 7 * 24 * 60 * 60;
export const MIN_UPDATE_TIME = 300;
export const DEFAULT_LOCK_TIME = 7 * 24 * 60 * 60;

/// ---------------------

/// Exported types -----------------------

export type MockERC20Params = {
  name: string;
  symbol: string;
  decimals?: number;
  supply?: BigNumberish;
};

export type AssetLimits = {
  minBorrowCF: BigNumberish;
  maxBorrowCF: BigNumberish;
  minLiquidateCF: BigNumberish;
  maxLiquidateCF: BigNumberish;
  minLiquidationFactor: BigNumberish;
  maxLiquidationFactor: BigNumberish;
};

export type Asset = {
  name: string;
  symbol: string;
  decimals: number;

  initial?: BigNumberish;
  assetLimits?: AssetLimits;

  collateralConfig?: CollateralConfig;
  initialPrice?: number;
  priceFeedDecimals?: number;
  factory?: FaucetToken__factory | EvilToken__factory | NonStandardFaucetFeeToken__factory;
};

export type CollateralConfig = {
  borrowCF: BigNumberish;
  liquidateCF: BigNumberish;
  liquidationFactor: BigNumberish;
  supplyCap: BigNumberish;
};

export type SandboxControllerOpts = {
  admin: string;
  dao: string;
  treasury: string;

  feeEnabled?: boolean;

  config?: SandboxControllerConfigurationStruct;
  reserveCommissions?: [bigint, bigint, bigint];
  protocolCommissions?: [bigint, bigint, bigint];
};

export type ProtocolOpts = {
  owner: SignerWithAddress;
  treasury: string;
  curator: SignerWithAddress;
  guardian: SignerWithAddress;
  dao: SignerWithAddress;

  name?: string;
  baseTokenSymbol?: string;
  assets?: {
    [symbol: string]: Asset;
  };

  curve?: BaseAssetCurveStruct;
  baseBorrowMin?: Numeric;

  suggestedAmountOfSeedReserves?: number | bigint;
  suggestedLockTimeOfSeedReserves?: number | bigint;
  config?: SandboxControllerConfigurationStruct;
  reserveCommissions?: [bigint, bigint, bigint];
  protocolCommissions?: [bigint, bigint, bigint];
  acceptCurator?: boolean;
};

export type Protocol = {
  opts: ProtocolOpts;
  baseTokenSymbol: string;
  baseToken: FaucetToken | NonStandardFaucetFeeToken;

  collaterals: {
    [symbol: string]: FaucetToken | NonStandardFaucetFeeToken;
  };

  priceFeeds: {
    [symbol: string]: SimplePriceFeed;
  };

  configControllerFactory: ConfigControllerFactory;
  configController: ConfigController;
  sandboxController: ISandboxController;
  cometImpl: ISandboxComet;
  cometFactory: ISandboxCometFactory;
};

/// ---------------------

/// Atomic helpers ---------------------------

export async function makeMockERC20(opts: MockERC20Params): Promise<FaucetToken> {
  const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
  const token = await FaucetFactory.deploy(opts.supply || 1e12, opts.name, opts.decimals || 18, opts.symbol);
  await token.deployed();
  return token;
}

export async function makePriceFeed(underlyingToken: string, amount?: string, decimals?: number): Promise<SimplePriceFeed> {
  const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
  const priceFeed = await PriceFeedFactory.deploy(amount ?? "100000000", decimals ?? 8, underlyingToken);
  await priceFeed.deployed();
  return priceFeed;
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

export function defaultAssets(): { [symbol: string]: Asset } {
  return {
    COMP: Object.assign({
      name: "COMP",
      symbol: "COMP",
      decimals: 18,

      initial: 1e7,
      initialPrice: 175,
      liquidationFactor: exp(0.8, 18),
    }),
    USDC: Object.assign({
      name: "USDC",
      symbol: "USDC",
      decimals: 6,

      initial: 1e6,
      liquidationFactor: exp(0.8, 18),
    }),
    WETH: Object.assign({
      name: "WETH",
      symbol: "WETH",
      decimals: 18,

      initial: 1e4,
      initialPrice: 3000,
      liquidationFactor: exp(0.8, 18),
    }),
    WBTC: Object.assign({
      name: "WBTC",
      symbol: "WBTC",
      decimals: 8,

      initial: 1e3,
      initialPrice: 41000,
      liquidationFactor: exp(0.8, 18),
    }),
  };
}

export function defaultAssetLimits(): AssetLimits {
  return {
    minBorrowCF: exp(0.5, 18),
    maxBorrowCF: exp(0.8, 18),
    minLiquidateCF: exp(0.7, 18),
    maxLiquidateCF: exp(0.9, 18),
    minLiquidationFactor: exp(0.75, 18),
    maxLiquidationFactor: exp(0.95, 18),
  };
}

export function defaultCollateralConfig(): CollateralConfig {
  return {
    borrowCF: exp(0.6, 18),
    liquidateCF: exp(0.75, 18),
    liquidationFactor: exp(0.85, 18),
    supplyCap: exp(1e9, 18),
  };
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
    },
    reserveCommissions: partial?.reserveCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
    protocolCommissions: partial?.protocolCommissions ?? [exp(0.01, 18), exp(0.02, 18), exp(0.03, 18)],
  };
}

export async function makeSandboxController(opts: SandboxControllerOpts, factory?): Promise<SandboxController> {
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

  return sandboxController;
}

export async function sandboxListBaseAsset(
  sandboxController: SandboxController,
  baseAsset: FaucetToken | NonStandardFaucetFeeToken,
  priceFeed: string,
  baseBorrowMin?: BigNumberish,
  curve?: BaseAssetCurveStruct,
  suggestedReserves?: BigNumberish,
  lockTime?: BigNumberish
) {
  const baseBorrowMin_ = baseBorrowMin || exp(1, await baseAsset.decimals());
  const curve_ = curve || makeValidCurve();
  const suggestedReserves_ = suggestedReserves || exp(1e5, 6); //100$ in USDC
  const lockTime_ = lockTime || DEFAULT_LOCK_TIME;

  // --- Whitelist the base token ---
  await sandboxController.whitelistBaseAsset(baseAsset.address, priceFeed, curve_, baseBorrowMin_, suggestedReserves_, lockTime_);
}

export async function sandboxListCollateralAsset(
  sandboxController: SandboxController,
  collateralAsset: FaucetToken,
  priceFeed: string,
  limits?: AssetLimits
) {
  const limits_: AssetLimits = limits || defaultAssetLimits();

  await sandboxController.whitelistCollateralAsset(
    collateralAsset.address,
    priceFeed,
    limits_.minBorrowCF,
    limits_.maxBorrowCF,
    limits_.minLiquidateCF,
    limits_.maxLiquidateCF,
    limits_.minLiquidationFactor,
    limits_.maxLiquidationFactor
  );
}

/// ---------------------

/// Protocol setup --------------

async function makeConfigControllerFactory(sandboxController: string, configControllerImpl?: string): Promise<ConfigControllerFactory> {
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

async function makeCometFactory(cometImpl: string, configControllerFactory: string): Promise<SandboxCometFactory> {
  const CometFactory_factory: SandboxCometFactory__factory = (await ethers.getContractFactory(
    "SandboxCometFactory"
  )) as SandboxCometFactory__factory;
  const cometFactory: SandboxCometFactory = await CometFactory_factory.deploy(cometImpl, configControllerFactory);
  await cometFactory.deployed();

  return cometFactory;
}

export async function makeConfigController(opts: ProtocolOpts): Promise<Protocol> {
  const assets = opts.assets || defaultAssets();
  const baseTokenSymbol = opts.baseTokenSymbol || "USDC";
  let baseToken: FaucetToken | NonStandardFaucetFeeToken;

  const acceptCurator = opts.acceptCurator === undefined || opts.acceptCurator;

  // --- deploy tokens ---
  const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;

  const collaterals = {};
  for (const symbol in assets) {
    const config = assets[symbol];
    const decimals = config.decimals || 18;
    const initial = (config.initial != undefined && config.initial.toString()) || 1e6;
    const name = config.name || symbol;
    const factory = config.factory || FaucetFactory;

    let token: FaucetToken | NonStandardFaucetFeeToken;
    token = await factory.deploy(initial, name, decimals, symbol);

    await token.deployed();

    if (symbol == baseTokenSymbol) {
      baseToken = token;
    } else {
      collaterals[symbol] = token;
    }
  }

  // --- Price feeds ---
  let priceFeeds = {};
  let tokenAddress: string;
  const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
  for (const symbol in assets) {
    const initialPrice = exp(assets[symbol].initialPrice || 1, 8);
    const priceFeedDecimals = assets[symbol].priceFeedDecimals || 8;

    if (symbol == baseTokenSymbol) {
      tokenAddress = baseToken.address;
    } else {
      tokenAddress = collaterals[symbol].address;
    }

    const priceFeed = await PriceFeedFactory.deploy(initialPrice, priceFeedDecimals, tokenAddress);
    await priceFeed.deployed();

    priceFeeds[symbol] = priceFeed;
  }

  /// --- Deploy sandbox controller
  const sandboxControllerOpts = defaultSandboxControllerOpts({
    admin: opts.owner.address,
    dao: opts.dao.address,
    treasury: opts.treasury,
    feeEnabled: false,
    config: opts.config,
    reserveCommissions: opts.reserveCommissions,
    protocolCommissions: opts.protocolCommissions,
  });

  const sandboxController = await makeSandboxController(sandboxControllerOpts);

  // --- Whitelist the base token ---
  await sandboxListBaseAsset(
    sandboxController,
    baseToken,
    priceFeeds[baseTokenSymbol].address,
    opts.baseBorrowMin,
    opts.curve,
    opts.suggestedAmountOfSeedReserves,
    opts.suggestedLockTimeOfSeedReserves
  );

  // --- Whitelist the collateral assets ---
  for (const symbol in assets) {
    // Skip the base token
    if (symbol == baseTokenSymbol) continue;

    await sandboxListCollateralAsset(sandboxController, collaterals[symbol], priceFeeds[symbol].address, opts.assets?.[symbol].assetLimits);
  }

  // --- deploy config controller ---
  const cometFactory_ = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;

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
    baseTokenSymbol: await baseToken.symbol(),
    baseToken,
    collaterals,
    priceFeeds,
    configControllerFactory,
    configController,
    sandboxController,
    cometImpl,
    cometFactory,
  };
}

export async function createComet(
  owner: SignerWithAddress,
  assets: {
    [symbol: string]: Asset;
  },
  configController: ConfigController,
  sandboxController: ISandboxController,
  collaterals: {
    [symbol: string]: FaucetToken | NonStandardFaucetFeeToken;
  },
  baseToken: FaucetToken | NonStandardFaucetFeeToken,
  name?: string
): Promise<SandboxComet> {
  const _assets = assets || defaultAssets();
  const defaultConfig: CollateralConfig = defaultCollateralConfig();

  const collateralTokens: CollateralTokenConfigStruct[] = [];

  for (let symbol in collaterals) {
    const assetConfig = _assets[symbol];

    collateralTokens.push({
      collateralToken: collaterals[symbol].address,
      borrowCollateralFactor: assetConfig?.collateralConfig?.borrowCF || defaultConfig.borrowCF,
      liquidateCollateralFactor: assetConfig?.collateralConfig?.liquidateCF || defaultConfig.liquidateCF,
      liquidationFactor: assetConfig?.collateralConfig?.liquidationFactor || defaultConfig.liquidationFactor,
      supplyCap: assetConfig?.collateralConfig?.supplyCap || defaultConfig.supplyCap,
    });
  }

  let marketConfig: CometConfigStruct = {
    baseToken: baseToken.address,
    collateralTokens: collateralTokens,
    baseTokenCurveId: 0n,
    name: name || "Comet",
    amountOfSeedReserves: dfn(opts.amountOfSeedReserves, "100000000")
  };

  const amount = await sandboxController.suggestedAmountOfSeedReserves(baseToken.address);
  await baseToken.connect(owner).allocateTo(owner.address, amount);
  await baseToken.connect(owner).approve(configController.address, amount);

  await configController.createComet(marketConfig);

  const lastComet = await configController.cometsLength();
  const cometAddr = await configController.comets(lastComet.sub(1));

  return (await ethers.getContractAt("SandboxComet", cometAddr)) as SandboxComet;
}

/// ---------------------

/// Balance helpers --------------

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
