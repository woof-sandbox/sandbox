// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script } from "lib/forge-std/src/Script.sol";
import { ISandboxComet } from "contracts/interfaces/ISandboxComet.sol";
import "forge-std/console.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { WETH9 } from "contracts/test/WETH9.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployProtocol is Script {
    address owner;
    address user;
    address baseToken;
    uint256 ownerPrivateKey;
    uint256 userPrivateKey;

    HelperConfig.NetworkConfig config;

    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        // Get owner's private key from .env
        ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        owner = vm.addr(ownerPrivateKey);
        userPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        user = vm.addr(userPrivateKey);

        // buy 0.2 WETH for owner
        WETH9 weth = WETH9(payable(config.weth));
        vm.startBroadcast(ownerPrivateKey);
        weth.deposit{ value: 0.2 ether }();
        IERC20(config.usdc).transfer(user, 20_000e6);
        vm.stopBroadcast();

        vm.startBroadcast(user);
        IERC20(config.usdc).approve(config.comet1, 10_000e6);
        IERC20(config.usdc).approve(config.comet2, 10_000e6);
        ISandboxComet(config.comet1).supply(config.usdc, 10_000e6);
        ISandboxComet(config.comet2).supply(config.usdc, 10_000e6);
        vm.stopBroadcast();

        // Initialize arrays with correct sizes
        baseToken = config.usdc;
        uint256 borrowAmount = 100e6; // 100 USDC

        address[] memory collateralTokens = new address[](4);
        collateralTokens[0] = config.weth;
        collateralTokens[1] = config.wbtc;
        uint256[] memory collateralAmounts = new uint256[](4);
        collateralAmounts[0] = 0.01 ether; // 0.01 WETH
        collateralAmounts[1] = 0.00001e18; // 0.00001 WBTC

        setupBorrowing(config.comet1, baseToken, collateralTokens, collateralAmounts, borrowAmount, owner);

        collateralTokens[2] = config.link;
        collateralTokens[3] = config.comp;
        collateralAmounts[2] = 100e18; // 100 LINK
        collateralAmounts[3] = 10e18; // 10 COMP

        setupBorrowing(config.comet2, baseToken, collateralTokens, collateralAmounts, borrowAmount, owner);
    }

    function setupBorrowing(
        address cometAddr,
        address baseToken,
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        uint256 borrowAmount,
        address user
    ) internal {
        ISandboxComet comet = ISandboxComet(cometAddr);

        vm.startBroadcast(user);
        // Supply collateral tokens
        for (uint i = 0; i < collateralTokens.length; i++) {
            address collateralToken = collateralTokens[i];
            IERC20 token = IERC20(collateralToken);
            WETH9 weth = WETH9(payable(collateralToken));

            if (collateralToken == address(0)) continue; // Skip if collateral token is zero address

            if (collateralToken == config.weth) {
                weth.approve(cometAddr, collateralAmounts[i]);
                comet.supply(collateralToken, collateralAmounts[i]);
            } else {
                token.approve(cometAddr, collateralAmounts[i]);
                comet.supply(collateralToken, collateralAmounts[i]);
            }
        }

        // Borrow base token
        comet.withdraw(baseToken, borrowAmount);
        vm.stopBroadcast();

        console.log("Borrowed amount:", borrowAmount);
    }
}
