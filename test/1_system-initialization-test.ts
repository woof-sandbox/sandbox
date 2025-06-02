import { ethers, exp, expect,
  defaultSandboxControllerOpts, makeSandboxController,
  makeToken, makePriceFeed,
  sandboxListBaseAsset, sandboxListCollateralAsset } from "./helper/helpers";
import {
  ConfigController,
  ConfigControllerFactory,
  SandboxComet,
  SandboxCometFactory,
  
  ConfigControllerFactory__factory,
  ConfigController__factory,
  SandboxComet__factory,
  SandboxCometFactory__factory,
} from "../build/types";
import {
  CollateralTokenConfigStruct,
  CometConfigStruct,
} from "../build/types/ConfigController";

describe("System Initialization", function() {
    // Factories
  let _ConfigControllerFactory: ConfigControllerFactory__factory;
  let _ConfigController: ConfigController__factory;
  let _Comet: SandboxComet__factory;
  let _SandboxCometFactory: SandboxCometFactory__factory;

  let configControllerImpl: ConfigController;
  let sandboxCometImpl: SandboxComet;

  const _minUpdateTime = 7 * 24 * 60 * 60;

  const configControllerOpts = {
    _curatorFee: 1000,
    _name: "ConfigController",
    _curatorProposalDuration: 7 * 24 * 60 * 60,
    _proposalDuration: 7 * 24 * 60 * 60
  }

  before(async function() {
    _ConfigControllerFactory = (await ethers.getContractFactory("ConfigControllerFactory")) as ConfigControllerFactory__factory;
    _ConfigController = (await ethers.getContractFactory("ConfigController")) as ConfigController__factory;
    _Comet = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
    _SandboxCometFactory = (await ethers.getContractFactory("SandboxCometFactory")) as SandboxCometFactory__factory;

    configControllerImpl = (await _ConfigController.deploy()) as ConfigController;
    sandboxCometImpl = (await _Comet.deploy()) as SandboxComet;
  });

  describe("Config Controller Factory deployment",function() {
    it("should allow to deploy ConfigControllerFactory", async function() {
      // deploy config controller factory
      const configControllerFactory = (await _ConfigControllerFactory.deploy(configControllerImpl.address)) as ConfigControllerFactory;
      expect(configControllerFactory).to.have.property("address");
    });

    it("should set storage properly after deployment", async function() {
      const configControllerFactory = (await _ConfigControllerFactory.deploy(
        configControllerImpl.address
      )) as ConfigControllerFactory;

      expect(
        await configControllerFactory.configControllerImplementation()
      ).to.eq(configControllerImpl.address);
    });

    it("should revert if implementation is zero address", async function() {
      await expect(
        _ConfigControllerFactory.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(
        _ConfigControllerFactory,
        "InvalidAddress"
      );
    });
  });

  describe("Sandbox Comet Factory deployment",function() {
    let configControllerFactory: ConfigControllerFactory;
    before(async function() {
      configControllerFactory = await _ConfigControllerFactory.deploy(configControllerImpl.address);
    });

    it("should allow to deploy SandboxCometFactory", async function() {
      // deploy sandbox comet factory
      const sandboxCometFactory = await _SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );
      expect(sandboxCometFactory).to.have.property("address");
    });

    it("should set storage properly after deployment", async function() {
      const sandboxCometFactory = await _SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );

      expect(await sandboxCometFactory.cometImplementation()).to.eq(sandboxCometImpl.address);
      expect(await sandboxCometFactory.configControllerFactory()).to.eq(configControllerFactory.address);
    });

    it("should revert if one of the parameters is zero address", async function() {
      await expect(
        _SandboxCometFactory.deploy(
          ethers.constants.AddressZero,
          sandboxCometImpl.address
        )
      ).to.be.revertedWithCustomError(_SandboxCometFactory, "InvalidAddress");

      await expect(
        _SandboxCometFactory.deploy(
          sandboxCometImpl.address,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWithCustomError(_SandboxCometFactory, "InvalidAddress");
    });

  });

  describe("Config Controller deployment",function() {
    let configControllerFactory: ConfigControllerFactory;
    let sandboxCometFactory: SandboxCometFactory;
    let signers;
    let owner, curator, guardian, sandboxController;

    beforeEach(async function() {
      configControllerFactory = await _ConfigControllerFactory.deploy(configControllerImpl.address);
      sandboxCometFactory = await _SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );
      signers = await ethers.getSigners();

      owner = signers[0];
      curator = signers[1];
      guardian = signers[2];

      sandboxController = (await makeSandboxController(defaultSandboxControllerOpts({minUpdateTime: _minUpdateTime}))).sandboxController;
    });

    it("should allow to deploy ConfigController", async function() {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      // deploy config controller
      await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );
      const configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;
      expect(configController.address).to.be.eq(configControllerAddress);
    });

    it("should emit event on Controller deployment", async function() {
      const configControllerAddress = await configControllerFactory.callStatic.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      // deploy config controller
      expect(await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      )).to.emit(configControllerFactory, "ConfigControllerCreated")
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
    });

    it("should revert on deployment with zero address", async function() {
      it("owner", async function() {
        await expect(
          configControllerFactory.createConfigController(
            ethers.constants.AddressZero,
            curator.address,
            guardian.address,
            sandboxController.address,
            sandboxCometFactory.address,
            configControllerOpts._curatorFee,
            configControllerOpts._name,
            configControllerOpts._curatorProposalDuration,
            configControllerOpts._proposalDuration
          )
        ).to.be.revertedWithCustomError(_ConfigController, "ZeroAddress");
      });

      it("curator", async function() {
        await expect(
          configControllerFactory.createConfigController(
            owner.address,
            ethers.constants.AddressZero,
            guardian.address,
            sandboxController.address,
            sandboxCometFactory.address,
            configControllerOpts._curatorFee,
            configControllerOpts._name,
            configControllerOpts._curatorProposalDuration,
            configControllerOpts._proposalDuration
          )
        ).to.be.revertedWithCustomError(_ConfigController, "ZeroAddress");
      });

      it("sandbox controller", async function() {
        await expect(
          configControllerFactory.createConfigController(
            owner.address,
            curator.address,
            guardian.address,
            ethers.constants.AddressZero,
            sandboxCometFactory.address,
            configControllerOpts._curatorFee,
            configControllerOpts._name,
            configControllerOpts._curatorProposalDuration,
            configControllerOpts._proposalDuration
          )
        ).to.be.revertedWithCustomError(_ConfigController, "ZeroAddress");
      });

      it("comet factory", async function() {
        await expect(
          configControllerFactory.createConfigController(
            owner.address,
            curator.address,
            guardian.address,
            sandboxController.address,
            ethers.constants.AddressZero,
            configControllerOpts._curatorFee,
            configControllerOpts._name,
            configControllerOpts._curatorProposalDuration,
            configControllerOpts._proposalDuration
          )
        ).to.be.revertedWithCustomError(_ConfigController, "ZeroAddress");
      });
    });

    it("should revert on deployment with invalid fee percentage", async function() {
      await expect(
        configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        10000 + 1,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(_ConfigController, "InvalidFeePercentage");
    });

    it("should revert on deployment with proposals duration is too short", async function() {
      const {
        minUpdateTime,
      } = await sandboxController.controllerConfiguration();

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          minUpdateTime.sub(1),
          configControllerOpts._proposalDuration
        )
      ).to.be.revertedWithCustomError(
        _ConfigController,
        "ProposalDurationTooShort"
      );

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          minUpdateTime.sub(1)
        )
      ).to.be.revertedWithCustomError(
        _ConfigController,
        "ProposalDurationTooShort"
      );
    });

    
    describe("storage check",function() {
      let configControllerAddress;
      let configController: ConfigController;

      beforeEach(async function() {
        configControllerAddress = await configControllerFactory.callStatic.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );

        // deploy config controller
        await configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          sandboxCometFactory.address,
          configControllerOpts._curatorFee,
          configControllerOpts._name,
          configControllerOpts._curatorProposalDuration,
          configControllerOpts._proposalDuration
        );
        configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;
      });

      it("should return correct address on Controller deployment", async function() {
        expect(configController.address).to.be.eq(configControllerAddress);
      });

      it("should set Factory storage after Controller deployment", async function() {
        expect(await configControllerFactory.getLastControllerLength()).to.eq(1);
        expect(await configControllerFactory.controllerAddresses(0)).to.eq(configControllerAddress);
        expect(await configControllerFactory.controllerIds(configControllerAddress)).to.eq(0);
      });

      it("should be recognized by factory", async function() {
        expect(await configControllerFactory.isController(configControllerAddress)).to.be.true;
        expect(await configControllerFactory.isController(owner.address)).to.be.false;
      });

      it("should set roles properly after deployment", async function() {
        expect(await configController.owner()).to.eq(owner.address);
        expect(await configController.guardian()).to.eq(guardian.address);
        expect(await configController.sandboxController()).to.eq(sandboxController.address);
      });

      it("should propose curator properly", async function() {
        expect(await configController.proposedCurator()).to.eq(curator.address);
        expect(await configController.curator()).to.eq(ethers.constants.AddressZero);
      });

      it("should set factories", async function() {
        expect(await configController.cometFactory()).to.eq(sandboxCometFactory.address);
        expect(await configController.configControllerFactory()).to.eq(
          configControllerFactory.address
        );
      });

      it("should set parameters properly", async function() {
        expect(await configController.curatorFee()).to.eq(configControllerOpts._curatorFee);
        expect(await configController.name()).to.eq(configControllerOpts._name);
        expect(await configController.curatorProposalDuration()).to.eq(
          configControllerOpts._curatorProposalDuration
        );
        expect(await configController.proposalDuration()).to.eq(configControllerOpts._proposalDuration);
      });

      it("should revert if initialize twice", async function() {
        await expect(
          configController.initialize(
            owner.address,
            curator.address,
            guardian.address,
            sandboxController.address,
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


  describe("Comet deployment",function() {
    let signers;
    let owner, curator, guardian, sandboxController;

    let configControllerAddress;
    let configController: ConfigController;
    let sandboxCometFactory: SandboxCometFactory;

    const configControllerOpts = {
      _curatorFee: 1000,
      _name: "ConfigController",
      _curatorProposalDuration: 7 * 24 * 60 * 60,
      _proposalDuration: 7 * 24 * 60 * 60
    }

    let comet: SandboxComet;
    let cometAddress;
    let marketConfig: CometConfigStruct;

    before(async function() {
      const configControllerFactory = await _ConfigControllerFactory.deploy(configControllerImpl.address);
      sandboxCometFactory = await _SandboxCometFactory.deploy(
        sandboxCometImpl.address,
        configControllerFactory.address
      );
      signers = await ethers.getSigners();

      owner = signers[0];
      curator = signers[1];
      guardian = signers[2];
      sandboxController = (await makeSandboxController(defaultSandboxControllerOpts({minUpdateTime: _minUpdateTime}))).sandboxController;

      configControllerAddress = await configControllerFactory.callStatic.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );

      // deploy config controller
      await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        sandboxCometFactory.address,
        configControllerOpts._curatorFee,
        configControllerOpts._name,
        configControllerOpts._curatorProposalDuration,
        configControllerOpts._proposalDuration
      );
      configController = (await ethers.getContractAt("ConfigController", configControllerAddress)) as ConfigController;

      // deploy comet
      const baseToken = await makeToken({symbol: "BASE", initialMint: ethers.utils.parseEther('50000').toString()});
      const collateralToken = await makeToken({symbol: "COL"});
      const priceFeedBase = await makePriceFeed({}, baseToken.address);
      const priceFeedCol = await makePriceFeed({}, collateralToken.address);

      await sandboxListBaseAsset(sandboxController, baseToken, priceFeedBase.address);
      await sandboxListCollateralAsset(sandboxController, collateralToken, priceFeedCol.address);

      let collateralTokens: CollateralTokenConfigStruct[] = [];  
          collateralTokens.push({
            collateralToken: collateralToken.address,
            priceFeed: priceFeedCol.address,
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.7, 18),
            liquidationFactor: exp(0.8, 18),
            supplyCap: exp(1e9, 18),
          });

      marketConfig = {
        baseToken: baseToken.address,
        priceFeed: priceFeedBase.address,
        collateralTokens: collateralTokens,
        baseTokenCurveId: 0n,
        options: {
          baseTrackingSupplySpeed: 1e15,
          baseTrackingBorrowSpeed: 1e15,
          trackingIndexScale: 1e15,
          baseMinForRewards: 1e15,
        },
      };

      cometAddress = await configController.callStatic.createComet(marketConfig);
      await configController.createComet(marketConfig);

      comet = (await ethers.getContractAt("SandboxComet", cometAddress)) as SandboxComet;
    });
    
  
    it("should allow to deploy Comet", async function() {
      expect(comet.address).to.be.eq(cometAddress);
    });

    it("should be listed in the factory", async function() {
      expect(await sandboxCometFactory.getCometsLength()).to.eq(1);
      expect(await sandboxCometFactory.comets(0)).to.eq(cometAddress);
    });

    it("should set storage properly after deployment and initialization", async function() {
      expect(await comet.factory()).to.eq(sandboxCometFactory.address);
      expect(await comet.configController()).to.eq(configController.address);
      expect(await comet.extension()).to.not.eq(ethers.constants.AddressZero);

      expect(await comet.baseToken()).to.eq(marketConfig.baseToken);
    });

    it("should revert if createComet is called not by controller", async function() {
      await expect(
        sandboxCometFactory.connect(owner).createComet()
      ).to.be.revertedWithCustomError(sandboxCometFactory, "Unauthorized");
    });

    it("should revert if createComet is called not from owner on config controller", async function() {
      await expect(
        configController.connect(curator).createComet(marketConfig)
      ).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert if factoryInit called twice", async function() {
      await expect(
        comet.factoryInit(configController.address, sandboxCometFactory.address)
      ).to.be.revertedWithCustomError(comet, "AlreadyInitialized");
    });

    it("should revert on zero addressesin factoryInit", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const _comet = (await SandboxComet.deploy()) as SandboxComet;

      await expect(
        _comet.factoryInit(ethers.constants.AddressZero, sandboxCometFactory.address)
      ).to.be.revertedWithCustomError(SandboxComet, "IncorrectInitialization");

      await expect(
        _comet.factoryInit(configController.address, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(SandboxComet, "IncorrectInitialization");
    });

    it("should revert if initialize is called not from config controller", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const _comet = (await SandboxComet.deploy()) as SandboxComet;

      await _comet.factoryInit(configController.address, sandboxCometFactory.address);
      const config = await sandboxController.config();

      await expect(
        _comet
          .connect(curator)
          .initialize(marketConfig, config, sandboxController.address, 1e15)
      ).to.be.revertedWithCustomError(_comet, "IncorrectInitialization");
    });

    it("should revert if initialize is called twice", async function() {
      const SandboxComet = await ethers.getContractFactory("SandboxComet");
      const _comet = (await SandboxComet.deploy()) as SandboxComet;

      await _comet.factoryInit(owner.address, sandboxCometFactory.address);
      const config = await sandboxController.config();
      await _comet.connect(owner).initialize(marketConfig, config, sandboxController.address, 1e15);
      
      await expect(
        _comet
          .connect(owner)
          .initialize(marketConfig, config, sandboxController.address, 1e15)
      ).to.be.revertedWithCustomError(_comet, "AlreadyInitialized");
    });

    it("should emit event on Comet deployment", async function() {
      // deploy config controller
      expect(await configController.createComet(marketConfig)).to.emit(sandboxCometFactory, "CometCreated");
    });

  });
});
