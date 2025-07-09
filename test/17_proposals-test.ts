import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { makeProtocol, ethers, expect } from "./helper/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers";

describe("17. Proposals", () => {
    let configController;
    let snapshot;
    let owner;
    let comet;
    let curator;
    let tokens;
    let users;

    before(async () => {
        const protocol = await makeProtocol();
        configController = protocol.configController;
        owner = protocol.owner;
        tokens = protocol.tokens;
        comet = await configController.comets(0);
        users = protocol.users;
        curator = protocol.curator;
    });

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("ProposeCurator", () => {
        let newCurator: SignerWithAddress;
        
        beforeEach(async () => {
            newCurator = users[0];
        });

        it("should create and execute a proposal for new curator", async () => {
            /// Encode the new curator address
            const encodedNewCurator: string = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            /// Create the proposal. Type 0 is ProposeCurator.
            await configController.createProposal(encodedNewCurator, 0);
            /// Accept the proposal.
            const tx: ContractTransaction = await configController.connect(newCurator).acceptProposal(await configController.proposalCounter());
            const txReceipt: ContractReceipt = await tx.wait();
            /// Check if the curator is the new curator.
            expect(await configController.curator()).to.equal(newCurator.address);
            // Check if the event was emitted
            const event = txReceipt.events?.find(e => e.event === "CuratorAccepted");
            
            expect(event).to.not.be.undefined;
            if (event && event.args) {
                expect(event.args[0]).to.equal(curator.address);
                expect(event.args[1]).to.equal(newCurator.address);
            }
        });
    });

    describe("ProposeNewCollateralToken", () => {
        
    });
});
