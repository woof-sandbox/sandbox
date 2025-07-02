// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface ILRTOracle {
    function rsETHPrice() external view returns (uint256);
}
