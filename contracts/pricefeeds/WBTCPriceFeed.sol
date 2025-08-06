// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";

/**
 * @title WBTC price feed
 * @notice A custom price feed that calculates the price for WBTC / USD
 * @author Compound
 */
contract WBTCPriceFeed is AccessControl, IPriceFeed {
    /** Custom errors **/
    error BadDecimals();
    error InvalidInt256();
    error ZeroUpdateTimeLimit();
    error PriceNotAvailable();

    /// @notice Version of the price feed
    uint public constant override version = 1;

    /// @notice Description of the price feed
    string public constant override description = "Custom price feed for WBTC / USD";

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Chainlink WBTC / BTC price feed
    address public WBTCtoBTCPriceFeed;

    /// @notice Combined scale of the two underlying Chainlink price feeds
    int public combinedScale;

    /// @notice Scale of this price feed
    int public immutable priceFeedScale;

    /// @notice The underlying token
    address public immutable override underlyingToken;

    /// @notice Chainlink BTC / USD price feed
    address public BTCtoUSDPriceFeed;

    address public fallbackBTCtoUSDPriceFeed;

    uint16 public updateTimeLimit;

    uint16 public fallbackUpdateTimeLimit;

    event PriceFeedsSet(
        address indexed WBTCtoBTCPriceFeed,
        address indexed BTCtoUSDPriceFeed,
        address indexed fallbackBTCtoUSDPriceFeed,
        uint16 updateTimeLimit,
        uint16 fallbackUpdateTimeLimit
    );

    /**
     * @notice Construct a new WBTC / USD price feed
     * @param WBTCtoBTCPriceFeed_ The address of the WBTC / BTC price feed to fetch prices from
     * @param BTCtoUSDPriceFeed_ The address of the BTC / USD price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(
        address dao_,
        address WBTCtoBTCPriceFeed_,
        address BTCtoUSDPriceFeed_,
        address fallbackBTCtoUSDPriceFeed_,
        uint16 updateTimeLimit_,
        uint16 fallbackUpdateTimeLimit_,
        uint8 decimals_,
        address underlyingToken_
    ) AccessControl(dao_) {
        if (WBTCtoBTCPriceFeed_ == address(0) || BTCtoUSDPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || fallbackUpdateTimeLimit_ == 0) revert ZeroUpdateTimeLimit();

        WBTCtoBTCPriceFeed = WBTCtoBTCPriceFeed_;
        BTCtoUSDPriceFeed = BTCtoUSDPriceFeed_;
        fallbackBTCtoUSDPriceFeed = fallbackBTCtoUSDPriceFeed_;

        uint8 WBTCToBTCPriceFeedDecimals = AggregatorV3Interface(WBTCtoBTCPriceFeed_).decimals();
        uint8 BTCToUSDPriceFeedDecimals = AggregatorV3Interface(BTCtoUSDPriceFeed_).decimals();

        combinedScale = signed256(10 ** (WBTCToBTCPriceFeedDecimals + BTCToUSDPriceFeedDecimals));

        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();
        decimals = decimals_;
        priceFeedScale = signed256(10 ** decimals);
        underlyingToken = underlyingToken_;
        updateTimeLimit = updateTimeLimit_;
        fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
    }

    function setPriceFeeds(
        address WBTCtoBTCPriceFeed_,
        address BTCtoUSDPriceFeed_,
        address fallbackBTCtoUSDPriceFeed_,
        uint16 updateTimeLimit_,
        uint16 fallbackUpdateTimeLimit_
    ) external onlyAuthorized {
        if (BTCtoUSDPriceFeed_ == address(0) || WBTCtoBTCPriceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || fallbackUpdateTimeLimit_ == 0) revert ZeroUpdateTimeLimit();

        WBTCtoBTCPriceFeed = WBTCtoBTCPriceFeed_;
        BTCtoUSDPriceFeed = BTCtoUSDPriceFeed_;

        uint8 WBTCToBTCPriceFeedDecimals = AggregatorV3Interface(WBTCtoBTCPriceFeed_).decimals();
        uint8 BTCToUSDPriceFeedDecimals = AggregatorV3Interface(BTCtoUSDPriceFeed_).decimals();

        combinedScale = signed256(10 ** (WBTCToBTCPriceFeedDecimals + BTCToUSDPriceFeedDecimals));

        fallbackBTCtoUSDPriceFeed = fallbackBTCtoUSDPriceFeed_;
        updateTimeLimit = updateTimeLimit_;
        fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;

        emit PriceFeedsSet(WBTCtoBTCPriceFeed_, BTCtoUSDPriceFeed_, fallbackBTCtoUSDPriceFeed_, updateTimeLimit_, fallbackUpdateTimeLimit_);
    }

    /**
     * @notice WBTC price for the latest round
     * @return roundId Round id from the BTC / USD price feed
     * @return answer Latest price for WBTC / USD
     * @return startedAt Timestamp when the round was started; passed on from the BTC / USD price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from the BTC / USD price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from the BTC / USD price feed
     **/
    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        (, int256 WBTCToBTCPrice, , , ) = AggregatorV3Interface(WBTCtoBTCPriceFeed).latestRoundData();

        if (WBTCToBTCPrice <= 0) revert PriceNotAvailable();

        (uint80 roundId_, int256 BTCToUSDPrice, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) = AggregatorV3Interface(
            BTCtoUSDPriceFeed
        ).latestRoundData();

        if (BTCToUSDPrice <= 0 || block.timestamp - updatedAt_ > updateTimeLimit) {
            if (fallbackBTCtoUSDPriceFeed == address(0)) revert PriceNotAvailable();

            (roundId_, BTCToUSDPrice, startedAt_, updatedAt_, answeredInRound_) = AggregatorV3Interface(fallbackBTCtoUSDPriceFeed)
                .latestRoundData();

            if (BTCToUSDPrice <= 0 || block.timestamp - updatedAt_ > fallbackUpdateTimeLimit) revert PriceNotAvailable();
        }

        int256 price = (WBTCToBTCPrice * BTCToUSDPrice * priceFeedScale) / combinedScale;
        return (roundId_, price, startedAt_, updatedAt_, answeredInRound_);
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }
}
