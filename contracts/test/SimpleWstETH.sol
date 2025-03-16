// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.22;

contract SimpleWstETH {
    uint8 public constant decimals = 18;

    uint public immutable tokensPerStEth;

    constructor(uint tokensPerStEth_) {
        tokensPerStEth = tokensPerStEth_;
    }
}