import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { makeProtocol, ethers, expect } from "./helper/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt, Event } from "ethers";
import { CollateralAssetStruct } from "../build/types/SandboxComet";
import { 
    ConfigControllerProposalTest, 
    ConfigController, 
    ConfigControllerFactory, 
    FaucetToken, 
    FaucetToken__factory, 
    SandboxCometFactory, 
    SandboxController, 
    SimplePriceFeed, 
    SimplePriceFeed__factory,
    SandboxComet
} from "../build/types";
import { CollateralTokenConfigStruct, CometConfigStruct } from "../build/types/ConfigController";
import { ProposeNewCollateralTokenEvent } from "../build/types/ConfigControllerProposalTest";

// Interface for the addCollateral function
const iface = new ethers.utils.Interface([
    "function addCollateralAsset((address collateralToken, uint128 supplyCap, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
]);

describe("17. Propose New Collateral Token", () => {
    let configController: ConfigController;
    let sandboxController: SandboxController;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let cometAddress: string;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let users: [SignerWithAddress];
    let newCollateralToken: FaucetToken;
    let configControllerFactory: ConfigControllerFactory;
    let cometFactory: SandboxCometFactory;
    let baseToken: FaucetToken;
    let collateralTokenConfig: CollateralTokenConfigStruct;
    let calldata: string;

    before(async () => {
        const protocol = await makeProtocol();
        configController = <ConfigController>protocol.configController;
        owner = <SignerWithAddress>protocol.owner;
        cometAddress = await configController.comets(0);
        users = <[SignerWithAddress]>protocol.users;
        curator = <SignerWithAddress>protocol.curator;
        guardian = <SignerWithAddress>protocol.guardian;
        sandboxController = <SandboxController>protocol.sandboxController;
        configControllerFactory = <ConfigControllerFactory>protocol.configControllerFactory;
        cometFactory = <SandboxCometFactory>protocol.cometFactory;
        baseToken = <FaucetToken>protocol.baseToken;
        // Create a new token for testing
        const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
        newCollateralToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("1000000"), 
            "New Collateral Token", 
            18, 
            "NCT"
        );
        await newCollateralToken.deployed();
        
        // Create price feed for the new token
        const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
        const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("100", 8), // $100 price
            8, // 8 decimals
            newCollateralToken.address
        );
        await priceFeed.deployed();
        
        // Whitelist the new collateral token in SandboxController
        await sandboxController.whitelistCollateralAsset(
            newCollateralToken.address,
            priceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );

        // Create the collateral token configuration
        collateralTokenConfig = {
            collateralToken: newCollateralToken.address,
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };

        // Encode the function call
        calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);

        snapshot = await takeSnapshot();
    });

    describe("Create proposal ProposeNewCollateralToken.", () => {
        
        afterEach(async () => {
            await snapshot.restore();
        })

        it("should create a proposal for new collateral token successfully", async () => {
            // Create the proposal
            const tx = await configController.createProposal(calldata, cometAddress, 1);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(await configController.proposalCounter()); // proposalId
                expect(event.args[1]).to.equal(owner.address); // proposer
                expect(event.args[2].collateralToken).to.equal(newCollateralToken.address);
                expect(event.args[2].supplyCap).to.equal(collateralTokenConfig.supplyCap);
                expect(event.args[2].borrowCollateralFactor).to.equal(collateralTokenConfig.borrowCollateralFactor);
                expect(event.args[2].liquidateCollateralFactor).to.equal(collateralTokenConfig.liquidateCollateralFactor);
                expect(event.args[2].liquidationFactor).to.equal(collateralTokenConfig.liquidationFactor);
            }

            // Check proposal was created correctly
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            
            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(1); // ProposeNewCollateralToken
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.expirationTime).to.be.gt(0);
            expect(proposal.maturityTime).to.be.gt(0);
        });

        it("should revert when comet does not belong to the config controller", async () => {
            // Create a new ConfigController with a new comet.
            const tx: ContractTransaction = await configControllerFactory.connect(owner).createConfigController(
                curator.address,
                guardian.address,
                cometFactory.address,
                1000,
                "New Config Controller",
                7 * 24 * 60 * 60,
                7 * 24 * 60 * 60
            );
            
            const receipt: ContractReceipt = await tx.wait();
            const [createConfigControllerEvent] = <Event[]>receipt.events?.filter(event => event.event === "ConfigControllerCreated");
            const configControllerAddress: string = createConfigControllerEvent?.args?.controller;

            const configController2 = await ethers.getContractAt("ConfigController", configControllerAddress);
            // Create market.
            // Deploy the collateral token.
            const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
            const newCollateralToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                "New Collateral Token", 
                18, 
                "NCT"
            );
            await newCollateralToken.deployed();
            
            // Create price feed for the new token
            const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
            const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                ethers.utils.parseUnits("100", 8), // $100 price
                8, // 8 decimals
                newCollateralToken.address
            );
            await priceFeed.deployed();
            // Whitelist the new collateral token in SandboxController
            await sandboxController.whitelistCollateralAsset(
                newCollateralToken.address,
                priceFeed.address,
                ethers.utils.parseEther("0.5"), // minBorrowCF
                ethers.utils.parseEther("0.7"), // maxBorrowCF
                ethers.utils.parseEther("0.6"), // minLiquidateCF
                ethers.utils.parseEther("0.8"), // maxLiquidateCF
                ethers.utils.parseEther("0.8"), // minLiquidationFactor
                ethers.utils.parseEther("1.0")  // maxLiquidationFactor
            );
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            let cometConfig: CometConfigStruct = {
                baseToken: baseToken.address,
                collateralTokens: [collateralTokenConfig],
                baseTokenCurveId: 0n
            }
            
            await configController2.createComet(cometConfig)

            let cometAddress: string = await configController2.comets(0);
            // Now we have the deployed comet on the another config controller.
            // And we trying to create a poposal of adding a new collateral token with the comet that belongs to the another config controller.
            await expect(configController.createProposal(calldata, cometAddress, 1)).to.be.revertedWithCustomError(configController2, "UnknownComet");
        });
        
        it("should revert when collateral token is the base token", async () => {
            // Get Comet base token.
            let comet: SandboxComet = await ethers.getContractAt("SandboxComet", cometAddress);
            let collateralTokenConfig2 = {...collateralTokenConfig, collateralToken: await comet.baseToken()}
            let calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig2]);
            await expect(configController.connect(owner).createProposal(calldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when non-owner tries to create proposal", async () => {            
            // Try to create proposal with non-owner
            await expect(configController.connect(users[0]).createProposal(calldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when invalid proposal type is provided", async () => {            
            // Try to create proposal with invalid type
            await expect(configController.createProposal(calldata, cometAddress, 2)).to.be.revertedWithCustomError(configController, "InvalidProposalType");
        });

        it("should revert when invalid selector is provided", async () => {
            // Create calldata with wrong selector
            const wrongIface = new ethers.utils.Interface([
                "function wrongFunction((address collateralToken, uint128 supplyCap, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
            ]);
            const wrongCalldata = wrongIface.encodeFunctionData("wrongFunction", [collateralTokenConfig]);
            
            await expect(configController.createProposal(wrongCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when calldata is too short", async () => {
            // Create calldata with wrong selector
            const wrongCalldata = calldata.slice(0, -10);
            await expect(configController.createProposal(wrongCalldata, cometAddress, 1)).to.be.reverted;
        })

        it("should revert when calldata structure is wrong", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig = {
                collateralToken: newCollateralToken.address,
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            // Create calldata with wrong selector
            const wrongIface = new ethers.utils.Interface([
                "function addCollateralAsset((address collateralToken, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
            ]);
            const wrongCalldata = wrongIface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            // Read the selector from the contract and replace the selector in the calldata
            const ADD_COLLATERAL_SELECTOR = "0xfad67aaa";
            const wrongCalldataWithSelector = ADD_COLLATERAL_SELECTOR + wrongCalldata.slice(10);
            await expect(configController.createProposal(wrongCalldataWithSelector, cometAddress, 1)).to.be.reverted;
        })

        it("should revert when guardian tries to create proposal", async () => {
            await expect(configController.connect(guardian).createProposal(calldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to create proposal", async () => {
            await expect(configController.connect(curator).createProposal(calldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when collateral token is not whitelisted", async () => {            
            // Create a token that's not whitelisted
            const FaucetFactory = await ethers.getContractFactory("FaucetToken");
            const unwhitelistedToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                "Unwhitelisted Token", 
                18, 
                "UWT"
            );
            await unwhitelistedToken.deployed();
            
            const unwhitelistedConfig = {
                ...collateralTokenConfig,
                collateralToken: unwhitelistedToken.address
            };
            
            const unwhitelistedCalldata = iface.encodeFunctionData("addCollateralAsset", [unwhitelistedConfig]);
            
            await expect(configController.createProposal(unwhitelistedCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "CollateralTokenNotWhitelisted");
        });

        it("should revert when supply cap is zero", async () => {            
            const invalidConfig = {
                ...collateralTokenConfig,
                supplyCap: 0
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "SupplyCapCantBeZero");
        });

        it("should revert when collateral factors are in wrong order", async () => {            
            // Wrong order: borrowCF > liquidateCF
            const invalidConfig = {
                ...collateralTokenConfig,
                borrowCollateralFactor: ethers.utils.parseEther("0.8"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7")
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when borrow collateral factor is too high", async () => {            
            /// We must to update the LCF since the BCF can't be more than LCF.
            const invalidConfig = {
                ...collateralTokenConfig,
                liquidateCollateralFactor: ethers.utils.parseEther("0.71"),
                borrowCollateralFactor: ethers.utils.parseEther("0.701") // Higher than max (0.7)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "BorrowCollateralFactorTooHigh");
        });

        it("should revert when borrow collateral factor is too low", async () => {            
            const invalidConfig = {
                ...collateralTokenConfig,
                borrowCollateralFactor: ethers.utils.parseEther("0.4") // Lower than min (0.5)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "BorrowCollateralFactorTooLow");
        });

        it("should revert when liquidate collateral factor is too high", async () => {            
            const invalidConfig = {
                ...collateralTokenConfig,
                liquidateCollateralFactor: ethers.utils.parseEther("0.9"), // Higher than max (0.8)
                liquidationFactor: ethers.utils.parseEther("0.95") // Must be >= liquidateCollateralFactor
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "LiquidateCollateralFactorTooHigh");
        });

        it("should revert when liquidate collateral factor is too low", async () => {        
            const invalidConfig = {
                ...collateralTokenConfig,
                borrowCollateralFactor: ethers.utils.parseEther("0.59"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.59") // Lower than min (0.6)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "LiquidateCollateralFactorTooLow");
        });

        it("should revert when liquidation factor is too high", async () => {    
            const invalidConfig = {
                ...collateralTokenConfig,
                liquidationFactor: ethers.utils.parseEther("1.1") // Higher than max (1.0)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "LiquidationFactorTooHigh");
        });

        it("should revert when liquidation factor is too low", async () => {            
            const invalidConfig = {
                ...collateralTokenConfig,
                liquidationFactor: ethers.utils.parseEther("0.7") // Lower than min (0.8)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "LiquidationFactorTooLow");
        });

        it("should revert when liquidate collateral factor is greater than liquidation factor", async () => {            
            const invalidConfig = {
                ...collateralTokenConfig,
                liquidateCollateralFactor: ethers.utils.parseEther("0.9"),
                liquidationFactor: ethers.utils.parseEther("0.8")
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, 1)).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when comet address is zero", async () => {            
            await expect(configController.createProposal(calldata, ethers.constants.AddressZero, 1)).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when calldata is malformed",  async () => {
            // Create malformed calldata by truncating it
            const malformedCalldata = calldata.slice(0, -10);
            
            await expect(configController.createProposal(malformedCalldata, cometAddress, 1)).to.be.reverted;
        });

        it("should revert when empty calldata", async () => {            
            await expect(configController.createProposal("0x", cometAddress, 1)).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should increment proposal counter correctly", async () => {
            const initialCounter = await configController.proposalCounter();
            
            // Create first proposal
            await configController.createProposal(calldata, cometAddress, 1);
            expect(await configController.proposalCounter()).to.equal(initialCounter + 1);
            
            // Create second proposal
            await configController.createProposal(calldata, cometAddress, 1);
            expect(await configController.proposalCounter()).to.equal(initialCounter + 2);
        });

        it("should set correct timestamps for proposal", async () => {            
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Create the proposal
            await configController.createProposal(calldata, cometAddress, 1);
            
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            
            // Check expiration time (2 weeks from now)
            expect(proposal.expirationTime).to.be.gt(currentTime + 13 * 24 * 60 * 60); // > 13 days
            expect(proposal.expirationTime).to.be.lt(currentTime + 15 * 24 * 60 * 60); // < 15 days
            
            // Check maturity time (1 week from now)
            expect(proposal.maturityTime).to.be.gt(currentTime + 6 * 24 * 60 * 60); // > 6 days
            expect(proposal.maturityTime).to.be.lt(currentTime + 8 * 24 * 60 * 60); // < 8 days
            
            // Check timelock (should be 0 for now)
            expect(proposal.timelock).to.equal(0);
        });

        it("should create two proposals with equal parameters", async () => {
            // Create a first proposal. 
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId1 = await configController.proposalCounter();
            const proposal1 = await configController.proposals(proposalId1);
            expect(proposal1.proposer).to.equal(owner.address);
            expect(proposal1.proposalType).to.equal(1);
            expect(proposal1.comet).to.equal(cometAddress);
            expect(proposal1.call).to.equal(calldata);

            // Create a second proposal with the same parameters
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId2 = await configController.proposalCounter();
            const proposal2 = await configController.proposals(proposalId2);
            expect(proposal2.proposer).to.equal(owner.address);
            expect(proposal2.proposalType).to.equal(1);
            expect(proposal2.comet).to.equal(cometAddress);
            expect(proposal2.call).to.equal(calldata);
        });
    });

    describe("Create and execute proposal.", () => {
        
        afterEach(async () => {
            await snapshot.restore();
        })

        it("should create and execute a proposal for new collateral token", async () => {
            const comet = await ethers.getContractAt("SandboxComet", cometAddress);
            // Create the proposal. Type 1 is ProposeNewCollateralToken.
            const tx: ContractTransaction = await configController.createProposal(calldata, cometAddress, 1);
            const receipt: ContractReceipt = await tx.wait();
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(await configController.proposalCounter()); // proposalId
                expect(event.args[1]).to.equal(owner.address); // proposer
                expect(event.args[2].collateralToken).to.equal(newCollateralToken.address);
                expect(event.args[2].supplyCap).to.equal(collateralTokenConfig.supplyCap);
                expect(event.args[2].borrowCollateralFactor).to.equal(collateralTokenConfig.borrowCollateralFactor);
                expect(event.args[2].liquidateCollateralFactor).to.equal(collateralTokenConfig.liquidateCollateralFactor);
                expect(event.args[2].liquidationFactor).to.equal(collateralTokenConfig.liquidationFactor);
            }
            // Get the proposal ID
            const proposalId = await configController.proposalCounter();
            /// Before accepting the proposal, we need to fast forward the time.
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days TODO: FIX to custom value.
            await ethers.provider.send("evm_mine", []);
            // Accept the proposal by the owner
            const acceptTx: ContractTransaction = await configController.connect(owner).acceptProposal(proposalId);
            const acceptReceipt: ContractReceipt = await acceptTx.wait();
            // Check if the event was emitted
            const acceptEvent: Event = <Event>acceptReceipt.events?.find(e => e.event === "ProposeNewCollateralTokenAccepted");
            expect(acceptEvent).to.not.be.undefined;

            if (acceptEvent && acceptEvent.args) {
                expect(acceptEvent.args[0]).to.equal(proposalId); // proposalId
                expect(acceptEvent.args[1]).to.equal(owner.address); // accepter
                expect(acceptEvent.args[2].collateralToken).to.equal(newCollateralToken.address);
                expect(acceptEvent.args[2].supplyCap).to.equal(collateralTokenConfig.supplyCap);
                expect(acceptEvent.args[2].borrowCollateralFactor).to.equal(collateralTokenConfig.borrowCollateralFactor);
                expect(acceptEvent.args[2].liquidateCollateralFactor).to.equal(collateralTokenConfig.liquidateCollateralFactor);
                expect(acceptEvent.args[2].liquidationFactor).to.equal(collateralTokenConfig.liquidationFactor);
            }

            const newCollateralAsset: CollateralAssetStruct = await comet.collateralAssets((await comet.numAssets()) - 1);

            expect(newCollateralAsset.collateralToken).to.equal(newCollateralToken.address);
            expect(newCollateralAsset.supplyCap).to.equal(collateralTokenConfig.supplyCap);
            expect(newCollateralAsset.borrowCollateralFactor).to.equal(collateralTokenConfig.borrowCollateralFactor);
            expect(newCollateralAsset.liquidateCollateralFactor).to.equal(collateralTokenConfig.liquidateCollateralFactor);
            expect(newCollateralAsset.liquidationFactor).to.equal(collateralTokenConfig.liquidationFactor);
            /// Check that the proposal expiration time is zero. The expiration time zero is the marker of not active proposal.
            expect((await configController.proposals(proposalId)).expirationTime).to.be.equal(0);
        });

        it("should revert when curator tries to accept ProposeNewCollateralToken proposal", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create the proposal
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId = await configController.proposalCounter();
            
            // Fast forward past maturity period (1 week)
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Try to accept the proposal with curator - should fail
            await expect(configController.connect(curator).acceptProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when guardian tries to accept ProposeNewCollateralToken proposal", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create the proposal
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId = await configController.proposalCounter();
            
            // Fast forward past maturity period (1 week)
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Try to accept the proposal with guardian - should fail
            await expect(configController.connect(guardian).acceptProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when owner tries to accept proposal before maturity time", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create the proposal
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId = await configController.proposalCounter();
            
            // Get the proposal to check maturity time
            const proposal = await configController.proposals(proposalId);
            const maturityTime = proposal.maturityTime;
            
            // Fast forward to just before maturity time (1 hour before)
            const timeToMaturity = maturityTime - Math.floor(Date.now() / 1000) - 3600; // 1 hour before
            if (timeToMaturity > 0) {
                await ethers.provider.send("evm_increaseTime", [timeToMaturity]);
                await ethers.provider.send("evm_mine", []);
            }
            
            // Try to accept the proposal before maturity - should fail
            await expect(configController.connect(owner).acceptProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when owner tries to accept proposal after expiration deadline", async () => {
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create the proposal
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId = await configController.proposalCounter();
            
            // Get the proposal to check expiration time
            const proposal = await configController.proposals(proposalId);
            const expirationTime = proposal.expirationTime;
            
            // Fast forward past expiration time (1 day after expiration)
            const timeToExpiration = expirationTime - Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 1 day after
            if (timeToExpiration > 0) {
                await ethers.provider.send("evm_increaseTime", [timeToExpiration]);
                await ethers.provider.send("evm_mine", []);
            }
            
            // Try to accept the proposal after expiration - should fail
            await expect(configController.connect(owner).acceptProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when collateral token configuration is changed after proposal creation", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create the proposal
            const tx = await configController.createProposal(calldata, cometAddress, 1);
            const receipt = await tx.wait();
            
            // Verify proposal was created successfully
            const event = receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(await configController.proposalCounter()); // proposalId
                expect(event.args[1]).to.equal(owner.address); // proposer
                expect(event.args[2].collateralToken).to.equal(newCollateralToken.address);
            }
            
            const proposalId = await configController.proposalCounter();
            
            // Fast forward past maturity period (1 week)
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Now change the collateral token configuration limits in SandboxController
            // This will make the proposal's configuration invalid
            await sandboxController.changeCollateralAssetConfiguration(
                newCollateralToken.address,
                ethers.utils.parseEther("0.3"), // minBorrowCF - changed from 0.5
                ethers.utils.parseEther("0.5"), // maxBorrowCF - changed from 0.7
                ethers.utils.parseEther("0.4"), // minLiquidateCF - changed from 0.6
                ethers.utils.parseEther("0.6"), // maxLiquidateCF - changed from 0.8
                ethers.utils.parseEther("0.6"), // minLiquidationFactor - changed from 0.8
                ethers.utils.parseEther("0.8")  // maxLiquidationFactor - changed from 1.0
            );
            
            // Try to accept the proposal - it should revert because the configuration
            // in the proposal is now outside the new limits
            await expect(configController.connect(owner).acceptProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "BorrowCollateralFactorTooHigh");
        });

        it("should revert since the collateral token was added while the new proposal is not accepted", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);

            // Create a first proposal. 
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId1 = await configController.proposalCounter();
            const proposal1 = await configController.proposals(proposalId1);
            expect(proposal1.proposer).to.equal(owner.address);
            expect(proposal1.proposalType).to.equal(1);
            expect(proposal1.comet).to.equal(cometAddress);
            expect(proposal1.call).to.equal(calldata);

            // Create a second proposal with the same parameters
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId2 = await configController.proposalCounter();
            const proposal2 = await configController.proposals(proposalId2);
            expect(proposal2.proposer).to.equal(owner.address);
            expect(proposal2.proposalType).to.equal(1);
            expect(proposal2.comet).to.equal(cometAddress);
            expect(proposal2.call).to.equal(calldata);

            // Accept the first proposal to make the second proposal not executable.
            // Before accepting the proposal, we need to fast forward the time.
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days TODO: FIX to custom value.
            await ethers.provider.send("evm_mine", []);

            await configController.acceptProposal(proposalId1);

            // Check that proposal is executed.
            expect((await configController.proposals(proposalId1)).expirationTime).to.be.equal(0);

            // Try to execute the second proposal. Since the first proposal was executed and it has the same token the ConfigController would check the collateral tokens list and revert.
            await expect(configController.acceptProposal(proposalId2)).to.be.revertedWithCustomError(configController, "CollateralTokenAlreadyAdded")
        });

        it("should revert when trying to add more than MAX_ASSETS collateral tokens", async () => {
            // Create multiple collateral tokens to reach MAX_ASSETS limit
            const MAX_ASSETS = 24;
            const comet = await ethers.getContractAt("SandboxComet", cometAddress);
            const currentAssets = await comet.numAssets();
            const tokensToAdd = MAX_ASSETS - currentAssets;
            
            // Create and whitelist additional collateral tokens
            const additionalTokens: FaucetToken[] = [];
            const additionalPriceFeeds: SimplePriceFeed[] = [];
            
            for (let i = 0; i < tokensToAdd; i++) {
                // Create a new token
                const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
                const newToken = await FaucetFactory.deploy(
                    ethers.utils.parseEther("1000000"), 
                    `Additional Token ${i}`, 
                    18, 
                    `AT${i}`
                );
                await newToken.deployed();
                additionalTokens.push(newToken);
                
                // Create price feed for the new token
                const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
                const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                    ethers.utils.parseUnits("100", 8), // $100 price
                    8, // 8 decimals
                    newToken.address
                );
                await priceFeed.deployed();
                additionalPriceFeeds.push(priceFeed);
                
                // Whitelist the new collateral token in SandboxController
                await sandboxController.whitelistCollateralAsset(
                    newToken.address,
                    priceFeed.address,
                    ethers.utils.parseEther("0.5"), // minBorrowCF
                    ethers.utils.parseEther("0.7"), // maxBorrowCF
                    ethers.utils.parseEther("0.6"), // minLiquidateCF
                    ethers.utils.parseEther("0.8"), // maxLiquidateCF
                    ethers.utils.parseEther("0.8"), // minLiquidationFactor
                    ethers.utils.parseEther("1.0")  // maxLiquidationFactor
                );
            }
            
            // Add all tokens up to MAX_ASSETS limit
            for (let i = 0; i < tokensToAdd; i++) {
                const collateralTokenConfig: CollateralTokenConfigStruct = {
                    collateralToken: additionalTokens[i].address,
                    supplyCap: ethers.utils.parseEther("1000000"),
                    borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                    liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                    liquidationFactor: ethers.utils.parseEther("0.8"),
                };
                
                const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
                
                // Create proposal
                await configController.createProposal(calldata, cometAddress, 1);
                const proposalId = await configController.proposalCounter();
                
                // Fast forward past maturity period
                await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
                await ethers.provider.send("evm_mine", []);
                
                // Accept the proposal
                await configController.acceptProposal(proposalId);
            }
            
            // Verify we've reached MAX_ASSETS
            expect(await comet.numAssets()).to.equal(MAX_ASSETS);
            
            // Now try to add one more token - this should fail
            const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
            const extraToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                "Extra Token", 
                18, 
                "EXT"
            );
            await extraToken.deployed();
            
            // Create price feed for the extra token
            const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
            const extraPriceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                ethers.utils.parseUnits("100", 8), // $100 price
                8, // 8 decimals
                extraToken.address
            );
            await extraPriceFeed.deployed();
            
            // Whitelist the extra token
            await sandboxController.whitelistCollateralAsset(
                extraToken.address,
                extraPriceFeed.address,
                ethers.utils.parseEther("0.5"), // minBorrowCF
                ethers.utils.parseEther("0.7"), // maxBorrowCF
                ethers.utils.parseEther("0.6"), // minLiquidateCF
                ethers.utils.parseEther("0.8"), // maxLiquidateCF
                ethers.utils.parseEther("0.8"), // minLiquidationFactor
                ethers.utils.parseEther("1.0")  // maxLiquidationFactor
            );
            
            // Create proposal for the extra token
            const extraCollateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: extraToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            const extraCalldata = iface.encodeFunctionData("addCollateralAsset", [extraCollateralTokenConfig]);
            
            // Create proposal
            await expect(configController.createProposal(extraCalldata, cometAddress, 1))
                .to.be.revertedWithCustomError(configController, "MaxCollateralTokensReached");

            // Verify the comet still has exactly MAX_ASSETS
            expect(await comet.numAssets()).to.equal(MAX_ASSETS);
        });

        it("should revert when trying to accept proposal that would exceed MAX_ASSETS limit", async () => {
            // Create multiple collateral tokens to reach MAX_ASSETS limit
            const MAX_ASSETS = 24;
            const comet = await ethers.getContractAt("SandboxComet", cometAddress);
            const currentAssets = await comet.numAssets();
            const tokensToAdd = MAX_ASSETS - currentAssets;
            // Create and whitelist additional collateral tokens
            const additionalTokens: FaucetToken[] = [];
            const additionalPriceFeeds: SimplePriceFeed[] = [];
            
            for (let i = 0; i < tokensToAdd + 1; i++) {
                // Create a new token
                const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
                const newToken = await FaucetFactory.deploy(
                    ethers.utils.parseEther("1000000"), 
                    `Additional Token ${i}`, 
                    18, 
                    `AT${i}`
                );
                await newToken.deployed();
                additionalTokens.push(newToken);
                
                // Create price feed for the new token
                const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
                const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                    ethers.utils.parseUnits("100", 8), // $100 price
                    8, // 8 decimals
                    newToken.address
                );
                await priceFeed.deployed();
                additionalPriceFeeds.push(priceFeed);
                
                // Whitelist the new collateral token in SandboxController
                await sandboxController.whitelistCollateralAsset(
                    newToken.address,
                    priceFeed.address,
                    ethers.utils.parseEther("0.5"), // minBorrowCF
                    ethers.utils.parseEther("0.7"), // maxBorrowCF
                    ethers.utils.parseEther("0.6"), // minLiquidateCF
                    ethers.utils.parseEther("0.8"), // maxLiquidateCF
                    ethers.utils.parseEther("0.8"), // minLiquidationFactor
                    ethers.utils.parseEther("1.0")  // maxLiquidationFactor
                );
            }
            
            // Add all tokens up to MAX_ASSETS limit
            for (let i = 0; i < tokensToAdd; i++) {
                const collateralTokenConfig: CollateralTokenConfigStruct = {
                    collateralToken: additionalTokens[i].address,
                    supplyCap: ethers.utils.parseEther("1000000"),
                    borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                    liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                    liquidationFactor: ethers.utils.parseEther("0.8"),
                };
                
                const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
                
                // Create proposal
                await configController.createProposal(calldata, cometAddress, 1);
                const proposalId = await configController.proposalCounter();

                if (i == tokensToAdd - 1) {
                    const collateralTokenConfig: CollateralTokenConfigStruct = {
                        collateralToken: additionalTokens[i + 1].address,
                        supplyCap: ethers.utils.parseEther("1000000"),
                        borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                        liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                        liquidationFactor: ethers.utils.parseEther("0.8"),
                    };
                    
                    const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
                    
                    // Create proposal
                    await configController.createProposal(calldata, cometAddress, 1);
                }

                // Fast forward past maturity period
                await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
                await ethers.provider.send("evm_mine", []);
            
                // Accept the proposal
                await configController.acceptProposal(proposalId);
            }
            
            // Verify we've reached MAX_ASSETS
            expect(await comet.numAssets()).to.equal(MAX_ASSETS);

            const extraProposalId = await configController.proposalCounter();
            
            // Try to accept the proposal - this should fail because MAX_ASSETS is reached
            await expect(configController.acceptProposal(extraProposalId))
                .to.be.revertedWithCustomError(configController, "MaxCollateralTokensReached");
            
            // Verify the proposal is still active (not executed)
            const proposal = await configController.proposals(extraProposalId);
            expect(proposal.expirationTime).to.be.gt(0);
            
            // Verify the comet still has exactly MAX_ASSETS
            expect(await comet.numAssets()).to.equal(MAX_ASSETS);
        });

        it("should revert when trying to accept an already executed proposal", async () => {
            // Create the collateral token configuration
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            // Encode the function call
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);

            // Create a first proposal. 
            await configController.createProposal(calldata, cometAddress, 1);
            const proposalId1 = await configController.proposalCounter();
            const proposal1 = await configController.proposals(proposalId1);
            expect(proposal1.proposer).to.equal(owner.address);
            expect(proposal1.proposalType).to.equal(1);
            expect(proposal1.comet).to.equal(cometAddress);
            expect(proposal1.call).to.equal(calldata);

            // Accept the first proposal to make the second proposal not executable.
            // Before accepting the proposal, we need to fast forward the time.
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days TODO: FIX to custom value.
            await ethers.provider.send("evm_mine", []);

            await configController.acceptProposal(proposalId1);

            // Check that proposal is executed.
            expect((await configController.proposals(proposalId1)).expirationTime).to.be.equal(0);

            // Try to accept an already executed proposal.
            await expect(configController.acceptProposal(proposalId1)).to.be.revertedWithCustomError(configController, "NoActiveProposal")  
        })
    });
});

describe("Check the proposal revert on the SandboxComet side.", () => {
    let configControllerProposalTest: ConfigControllerProposalTest;
    let comet: any;
    let baseToken: FaucetToken;
    let basePriceFeed: SimplePriceFeed;
    let collateralToken: FaucetToken;
    let priceFeed: SimplePriceFeed;
    let sandboxController: any;
    let configControllerFactory: any;
    let cometFactory: any;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let dao: SignerWithAddress;
    let cometAddress: string;
    let snapshot: SnapshotRestorer;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        dao = signers[3];

        // Create base token (USDC)
        const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
        baseToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("1000000"), 
            "USD Coin", 
            6, 
            "USDC"
        );
        await baseToken.deployed();

        // Create collateral token (WETH)
        collateralToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("10000"), 
            "Wrapped Ether", 
            18, 
            "WETH"
        );
        await collateralToken.deployed();

        // Create price feeds
        const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
        
        // Base token price feed (USDC = $1)
        basePriceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("1", 8), // $1 price
            8, // 8 decimals
            baseToken.address
        );
        await basePriceFeed.deployed();

        // Collateral token price feed (WETH = $3000)
        priceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("3000", 8), // $3000 price
            8, // 8 decimals
            collateralToken.address
        );
        await priceFeed.deployed();

        // Create SandboxController
        const SandboxControllerFactory = await ethers.getContractFactory("SandboxController");
        sandboxController = await SandboxControllerFactory.deploy(
            owner.address,
            dao.address, // dao
            ethers.Wallet.createRandom().address, // treasury
            false, // feeEnabled
            ethers.utils.parseEther("0.5").toString(), // targetPercent
            ethers.utils.parseEther("0.9999999999").toString(), // storeFrontPriceFactor
            300, // minUpdateTime
            7 * 24 * 60 * 60, // maxUpdateTime
            ethers.utils.parseEther("500").toString(), // suggestedAmountOfSeedReserves
            86400, // suggestedLockTimeOfSeedReserves
            [ethers.utils.parseEther("0.01"), ethers.utils.parseEther("0.02"), ethers.utils.parseEther("0.03")], // reserveCommissions
            [ethers.utils.parseEther("0.01"), ethers.utils.parseEther("0.02"), ethers.utils.parseEther("0.03")] // protocolCommissions
        );
        await sandboxController.deployed();

        // Whitelist base token
        await sandboxController.whitelistBaseAsset(
            baseToken.address,
            basePriceFeed.address,
            {
                supplyKink: ethers.utils.parseEther("0.8"),
                supplyPerYearInterestRateBase: ethers.utils.parseEther("0.001"),
                supplyPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.05"),
                supplyPerYearInterestRateSlopeHigh: ethers.utils.parseEther("2"),
                borrowKink: ethers.utils.parseEther("0.8"),
                borrowPerYearInterestRateBase: ethers.utils.parseEther("0.005"),
                borrowPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.1"),
                borrowPerYearInterestRateSlopeHigh: ethers.utils.parseEther("3"),
            },
            ethers.utils.parseUnits("1", 6) // baseBorrowMin
        );

        // Whitelist collateral token
        await sandboxController.whitelistCollateralAsset(
            collateralToken.address,
            priceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );

        // Create ConfigControllerFactory
        const ConfigControllerFactoryFactory = await ethers.getContractFactory("ConfigControllerFactory");
        const ConfigControllerProposalTestFactory = await ethers.getContractFactory("ConfigControllerProposalTest");
        const configControllerImpl = await ConfigControllerProposalTestFactory.deploy();
        configControllerFactory = await ConfigControllerFactoryFactory.deploy(
            sandboxController.address, 
            configControllerImpl.address
        );
        await configControllerFactory.deployed();

        // Create CometFactory
        const CometFactory = await ethers.getContractFactory("CometHarness");
        const cometImpl = await CometFactory.deploy();
        const SandboxCometFactoryFactory = await ethers.getContractFactory("SandboxCometFactory");
        cometFactory = await SandboxCometFactoryFactory.deploy(
            cometImpl.address, 
            configControllerFactory.address
        );
        await cometFactory.deployed();

        // Create ConfigController
        const tx = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee
            "ConfigController",
            7 * 24 * 60 * 60, // curatorProposalDuration
            7 * 24 * 60 * 60  // proposalDuration
        );
        const receipt = await tx.wait();
        const [createConfigControllerEvent] = receipt.events?.filter(event => event.event === "ConfigControllerCreated");
        const configControllerAddress = createConfigControllerEvent?.args?.controller;

        // Get ConfigControllerProposalTest instance
        configControllerProposalTest = await ethers.getContractAt("ConfigControllerProposalTest", configControllerAddress);

        // Accept curator proposal
        await configControllerProposalTest.connect(curator).acceptProposal(await configControllerProposalTest.proposalCounter());

        // Create comet with only one collateral token
        const cometConfig = {
            baseToken: baseToken.address,
            collateralTokens: [{
                collateralToken: collateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            }],
            baseTokenCurveId: 0n
        };

        await configControllerProposalTest.createComet(cometConfig);
        cometAddress = await configControllerProposalTest.comets(0);
        comet = await ethers.getContractAt("SandboxComet", cometAddress);

        // Allocate base token to owner and approve for seed reserves
        await baseToken.allocateTo(owner.address, ethers.utils.parseEther("500"));
        await baseToken.approve(configControllerProposalTest.address, ethers.utils.parseEther("500"));
        
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    })

    it("should fail when trying to add already existing collateral token", async () => {
        // Create a proposal for the same collateral token that already exists in the comet
        const collateralTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: collateralToken.address, // Use the existing WETH token
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };

        // Encode the function call
        const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
        
        // Create a proposal
        const tx = await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
        const receipt = await tx.wait();            
        // Get the proposal ID from the event
        const event = <ProposeNewCollateralTokenEvent> receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
        const proposalId = event.args[0];
        
        // Fast forward past maturity period (1 week)
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);
        
        // Try to accept the proposal - this should fail because the token already exists
        await expect(configControllerProposalTest.connect(owner).acceptProposal(proposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "CollateralTokenAlreadyAdded");
        
        // Verify the proposal is still active (not executed)
        const proposal = await configControllerProposalTest.proposals(proposalId);
        expect(proposal.expirationTime).to.be.gt(0);
        
        // Verify the comet still has only the original collateral token
        const numAssets = await comet.numAssets();
        expect(numAssets).to.equal(1);
        
        const existingAsset = await comet.collateralAssets(0);
        expect(existingAsset.collateralToken).to.equal(collateralToken.address);
    });

    it("should fail when trying to add base token as collateral token", async () => {
        // Whitelist base token as collateral token (for testing purposes)
        await sandboxController.whitelistCollateralAsset(
            baseToken.address,
            basePriceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );

        // Create a proposal with the collateral token that is the base asset
        const baseTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: baseToken.address, // Use the base token as collateral (should fail)
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };

        // Encode the function call
        const calldata = iface.encodeFunctionData("addCollateralAsset", [baseTokenConfig]);
        
        // Create a proposal
        const tx = await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
        const receipt = await tx.wait();            
        // Get the proposal ID from the event
        const event = <ProposeNewCollateralTokenEvent> receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
        const proposalId = event.args[0];
        
        // Fast forward past maturity period (1 week)
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);

        // Try to accept the proposal - this should fail because base token cannot be used as collateral
        await expect(configControllerProposalTest.connect(owner).acceptProposal(proposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "CometCallFailed");
        
        // Verify the proposal is still active (not executed)
        const proposalAfterAttempt = await configControllerProposalTest.proposals(proposalId);
        expect(proposalAfterAttempt.expirationTime).to.be.gt(0);
        
        // Verify the comet still has only the original collateral token
        const numAssets = await comet.numAssets();
        expect(numAssets).to.equal(1);
        
        const existingAsset = await comet.collateralAssets(0);
        expect(existingAsset.collateralToken).to.equal(collateralToken.address);
    });

    it("should fail when trying to add collateral token beyond MAX_ASSETS limit", async () => {
        // Create multiple collateral tokens to reach MAX_ASSETS limit
        const MAX_ASSETS = 24;
        const currentAssets = await comet.numAssets();
        const tokensToAdd = MAX_ASSETS - currentAssets;
        
        // Create and whitelist additional collateral tokens
        const additionalTokens: FaucetToken[] = [];
        const additionalPriceFeeds: SimplePriceFeed[] = [];
        
        for (let i = 0; i < tokensToAdd; i++) {
            // Create a new token
            const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
            const newToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                `Additional Token ${i}`, 
                18, 
                `AT${i}`
            );
            await newToken.deployed();
            additionalTokens.push(newToken);
            
            // Create price feed for the new token
            const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
            const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                ethers.utils.parseUnits("100", 8), // $100 price
                8, // 8 decimals
                newToken.address
            );
            await priceFeed.deployed();
            additionalPriceFeeds.push(priceFeed);
            
            // Whitelist the new collateral token in SandboxController
            await sandboxController.whitelistCollateralAsset(
                newToken.address,
                priceFeed.address,
                ethers.utils.parseEther("0.5"), // minBorrowCF
                ethers.utils.parseEther("0.7"), // maxBorrowCF
                ethers.utils.parseEther("0.6"), // minLiquidateCF
                ethers.utils.parseEther("0.8"), // maxLiquidateCF
                ethers.utils.parseEther("0.8"), // minLiquidationFactor
                ethers.utils.parseEther("1.0")  // maxLiquidationFactor
            );
        }
        
        // Add all tokens up to MAX_ASSETS limit
        for (let i = 0; i < tokensToAdd; i++) {
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: additionalTokens[i].address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create proposal
            await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
            const proposalId = await configControllerProposalTest.proposalCounter();
            
            // Fast forward past maturity period
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Accept the proposal
            await configControllerProposalTest.connect(owner).acceptProposal(proposalId);
        }
        
        // Verify we've reached MAX_ASSETS
        expect(await comet.numAssets()).to.equal(MAX_ASSETS);
        
        // Now try to add one more token - this should fail
        const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken");
        const extraToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("1000000"), 
            "Extra Token", 
            18, 
            "EXT"
        );
        await extraToken.deployed();
        
        // Create price feed for the extra token
        const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed");
        const extraPriceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("100", 8), // $100 price
            8, // 8 decimals
            extraToken.address
        );
        await extraPriceFeed.deployed();
        
        // Whitelist the extra token
        await sandboxController.whitelistCollateralAsset(
            extraToken.address,
            extraPriceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );
        
        // Create proposal for the extra token
        const extraCollateralTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: extraToken.address,
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };
        
        const extraCalldata = iface.encodeFunctionData("addCollateralAsset", [extraCollateralTokenConfig]);
        
        // Create proposal
        await configControllerProposalTest.connect(owner).createProposal2(extraCalldata, cometAddress, 1);
        const extraProposalId = await configControllerProposalTest.proposalCounter();
        
        // Fast forward past maturity period
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);
        
        // Try to accept the proposal - this should fail because MAX_ASSETS is reached
        await expect(configControllerProposalTest.connect(owner).acceptProposal(extraProposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "MaxCollateralTokensReached");
        
        // Verify the proposal is still active (not executed)
        const proposal = await configControllerProposalTest.proposals(extraProposalId);
        expect(proposal.expirationTime).to.be.gt(0);
        
        // Verify the comet still has exactly MAX_ASSETS
        expect(await comet.numAssets()).to.equal(MAX_ASSETS);
    });

});