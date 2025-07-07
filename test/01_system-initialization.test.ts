import {
  ethers,
  exp,
  expect,
  defaultSandboxControllerOpts,
  makeSandboxController,
  makeToken,
  makePriceFeed,
  sandboxListBaseAsset,
  sandboxListCollateralAsset,
  SandboxControllerOpts,
} from "./helper/helpers";
import {
  ConfigController,
  ConfigControllerInitializeTest,
  ConfigControllerFactory,
  SandboxComet,
  SandboxCometFactory,
  ConfigControllerFactory__factory,
  ConfigControllerInitializeTest__factory,
  SandboxComet__factory,
  SandboxCometFactory__factory,
  SandboxController__factory,
} from "../build/types";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";

describe("1. System Initialization", function () {
  // Factories
  let _ConfigControllerFactory: ConfigControllerFactory__factory;
  let _ConfigController: ConfigControllerInitializeTest__factory;
  let _Comet: SandboxComet__factory;
  let _SandboxCometFactory: SandboxCometFactory__factory;
  let _SandboxControllerFactory: SandboxController__factory;

  let configControllerImpl: ConfigController;
  let sandboxCometImpl: SandboxComet;

  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let guardian: SignerWithAddress;
  let dao: SignerWithAddress;

  const _minUpdateTime = 7 * 24 * 60 * 60;

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60,
  };

  let opts: SandboxControllerOpts = {};

  before(async function () {
    _ConfigControllerFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;

    /// Note: we are deploying the test wrapper over the config controller
    _ConfigController = (await ethers.getContractFactory("ConfigControllerInitializeTest")) as ConfigControllerInitializeTest__factory;
    _Comet = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
    _SandboxCometFactory = (await ethers.getContractFactory("SandboxCometFactory")) as SandboxCometFactory__factory;
    _SandboxControllerFactory = (await ethers.getContractFactory("SandboxController")) as SandboxController__factory;

    configControllerImpl = (await _ConfigController.deploy()) as ConfigController;
    sandboxCometImpl = (await _Comet.deploy()) as SandboxComet;

    signers = await ethers.getSigners();

    owner = signers[0];
    curator = signers[1];
    guardian = signers[2];
    dao = signers[3];
    /// Options of the sandbox controller
    opts = defaultSandboxControllerOpts({ admin: owner, dao: dao, feeEnabled: true });
  });

  describe("Config Controller Factory deployment", function () {
    let sandboxControllerTest;

    before(async function () {
      sandboxControllerTest = signers[4];
    });
    it("should allow to deploy ConfigControllerFactory", async function () {
      // deploy config controller factory
      const configControllerFactory = (await _ConfigControllerFactory.deploy(
        sandboxControllerTest.address,
        configControllerImpl.address
      )) as ConfigControllerFactory;
      expect(configControllerFactory).to.have.property("address");
    });

    it("should set storage properly after deployment", async function () {
      const configControllerFactory = (await _ConfigControllerFactory.deploy(
        sandboxControllerTest.address,
        configControllerImpl.address
      )) as ConfigControllerFactory;

      expect(await configControllerFactory.configControllerImplementation()).to.eq(configControllerImpl.address);

      expect(await configControllerFactory.sandboxController()).to.eq(sandboxControllerTest.address);
    });

    it("should revert if implementation is zero address", async function () {
      await expect(
        _ConfigControllerFactory.deploy(sandboxControllerTest.address, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(_ConfigControllerFactory, "ZeroAddress");
    });

    it("should revert if sandbox controller is zero address", async function () {
      await expect(
        _ConfigControllerFactory.deploy(ethers.constants.AddressZero, configControllerImpl.address)
      ).to.be.revertedWithCustomError(_ConfigControllerFactory, "ZeroAddress");
    });
  });

  describe("Sandbox Comet Factory deployment", function () {
    let configControllerFactory: ConfigControllerFactory;

    before(async function () {
      const sandboxControllerTest = signers[4];
      configControllerFactory = await _ConfigControllerFactory.deploy(sandboxControllerTest.address, configControllerImpl.address);
    });

    it("should allow to deploy SandboxCometFactory", async function () {
      // deploy sandbox comet factory
      const sandboxCometFactory = await _SandboxCometFactory.deploy(sandboxCometImpl.address, configControllerFactory.address);
      expect(sandboxCometFactory).to.have.property("address");
    });

    it("should set storage properly after deployment", async function () {
      const sandboxCometFactory = await _SandboxCometFactory.deploy(sandboxCometImpl.address, configControllerFactory.address);

      expect(await sandboxCometFactory.cometImplementation()).to.eq(sandboxCometImpl.address);
      expect(await sandboxCometFactory.configControllerFactory()).to.eq(configControllerFactory.address);
    });

    it("should revert if one of the parameters is zero address", async function () {
      await expect(_SandboxCometFactory.deploy(ethers.constants.AddressZero, sandboxCometImpl.address)).to.be.revertedWithCustomError(
        _SandboxCometFactory,
        "InvalidAddress"
      );

      await expect(_SandboxCometFactory.deploy(sandboxCometImpl.address, ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        _SandboxCometFactory,
        "InvalidAddress"
      );
    });
  });

  describe("Config Controller deployment", function () {
    let configControllerFactory: ConfigControllerFactory;
    let sandboxCometFactory: SandboxCometFactory;
    let sandboxController;
    let configControllersCount = 0;

    before(async function () {
      sandboxController = (await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }))).sandboxController;
      configControllerFactory = await _ConfigControllerFactory.deploy(sandboxController.address, configControllerImpl.address);
      sandboxCometFactory = await _SandboxCometFactory.deploy(sandboxCometImpl.address, configControllerFactory.address);
    });

    it("should allow to deploy ConfigController", async function () {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
        curator.address,
        guardian.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      // deploy config controller
      await configControllerFactory.createConfigController(
        curator.address,
        guardian.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      configControllersCount += 1;

      const configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;
      expect(configController.address).to.be.eq(configControllerAddress);
    });

    it("should emit event on Controller deployment", async function () {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
        curator.address,
        guardian.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      // deploy config controller
      expect(
        await configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      )
        .to.emit(configControllerFactory, "ConfigControllerCreated")
        .withArgs(
          configControllerAddress,
          owner.address,
          curator.address,
          sandboxController.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration,
          0
        );
      configControllersCount += 1;
    });

    it("should revert on deployment with curator zero address", async function () {
      await expect(
        configControllerFactory.createConfigController(
          ethers.constants.AddressZero,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(_ConfigController, "ZeroAddress");
    });

    it("should revert on deployment with comet factory zero address", async function () {
      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          ethers.constants.AddressZero,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(configControllerFactory, "ZeroAddress");
    });

    it("should revert on deployment with matching addresses: curator/owner", async function () {
      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(configControllerFactory, "InvalidAddress");
    });

    it("should revert on deployment with matching addresses: guardian/owner", async function () {
      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          owner.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(configControllerFactory, "InvalidAddress");
    });

    it("should revert on deployment with matching addresses: guardian/curator", async function () {
      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          curator.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(configControllerFactory, "InvalidAddress");
    });

    it("should revert on deployment with foreign factory", async function () {
      const configControllerFactoryForeign = await _ConfigControllerFactory.deploy(sandboxController.address, configControllerImpl.address);
      const sandboxCometFactoryForeign = await _SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactoryForeign.address
      );
      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactoryForeign.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(configControllerFactory, "InvalidFactory");
    });

    it("should revert on deployment with invalid fee percentage", async function () {
      const maxFee = await configControllerImpl.FEE_DIVISOR();
      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          maxFee.add(1),
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(_ConfigController, "InvalidFeePercentage");
    });

    it("should revert on deployment with proposals duration is too short", async function () {
      const { minUpdateTime } = await sandboxController.config();

      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          minUpdateTime.sub(1),
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(_ConfigController, "ProposalDurationTooShort");

      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          minUpdateTime.sub(1)
        )
      ).to.be.revertedWithCustomError(_ConfigController, "ProposalDurationTooShort");
    });

    it("should revert on deployment with proposals duration is too long", async function () {
      const minMaxParams = await sandboxController.proposalBoundaries();
      const maxUpdateTime = minMaxParams[1];

      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          maxUpdateTime.add(1),
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(_ConfigController, "ProposalDurationTooLong");

      await expect(
        configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          maxUpdateTime.add(1)
        )
      ).to.be.revertedWithCustomError(_ConfigController, "ProposalDurationTooLong");
    });

    describe("storage check", function () {
      let configControllerAddress;
      let configController: ConfigController;

      before(async function () {
        configControllerAddress = await configControllerFactory.callStatic.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );

        // deploy config controller
        await configControllerFactory.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );
        configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;

        configControllersCount += 1;
      });

      it("should return correct address on Controller deployment", async function () {
        expect(configController.address).to.be.eq(configControllerAddress);
      });

      it("should set Factory storage after Controller deployment", async function () {
        expect(await configControllerFactory.getLastControllerLength()).to.eq(configControllersCount);
        expect(await configControllerFactory.controllerAddresses(configControllersCount - 1)).to.eq(configControllerAddress);
        expect(await configControllerFactory.controllerIds(configControllerAddress)).to.eq(configControllersCount - 1);
      });

      it("should be recognized by factory", async function () {
        expect(await configControllerFactory.isController(configControllerAddress)).to.be.true;
        expect(await configControllerFactory.isController(owner.address)).to.be.false;
      });

      it("should set roles properly after deployment", async function () {
        expect(await configController.owner()).to.eq(owner.address);
        expect(await configController.guardian()).to.eq(guardian.address);
        expect(await configController.sandboxController()).to.eq(sandboxController.address);
      });

      it("should propose curator properly", async function () {
        expect(await configController.proposedCurator()).to.eq(curator.address);
        expect(await configController.curator()).to.eq(ethers.constants.AddressZero);
      });

      it("should set factories", async function () {
        expect(await configController.cometFactory()).to.eq(sandboxCometFactory.address);
        expect(await configController.configControllerFactory()).to.eq(configControllerFactory.address);
      });

      it("should set parameters properly", async function () {
        expect(await configController.curatorFee()).to.eq(configControllerOpts._curatorFee);
        expect(await configController.name()).to.eq(configControllerOpts._name);
        expect(await configController.curatorProposalDuration()).to.eq(configControllerOpts._curatorProposalDuration);
        expect(await configController.proposalDuration()).to.eq(configControllerOpts._proposalDuration);
      });

      it("should revert if initialize twice", async function () {
        await expect(
          configController.initialize(
            owner.address,
            curator.address,
            guardian.address,
            sandboxCometFactory.address,
            configControllerOpts._curatorFee,
            configControllerOpts._name,
            configControllerOpts._curatorProposalDuration,
            configControllerOpts._proposalDuration
          )
        ).to.be.revertedWithCustomError(_ConfigController, "AlreadyInitialized");
      });
    });
  });

  describe("Comet deployment", function () {
    let sandboxController;

    let configControllerAddress;
    let configController: ConfigControllerInitializeTest;
    let sandboxCometFactory: SandboxCometFactory;

    const configControllerOpts = {
      _curatorFee: 1000,
      _name: "ConfigController",
      _curatorProposalDuration: 7 * 24 * 60 * 60,
      _proposalDuration: 7 * 24 * 60 * 60,
    };

    let comet: SandboxComet;
    let cometAddress;
    let marketConfig: CometConfigStruct;

    before(async function () {
      sandboxController = (await makeSandboxController(defaultSandboxControllerOpts({ minUpdateTime: _minUpdateTime }))).sandboxController;

      const configControllerFactory = await _ConfigControllerFactory.deploy(sandboxController.address, configControllerImpl.address);
      sandboxCometFactory = await _SandboxCometFactory.deploy(sandboxCometImpl.address, configControllerFactory.address);

      configControllerAddress = await configControllerFactory
        .connect(owner)
        .callStatic.createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );

      // deploy config controller
      await configControllerFactory
        .connect(owner)
        .createConfigController(
          curator.address,
          guardian.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );
      configController = (await ethers.getContractAt(
        "ConfigControllerInitializeTest",
        configControllerAddress
      )) as ConfigControllerInitializeTest;

      // deploy comet
      const baseToken = await makeToken({
        symbol: "BASE",
        initialMint: ethers.utils.parseEther("50000").toString(),
      });
      const collateralToken = await makeToken({ symbol: "COL" });
      const priceFeedBase = await makePriceFeed(baseToken.address);
      const priceFeedCol = await makePriceFeed(collateralToken.address);

      await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);
      await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

      let collateralTokens: CollateralTokenConfigStruct[] = [];
      collateralTokens.push({
        collateralToken: collateralToken.address,
        borrowCollateralFactor: exp(0.6, 18),
        liquidateCollateralFactor: exp(0.7, 18),
        liquidationFactor: exp(0.8, 18),
        supplyCap: exp(1e9, 18),
      });

      marketConfig = {
        baseToken: baseToken.address,
        collateralTokens: collateralTokens.map(obj => ({ ...obj })),
        baseTokenCurveId: 0n,
        name: "Comet",
      };

      cometAddress = await configController.callStatic.createComet(marketConfig);
      await configController.createComet(marketConfig);
      comet = (await ethers.getContractAt("SandboxComet", cometAddress)) as SandboxComet;
    });

    it("should allow to deploy Comet", async function () {
      expect(comet.address).to.be.eq(cometAddress);
    });

    it("should be listed in the factory", async function () {
      expect(await sandboxCometFactory.getCometsLength()).to.eq(1);
      expect(await sandboxCometFactory.comets(0)).to.eq(cometAddress);
    });

    it("should be listed in the Controller", async function () {
      expect(await configController.cometsLength()).to.eq(1);
      expect(await configController.comets(0)).to.eq(cometAddress);
    });

    it("should set storage properly after deployment and initialization", async function () {
      expect(await comet.factory()).to.eq(sandboxCometFactory.address);
      expect(await comet.configController()).to.eq(configController.address);
      expect(await comet.extension()).to.not.eq(ethers.constants.AddressZero);

      expect(await comet.baseToken()).to.eq(marketConfig.baseToken);
    });

    it("should set comet name properly on comet extension", async function () {
      const cometExtension = await ethers.getContractAt("CometExtension", comet.address);
      expect(await cometExtension.name()).to.eq(marketConfig.name);
    });

    it("should revert if createComet is called not by controller", async function () {
      await expect(sandboxCometFactory.connect(owner).createComet("comet")).to.be.revertedWithCustomError(
        sandboxCometFactory,
        "Unauthorized"
      );
    });

    it("should revert if createComet is called not from owner on config controller", async function () {
      await expect(configController.connect(curator).createComet(marketConfig)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if factoryInit called twice", async function () {
      await expect(comet.factoryInit(configController.address, sandboxCometFactory.address)).to.be.revertedWithCustomError(
        comet,
        "AlreadyInitialized"
      );
    });

    it("should revert on zero addressesin factoryInit", async function () {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const _comet = (await SandboxComet.deploy()) as SandboxComet;

      await expect(_comet.factoryInit(ethers.constants.AddressZero, sandboxCometFactory.address)).to.be.revertedWithCustomError(
        SandboxComet,
        "IncorrectInitialization"
      );

      await expect(_comet.factoryInit(configController.address, ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        SandboxComet,
        "IncorrectInitialization"
      );
    });

    it("should revert if initialize is called not from config controller", async function () {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const _comet = (await SandboxComet.deploy()) as SandboxComet;

      await _comet.factoryInit(configController.address, sandboxCometFactory.address);
      const config = await sandboxController.config();

      await expect(_comet.connect(curator).initialize(marketConfig, config)).to.be.revertedWithCustomError(
        _comet,
        "IncorrectInitialization"
      );
    });

    it("should revert if initialize is called twice", async function () {
      /// call via the test wrapper
      await expect(configController.reinitializeComet(comet.address, marketConfig)).to.be.revertedWithCustomError(
        comet,
        "AlreadyInitialized"
      );
    });

    it("should emit event on Comet deployment", async function () {
      const _cometAddress = await configController.callStatic.createComet(marketConfig);
      const numOfComets = await configController.cometsLength();
      // deploy config controller
      expect(await configController.createComet(marketConfig))
        .to.emit(sandboxCometFactory, "CometCreated")
        .withArgs(_cometAddress, marketConfig.baseToken, numOfComets.add(1), marketConfig.baseTokenCurveId);
    });
  });

  describe("Sandbox Controller deployment", function () {
    type DeployParams = Parameters<typeof _SandboxControllerFactory.deploy>;

    beforeEach(async function () {
      opts = defaultSandboxControllerOpts();
      opts.dao = dao.address;
      opts.admin = owner.address;
    });

    it("initializes state with correct values", async function () {
      const { sandboxController } = await makeSandboxController(opts);
      expect(await sandboxController.owner()).to.equal(owner.address);
      expect(await sandboxController.dao()).to.equal(dao.address);
      expect(await sandboxController.feeEnabled()).to.equal(false);
      expect(await sandboxController.reserveCommission(0)).to.equal(exp(0.01, 18));
      expect(await sandboxController.reserveCommission(1)).to.equal(exp(0.02, 18));
      expect(await sandboxController.reserveCommission(2)).to.equal(exp(0.03, 18));
      expect(await sandboxController.protocolCommission(0)).to.equal(exp(0.01, 18));
      expect(await sandboxController.protocolCommission(1)).to.equal(exp(0.02, 18));
      expect(await sandboxController.protocolCommission(2)).to.equal(exp(0.03, 18));
      expect((await sandboxController.config()).storeFrontPriceFactor).to.equal(parseEther("0.9999999999").toString());
      expect((await sandboxController.config()).minUpdateTime).to.equal(300);
      expect((await sandboxController.config()).maxUpdateTime).to.equal(604800);
      expect((await sandboxController.config()).suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("500").toString());
      expect((await sandboxController.config()).suggestedLockTimeOfSeedReserves).to.equal(86400);
    });

    it("reverts if admin = 0", async function () {
      opts.admin = ethers.constants.AddressZero;
      await expect(_SandboxControllerFactory.connect(dao).deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "ZeroAddress"
      );
    });

    it("reverts if dao = 0", async function () {
      opts.dao = ethers.constants.AddressZero;
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "ZeroAddress"
      );
    });

    it("reverts if storeFrontPriceFactor >= 1e18", async function () {
      opts.storeFrontPriceFactor = ethers.utils.parseEther("1").toString();
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if the sum of reserveCommissions elements + protocolCommissions elements > 1e18(first set)", async function () {
      opts.reserveCommissions = [exp(0.5, 18), exp(0.5, 18), exp(0.5, 18)];
      opts.protocolCommissions = [exp(0.5, 18), exp(0.5, 18), exp(0.5, 18)];
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if the sum of reserveCommissions elements + protocolCommissions elements > 1e18(second set)", async function () {
      opts.reserveCommissions = [exp(0.8, 18), exp(0.9, 18), exp(0.99, 18)];
      opts.protocolCommissions = [exp(0.3, 18), exp(0.2, 18), exp(0.1, 18)];
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });
    /// TODO: add fuzzing for this case
    it("reverts if the sum of reserveCommissions elements + protocolCommissions elements > 1e18(third set)", async function () {
      opts.reserveCommissions = [exp(0.5, 18), exp(0.5, 18), exp(0.5, 18)];
      opts.protocolCommissions = [exp(0.8, 18), exp(0.7, 18), exp(0.9, 18)];
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if minUpdateTime = 0", async function () {
      opts.minUpdateTime = 0;
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if suggestedAmountOfSeedReserves = 0", async function () {
      opts.suggestedAmountOfSeedReserves = "0";
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if suggestedLockTimeOfSeedReserves = 0", async function () {
      opts.suggestedLockTimeOfSeedReserves = 0;
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });

    it("reverts if targetReserves > 5e17", async function () {
      opts.targetPercent = ethers.utils.parseEther("0.6").toString();
      await expect(_SandboxControllerFactory.deploy(...(Object.values(opts) as DeployParams))).to.be.revertedWithCustomError(
        _SandboxControllerFactory,
        "InvalidFactors"
      );
    });
  });
});
