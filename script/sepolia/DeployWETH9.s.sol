// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { WETH9 } from "contracts/tests/WETH9.sol";
import { Script, console } from "forge-std/Script.sol";

contract DeployWETH9 is Script {
    function run() external {
        vm.startBroadcast();

        WETH9 weth = new WETH9();
        console.log("WETH9 deployed at:", address(weth));

        vm.stopBroadcast();
    }
}
