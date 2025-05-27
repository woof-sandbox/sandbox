import { 
  ethers,
  expect, 
  exp, 
  factor, 
  makeConfigController,
  makeSandboxController,
  makeMockComet,
  cmakeCometFactory,
  defaultSandboxControllerOpts,
  makeOnlyConfigController,
  makeConfigControllerFactory
} from './helper/helpers';
import { 
  MarketConfigStruct, 
  ConfigController, 
  CollateralTokenConfigStruct 
} from '../build/types/ConfigController';
import { 
  FaucetToken, 
  IMarket, 
  SimplePriceFeed, 
  NonStandardFaucetFeeToken,
  MarketMock,
  SandboxController,
  MarketFactory__factory,
  ConfigControllerFactory,
  ConfigController__factory
} from '../build/types';
import { BigNumber, ContractTransaction, ContractReceipt, Event } from 'ethers';


describe('ConfigControllerFactory', () => {
  describe('Initialize', () => {
    it('should initialize with correct values', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);

      expect(await configControllerFactory.implementation()).to.equal(configControllerImpl.address);
      expect(await configControllerFactory.controllerIds(ethers.constants.AddressZero)).to.equal(0);
    });

    it('should revert if implementation is zero address', async () => {
      const ConfigControllerFactory_Factory = await ethers.getContractFactory('ConfigControllerFactory');
      await expect(makeConfigControllerFactory(ethers.constants.AddressZero))
        .to.be.revertedWithCustomError(ConfigControllerFactory_Factory, 'ZeroAddress');
    });
  });

  describe('Create ConfigController', () => {
    it('should create a new ConfigController', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, curator, guardian] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      const tx = await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        marketFactory.address,
        1000, // 10% curator fee
        'ConfigController',
        7 * 24 * 60 * 60, // 7 days for curator proposal duration
        7 * 24 * 60 * 60 // 7 days for proposal duration
      );
      const receipt = await tx.wait();
      const [createControllerEvents] = receipt.events?.filter((event) => event.event === 'ConfigControllerCreated');

      expect(createControllerEvents.args.controller).to.not.equal(ethers.constants.AddressZero);
      expect(await configControllerFactory.controllerIds(createControllerEvents.args.controller)).to.equal(1);

      const configController = <ConfigController>await ethers.getContractAt('ConfigController', createControllerEvents.args.controller);
      expect(await configController.owner()).to.equal(owner.address);
      expect(await configController.curator()).to.equal(curator.address);
      expect(await configController.guardian()).to.equal(guardian.address);
      expect(await configController.sandboxController()).to.equal(sandboxController.address);
      expect(await configController.marketFactory()).to.equal(marketFactory.address);
      expect(await configController.curatorFee()).to.equal(1000);
      expect(await configController.name()).to.equal('ConfigController');
      expect(await configController.curatorProposalDuration()).to.equal(7 * 24 * 60 * 60);
      expect(await configController.proposalDuration()).to.equal(7 * 24 * 60 * 60);
    });

    it('should revert if owner is zero address', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [guardian, curator] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      await expect(
        configControllerFactory.createConfigController(
          ethers.constants.AddressZero,
          curator.address,
          guardian.address,
          sandboxController.address,
          marketFactory.address,
          1000,
          'ConfigController',
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController_Factory, 'ZeroAddress');
    });

    it('should revert if sandbox controller is zero address', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, guardian, curator] = await ethers.getSigners();
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          ethers.constants.AddressZero,
          marketFactory.address,
          1000,
          'ConfigController',
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController_Factory, 'ZeroAddress');
    });

    it('should revert if market factory is zero address', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, guardian, curator] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          ethers.constants.AddressZero,
          1000,
          'ConfigController',
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController_Factory, 'ZeroAddress');
    });

    it('should revert if curator fee is greater than 100%', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, guardian, curator] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          marketFactory.address,
          10001,
          'ConfigController',
          7 * 24 * 60 * 60,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController_Factory, 'InvalidFeePercentage');
    });

    it('should revert if curator proposal duration is less than min update time', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, guardian, curator] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      await expect(
        configControllerFactory.createConfigController(
          owner.address,
          curator.address,
          guardian.address,
          sandboxController.address,
          marketFactory.address,
          1000,
          'ConfigController',
          1,
          7 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(ConfigController_Factory, 'ProposalDurationTooShort');
    });
  });

  describe('Get Controller', () => {
    it('should return correct controller by index', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, curator, guardian] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      const tx = await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        marketFactory.address,
        1000,
        'ConfigController',
        7 * 24 * 60 * 60,
        7 * 24 * 60 * 60
      );
      const receipt = await tx.wait();
      const [createControllerEvents] = receipt.events?.filter((event) => event.event === 'ConfigControllerCreated');

      expect(await configControllerFactory.getController(1)).to.equal(createControllerEvents.args.controller);
    });

    it('should revert if index is out of bounds', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);

      await expect(configControllerFactory.getController(1))
        .to.be.revertedWithCustomError(configControllerFactory, 'IndexOutOfBounds');
    });
  });

  describe('Is Valid Controller', () => {
    it('should return true for valid controller', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const [owner, curator, guardian] = await ethers.getSigners();
      const sandboxController = (await makeSandboxController(defaultSandboxControllerOpts())).sandboxController;
      const market = await makeMockComet();
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);
      const marketFactory = await cmakeCometFactory({});

      const tx = await configControllerFactory.createConfigController(
        owner.address,
        curator.address,
        guardian.address,
        sandboxController.address,
        marketFactory.address,
        1000,
        'ConfigController',
        7 * 24 * 60 * 60,
        7 * 24 * 60 * 60
      );
      const receipt = await tx.wait();
      const [createControllerEvents] = receipt.events?.filter((event) => event.event === 'ConfigControllerCreated');

      expect(await configControllerFactory.isController(createControllerEvents.args.controller)).to.be.true;
    });

    it('should return false for invalid controller', async () => {
      const ConfigController_Factory = await ethers.getContractFactory('ConfigController');
      const configControllerImpl = await ConfigController_Factory.deploy();
      const configControllerFactory = await makeConfigControllerFactory(configControllerImpl.address);

      expect(await configControllerFactory.isController(ethers.Wallet.createRandom().address)).to.be.false;
    });
  });
});
