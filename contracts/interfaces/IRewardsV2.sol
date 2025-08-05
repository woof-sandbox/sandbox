// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface IRewardsV2 {
    function accrue() external returns (bool);
}
