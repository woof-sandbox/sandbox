import { ethers, exp, expect, makeConfigController } from "./helper/helpers";
import {
  ConfigControllerFactory__factory,
  ConfigController__factory,
  SandboxComet__factory,
  SandboxCometFactory__factory,
  ConfigController,
  ConfigControllerFactory,
  SandboxComet,
  SandboxController,
  SandboxCometFactory,
  FaucetToken,
  NonStandardFaucetFeeToken,
} from "../build/types";
import {
  CollateralTokenConfigStruct,
  CometConfigStruct,
} from "../build/types/ConfigController";
import { anyUint } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("System Initialization Validation", function() {
  // Factories
  let ConfigControllerFactory: ConfigControllerFactory__factory;
  let ConfigController: ConfigController__factory;
  let Comet: SandboxComet__factory;
  let SandboxCometFactory: SandboxCometFactory__factory;

  before(async function() {
    ConfigControllerFactory = (await ethers.getContractFactory(
      "ConfigControllerFactory"
    )) as ConfigControllerFactory__factory;
    ConfigController = (await ethers.getContractFactory(
      "ConfigController"
    )) as ConfigController__factory;
    Comet = (await ethers.getContractFactory(
      "SandboxComet"
    )) as SandboxComet__factory;
    SandboxCometFactory = (await ethers.getContractFactory(
      "SandboxCometFactory"
    )) as SandboxCometFactory__factory;
  });

  describe("ConfigControllerFactory", function() {
    it("should set storage properly after deployment", async function() {
      // deploy config controller implementation
      const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

      // deploy config controller factory
      const configControllerFactory = (await ConfigControllerFactory.deploy(
        configControllerImpl.address
      )) as ConfigControllerFactory;

      expect(
        await configControllerFactory.configControllerImplementation()
      ).to.eq(configControllerImpl.address);
    });

    it("should revert if implementation is zero address", async function() {
      await expect(
        ConfigControllerFactory.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(
        ConfigControllerFactory,
        "InvalidAddress"
      );
    });
  });

  describe("SandboxCometFactory", function() {
    it("should set storage properly after deployment", async function() {
      // deploy config controller implementation
      const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

      // deploy config controller factory
      const configControllerFactory = (await ConfigControllerFactory.deploy(
        configControllerImpl.address
      )) as ConfigControllerFactory;

      // deploy implementation of sandbox comet
      const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

      // deploy sandbox comet factory
      const sandboxCometFactory = await SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );

      expect(await sandboxCometFactory.cometImplementation()).to.eq(
        sandboxCometImpl.address
      );
      expect(await sandboxCometFactory.configControllerFactory()).to.eq(
        configControllerFactory.address
      );
    });

    it("should revert if one of the parameters is zero address", async function() {
      const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

      await expect(
        SandboxCometFactory.deploy(
          ethers.constants.AddressZero,
          sandboxCometImpl.address
        )
      ).to.be.revertedWithCustomError(SandboxCometFactory, "InvalidAddress");

      await expect(
        SandboxCometFactory.deploy(
          sandboxCometImpl.address,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWithCustomError(SandboxCometFactory, "InvalidAddress");
    });
  });

  describe("ConfigController", function() {
    let configControllerFactory: ConfigControllerFactory;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let sandboxController: SandboxController;
    let cometFactory: SandboxCometFactory;

    beforeEach(async function() {
      // deploy config controller implementation
      const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

      // deploy config controller factory
      configControllerFactory = (await ConfigControllerFactory.deploy(
        configControllerImpl.address
      )) as ConfigControllerFactory;

      // deploy implementation of sandbox comet
      const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

      // deploy sandbox comet factory
      cometFactory = await SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );

      const {
        owner: ownerSigner,
        curator: curatorSigner,
        guardian: guardianSigner,
        sandboxController: sandboxControllerContract,
      } = await makeConfigController();

      owner = ownerSigner;
      curator = curatorSigner;
      guardian = guardianSigner;
      sandboxController = sandboxControllerContract as SandboxController;
    });

    it("should set storage properly after deployment", async function() {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
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

      // deploy config controller
      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      )
        .to.emit(configControllerFactory, "ConfigControllerCreated")
        .withArgs(
          configControllerAddress,
          owner.address,
          curator.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60,
          0
        );

      // Checks
      expect(await configControllerFactory.controllerAddresses(0)).to.eq(
        configControllerAddress
      );
      expect(await configControllerFactory.getLastControllerLength()).to.eq(1);
      expect(await configControllerFactory.getLastControllerLength()).to.eq(1);

      const configController = await ethers.getContractAt(
        "ConfigController",
        configControllerAddress
      );

      expect(await configController.owner()).to.eq(owner.address);
      expect(await configController.guardian()).to.eq(guardian.address);
      expect(await configController.sandboxController()).to.eq(
        sandboxController.address
      );
      expect(await configController.cometFactory()).to.eq(cometFactory.address);
      expect(await configController.curatorFee()).to.eq(1000);
      expect(await configController.name()).to.eq("ConfigController");
      expect(await configController.curatorProposalDuration()).to.eq(
        7 * 24 * 60 * 60
      );
      expect(await configController.proposalDuration()).to.eq(7 * 24 * 60 * 60);
      expect(await configController.configControllerFactory()).to.eq(
        configControllerFactory.address
      );
    });

    it("should propose curator properly", async function() {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
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

      // deploy config controller
      expect(
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
        )
      )
        .to.emit(ConfigController, "CuratorProposed")
        .withArgs(ethers.constants.AddressZero, curator.address, anyUint);

      const configController = (await ethers.getContractAt(
        "ConfigController",
        configControllerAddress
      )) as ConfigController;

      expect(await configController.proposedCurator()).to.eq(curator.address);
    });

    it("should revert if initialize twice", async function() {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
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
        configControllerAddress
      )) as ConfigController;

      await expect(
        configController.initialize(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "AlreadyInitialized");
    });

    it("should revert if passed addresses are zero address", async function() {
      await expect(
        configControllerFactory.createConfigController(
          ethers.constants.AddressZero,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "ZeroAddress");

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          ethers.constants.AddressZero,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "ZeroAddress");

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          ethers.constants.AddressZero,
          cometFactory.address,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "ZeroAddress");

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          ethers.constants.AddressZero,
          1000,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "ZeroAddress");
    });

    it("should revert if curator fee if invalid fee percentage", async function() {
      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          10001,
          "ConfigController",
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController, "InvalidFeePercentage");
    });

    it("should revert if proposals duration is too short", async function() {
      const {
        minUpdateTime,
      } = await sandboxController.controllerConfiguration();

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          minUpdateTime.sub(1),
          minUpdateTime.add(1)
        )
      ).to.be.revertedWithCustomError(
        ConfigController,
        "ProposalDurationTooShort"
      );

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          cometFactory.address,
          1000,
          "ConfigController",
          minUpdateTime.add(1),
          minUpdateTime.sub(1)
        )
      ).to.be.revertedWithCustomError(
        ConfigController,
        "ProposalDurationTooShort"
      );
    });
  });

  describe("SandboxComet", function() {
    let configControllerFactory: ConfigControllerFactory;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let sandboxController: SandboxController;
    let cometFactory: SandboxCometFactory;
    let configController: ConfigController;
    let tokens: any;
    let baseToken: FaucetToken | NonStandardFaucetFeeToken;
    let opts: any;
    let priceFeeds: any;

    beforeEach(async function() {
      // deploy config controller implementation
      const configControllerImpl = (await ConfigController.deploy()) as ConfigController;

      // deploy config controller factory
      configControllerFactory = (await ConfigControllerFactory.deploy(
        configControllerImpl.address
      )) as ConfigControllerFactory;

      // deploy implementation of sandbox comet
      const sandboxCometImpl = (await Comet.deploy()) as SandboxComet;

      // deploy sandbox comet factory
      cometFactory = await SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );

      const {
        owner: ownerSigner,
        curator: curatorSigner,
        guardian: guardianSigner,
        sandboxController: sandboxControllerContract,
        tokens: tokensList,
        baseToken: baseTokenContract,
        opts: optsList,
        priceFeeds: priceFeedsList,
      } = await makeConfigController();

      owner = ownerSigner;
      curator = curatorSigner;
      guardian = guardianSigner;
      sandboxController = sandboxControllerContract as SandboxController;
      tokens = tokensList;
      baseToken = baseTokenContract;
      opts = optsList;
      priceFeeds = priceFeedsList;

      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
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

      configController = (await ethers.getContractAt(
        "ConfigController",
        configControllerAddress
      )) as ConfigController;
    });

    it("should set storage properly after deployment", async function() {
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

      const cometAddr = await configController.callStatic.createComet(
        marketConfig
      );

      await expect(await configController.createComet(marketConfig))
        .to.emit(configController, "CometCreated")
        .withArgs(
          cometAddr,
          marketConfig.baseToken,
          marketConfig.priceFeed,
          1,
          marketConfig.baseTokenCurveId
        );

      const comet = (await ethers.getContractAt(
        "SandboxComet",
        cometAddr
      )) as SandboxComet;

      expect(await comet.factory()).to.eq(cometFactory.address);
      expect(await comet.configController()).to.eq(configController.address);
      expect(await comet.extension()).to.not.eq(ethers.constants.AddressZero);
    });

    it("should revert if factoryInit is called not from controller", async function() {
      await expect(
        cometFactory.connect(owner).createComet()
      ).to.be.revertedWithCustomError(cometFactory, "Unauthorized");
    });

    it("should revert if createComet is called not from owner on config controller", async function() {
      await expect(
        configController.connect(curator).createComet({
          baseToken: baseToken.address,
          priceFeed: priceFeeds[await baseToken.symbol()].address,
          collateralTokens: [],
          baseTokenCurveId: 0n,
          options: {
            baseTrackingSupplySpeed: 1e15,
            baseTrackingBorrowSpeed: 1e15,
            trackingIndexScale: 1e15,
            baseMinForRewards: 1e15,
          },
        })
      ).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert if factoryInit called twice", async function() {
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

      const cometAddr = await configController.callStatic.createComet(
        marketConfig
      );

      await configController.createComet(marketConfig);

      const comet = (await ethers.getContractAt(
        "SandboxComet",
        cometAddr
      )) as SandboxComet;

      await expect(
        comet.factoryInit(configController.address, cometFactory.address)
      ).to.be.revertedWithCustomError(comet, "AlreadyInitialized");
    });

    it("should revert on zero addresses", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const comet = (await SandboxComet.deploy()) as SandboxComet;

      await expect(
        comet.factoryInit(ethers.constants.AddressZero, curator.address)
      ).to.be.revertedWithCustomError(SandboxComet, "IncorrectInitialization");

      await expect(
        comet.factoryInit(curator.address, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(SandboxComet, "IncorrectInitialization");
    });

    it("should revert if initialize is called not from config controller", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const comet = (await SandboxComet.deploy()) as SandboxComet;

      await comet.factoryInit(owner.address, owner.address);

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

      const config = await sandboxController.config();

      await expect(
        comet
          .connect(curator)
          .initialize(marketConfig, config, curator.address, 1e15)
      ).to.be.revertedWithCustomError(comet, "IncorrectInitialization");
    });

    it("should initialize correctly", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const comet = (await SandboxComet.deploy()) as SandboxComet;

      await comet.factoryInit(owner.address, owner.address);

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

      const config = await sandboxController.config();

      await comet
        .connect(owner)
        .initialize(marketConfig, config, sandboxController.address, 1e15);

      expect(await comet.baseToken()).to.eq(marketConfig.baseToken);
    });

    it("should revert if initialize is called twice", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const comet = (await SandboxComet.deploy()) as SandboxComet;

      await comet.factoryInit(owner.address, owner.address);

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

      const config = await sandboxController.config();

      await comet
        .connect(owner)
        .initialize(marketConfig, config, sandboxController.address, 1e15);

      await expect(
        comet
          .connect(owner)
          .initialize(marketConfig, config, sandboxController.address, 1e15)
      ).to.be.revertedWithCustomError(comet, "AlreadyInitialized");
    });
  });
});
