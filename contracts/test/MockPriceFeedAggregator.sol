// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../interfaces/AggregatorV3Interface.sol";
import "../interfaces/IPriceFeed.sol";

contract MockPriceFeedAggregator is IPriceFeed {
    string public constant override description = "Mock Chainlink price aggregator";

    uint public constant override version = 1;

    uint8 public immutable override decimals;

    address public immutable override underlyingToken;

    AggregatorV3Interface public immutable priceFeed;

    constructor(uint8 decimals_, address underlyingToken_, address priceFeed_) {
        decimals = decimals_;
        underlyingToken = underlyingToken_;
        priceFeed = AggregatorV3Interface(priceFeed_);
    }

    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = priceFeed.latestRoundData();
        updatedAt = block.timestamp;
    }
}
