// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ILRTOracle } from "contracts/interfaces/ILRTOracle.sol";

contract ManagedLRTOracle is ILRTOracle {
    uint256 public price;

    constructor(uint256 initialPrice) {
        price = initialPrice;
    }

    function setPrice(uint256 newPrice) external {
        price = newPrice;
    }

    function rsETHPrice() external view override returns (uint256) {
        return price;
    }
}
