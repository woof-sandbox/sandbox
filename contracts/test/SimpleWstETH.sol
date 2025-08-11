// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

contract SimpleWstETH {
    uint8 public constant decimals = 18;

    uint256 public immutable tokensPerStEth;

    constructor(uint256 tokensPerStEth_) {
        tokensPerStEth = tokensPerStEth_;
    }
}
