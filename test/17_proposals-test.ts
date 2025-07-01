import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { ConfigController } from "../build/types";
import { makeProtocol } from "./helper/helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("17. Proposals", () => {
    let configController: ConfigController;
    let snapshot: SnapshotRestorer;

    before(async () => {
        const { configController: controller } = await makeProtocol();
        configController = controller;
    });

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    it("should create a proposal for new collateral token", async () => {
        // Create a CollateralTokenConfig struct
        const collateralTokenConfig = {
            collateralToken: "0x1234567890123456789012345678901234567890", // Example token address
            supplyCap: ethers.utils.parseEther("1000000"), // 1,000,000 tokens
            borrowCollateralFactor: 8000, // 80% (scaled by 100)
            liquidateCollateralFactor: 8500, // 85% (scaled by 100)
            liquidationFactor: 5000, // 50% (scaled by 100)
        };

        // Encode the proposeNewCollateralToken function call
        // First, we need to create the function signature
        const functionSignature = "function addCollateralToken(tuple(address,uint128,uint64,uint64,uint64))";
        const functionSelector = ethers.utils.id(functionSignature).slice(0, 10);
        
        // Encode the parameters (CollateralTokenConfig struct)
        const encodedParams = ethers.utils.defaultAbiCoder.encode(
            ["tuple(address,uint128,uint64,uint64,uint64)"],
            [[
                collateralTokenConfig.collateralToken,
                collateralTokenConfig.supplyCap,
                collateralTokenConfig.borrowCollateralFactor,
                collateralTokenConfig.liquidateCollateralFactor,
                collateralTokenConfig.liquidationFactor
            ]]
        );

        // Combine function selector with encoded parameters
        const calldata = functionSelector + encodedParams.slice(2);

        // Create the proposal with proposal type 1 (ProposeNewCollateralToken)
        const proposalId = await configController.createProposal(calldata, 1);
        
        // Verify the proposal was created
        expect(proposalId).to.be.gt(0);
    });
});
