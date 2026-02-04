// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IBalancerRateProvider } from "contracts/interfaces/IBalancerRateProvider.sol";

contract BalancerRateProviderTest is IBalancerRateProvider {
    uint256 internal rate;

    constructor(uint256 initialRate) {
        rate = initialRate;
    }

    function getRate() external view returns (uint256) {
        return rate;
    }

    function setRate(uint256 newRate) external {
        rate = newRate;
    }
}
