// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script } from "lib/forge-std/src/Script.sol";
import { stdJson } from "lib/forge-std/src/StdJson.sol";

import { WETH9 } from "contracts/test/WETH9.sol";
import { MockERC20 } from "contracts/test/MockERC20.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

contract DeployTokens is Script {
    using stdJson for string;

    uint256 ownerPrivateKey = uint256(vm.envUint("OWNER_PRIVATE_KEY"));

    function run() public {
        /*//////////////////////////////////////////////////////////////
                           TOKENS DEPLOYMENT
        //////////////////////////////////////////////////////////////*/
        vm.startBroadcast(ownerPrivateKey);
        address usdc = address(new MockERC20("USDC", "USDC", 10_000_000_000e6, 6));
        address wbtc = address(new MockERC20("WBTC", "WBTC", 1_000_000e8, 8));
        address weth = address(new WETH9());
        WETH9(payable(weth)).mintTo(msg.sender, 1_000_000e18);
        address link = address(new MockERC20("LINK", "LINK", 10_000_000_000e18, 18));
        address stETH = address(new MockERC20("stETH", "stETH", 1_000_000e18, 18));
        address wstETH = address(new MockERC20("wstETH", "wstETH", 1_000_000e18, 18));
        address susde = address(new MockERC20("sUSDe", "sUSDe", 10_000_000_000e18, 18));
        address snx = address(new MockERC20("SNX", "SNX", 10_000_000_000e18, 18));
        address jpy = address(new MockERC20("JPY", "JPY", 10_000_000_000e18, 18));
        address oETH = address(new MockERC20("oETH", "oETH", 1_000_000e18, 18));
        vm.stopBroadcast();

        /*//////////////////////////////////////////////////////////////
                             UPDATE CONFIG
        //////////////////////////////////////////////////////////////*/
        HelperConfig helperConfig = new HelperConfig();
        string memory networkConfigPath = helperConfig.getChainConfigPath();

        vm.writeJson(vm.toString(usdc), networkConfigPath, ".assets.USDC.address");
        vm.writeJson(vm.toString(wbtc), networkConfigPath, ".assets.WBTC.address");
        vm.writeJson(vm.toString(weth), networkConfigPath, ".assets.WETH.address");
        vm.writeJson(vm.toString(link), networkConfigPath, ".assets.LINK.address");
        vm.writeJson(vm.toString(stETH), networkConfigPath, ".assets.stETH.address");
        vm.writeJson(vm.toString(wstETH), networkConfigPath, ".assets.wstETH.address");
        vm.writeJson(vm.toString(susde), networkConfigPath, ".assets.sUSDe.address");
        vm.writeJson(vm.toString(snx), networkConfigPath, ".assets.SNX.address");
        vm.writeJson(vm.toString(jpy), networkConfigPath, ".assets.JPY.address");
        vm.writeJson(vm.toString(oETH), networkConfigPath, ".assets.oETH.address");
    }
}
