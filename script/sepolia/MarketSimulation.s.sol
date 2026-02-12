// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { SandboxComet } from "contracts/SandboxComet.sol";
import { CometExtension } from "contracts/CometExtension.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometStructures } from "contracts/interfaces/ICometStructures.sol";

import { WETH9 } from "contracts/test/WETH9.sol";
import { MockERC20 } from "contracts/test/MockERC20.sol";

import { console } from "forge-std/console.sol";

contract MarketSimulation is Script {
    HelperConfig.NetworkConfig config;

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        SandboxComet cometUSDC = SandboxComet(payable(helperConfig.getCometAddress("usdc")));
        SandboxComet cometUSDC2 = SandboxComet(payable(helperConfig.getCometAddress("usdc2")));
        SandboxComet cometWBTC = SandboxComet(payable(helperConfig.getCometAddress("wbtc")));
        SandboxComet cometWETH = SandboxComet(payable(helperConfig.getCometAddress("weth")));

        IERC20 link = IERC20(config.link.tokenAddress);
        IERC20 usdc = IERC20(config.usdc.tokenAddress);
        IERC20 weth = IERC20(config.weth.tokenAddress);
        IERC20 wbtc = IERC20(config.wbtc.tokenAddress);
        IERC20 susde = IERC20(config.sUSDe.tokenAddress);
        IERC20 snx = IERC20(config.snx.tokenAddress);
        IERC20 jpy = IERC20(config.jpy.tokenAddress);
        IERC20 oETH = IERC20(config.oETH.tokenAddress);
        IERC20 stETH = IERC20(config.stETH.tokenAddress);
        IERC20 wstETH = IERC20(config.wstETH.tokenAddress);

        address baseTokenSupplyer = 0xd2251Ea4c0e8aa3EAdb2d6292Ad94C00B233795F;
        address minter = 0x0309004C4fB9943797f5C530abd8cddE564A9fD4;
        address collateralSupplyer = 0x636e7DffF6304a9E951B2F47B449e8f6b23D7492;

        uint256 baseTokenSupplierPrivateKey = uint256(vm.envUint("BASE_TOKEN_SUPPLIER_PRIVATE_KEY"));
        uint256 minterPrivateKey = uint256(vm.envUint("MINTER_PRIVATE_KEY"));
        uint256 collateralSupplyerPrivateKey = uint256(vm.envUint("COLLATERAL_SUPPLIER_PRIVATE_KEY"));

        /*//////////////////////////////////////////////////////////////
                            BASE TOKENS SUPPLY
        //////////////////////////////////////////////////////////////*/

        uint256 USDC_BASE_SUPPLY = 340_000e6;
        uint256 USDC2_BASE_SUPPLY = 420_000e6;
        uint256 WETH_BASE_SUPPLY = 135e18;
        uint256 WBTC_BASE_SUPPLY = 4e8;

        // vm.startBroadcast(minterPrivateKey);

        // WETH9(payable(address(weth))).mintTo(baseTokenSupplyer, WETH_BASE_SUPPLY);
        // MockERC20(address(usdc)).mintTo(baseTokenSupplyer, USDC_BASE_SUPPLY);
        // MockERC20(address(usdc)).mintTo(baseTokenSupplyer, USDC2_BASE_SUPPLY);
        // MockERC20(address(wbtc)).mintTo(baseTokenSupplyer, WBTC_BASE_SUPPLY);
        
        // vm.stopBroadcast();

        // vm.startBroadcast(baseTokenSupplierPrivateKey);

        // usdc.approve(address(cometUSDC), type(uint256).max);
        // usdc.approve(address(cometUSDC2), type(uint256).max);
        // weth.approve(address(cometWETH), type(uint256).max);
        // wbtc.approve(address(cometWBTC), type(uint256).max);

        // cometUSDC.supply(address(usdc), USDC_BASE_SUPPLY);
        // cometUSDC2.supply(address(usdc), USDC2_BASE_SUPPLY);
        // cometWETH.supply(address(weth), WETH_BASE_SUPPLY);
        // cometWBTC.supply(address(wbtc), WBTC_BASE_SUPPLY);

        // cometUSDC.withdraw(address(usdc), USDC_BASE_SUPPLY / 2);
        // cometUSDC2.withdraw(address(usdc), USDC2_BASE_SUPPLY / 2);
        // cometWETH.withdraw(address(weth), WETH_BASE_SUPPLY / 2);
        // cometWBTC.withdraw(address(wbtc), WBTC_BASE_SUPPLY / 2);

        // vm.stopBroadcast();

        vm.startBroadcast(collateralSupplyerPrivateKey);

        /*//////////////////////////////////////////////////////////////
                                APPROVALS
        //////////////////////////////////////////////////////////////*/

        // wbtc.approve(address(cometUSDC), type(uint256).max);
        // weth.approve(address(cometUSDC), type(uint256).max);
        // link.approve(address(cometUSDC), type(uint256).max);
        // susde.approve(address(cometUSDC), type(uint256).max);

        // wbtc.approve(address(cometUSDC2), type(uint256).max);
        // weth.approve(address(cometUSDC2), type(uint256).max);

        // stETH.approve(address(cometWETH), type(uint256).max);
        // wstETH.approve(address(cometWETH), type(uint256).max);
        // link.approve(address(cometWETH), type(uint256).max);
        // oETH.approve(address(cometWETH), type(uint256).max);

        // jpy.approve(address(cometWBTC), type(uint256).max);
        // weth.approve(address(cometWBTC), type(uint256).max);
        // link.approve(address(cometWBTC), type(uint256).max);
        // snx.approve(address(cometWBTC), type(uint256).max);

        // /*//////////////////////////////////////////////////////////////
        //                             USDC
        // //////////////////////////////////////////////////////////////*/

        // cometUSDC.supply(address(wbtc), 2.5e8);
        // cometUSDC.supply(address(weth), 65e18);
        // cometUSDC.supply(address(link), 18435e18);
        // cometUSDC.supply(address(susde), 54489e18);

        // cometUSDC.withdraw(address(usdc), 54789e6);

        // /*//////////////////////////////////////////////////////////////
        //                             USDC 2
        // //////////////////////////////////////////////////////////////*/

        // cometUSDC2.supply(address(wbtc), 3.3e8);
        // cometUSDC2.supply(address(weth), 43e18);

        // cometUSDC2.withdraw(address(usdc), 150500e6);

        /*//////////////////////////////////////////////////////////////
                                WETH
        //////////////////////////////////////////////////////////////*/
        
        // cometWETH.supply(address(stETH), 40e18);
        // cometWETH.supply(address(wstETH), 75e18);
        // cometWETH.supply(address(link), 15424e18);
        // cometWETH.supply(address(oETH), 56e18);

        // cometWETH.withdraw(address(weth), 64e18);

        /*//////////////////////////////////////////////////////////////
                                    WBTC
        //////////////////////////////////////////////////////////////*/

        cometWBTC.supply(address(jpy), 18300e18);
        cometWBTC.supply(address(weth), 73e18);
        cometWBTC.supply(address(link), 14800e18);
        cometWBTC.supply(address(snx), 8600e18);

        cometWBTC.withdraw(address(wbtc), 1.8e8);
        
        vm.stopBroadcast();
    }
}

