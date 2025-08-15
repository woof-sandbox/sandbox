// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";

/**
 * @title Multiplicative price feed
 * @notice A custom price feed that multiplies the prices from two price feeds and returns the result
 * @author Compound
 */
contract MultiplicativePriceFeed is IPriceFeed, AccessControl {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice Scale of this price feed
    int256 public immutable priceFeedScale;

    /// @notice Description of the price feed
    string public description;

    /// @notice Chainlink price feed A
    address public priceFeedA;

    /// @notice Chainlink price feed B
    address public priceFeedB;

    /// @notice Fallback price feed A
    address public fallbackPriceFeedA;

    /// @notice Fallback price feed B
    address public fallbackPriceFeedB;

    /// @notice Update time limit for price feed A
    uint24 public updateTimeLimitA;

    /// @notice Update time limit for price feed B
    uint24 public updateTimeLimitB;

    /// @notice Update time limit for fallback price feed A
    uint24 public updateTimeLimitFallbackA;

    /// @notice Update time limit for fallback price feed B
    uint24 public updateTimeLimitFallbackB;

    /// @notice Decimals of price feed A
    uint8 public priceFeedADecimals;

    /// @notice Decimals of price feed B
    uint8 public priceFeedBDecimals;

    /// @notice Decimals of fallback price feed A
    uint8 public fallbackPriceFeedADecimals;

    /// @notice Decimals of fallback price feed B
    uint8 public fallbackPriceFeedBDecimals;

    /**
     * @notice Emitted when a price feed is set
     * @param priceFeed The address of the price feed to fetch prices from
     * @param priceFeedDecimals The decimals of the price feed
     * @param updateTimeLimit The update time limit for the price feed
     * @param isPriceFeedA Whether the price feed is price feed A
     */
    event PriceFeedSet(address indexed priceFeed, uint8 priceFeedDecimals, uint24 updateTimeLimit, bool isPriceFeedA);

    /**
     * @notice Emitted when a fallback price feed is set
     * @param fallbackPriceFeed The address of the fallback price feed to fetch prices from
     * @param fallbackPriceFeedDecimals The decimals of the fallback price feed
     * @param updateTimeLimit The update time limit for the fallback price feed
     * @param isPriceFeedA Whether the fallback price feed is for price feed A
     */
    event FallbackPriceFeedSet(
        address indexed fallbackPriceFeed,
        uint8 fallbackPriceFeedDecimals,
        uint24 updateTimeLimit,
        bool isPriceFeedA
    );

    /// @notice reverts when bad decimals are provided
    error BadDecimals();

    /// @notice reverts when an invalid int256 is encountered
    error InvalidInt256();

    /// @notice reverts when a zero address is provided
    error BadUpdateTimeLimit();

    /// @notice reverts when a price can not be fetched or calculated
    error PriceNotAvailable();

    /**
     * @notice Construct a new multiplicative price feed
     * @param dao_ The address of the DAO that controls this price feed
     * @param priceFeedA_ The address of the first price feed to fetch prices from
     * @param priceFeedB_ The address of the second price feed to fetch prices from
     * @param fallbackPriceFeedA_ The address of the fallback price feed for price feed A
     * @param fallbackPriceFeedB_ The address of the fallback price feed for price feed B
     * @param underlyingToken_ The address of the underlying token
     * @param updateTimeLimitA_ The update time limit for price feed A
     * @param updateTimeLimitB_ The update time limit for price feed B
     * @param updateTimeLimitFallbackA_ The update time limit for fallback price feed A
     * @param updateTimeLimitFallbackB_ The update time limit for fallback price feed B
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     */
    constructor(
        address dao_,
        address priceFeedA_,
        address priceFeedB_,
        address fallbackPriceFeedA_,
        address fallbackPriceFeedB_,
        address underlyingToken_,
        uint24 updateTimeLimitA_,
        uint24 updateTimeLimitB_,
        uint24 updateTimeLimitFallbackA_,
        uint24 updateTimeLimitFallbackB_,
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
     * @notice Sets the price feeds and their update time limits
     * @param priceFeedA_ The address of the first price feed to fetch prices from
     * @param priceFeedB_ The address of the second price feed to fetch prices from
     * @param fallbackPriceFeedA_ The address of the fallback price feed for price feed A
     * @param fallbackPriceFeedB_ The address of the fallback price feed for price feed B
     * @param updateTimeLimitA_ Update time limit for price feed A
     * @param updateTimeLimitB_ Update time limit for price feed B
     * @param updateTimeLimitFallbackA_ Update time limit for fallback price feed A
     * @param updateTimeLimitFallbackB_ Update time limit for fallback price feed B
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
        uint8 priceFeedADecimals_ = priceFeedADecimals;
        uint8 priceFeedBDecimals_ = priceFeedBDecimals;

        (, int256 priceA, , uint256 updatedAtA, ) = AggregatorV3Interface(priceFeedA).latestRoundData();

        if (priceA <= 0 || block.timestamp - updatedAtA > updateTimeLimitA) {
            if (fallbackPriceFeedA == address(0)) revert PriceNotAvailable();

            (, priceA, , updatedAtA, ) = AggregatorV3Interface(fallbackPriceFeedA).latestRoundData();

            if (priceA <= 0 || block.timestamp - updatedAtA > updateTimeLimitFallbackA) revert PriceNotAvailable();

            priceFeedADecimals_ = fallbackPriceFeedADecimals;
        }

        (uint80 roundId_, int256 priceB, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) = AggregatorV3Interface(
            priceFeedB
        ).latestRoundData();

        if (priceB <= 0 || block.timestamp - updatedAt_ > updateTimeLimitB) {
            if (fallbackPriceFeedB == address(0)) revert PriceNotAvailable();

            (roundId_, priceB, startedAt_, updatedAt_, answeredInRound_) = AggregatorV3Interface(fallbackPriceFeedB).latestRoundData();

            if (priceB <= 0 || block.timestamp - updatedAt_ > updateTimeLimitFallbackB) revert PriceNotAvailable();
            priceFeedBDecimals_ = fallbackPriceFeedBDecimals;
        }

        int256 combinedScale = signed256(10 ** (priceFeedADecimals_ + priceFeedBDecimals_));
        int256 price = (priceA * priceB * priceFeedScale) / combinedScale;
        return (roundId_, price, startedAt_, updatedAt_, answeredInRound_);
    }

    /**
     * @notice Converts a uint256 to int256
     * @dev Reverts if the uint256 is greater than the maximum value of int256
     * @param n The number to convert to int256
     */
    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    /**
     * @notice Validates and sets the price feed and its update time limit
     * @param priceFeed_ The address of the price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the price feed
     * @param isPriceFeedA Whether the price feed is price feed A
     * @dev Reverts if the price feed address is zero or the update time limit is zero
     * @dev Emits a PriceFeedSet event when the price feed is set
     */
    function _validateAndSetPriceFeed(address priceFeed_, uint24 updateTimeLimit_, bool isPriceFeedA) internal {
        if (priceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0) revert BadUpdateTimeLimit();

        uint8 priceFeedDecimals = AggregatorV3Interface(priceFeed_).decimals();

        if (isPriceFeedA) {
            priceFeedA = priceFeed_;
            priceFeedADecimals = priceFeedDecimals;
            updateTimeLimitA = updateTimeLimit_;
        } else {
            priceFeedB = priceFeed_;
            priceFeedBDecimals = priceFeedDecimals;
            updateTimeLimitB = updateTimeLimit_;
        }

        emit PriceFeedSet(priceFeed_, priceFeedDecimals, updateTimeLimit_, isPriceFeedA);
    }

    /**
     * @notice Validates and sets the fallback price feed and its update time limit
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the fallback price feed
     * @param isPriceFeedA Whether the fallback price feed is for price feed A
     * @dev Reverts if the fallback price feed address is zero or the update time limit is zero
     * @dev Emits a FallbackPriceFeedSet event when the fallback price feed is set
     */
    function _validateAndSetFallbackPriceFeed(address fallbackPriceFeed_, uint24 updateTimeLimit_, bool isPriceFeedA) internal {
        if (fallbackPriceFeed_ == address(0)) {
            if (isPriceFeedA) {
                fallbackPriceFeedA = address(0);
                fallbackPriceFeedADecimals = 0;
                updateTimeLimitFallbackA = 0;
            } else {
                fallbackPriceFeedB = address(0);
                fallbackPriceFeedBDecimals = 0;
                updateTimeLimitFallbackB = 0;
            }

            emit FallbackPriceFeedSet(address(0), 0, 0, isPriceFeedA);
            return;
        }

        if (updateTimeLimit_ == 0) revert BadUpdateTimeLimit();

        uint8 fallbackPriceFeedDecimals = AggregatorV3Interface(fallbackPriceFeed_).decimals();

        if (isPriceFeedA) {
            fallbackPriceFeedA = fallbackPriceFeed_;
            fallbackPriceFeedADecimals = fallbackPriceFeedDecimals;
            updateTimeLimitFallbackA = updateTimeLimit_;
        } else {
            fallbackPriceFeedB = fallbackPriceFeed_;
            fallbackPriceFeedBDecimals = fallbackPriceFeedDecimals;
            updateTimeLimitFallbackB = updateTimeLimit_;
        }

        emit FallbackPriceFeedSet(fallbackPriceFeed_, fallbackPriceFeedDecimals, updateTimeLimit_, isPriceFeedA);
    }
}
