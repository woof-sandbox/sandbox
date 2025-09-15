// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script } from "lib/forge-std/src/Script.sol";
import { ISandboxComet } from "contracts/interfaces/internal/sandbox/ISandboxComet.sol";
import "forge-std/console.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { WETH9 } from "contracts/tests/WETH9.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployProtocol is Script {
    HelperConfig.NetworkConfig config;

    uint256 lenderPrivateKey;
    uint256 baseLenderPrivateKey;
    uint256 borrowerPrivateKey;

    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        // Get owner's private key from .env
        lenderPrivateKey = vm.envUint("LENDER_PRIVATE_KEY");
        baseLenderPrivateKey = vm.envUint("BASE_LENDER_PRIVATE_KEY");
        borrowerPrivateKey = vm.envUint("BORROWER_PRIVATE_KEY");

        address lender = vm.addr(lenderPrivateKey);
        address baseLender = vm.addr(baseLenderPrivateKey);
        address borrower = vm.addr(borrowerPrivateKey);

        uint256 borrowAmount = 50e6;

        // Initialize arrays with correct sizes

        address[] memory collateralTokens = new address[](4);
        collateralTokens[0] = config.weth;
        collateralTokens[1] = config.wbtc;
        uint256[] memory collateralAmounts = new uint256[](4);
        collateralAmounts[0] = 0.001 ether; // 0.001 WETH
        collateralAmounts[1] = 0.001e8; // 0.001 WBTC

        lendCollaterals(config.comet1, collateralTokens, collateralAmounts, lender);
        lendBaseToken(config.comet1, config.usdc, 500e6, baseLender);
        setupBorrowing(config.comet1, config.usdc, collateralTokens, collateralAmounts, borrowAmount, borrower);

        collateralTokens[2] = config.link;
        collateralTokens[3] = config.comp;
        collateralAmounts[2] = 4e18; // 4 LINK
        collateralAmounts[3] = 3e18; // 3 COMP

        lendCollaterals(config.comet2, collateralTokens, collateralAmounts, lender);
        lendBaseToken(config.comet2, config.usdc, 500e6, baseLender);
        setupBorrowing(config.comet2, config.usdc, collateralTokens, collateralAmounts, borrowAmount, borrower);
    }

    function lendCollaterals(
        address cometAddr,
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        address user
    ) internal {
        ISandboxComet comet = ISandboxComet(cometAddr);

        vm.startBroadcast(lenderPrivateKey);
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
        vm.stopBroadcast();
    }

    function lendBaseToken(address cometAddr, address baseToken, uint256 lendAmount, address user) internal {
        ISandboxComet comet = ISandboxComet(cometAddr);

        vm.startBroadcast(baseLenderPrivateKey);
        // Supply base token
        IERC20(baseToken).approve(cometAddr, lendAmount);
        comet.supply(baseToken, lendAmount);
        vm.stopBroadcast();

        console.log("Lent base token:", baseToken, "amount:", lendAmount);
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

        vm.startBroadcast(borrowerPrivateKey);
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
