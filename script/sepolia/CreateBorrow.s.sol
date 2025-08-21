// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { SandboxComet } from "contracts/SandboxComet.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployProtocol is Script {
    HelperConfig.NetworkConfig config;

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        SandboxComet cometUSDC = SandboxComet(payable(0xC1D21B24Ef9B02ecFa1D30c89b98366437F68144));
        SandboxComet cometUSDC2 = SandboxComet(payable(0x9A6EAfF541a9ACc85B98582d69658176aE5A086a));
        SandboxComet cometWBTC = SandboxComet(payable(0x9d4223477C668eB60C01fd7148dA38cA1Df614fB));
        SandboxComet cometWETH = SandboxComet(payable(0xc50E5F19B9dF6F3542b82660423c1DC1cc2BA439));

        IERC20 link = IERC20(config.link.tokenAddress);
        IERC20 usdc = IERC20(config.usdc.tokenAddress);
        IERC20 weth = IERC20(config.weth.tokenAddress);
        IERC20 wbtc = IERC20(config.wbtc.tokenAddress);

        // vm.startBroadcast();

        // // supply
        // link.approve(address(cometUSDC), 1e18);
        // cometUSDC.supply(address(link), 1e18);
        // // borrow
        // cometUSDC.withdraw(address(usdc), 5e6);
        // // repay
        // usdc.approve(address(cometUSDC), 10e6);
        // cometUSDC.repayAllFrom(0x0309004C4fB9943797f5C530abd8cddE564A9fD4, 0x0309004C4fB9943797f5C530abd8cddE564A9fD4);
        // // withdraw
        // cometUSDC.withdraw(address(link), 0.9e18);

        // // supply
        // weth.approve(address(cometUSDC2), 0.002e18);
        // cometUSDC2.supply(address(weth), 0.002e18);
        // // borrow
        // cometUSDC2.withdraw(address(usdc), 5e6);
        // // repay
        // uint256 borrowBalance = cometUSDC2.borrowBalanceOf(0x0309004C4fB9943797f5C530abd8cddE564A9fD4);
        // usdc.approve(address(cometUSDC2), borrowBalance);
        // // cometUSDC2.repayAllFrom(0x0309004C4fB9943797f5C530abd8cddE564A9fD4, 0x0309004C4fB9943797f5C530abd8cddE564A9fD4);
        // cometUSDC2.supply(address(usdc), borrowBalance);
        // // withdraw
        // cometUSDC2.withdraw(address(weth), 0.0019e18);

        // // supply
        // link.approve(address(cometWBTC), 3e18);
        // cometWBTC.supply(address(link), 3e18);
        // // borrow
        // cometWBTC.withdraw(address(wbtc), 0.0001e8);
        // // repay
        // uint256 borrowBalance = cometWBTC.borrowBalanceOf(0x0309004C4fB9943797f5C530abd8cddE564A9fD4);
        // wbtc.approve(address(cometWBTC), borrowBalance);
        // cometWBTC.supply(address(wbtc), borrowBalance);
        // // withdraw
        // cometWBTC.withdraw(address(link), 3e18 - 5);

        // // supply
        // link.approve(address(cometWETH), 2e18);
        // cometWETH.supply(address(link), 2e18);
        // // borrow
        // cometWETH.withdraw(address(weth), 900000000000000);
        // // repay
        // uint256 borrowBalance = cometWETH.borrowBalanceOf(0x0309004C4fB9943797f5C530abd8cddE564A9fD4);
        // weth.approve(address(cometWETH), borrowBalance);
        // cometWETH.supply(address(weth), borrowBalance);
        // // withdraw
        // cometWETH.withdraw(address(link), 2e18 - 2);

        // weth.approve(address(cometWETH), 2 ether);
        // cometWETH.supply(address(weth), 2 ether);

        // vm.stopBroadcast();

        vm.startBroadcast();

        // cometWETH.withdrawAllFrom(0xFC73F49D78faF266157d03F7CDC72D4DdaA7Ddf1, 0xFC73F49D78faF266157d03F7CDC72D4DdaA7Ddf1);
        weth.approve(address(cometWETH), 2 ether);
        cometWETH.repayAllFrom(0xFC73F49D78faF266157d03F7CDC72D4DdaA7Ddf1, 0xFC73F49D78faF266157d03F7CDC72D4DdaA7Ddf1);
        // uint256 wethBalance = weth.balanceOf(address(cometWETH));
        // console.log(wethBalance);

        vm.stopBroadcast();
    }
}
