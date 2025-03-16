// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.22;

interface IRateProvider {
    function getRate() external view returns (uint256);
}
