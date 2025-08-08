// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";

/**
 * @title Reverse multiplicative price feed
 * @notice A custom price feed that multiplies the price from one price feed and the inverse price from another price feed
 * and returns the result
 * @dev for example if we need tokenX to eth, but there is only tokenX to usd, we can use this price feed to get tokenX to eth:
 * tokenX to usd * reversed(eth to usd)
 * @author Compound
 */
contract ReverseMultiplicativePriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Description of the price feed
    string public description;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice Chainlink price feed A
    address public priceFeedA;

    /// @notice Chainlink price feed B
    address public priceFeedB;

    /// @notice Fallback price feed A
    address public fallbackPriceFeedA;

    /// @notice Fallback price feed B
    address public fallbackPriceFeedB;

    /// @notice Price feed A scale
    int256 public priceFeedAScale;

    /// @notice Price feed B scale
    int256 public priceFeedBScale;

    /// @notice Fallback scale for price feed A
    int256 public fallbackPriceFeedAScale;

    /// @notice Fallback scale for price feed B
    int256 public fallbackPriceFeedBScale;

    /// @notice Scale of this price feed
    int256 public priceFeedScale;

    /// @notice Update time limit for price feed A
    uint16 public updateTimeLimitA;

    /// @notice Update time limit for price feed B
    uint16 public updateTimeLimitB;

    /// @notice Update time limit for fallback price feed A
    uint16 public updateTimeLimitFallbackA;

    /// @notice Update time limit for fallback price feed B
    uint16 public updateTimeLimitFallbackB;

    /**
     * @notice Emitted when a price feed is set
     * @param priceFeed The address of the price feed to fetch prices from
     * @param priceFeedScale The scale of the price feed
     * @param updateTimeLimit The update time limit for the price feed
     * @param isPriceFeedA Whether the price feed is price feed A
     */
    event PriceFeedSet(address indexed priceFeed, int256 priceFeedScale, uint16 updateTimeLimit, bool isPriceFeedA);

    /**
     * @notice Emitted when a fallback price feed is set
     * @param fallbackPriceFeed The address of the fallback price feed to fetch prices from
     * @param updateTimeLimit The update time limit for the fallback price feed
     * @param fallbackPriceFeedScale The scale of the fallback price feed
     * @param isPriceFeedA Whether the fallback price feed is for price feed A
     */
    event FallbackPriceFeedSet(address indexed fallbackPriceFeed, int256 fallbackPriceFeedScale, uint16 updateTimeLimit, bool isPriceFeedA);

    /// @notice reverts when bad decimals are provided
    error BadDecimals();

    /// @notice reverts when an invalid int256 is encountered
    error InvalidInt256();

    /// @notice reverts when a zero address is provided
    error BadUpdateTimeLimit();

    /// @notice reverts when a price can not be fetched or calculated
    error PriceNotAvailable();

    /**
     * @notice Construct a new reverse multiplicative price feed
     * @param dao_ The address of the DAO that controls this price feed
     * @param priceFeedA_ The address of the first price feed to fetch prices from
     * @param priceFeedB_ The address of the second price feed to fetch prices from
     * @param fallbackPriceFeedA_ The address of the fallback price feed for price feed A
     * @param fallbackPriceFeedB_ The address of the fallback price feed for price feed B
     * @param underlyingToken_ The address of the underlying token for which this price feed provides prices
     * @param updateTimeLimitA_ The update time limit for price feed A
     * @param updateTimeLimitB_ The update time limit for price feed B
     * @param updateTimeLimitFallbackA_ The update time limit for fallback price feed A
     * @param updateTimeLimitFallbackB_ The update time limit for fallback price feed B
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ A description of the price feed
     */
    constructor(
        address dao_,
        address priceFeedA_,
        address priceFeedB_,
        address fallbackPriceFeedA_,
        address fallbackPriceFeedB_,
        address underlyingToken_,
        uint16 updateTimeLimitA_,
        uint16 updateTimeLimitB_,
        uint16 updateTimeLimitFallbackA_,
        uint16 updateTimeLimitFallbackB_,
        uint8 decimals_,
        string memory description_
    ) AccessControl(dao_) {
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();

        _validateAndSetPriceFeed(priceFeedA_, updateTimeLimitA_, true);
        _validateAndSetPriceFeed(priceFeedB_, updateTimeLimitB_, false);
        _validateAndSetFallbackPriceFeed(fallbackPriceFeedA_, updateTimeLimitFallbackA_, true);
        _validateAndSetFallbackPriceFeed(fallbackPriceFeedB_, updateTimeLimitFallbackB_, false);

        decimals = decimals_;
        description = description_;
        priceFeedScale = signed256(10 ** decimals);
        underlyingToken = underlyingToken_;
    }

    /**
     * @notice Sets the price feeds and their fallback price feeds
     * @param priceFeedA_ The address of the first price feed to fetch prices from
     * @param priceFeedB_ The address of the second price feed to fetch prices from
     * @param fallbackPriceFeedA_ The address of the fallback price feed for price feed A
     * @param fallbackPriceFeedB_ The address of the fallback price feed for price feed B
     * @param updateTimeLimitA_ The update time limit for price feed A
     * @param updateTimeLimitB_ The update time limit for price feed B
     * @param updateTimeLimitFallbackA_ The update time limit for fallback price feed A
     * @param updateTimeLimitFallbackB_ The update time limit for fallback price feed B
     * @dev Only callable by the authorized
     */
    function setPriceFeeds(
        address priceFeedA_,
        address priceFeedB_,
        address fallbackPriceFeedA_,
        address fallbackPriceFeedB_,
        uint16 updateTimeLimitA_,
        uint16 updateTimeLimitB_,
        uint16 updateTimeLimitFallbackA_,
        uint16 updateTimeLimitFallbackB_
    ) external onlyAuthorized {
        _validateAndSetPriceFeed(priceFeedA_, updateTimeLimitA_, true);
        _validateAndSetPriceFeed(priceFeedB_, updateTimeLimitB_, false);
        _validateAndSetFallbackPriceFeed(fallbackPriceFeedA_, updateTimeLimitFallbackA_, true);
        _validateAndSetFallbackPriceFeed(fallbackPriceFeedB_, updateTimeLimitFallbackB_, false);
    }

    /**
     * @notice Calculates the latest round data using data from the two price feeds
     * @return roundId Round id from price feed B
     * @return answer Latest price
     * @return startedAt Timestamp when the round was started; passed on from price feed B
     * @return updatedAt Timestamp when the round was last updated; passed on from price feed B
     * @return answeredInRound Round id in which the answer was computed; passed on from price feed B
     * @dev Note: Only the `answer` really matters for downstream contracts that use this price feed (e.g. Comet)
     **/
    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        int256 priceFeedScaleA = priceFeedAScale;
        int256 priceFeedScaleB = priceFeedBScale;

        (, int256 priceA, , uint256 updatedAtA, ) = AggregatorV3Interface(priceFeedA).latestRoundData();

        if (priceA <= 0 || block.timestamp - updatedAtA > updateTimeLimitA) {
            if (fallbackPriceFeedA == address(0)) revert PriceNotAvailable();

            (, priceA, , updatedAtA, ) = AggregatorV3Interface(fallbackPriceFeedA).latestRoundData();

            if (priceA <= 0 || block.timestamp - updatedAtA > updateTimeLimitFallbackA) revert PriceNotAvailable();
            priceFeedScaleA = fallbackPriceFeedAScale;
        }

        (uint80 roundId_, int256 priceB, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) = AggregatorV3Interface(
            priceFeedB
        ).latestRoundData();

        if (priceB <= 0 || block.timestamp - updatedAt_ > updateTimeLimitB) {
            if (fallbackPriceFeedB == address(0)) revert PriceNotAvailable();

            (roundId_, priceB, startedAt_, updatedAt_, answeredInRound_) = AggregatorV3Interface(fallbackPriceFeedB).latestRoundData();

            if (priceB <= 0 || block.timestamp - updatedAt_ > updateTimeLimitFallbackB) revert PriceNotAvailable();
            priceFeedScaleB = fallbackPriceFeedBScale;
        }

        int256 price = (priceA * priceFeedScaleB * priceFeedScale) / priceB / priceFeedScaleA;
        return (roundId_, price, startedAt_, updatedAt_, answeredInRound_);
    }

    /**
     * @notice Converts an unsigned integer to a signed integer
     * @param n The unsigned integer to convert to signed
     */
    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    /**
     * @notice Validates and sets the price feed
     * @param priceFeed_ The address of the price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the price feed
     * @param isPriceFeedA Whether the price feed is for price feed A
     */
    function _validateAndSetPriceFeed(address priceFeed_, uint16 updateTimeLimit_, bool isPriceFeedA) internal {
        if (priceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0) revert BadUpdateTimeLimit();

        uint8 priceFeedDecimals = AggregatorV3Interface(priceFeed_).decimals();
        int256 priceFeedScale_ = signed256(10 ** priceFeedDecimals);

        if (isPriceFeedA) {
            priceFeedA = priceFeed_;
            priceFeedAScale = priceFeedScale_;
            updateTimeLimitA = updateTimeLimit_;
        } else {
            priceFeedB = priceFeed_;
            priceFeedBScale = priceFeedScale_;
            updateTimeLimitB = updateTimeLimit_;
        }

        emit PriceFeedSet(priceFeed_, priceFeedScale_, updateTimeLimit_, isPriceFeedA);
    }

    /**
     * @notice Validates and sets the fallback price feed
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the fallback price feed
     * @param isPriceFeedA Whether the fallback price feed is for price feed A
     */
    function _validateAndSetFallbackPriceFeed(address fallbackPriceFeed_, uint16 updateTimeLimit_, bool isPriceFeedA) internal {
        if (fallbackPriceFeed_ == address(0)) {
            if (isPriceFeedA) {
                fallbackPriceFeedA = address(0);
                fallbackPriceFeedAScale = 0;
                updateTimeLimitFallbackA = 0;
            } else {
                fallbackPriceFeedB = address(0);
                fallbackPriceFeedBScale = 0;
                updateTimeLimitFallbackB = 0;
            }
            emit FallbackPriceFeedSet(address(0), 0, 0, isPriceFeedA);
            return;
        }

        if (updateTimeLimit_ == 0) revert BadUpdateTimeLimit();

        uint8 fallbackPriceFeedDecimals = AggregatorV3Interface(fallbackPriceFeed_).decimals();
        int256 fallbackPriceFeedScale_ = signed256(10 ** fallbackPriceFeedDecimals);

        if (isPriceFeedA) {
            fallbackPriceFeedA = fallbackPriceFeed_;
            fallbackPriceFeedAScale = fallbackPriceFeedScale_;
            updateTimeLimitFallbackA = updateTimeLimit_;
        } else {
            fallbackPriceFeedB = fallbackPriceFeed_;
            fallbackPriceFeedBScale = fallbackPriceFeedScale_;
            updateTimeLimitFallbackB = updateTimeLimit_;
        }

        emit FallbackPriceFeedSet(fallbackPriceFeed_, fallbackPriceFeedScale_, updateTimeLimit_, isPriceFeedA);
    }
}
