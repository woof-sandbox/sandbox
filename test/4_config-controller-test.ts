import {
    ethers,
    expect,
    exp,
    factor,
    makeConfigController,
    makeSandboxController,
    makeMockComet,
    makeCometFactory,
    defaultSandboxControllerOpts,
    makeOnlyConfigController,
    makeConfigControllerFactory,
    createComet,
} from "./helper/helpers";
import { ConfigController, CollateralTokenConfigStruct } from "../build/types/ConfigController";
import {
    FaucetToken,
    SimplePriceFeed,
    NonStandardFaucetFeeToken,
    SandboxController,
    SandboxCometFactory__factory,
    ISandboxComet,
    CometHarness,
} from "../build/types";
import { BigNumber, ContractTransaction, ContractReceipt, Event } from "ethers";

describe("ConfigController", () => {
    // describe('setCuratorFee', () => {
    //     it('should set curator fee', async () => {
    //         const { configController } = await makeConfigController();
    //         await expect(configController.setCuratorFee(2000))
    //             .to.emit(configController, 'CuratorFeeUpdated')
    //             .withArgs(1000, 2000);
    //         expect(await configController.curatorFee()).to.equal(2000);
    //     });
    //     it('should revert if not owner', async () => {
    //         const { configController } = await makeConfigController();
    //         const [_, nonOwner] = await ethers.getSigners();
    //         await expect(configController.connect(nonOwner).setCuratorFee(2000))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert if fee is greater than 100%', async () => {
    //         const { configController } = await makeConfigController();
    //         await expect(configController.setCuratorFee(10001))
    //             .to.be.revertedWithCustomError(configController, 'InvalidFeePercentage');
    //     });
    // });
    // describe('accumulateRevenue', () => {
    //     it('should accumulate revenue with curator fee', async () => {
    //         const { configController, tokens, users, owner, baseToken, priceFeeds, cometFactory } = await makeConfigController();
    //         const token = tokens['USDC'];
    //         const amount = exp(1000, 6); // 1000 USDC
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: CometHarness = <CometHarness>await ethers.getContractAt(
    //             "CometHarness", cometAddress);
    //         await token.allocateTo(cometAddress, amount);
    //         await expect(cometContract.accumulateRevenue(token.address, amount))
    //             .to.emit(configController, 'RevenueAccumulated')
    //             .withArgs(token.address, amount);
    //         const ownerAmount = (amount * 9000n) / 10000n; // 90%
    //         const curatorAmount = (amount * 1000n) / 10000n; // 10%
    //         expect(await configController.getUnclaimedRevenue(token.address, await configController.owner()))
    //             .to.equal(ownerAmount);
    //         expect(await configController.getUnclaimedRevenue(token.address, await configController.curator()))
    //             .to.equal(curatorAmount);
    //     });
    //     it('should accumulate all revenue to owner when curator fee is 0', async () => {
    //         const { configController, tokens, users, owner, baseToken, priceFeeds } = await makeConfigController();
    //         await configController.setCuratorFee(0);
    //         const token = tokens['USDC'];
    //         const amount = exp(1000, 6); // 1000 USDC
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: MarketMock = <MarketMock>await ethers.getContractAt("MarketMock", cometAddress);
    //         await token.allocateTo(cometAddress, amount);
    //         await cometContract.accumulateRevenue(token.address, amount);
    //         expect(await configController.getUnclaimedRevenue(token.address, await configController.owner()))
    //             .to.equal(amount);
    //         expect(await configController.getUnclaimedRevenue(token.address, await configController.curator()))
    //             .to.equal(0);
    //     });
    //     it('should revert if amount is zero', async () => {
    //         const { configController, tokens, owner, baseToken, priceFeeds } = await makeConfigController();
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: MarketMock = <MarketMock>await ethers.getContractAt("MarketMock", cometAddress);
    //         await expect(cometContract.accumulateRevenue(tokens['USDC'].address, 0))
    //             .to.be.revertedWithCustomError(configController, 'ZeroAmount');
    //     });
    // });
    // describe('claimRevenue', () => {
    //     it('should allow owner to claim revenue', async () => {
    //         const { configController, tokens, users, owner, baseToken, priceFeeds } = await makeConfigController();
    //         const token = tokens['USDC'];
    //         const amount = exp(1000, 6); // 1000 USDC
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: MarketMock = <MarketMock>await ethers.getContractAt("MarketMock", cometAddress);
    //         await token.allocateTo(cometAddress, amount);
    //         await expect(cometContract.accumulateRevenue(token.address, amount))
    //             .to.emit(configController, 'RevenueAccumulated')
    //             .withArgs(token.address, amount);
    //         const ownerAmount = (amount * 9000n) / 10000n; // 90%
    //         const balanceBefore = await token.balanceOf(owner.address);
    //         await expect(configController.connect(owner).claimRevenue(token.address))
    //             .to.emit(configController, 'RevenueClaimed')
    //             .withArgs(token.address, owner.address, ownerAmount);
    //         expect(await token.balanceOf(owner.address)).to.equal(balanceBefore.add(ownerAmount));
    //         expect(await configController.getUnclaimedRevenue(token.address, owner.address)).to.equal(0);
    //     });
    //     it('should allow curator to claim revenue', async () => {
    //         const { configController, curator, tokens, users, owner, baseToken, priceFeeds } = await makeConfigController();
    //         const token = tokens['USDC'];
    //         const amount = exp(1000, 6); // 1000 USDC
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: MarketMock = <MarketMock>await ethers.getContractAt("MarketMock", cometAddress);
    //         await token.allocateTo(cometAddress, amount);
    //         await expect(cometContract.accumulateRevenue(token.address, amount))
    //             .to.emit(configController, 'RevenueAccumulated')
    //             .withArgs(token.address, amount);
    //         const curatorAmount = (amount * 1000n) / 10000n; // 10%
    //         const balanceBefore = await token.balanceOf(curator.address);
    //         await expect(configController.connect(curator).claimRevenue(token.address))
    //             .to.emit(configController, 'RevenueClaimed')
    //             .withArgs(token.address, curator.address, curatorAmount);
    //         expect(await token.balanceOf(curator.address)).to.equal(balanceBefore.add(curatorAmount));
    //         expect(await configController.getUnclaimedRevenue(token.address, curator.address)).to.equal(0);
    //     });
    //     it('should revert if token is zero address', async () => {
    //         const { configController } = await makeConfigController();
    //         await expect(configController.claimRevenue(ethers.constants.AddressZero))
    //             .to.be.revertedWithCustomError(configController, 'ZeroAddress');
    //     });
    //     it('should revert if no revenue to claim', async () => {
    //         const { configController, tokens } = await makeConfigController();
    //         await expect(configController.claimRevenue(tokens['USDC'].address))
    //             .to.be.revertedWithCustomError(configController, 'InsufficientBalance');
    //     });
    //     it('should allow old curator to claim revenue after curator change', async () => {
    //         const { configController, tokens, curator, users, owner, baseToken, priceFeeds } = await makeConfigController();
    //         const token = tokens['USDC'];
    //         const amount = exp(1000, 6); // 1000 USDC
    //         let cometConfig: MarketConfigStruct = {
    //             baseToken: baseToken.address,
    //             priceFeed: priceFeeds[await baseToken.symbol()].address,
    //             collateralTokens: [],
    //             baseTokenCurveId: 0n,
    //             options: {
    //                 baseTrackingSupplySpeed: 0n,
    //                 baseTrackingBorrowSpeed: 0n,
    //                 trackingIndexScale: 0n,
    //                 baseMinForRewards: 0n
    //             }
    //         }
    //         cometConfig.collateralTokens.push(
    //             {
    //                 collateralToken: tokens["COMP"].address,
    //                 priceFeed: priceFeeds["COMP"].address,
    //                 borrowCollateralFactor: factor(0.6),
    //                 liquidateCollateralFactor: factor(0.7),
    //                 liquidationFactor: factor(0.8),
    //                 supplyCap: exp(1_000_000, 6)
    //             }
    //         );
    //         const createCometTx = await configController.connect(owner).createComet(cometConfig);
    //         const createCometReceipt = await createCometTx.wait();
    //         const [createCometEvents] = createCometReceipt.events?.filter((event) => event.event === 'CometCreated');
    //         const cometAddress = createCometEvents.args.comet;
    //         const cometContract: MarketMock = <MarketMock>await ethers.getContractAt("MarketMock", cometAddress);
    //         await token.allocateTo(cometAddress, amount);
    //         await expect(cometContract.accumulateRevenue(token.address, amount))
    //             .to.emit(configController, 'RevenueAccumulated')
    //             .withArgs(token.address, amount);
    //         const oldCuratorAmount = (amount * 1000n) / 10000n; // 10%
    //         const oldCuratorBalanceBefore = await token.balanceOf(curator.address);
    //         const newCurator = users[0];
    //         // Change curator
    //         await configController.proposeCurator(newCurator.address);
    //         await configController.connect(newCurator).acceptCuratorRole();
    //         // Old curator claims revenue
    //         await expect(configController.connect(curator).claimRevenue(token.address))
    //             .to.emit(configController, 'RevenueClaimed')
    //             .withArgs(token.address, curator.address, oldCuratorAmount);
    //         expect(await token.balanceOf(curator.address)).to.equal(oldCuratorBalanceBefore.add(oldCuratorAmount));
    //         expect(await configController.getUnclaimedRevenue(token.address, curator.address)).to.equal(0);
    //         expect(await configController.curator()).to.equal(newCurator.address);
    //     });
    // });
    // describe('grantOwnership', () => {
    //     it('should transfer ownership', async () => {
    //         const { configController, users } = await makeConfigController();
    //         await configController.grantOwnership(users[4].address);
    //         expect(await configController.owner()).to.equal(users[4].address);
    //     });
    //     it('should revert if not owner', async () => {
    //         const { configController, users } = await makeConfigController();
    //         await expect(configController.connect(users[4]).grantOwnership(users[5].address))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    // });
    // describe('Curator Role Proposal', () => {
    //     it('should allow owner to propose new curator', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await expect(configController.proposeCurator(proposedCurator))
    //             .to.emit(configController, 'CuratorProposed')
    //             .withArgs(await configController.curator(), proposedCurator, await configController.curatorProposalExpiry());
    //         expect(await configController.proposedCurator()).to.equal(proposedCurator);
    //         expect(await configController.curatorProposalExpiry()).to.be.gt(0);
    //     });
    //     it('should allow proposed curator to accept the role', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         const currentCurator = await configController.curator();
    //         await configController.proposeCurator(proposedCurator);
    //         await expect(configController.connect(users[4]).acceptCuratorRole())
    //             .to.emit(configController, 'CuratorAccepted')
    //             .withArgs(currentCurator, proposedCurator);
    //         expect(await configController.curator()).to.equal(proposedCurator);
    //         expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
    //         expect(await configController.curatorProposalExpiry()).to.equal(0);
    //     });
    //     it('should allow owner to cancel curator proposal', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await configController.proposeCurator(proposedCurator);
    //         await expect(configController.cancelCuratorProposal())
    //             .to.emit(configController, 'CuratorProposalCancelled')
    //             .withArgs(proposedCurator);
    //         expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
    //         expect(await configController.curatorProposalExpiry()).to.equal(0);
    //     });
    //     it('should revert if non-owner tries to propose curator', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await expect(configController.connect(users[4]).proposeCurator(proposedCurator))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert if non-proposed curator tries to accept role', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await configController.proposeCurator(proposedCurator);
    //         await expect(configController.connect(users[5]).acceptCuratorRole())
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert if non-owner tries to cancel proposal', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await configController.proposeCurator(proposedCurator);
    //         await expect(configController.connect(users[4]).cancelCuratorProposal())
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert if proposing zero address as curator', async () => {
    //         const { configController } = await makeConfigController();
    //         await expect(configController.proposeCurator(ethers.constants.AddressZero))
    //             .to.be.revertedWithCustomError(configController, 'ZeroAddress');
    //     });
    //     it('should revert if proposing current curator as new curator', async () => {
    //         const { configController } = await makeConfigController();
    //         const currentCurator = await configController.curator();
    //         await expect(configController.proposeCurator(currentCurator))
    //             .to.be.revertedWithCustomError(configController, 'InvalidCurator');
    //     });
    //     it('should revert if trying to accept expired proposal', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const proposedCurator = users[4].address;
    //         await configController.proposeCurator(proposedCurator);
    //         // Fast forward time past the proposal expiration
    //         await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60]); // 8 days
    //         await ethers.provider.send('evm_mine', []);
    //         await expect(configController.connect(users[4]).acceptCuratorRole())
    //             .to.be.revertedWithCustomError(configController, 'ProposalExpired');
    //     });
    //     it('should revert if trying to cancel non-existent proposal', async () => {
    //         const { configController } = await makeConfigController();
    //         await expect(configController.cancelCuratorProposal())
    //             .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
    //     });
    //     it('should allow owner to remove curator', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const currentCurator = await configController.curator();
    //         await expect(configController.removeCurator())
    //             .to.emit(configController, 'CuratorCanceled')
    //             .withArgs(currentCurator);
    //         expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
    //     });
    //     it('should revert if non-owner tries to remove curator', async () => {
    //         const { configController, users } = await makeConfigController();
    //         await expect(configController.connect(users[4]).removeCurator())
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    // });
    // describe('setGuardian', () => {
    //     it('should allow owner to set new guardian', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const newGuardian = users[4].address;
    //         const currentGuardian = await configController.guardian();
    //         await expect(configController.setGuardian(newGuardian))
    //             .to.emit(configController, 'GuardianUpdated')
    //             .withArgs(currentGuardian, newGuardian);
    //         expect(await configController.guardian()).to.equal(newGuardian);
    //     });
    //     it('should allow owner to set guardian to zero address', async () => {
    //         const { configController } = await makeConfigController();
    //         const currentGuardian = await configController.guardian();
    //         await expect(configController.setGuardian(ethers.constants.AddressZero))
    //             .to.emit(configController, 'GuardianUpdated')
    //             .withArgs(currentGuardian, ethers.constants.AddressZero);
    //         expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
    //     });
    //     it('should revert if non-owner tries to set guardian', async () => {
    //         const { configController, users } = await makeConfigController();
    //         const newGuardian = users[4].address;
    //         await expect(configController.connect(users[4]).setGuardian(newGuardian))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    // });
    // describe('Market Configuration Proposals', () => {
    //     it('should allow owner to create proposal', async () => {
    //         const { configController, tokens, baseToken, priceFeeds, owner, sandboxController } = await makeConfigController();
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         const cometAddress: string = await createComet(
    //             configController, tokens, baseToken, priceFeeds
    //         );
    //         const collateralTokens: CollateralTokenConfigStruct[] = [{
    //             collateralToken: tokens["COMP"].address,
    //             priceFeed: priceFeeds["COMP"].address,
    //             borrowCollateralFactor: factor(0.6),
    //             liquidateCollateralFactor: factor(0.7),
    //             liquidationFactor: factor(0.8),
    //             supplyCap: exp(1_000_000, 6)
    //         }];
    //         const tx: ContractTransaction = await configController.connect(owner).proposeMarketCollateralTokens(cometAddress, collateralTokens);
    //         const receipt: ContractReceipt = await tx.wait();
    //         const events: Event[] = receipt.events?.filter((event) => event.event === 'MarketConfigProposed');
    //         expect(events[0].args.comet).to.equal(cometAddress);
    //         expect(events[0].args.proposer).to.equal(owner.address);
    //         const block = await ethers.provider.getBlock(receipt.blockNumber);
    //         expect(events[0].args.revertTime).to.equal(block.timestamp + 7 * 24 * 60 * 60);
    //         expect(events[0].args.revertTime).to.equal(block.timestamp + 7 * 24 * 60 * 60);
    //     });
    //     it('should allow curator to create proposal', async () => {
    //         const { configController, tokens, baseToken, priceFeeds, curator, sandboxController, owner } = await makeConfigController();
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         const comet = await createComet(configController, tokens, baseToken, priceFeeds);
    //         const collateralTokens = [{
    //             collateralToken: tokens["COMP"].address,
    //             priceFeed: priceFeeds["COMP"].address,
    //             borrowCollateralFactor: factor(0.6),
    //             liquidateCollateralFactor: factor(0.7),
    //             liquidationFactor: factor(0.8),
    //             supplyCap: exp(1_000_000, 6)
    //         }];
    //         const tx = await configController.connect(curator).proposeMarketCollateralTokens(comet, collateralTokens);
    //         const receipt = await tx.wait();
    //         const proposal = await configController.cometProposals(comet);
    //         const events = receipt.events?.filter((event) => event.event === 'MarketConfigProposed');
    //         expect(events[0].args.comet).to.equal(comet);
    //         expect(events[0].args.proposer).to.equal(curator.address);
    //         expect(events[0].args.revertTime).to.equal(proposal.revertTime);
    //         const block = await ethers.provider.getBlock(receipt.blockNumber);
    //         expect(events[0].args.revertTime).to.equal(block.timestamp + 7 * 24 * 60 * 60);
    //         expect(proposal.proposer).to.equal(curator.address);
    //         expect(proposal.comet).to.equal(comet);
    //         expect(proposal.collateralTokens[0].collateralToken).to.equal(
    //             collateralTokens[0].collateralToken);
    //         expect(proposal.collateralTokens[0].priceFeed).to.equal(
    //             collateralTokens[0].priceFeed);
    //         expect(proposal.collateralTokens[0].borrowCollateralFactor).to.equal(
    //             collateralTokens[0].borrowCollateralFactor);
    //         expect(proposal.collateralTokens[0].liquidateCollateralFactor).to.equal(
    //             collateralTokens[0].liquidateCollateralFactor);
    //     });
    //     it('should not allow guardian to create proposal', async () => {
    //         const { configController, tokens, baseToken, priceFeeds, guardian, sandboxController, owner } = await makeConfigController();
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         const comet = await createComet(configController, tokens, baseToken, priceFeeds);
    //         const collateralTokens = [{
    //             collateralToken: tokens["COMP"].address,
    //             priceFeed: priceFeeds["COMP"].address,
    //             borrowCollateralFactor: factor(0.6),
    //             liquidateCollateralFactor: factor(0.7),
    //             liquidationFactor: factor(0.8),
    //             supplyCap: exp(1_000_000, 6)
    //         }];
    //         await expect(configController.connect(guardian).proposeMarketCollateralTokens(comet, collateralTokens))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should not allow non-owner/curator to create proposal', async () => {
    //         const { configController, tokens, baseToken, priceFeeds, users, sandboxController, owner } = await makeConfigController();
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         const comet = await createComet(configController, tokens, baseToken, priceFeeds);
    //         const collateralTokens = [{
    //             collateralToken: tokens["COMP"].address,
    //             priceFeed: priceFeeds["COMP"].address,
    //             borrowCollateralFactor: factor(0.6),
    //             liquidateCollateralFactor: factor(0.7),
    //             liquidationFactor: factor(0.8),
    //             supplyCap: exp(1_000_000, 6)
    //         }];
    //         await expect(configController.connect(users[4]).proposeMarketCollateralTokens(comet, collateralTokens))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    // });
    // describe('setProposalDurations', function () {
    //     it('should allow owner to set valid durations', async function () {
    //         const { configController, owner } = await makeConfigController();
    //         const newDuration = 14 * 24 * 60 * 60; // 14 days
    //         await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
    //             .to.emit(configController, "ProposalDurationsUpdated")
    //             .withArgs(7 * 24 * 60 * 60, newDuration, 7 * 24 * 60 * 60, newDuration);
    //         expect(await configController.proposalDuration()).to.equal(newDuration);
    //         expect(await configController.curatorProposalDuration()).to.equal(newDuration);
    //     });
    //     it('should revert when durations are below minimum update time', async function () {
    //         const { configController, owner } = await makeConfigController();
    //         const newDuration = 299;
    //         await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
    //             .to.be.revertedWithCustomError(configController, "ProposalDurationTooShort");
    //     });
    //     it('should revert when durations are set to zero', async function () {
    //         const { configController, owner } = await makeConfigController();
    //         await expect(configController.connect(owner).setProposalDurations(0, 0))
    //             .to.be.revertedWithCustomError(configController, "ProposalDurationTooShort");
    //     });
    //     it('should revert when called by non-owner', async function () {
    //         const { configController, users } = await makeConfigController();
    //         const newDuration = 14 * 24 * 60 * 60; // 14 days
    //         await expect(configController.connect(users[0]).setProposalDurations(newDuration, newDuration))
    //             .to.be.revertedWithCustomError(configController, "Unauthorized");
    //     });
    //     it('should emit event with correct old and new values', async function () {
    //         const { configController, owner } = await makeConfigController();
    //         const oldDuration = 7 * 24 * 60 * 60; // 7 days
    //         const newDuration = 14 * 24 * 60 * 60; // 14 days
    //         await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
    //             .to.emit(configController, "ProposalDurationsUpdated")
    //             .withArgs(oldDuration, newDuration, oldDuration, newDuration);
    //     });
    // });
    // describe('Market Transfer Proposals', () => {
    //     it('should allow owner to propose comet transfer', async () => {
    //         const {
    //             configControllerFactory,
    //             configController,
    //             owner,
    //             curator,
    //             guardian,
    //             sandboxController,
    //             cometFactory,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         } = await makeConfigController();
    //         await baseToken.allocateTo(
    //             owner.address,
    //             (await sandboxController.config()).suggestedAmountOfSeedReserves
    //         );
    //         await baseToken.connect(owner).approve(
    //             configController.address,
    //             (await sandboxController.config()).suggestedAmountOfSeedReserves
    //         );
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         const newControllerAddress: string = await makeOnlyConfigController(
    //             owner.address,
    //             curator.address,
    //             guardian.address,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         const tx = await configController.connect(owner).proposeMarketTransfer(
    //             cometAdress,
    //             newControllerAddress
    //         );
    //         const receipt = await tx.wait();
    //         const events = receipt.events?.filter((event) => event.event === 'MarketTransferProposed');
    //         const proposal = await configController.cometTransferProposals(cometAdress);
    //         expect(events[0].args.comet).to.equal(cometAdress);
    //         expect(events[0].args.newController).to.equal(newControllerAddress);
    //         expect(events[0].args.expiration).to.equal(proposal.expiration);
    //         expect(proposal.comet).to.equal(cometAdress);
    //         expect(proposal.newController).to.equal(newControllerAddress);
    //     });
    //     it('should not allow non-owner to propose comet transfer', async () => {
    //         const { users, configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const nonOwner = users[0];
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         const newControllerAddress = await makeOnlyConfigController(
    //             owner.address,
    //             curator.address,
    //             guardian.address,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         await expect(configController.connect(nonOwner).proposeMarketTransfer(cometAdress, newControllerAddress))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should not allow proposing transfer of non-owned comet', async () => {
    //         const { configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Deploy a new controller for testing transfers
    //         const newControllerAddress: string = await makeOnlyConfigController(
    //             owner.address,
    //             curator.address,
    //             guardian.address,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         const newController = <ConfigController>(await ethers.getContractAt('ConfigController', newControllerAddress));
    //             // Create a comet in the new controller
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(newController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         const otherMarketAdress: string = await createComet(
    //             newController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         console.log(await configController.comets(await configController.cometId(otherMarketAdress)));
    //         await expect(configController.connect(owner).proposeMarketTransfer(otherMarketAdress, newControllerAddress))
    //             .to.be.revertedWithCustomError(configController, 'MarketNotOwned');
    //     });
    //     it('should not allow proposing transfer to zero address', async () => {
    //         const { configController, owner, tokens, baseToken, priceFeeds, sandboxController } = await makeConfigController();
    //         await baseToken.allocateTo(owner.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         await baseToken.connect(owner).approve(configController.address, (await sandboxController.config()).suggestedAmountOfSeedReserves);
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).proposeMarketTransfer(cometAdress, ethers.constants.AddressZero))
    //             .to.be.revertedWithCustomError(configController, 'NonConfigController');
    //     });
    //     it('should not allow proposing transfer of zero address comet', async () => {
    //         const { configController, owner } = await makeConfigController();
    //         // Deploy a new controller for testing transfers
    //         const { configController: newController } = await makeConfigController();
    //         await expect(configController.connect(owner).proposeMarketTransfer(ethers.constants.AddressZero, newController.address))
    //             .to.be.revertedWithCustomError(configController, 'ZeroAddress');
    //     });
    //     it('should not allow duplicate proposals', async () => {
    //         const { configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         const newControllerAddress = await makeOnlyConfigController(
    //             {
    //                 owner: owner,
    //                 curator: curator,
    //                 guardian: guardian,
    //                 dao: dao,
    //                 sandboxController: sandboxController.address,
    //                 cometFactory: cometFactory.address,
    //                 configControllerFactory: configControllerFactory.address
    //             }
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newControllerAddress);
    //         await expect(configController.connect(owner).proposeMarketTransfer(cometAdress, newControllerAddress))
    //             .to.be.revertedWithCustomError(configController, 'ProposalExists');
    //     });
    //     it('should allow owner to cancel comet transfer proposal', async () => {
    //         const { configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         const newControllerAddress = await makeOnlyConfigController(
    //             {
    //                 owner: owner,
    //                 curator: curator,
    //                 guardian: guardian,
    //                 dao: dao,
    //                 sandboxController: sandboxController.address,
    //                 cometFactory: cometFactory.address,
    //                 configControllerFactory: configControllerFactory.address
    //             }
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newControllerAddress);
    //         await expect(configController.connect(owner).cancelMarketTransferProposal(cometAdress))
    //             .to.emit(configController, 'MarketTransferProposalCancelled')
    //             .withArgs(cometAdress, owner.address);
    //         const proposal = await configController.cometTransferProposals(cometAdress);
    //         expect(proposal.expiration).to.equal(0);
    //     });
    //     it('should not allow non-owner to cancel comet transfer proposal', async () => {
    //         const { users, configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const nonOwner = users[0];
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         const newControllerAddress = await makeOnlyConfigController(
    //             {
    //                 owner: owner,
    //                 curator: curator,
    //                 guardian: guardian,
    //                 dao: dao,
    //                 sandboxController: sandboxController.address,
    //                 cometFactory: cometFactory.address,
    //                 configControllerFactory: configControllerFactory.address
    //             }
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newControllerAddress);
    //         await expect(configController.connect(nonOwner).cancelMarketTransferProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should not allow canceling non-existent proposal', async () => {
    //         const { configController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).cancelMarketTransferProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
    //     });
    //     it('should allow owner to accept comet transfer proposal', async () => {
    //         const { users, configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const newConfigControllerOwner = users[0];
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         // Deploy a new controller for testing transfers
    //         const newConfigControllerAddress: string = await makeOnlyConfigController(
    //             newConfigControllerOwner.address,
    //             curator.address,
    //             guardian.address,
    //             dao,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         const newConfigController = <ConfigController>(await ethers.getContractAt('ConfigController', newConfigControllerAddress));
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newConfigControllerAddress);
    //         await expect(configController.connect(newConfigControllerOwner).acceptMarketTransferProposal(cometAdress))
    //             .to.emit(configController, 'MarketTransferProposalAccepted')
    //             .withArgs(cometAdress, configController.address, newConfigControllerAddress);
    //         // Verify comet ownership was transferred
    //         const comet = <MarketMock>(await ethers.getContractAt('MarketMock', cometAdress));
    //         expect(await comet.configControllerAddress()).to.equal(newConfigControllerAddress);
    //         // Verify comet was removed from old controller
    //         const cometsLength = await configController.cometsLength();
    //         expect(cometsLength).to.equal(0);
    //         expect(await newConfigController.cometsLength()).to.equal(1);
    //         expect(await newConfigController.comets(0)).to.equal(cometAdress);
    //     });
    //     it('should not allow non-owner to accept comet transfer proposal', async () => {
    //         const { users, configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const nonOwner = users[0];
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         // Deploy a new controller for testing transfers
    //         const newConfigControllerAddress: string = await makeOnlyConfigController(
    //             newConfigControllerOwner.address,
    //             curator.address,
    //             guardian.address,
    //             dao,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newConfigControllerAddress);
    //         await expect(configController.connect(nonOwner).acceptMarketTransferProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should not allow accepting non-existent proposal', async () => {
    //         const { configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         // Deploy a new controller for testing transfers
    //         const newConfigControllerAddress: string = await makeOnlyConfigController(
    //             newConfigControllerOwner.address,
    //             curator.address,
    //             guardian.address,
    //             dao,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newConfigControllerAddress);
    //         const cometAdress2: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).acceptMarketTransferProposal(cometAdress2))
    //             .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
    //     });
    //     it('should not allow accepting expired proposal', async () => {
    //         const { configControllerFactory, configController, owner, curator, guardian, dao, sandboxController, cometFactory, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         // Create a comet
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         // Deploy a new controller for testing transfers
    //         const newConfigControllerAddress: string = await makeOnlyConfigController(
    //             newConfigControllerOwner.address,
    //             curator.address,
    //             guardian.address,
    //             dao,
    //             sandboxController.address,
    //             cometFactory.address,
    //             configControllerFactory.address
    //         );
    //         await configController.connect(owner).proposeMarketTransfer(cometAdress, newConfigControllerAddress);
    //         // Fast forward past proposal duration
    //         const proposal = await configController.cometTransferProposals(cometAdress);
    //         const block = await ethers.provider.getBlock('latest');
    //         const timeToFastForward = Number(proposal.expiration) - block.timestamp + 1;
    //         await ethers.provider.send('evm_increaseTime', [timeToFastForward]);
    //         await ethers.provider.send('evm_mine', []);
    //         await expect(configController.connect(owner).acceptMarketTransferProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'ProposalExpired');
    //     });
    // });
    // describe('Base Token Curve Proposal', () => {
    //     it('should allow owner to propose base token curve', async () => {
    //         const { configController, dao, sandboxController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         const block = await ethers.provider.getBlock('latest');
    //         expect(proposal.revertTime).to.equal(block.timestamp + 7 * 24 * 60 * 60);
    //         expect(proposal.proposer).to.equal(owner.address);
    //         expect(proposal.curveId).to.equal(0);
    //     });
    //     it('should allow curator to propose base token curve', async () => {
    //         const { configController, dao, sandboxController, curator, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(curator).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         const block = await ethers.provider.getBlock('latest');
    //         expect(proposal.revertTime).to.equal(block.timestamp + 7 * 24 * 60 * 60);
    //         expect(proposal.proposer).to.equal(curator.address);
    //         expect(proposal.curveId).to.equal(0);
    //     });
    //     it('should revert when non-owner/curator tries to propose', async () => {
    //         const { configController, dao, sandboxController, users, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await expect(configController.connect(users[0]).proposeUpdateBaseTokenCurve(cometAdress, 0))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert when comet is not owned', async () => {
    //         const { configController, owner } = await makeConfigController();
    //         const randomAddress = ethers.Wallet.createRandom().address;
    //         await expect(configController.connect(owner).proposeUpdateBaseTokenCurve(randomAddress, 0))
    //             .to.be.revertedWithCustomError(configController, 'MarketNotOwned');
    //     });
    //     it('should revert when curve id is invalid', async () => {
    //         const { configController, dao, sandboxController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await expect(configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 1))
    //             .to.be.revertedWithCustomError(configController, 'InvalidCurveId');
    //     });
    //     it('should revert when proposing same curve', async () => {
    //         const { configController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0))
    //             .to.be.revertedWithCustomError(configController, 'SameCurve');
    //     });
    //     it('should allow owner to execute base token curve proposal', async () => {
    //         const { configController, dao, sandboxController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         // Verify comet is owned by controller
    //         expect(await configController.cometId(cometAdress)).to.not.equal(0);
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         // Propose the update
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         // Verify proposal exists
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.not.equal(0);
    //         // Fast forward time to after proposal period
    //         await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    //         await ethers.provider.send('evm_mine', []);
    //         // Execute the proposal
    //         const tx = await configController.connect(owner).executeBaseTokenCurveProposal(cometAdress);
    //         const receipt = await tx.wait();
    //         const events = receipt.events?.filter((event) => event.event === 'MarketBaseTokenCurveProposalExecuted');
    //         expect(events[0].args.comet).to.equal(cometAdress);
    //         expect(events[0].args.executedBy).to.equal(owner.address);
    //         // Verify proposal is deleted after execution
    //         const updatedProposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(updatedProposal.revertTime).to.equal(0);
    //         // Verify comet's base token curve ID is updated
    //         expect(await configController.cometBaseTokenCurveId(cometAdress)).to.equal(0);
    //     });
    //     it('should allow curator to execute base token curve proposal', async () => {
    //         const { configController, dao, sandboxController, curator, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(curator).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         // Fast forward time to after proposal period
    //         await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    //         await ethers.provider.send('evm_mine', []);
    //         await configController.connect(curator).executeBaseTokenCurveProposal(cometAdress);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.equal(0); // Proposal should be deleted after execution
    //     });
    //     it('should revert when non-owner/curator tries to execute', async () => {
    //         const { configController, dao, sandboxController, owner, users, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         // Fast forward time to after proposal period
    //         await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    //         await ethers.provider.send('evm_mine', []);
    //         await expect(configController.connect(users[0]).executeBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert when no active proposal exists', async () => {
    //         const { configController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).executeBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
    //     });
    //     it('should revert when trying to execute before proposal period ends', async () => {
    //         const { configController, dao, sandboxController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         await expect(configController.connect(owner).executeBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'ProposalNotReady');
    //     });
    //     it('should allow owner to cancel base token curve proposal', async () => {
    //         const { configController, dao, sandboxController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         const tx = await configController.connect(owner).cancelBaseTokenCurveProposal(cometAdress);
    //         const receipt = await tx.wait();
    //         const events = receipt.events?.filter((event) => event.event === 'MarketBaseTokenCurveProposalCancelled');
    //         expect(events[0].args.comet).to.equal(cometAdress);
    //         expect(events[0].args.cancelledBy).to.equal(owner.address);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.equal(0);
    //     });
    //     it('should revert when non-owner tries to cancel', async () => {
    //         const { configController, dao, sandboxController, owner, users, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         await expect(configController.connect(users[0]).cancelBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'Unauthorized');
    //     });
    //     it('should revert when no proposal exists', async () => {
    //         const { configController, owner, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         await expect(configController.connect(owner).cancelBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'NoActiveProposal');
    //     });
    //     it('should allow guardian to cancel proposal', async () => {
    //         const { configController, dao, owner, sandboxController, guardian, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         await configController.connect(guardian).cancelBaseTokenCurveProposal(cometAdress);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.equal(0);
    //     });
    //     it('should revert when guardian tries to cancel after proposal period ends', async () => {
    //         const { configController, dao, owner, sandboxController, guardian, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         // Fast forward time to after proposal period
    //         await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    //         await ethers.provider.send('evm_mine', []);
    //         await expect(configController.connect(guardian).cancelBaseTokenCurveProposal(cometAdress))
    //             .to.be.revertedWithCustomError(configController, 'ProposalNotRevertable');
    //     });
    //     it('should allow curator to cancel proposal if curator is proposer', async () => {
    //         const { configController, dao, curator, sandboxController, guardian, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(curator).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         await configController.connect(curator).cancelBaseTokenCurveProposal(cometAdress);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.equal(0);
    //     });
    //     it('should revert when curator is not proposer and tries to cancel', async () => {
    //         const { configController, dao, owner, curator, sandboxController, guardian, tokens, baseToken, priceFeeds } = await makeConfigController();
    //         const cometAdress: string = await createComet(
    //             configController,
    //             tokens,
    //             baseToken,
    //             priceFeeds
    //         );
    //         /// Update the base token curve
    //         await sandboxController.connect(dao).changeBaseAssetCurve(
    //             baseToken.address,
    //             0,
    //             {
    //                 supplyKink: BigNumber.from(factor(0.91)),
    //                 supplyPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 supplyPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //                 borrowKink: BigNumber.from(factor(0.91)),
    //                 borrowPerYearInterestRateBase: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeLow: BigNumber.from(factor(0.01)),
    //                 borrowPerYearInterestRateSlopeHigh: BigNumber.from(factor(0.01)),
    //             }
    //         );
    //         await configController.connect(owner).proposeUpdateBaseTokenCurve(cometAdress, 0);
    //         await configController.connect(curator).cancelBaseTokenCurveProposal(cometAdress);
    //         const proposal = await configController.baseAssetsCurvesProposals(cometAdress);
    //         expect(proposal.revertTime).to.equal(0);
    //     });
    // });
});
