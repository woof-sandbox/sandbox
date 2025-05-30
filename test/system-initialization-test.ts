import { ethers, exp, makeConfigController } from "./helper/helpers";
import {
  ConfigController,
  ConfigControllerFactory,
  SandboxComet,
} from "../build/types";
import {
  CollateralTokenConfigStruct,
  CometConfigStruct,
} from "../build/types/ConfigController";

describe("System Initialization", function() {
  it("should allow to deploy ConfigControllerFactory", async function() {
    // factories
    const ConfigControllerFactory = await ethers.getContractFactory(
      "ConfigControllerFactory"
    );
    const ConfigController = await ethers.getContractFactory(
      "ConfigController"
    );

    // deploy config controller implementation
    const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

    // deploy config controller factory
    await ConfigControllerFactory.deploy(configControllerImpl.address);
  });

  it("should allow to deploy SandboxCometFactory", async function() {
    // factories
    const ConfigControllerFactory = await ethers.getContractFactory(
      "ConfigControllerFactory"
    );
    const ConfigController = await ethers.getContractFactory(
      "ConfigController"
    );
    const Comet = await ethers.getContractFactory("SandboxComet");
    const SandboxCometFactory = await ethers.getContractFactory(
      "SandboxCometFactory"
    );

    // deploy config controller implementation
    const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

    // deploy config controller factory
    const configControllerFactory = (await ConfigControllerFactory.deploy(
      configControllerImpl.address
    )) as ConfigControllerFactory;

    // deploy implementation of sandbox comet
    const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

    // deploy sandbox comet factory
    await SandboxCometFactory.deploy(
      sandboxCometImpl.address,
      configControllerFactory.address
    );
  });

  it("should allow to deploy ConfigController", async function() {
    // factories
    const ConfigControllerFactory = await ethers.getContractFactory(
      "ConfigControllerFactory"
    );
    const ConfigController = await ethers.getContractFactory(
      "ConfigController"
    );
    const Comet = await ethers.getContractFactory("SandboxComet");
    const SandboxCometFactory = await ethers.getContractFactory(
      "SandboxCometFactory"
    );

    // deploy config controller implementation
    const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

    // deploy config controller factory
    const configControllerFactory = (await ConfigControllerFactory.deploy(
      configControllerImpl.address
    )) as ConfigControllerFactory;

    // deploy implementation of sandbox comet
    const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

    // deploy sandbox comet factory
    const cometFactory = await SandboxCometFactory.deploy(
      sandboxCometImpl.address,
      configControllerFactory.address
    );

    const {
      owner,
      curator,
      guardian,
      sandboxController,
    } = await makeConfigController();

    // deploy config controller
    await configControllerFactory.createConfigController(
      owner.address,
      curator.address,
      guardian.address,
      sandboxController.address,
      cometFactory.address,
      1000,
      "ConfigController",
      7 * 24 * 60 * 60,
      7 * 24 * 60 * 60
    );
  });

  it("should allow to deploy Comet", async function() {
    // factories
    const ConfigControllerFactory = await ethers.getContractFactory(
      "ConfigControllerFactory"
    );
    const ConfigController = await ethers.getContractFactory(
      "ConfigController"
    );
    const Comet = await ethers.getContractFactory("SandboxComet");
    const SandboxCometFactory = await ethers.getContractFactory(
      "SandboxCometFactory"
    );

    // deploy config controller implementation
    const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

    // deploy config controller factory
    const configControllerFactory = (await ConfigControllerFactory.deploy(
      configControllerImpl.address
    )) as ConfigControllerFactory;

    // deploy implementation of sandbox comet
    const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

    // deploy sandbox comet factory
    const cometFactory = await SandboxCometFactory.deploy(
      sandboxCometImpl.address,
      configControllerFactory.address
    );

    const {
      owner,
      curator,
      guardian,
      sandboxController,
      tokens,
      baseToken,
      opts,
      priceFeeds,
    } = await makeConfigController();

    // deploy config controller
    await configControllerFactory.createConfigController(
      owner.address,
      curator.address,
      guardian.address,
      sandboxController.address,
      cometFactory.address,
      1000,
      "ConfigController",
      7 * 24 * 60 * 60,
      7 * 24 * 60 * 60
    );

    const configController = (await ethers.getContractAt(
      "ConfigController",
      await configControllerFactory.controllerAddresses(0)
    )) as ConfigController;

    console.log(configController.address);

    // deploy comet
    const baseSymbol = await baseToken.symbol();

    let collateralTokens: CollateralTokenConfigStruct[] = [];
    for (let token of Object.keys(tokens)) {
      if (token !== baseSymbol) {
        const assetConfig = opts.assets?.[token];

        collateralTokens.push({
          collateralToken: tokens[token].address,
          priceFeed: priceFeeds[token].address,
          borrowCollateralFactor: assetConfig?.borrowCF ?? exp(0.6, 18),
          liquidateCollateralFactor: assetConfig?.liquidateCF ?? exp(0.7, 18),
          liquidationFactor: assetConfig?.liquidationFactor ?? exp(0.8, 18),
          supplyCap: assetConfig?.supplyCap ?? exp(1e9, 18),
        });
      }
    }

    const marketConfig: CometConfigStruct = {
      baseToken: baseToken.address,
      priceFeed: priceFeeds[await baseToken.symbol()].address,
      collateralTokens: collateralTokens,
      baseTokenCurveId: 0n,
      options: {
        baseTrackingSupplySpeed: 1e15,
        baseTrackingBorrowSpeed: 1e15,
        trackingIndexScale: 1e15,
        baseMinForRewards: 1e15,
      },
    };

    await configController.createComet(marketConfig);
  });
});
