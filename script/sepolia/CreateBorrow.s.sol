// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { SandboxComet } from "contracts/SandboxComet.sol";
import { CometExtension } from "contracts/CometExtension.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployProtocol is Script {
    HelperConfig.NetworkConfig config;

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        SandboxComet cometUSDC = SandboxComet(payable(0x38e04acB66733d22137b827Af3c11F19716a9e88));
        SandboxComet cometUSDC2 = SandboxComet(payable(0xc8C64E32FF87391094e61E097E7b7341F47bc32B));
        SandboxComet cometWBTC = SandboxComet(payable(0x70F7d9Db40f2EAB325aB13241b2d1BDE373995C1));
        SandboxComet cometWETH = SandboxComet(payable(0xdC14Cc2abE4077dDdD0424966A34B2D642547B0A));

        IERC20 link = IERC20(config.link.tokenAddress);
        IERC20 usdc = IERC20(config.usdc.tokenAddress);
        IERC20 weth = IERC20(config.weth.tokenAddress);
        IERC20 wbtc = IERC20(config.wbtc.tokenAddress);

        // vm.startBroadcast();

        // //
        // usdc.approve(address(cometUSDC), type(uint256).max);
        // usdc.approve(address(cometUSDC2), type(uint256).max);
        // cometUSDC.supply(address(usdc), 1000e6);
        // cometUSDC2.supply(address(usdc), 1000e6);

        // //
        // weth.approve(address(cometWETH), type(uint256).max);
        // cometWETH.supply(address(weth), 0.05e18);

        // //
        // wbtc.approve(address(cometWBTC), type(uint256).max);
        // cometWBTC.supply(address(wbtc), 0.0001e8);

        /*//////////////////////////////////////////////////////////////
                                    
        //////////////////////////////////////////////////////////////*/

        // weth.approve(address(cometUSDC), type(uint256).max);
        // weth.approve(address(cometUSDC2), type(uint256).max);
        // cometUSDC.supply(address(weth), 0.01e18);
        // cometUSDC2.supply(address(weth), 0.002e18);

        // link.approve(address(cometWETH), type(uint256).max);
        // cometWETH.supply(address(link), 15e18);

        // link.approve(address(cometWBTC), type(uint256).max);
        // cometWBTC.supply(address(link), 15e18);

        // vm.stopBroadcast();

        /*//////////////////////////////////////////////////////////////
                                 BORROW
        //////////////////////////////////////////////////////////////*/

        vm.startBroadcast(0x44908EF517c28DE800222A9F2030efbb01eE9aFe);

        weth.approve(address(cometUSDC), type(uint256).max);
        weth.approve(address(cometUSDC2), type(uint256).max);
        link.approve(address(cometWETH), type(uint256).max);
        link.approve(address(cometWBTC), type(uint256).max);

        cometUSDC.supply(address(weth), 1e18);
        cometUSDC2.supply(address(weth), 1e18);
        cometWETH.supply(address(link), 24e18);
        cometWBTC.supply(address(link), 24e18);

        cometUSDC.withdraw(address(usdc), 100e6);
        cometUSDC2.withdraw(address(usdc), 100e6);
        cometWETH.withdraw(address(weth), 0.01e18);
        cometWBTC.withdraw(address(wbtc), 0.001e8);

        vm.stopBroadcast();
    }
}
