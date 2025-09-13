// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { AggregatorV3Interface } from "../interfaces/external/AggregatorV3Interface.sol";
import { IPriceFeed } from "../interfaces/external/IPriceFeed.sol";

contract MockPriceFeed is IPriceFeed {
    string public constant override description = "Mock Chainlink price aggregator";

    uint public constant override version = 1;

    uint8 public immutable override decimals;

    address public immutable override underlyingToken;

    address public immutable priceFeed;

    constructor(uint8 decimals_, address underlyingToken_, address priceFeed_) {
        decimals = decimals_;
        underlyingToken = underlyingToken_;
        priceFeed = priceFeed_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        AggregatorV3Interface _priceFeed = AggregatorV3Interface(priceFeed);
        return _priceFeed.latestRoundData();
    }
}
