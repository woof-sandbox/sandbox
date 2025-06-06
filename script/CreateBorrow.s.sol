// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../contracts/SandboxController.sol";
import "../contracts/ConfigControllerFactory.sol";
import "../contracts/SandboxCometFactory.sol";
import "../contracts/SandboxComet.sol";
import "../contracts/test/ManagedFaucetToken.sol";
import "../contracts/test/ManagedSimplePriceFeed.sol";
import "../contracts/interfaces/ISandboxComet.sol";

contract DeployProtocol is Script {
    address owner;
    address user;
    address comet;
    address baseToken;
    uint256 ownerPrivateKey;
    uint256 userPrivateKey;

    function run() external {
        // Get owner's private key from .env
        ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        owner = vm.addr(ownerPrivateKey);
        userPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        user = vm.addr(userPrivateKey);
        comet = 0x752CBab5343AD101144d0dFc6eBC2d5e40bCCcA8;
        // Initialize arrays with correct sizes
        address[] memory collateralTokens = new address[](4);
        collateralTokens[0] = 0x617b62AA26Ea878788Cb7fa05f14396956774Cf1;
        collateralTokens[1] = 0xa5D440b5626cf6e46c19541D793647193CC9CC84;
        collateralTokens[2] = 0xEe0893D5AF0319aEE9cA89b0223812B970ED438a;
        collateralTokens[3] = 0xAe3f194f413aB4f772B89cb6E92E7c321959F373;
        baseToken = 0x210B11A468b3Ceb098a20dCACe7eB6E74479e522;

        setupBorrowing(
            comet, 
            baseToken, 
            collateralTokens, 
            user
        );
    }

    function setupBorrowing(
        address cometAddr,
        address baseToken,
        address[] memory collateralTokens,
        address user
    ) internal {
        ISandboxComet comet = ISandboxComet(cometAddr);
        ManagedFaucetToken baseTokenContract = ManagedFaucetToken(baseToken);

        // Supply base token to the comet
        uint256 baseAmount = 1e24; // 1,000,000 base tokens
        vm.startBroadcast(ownerPrivateKey);
        baseTokenContract.allocateTo(owner, baseAmount);
        baseTokenContract.approve(cometAddr, baseAmount);
        comet.supply(baseToken, baseAmount);
        vm.stopBroadcast();

        // Supply collateral tokens
        // for (uint i = 0; i < collateralTokens.length; i++) {
        //     ManagedFaucetToken collateralToken = ManagedFaucetToken(collateralTokens[i]);
        //     uint256 collateralAmount = 1e24; // 1,000,000 collateral tokens
        //     vm.startBroadcast(ownerPrivateKey);
        //     collateralToken.allocateTo(user, collateralAmount);
        //     vm.stopBroadcast();
        //     vm.startBroadcast(userPrivateKey);
        //     collateralToken.approve(cometAddr, collateralAmount);
        //     comet.supply(collateralTokens[i], collateralAmount);
        //     vm.stopBroadcast();
        // }
        
        // Borrow base token
        uint256 borrowAmount = 500 * 10 ** baseTokenContract.decimals(); 
        vm.startBroadcast(userPrivateKey);
        comet.withdraw(baseToken, borrowAmount);
        vm.stopBroadcast();

        console.log("Setup borrowing for Comet:", cometAddr);
        console.log("Supplied base token amount:", baseAmount);
        console.log("Borrowed amount:", borrowAmount);
    }
} 