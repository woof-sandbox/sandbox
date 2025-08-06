// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../interfaces/AggregatorV3Interface.sol";
import "../interfaces/IPriceFeed.sol";

import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";

/**
 * @title Scaling price feed
 * @notice A custom price feed that scales up or down the price received from an underlying price feed and returns the result
 * @author Compound
 */
contract ScalingPriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint public constant override version = 1;

    /// @notice Description of the price feed
    string public description;

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Underlying price feed where prices are fetched from
    address public underlyingPriceFeed;

    /// @notice Fallback price feed address
    address public fallbackPriceFeed;

    /// @notice Whether or not the price should be upscaled
    bool internal shouldUpscale;

    bool internal shouldUpscaleFallback;

    /// @notice The amount to upscale or downscale the price by
    int256 public rescaleFactor;

    int256 public fallbackRescaleFactor;

    /// @notice The underlying token
    address public immutable override underlyingToken;

    uint16 public updateTimeLimit;
    uint16 public fallbackUpdateTimeLimit;

    event PriceFeedsUpdated(
        address indexed underlyingPriceFeed,
        address indexed fallbackPriceFeed,
        uint16 updateTimeLimit,
        uint16 fallbackUpdateTimeLimit
    );

    /** Custom errors **/
    error InvalidInt256();
    error InvalidUpdateTimeLimit();
    error BadDecimals();
    error PriceNotAvailable();

    /**
     * @notice Construct a new scaling price feed
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(
        address dao_,
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        address underlyingToken_,
        uint16 updateTimeLimit_,
        uint16 fallbackUpdateTimeLimit_,
        uint8 decimals_,
        string memory description_
    ) AccessControl(dao_) {
        if (underlyingPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();

        underlyingPriceFeed = underlyingPriceFeed_;
        fallbackPriceFeed = fallbackPriceFeed_;

        decimals = decimals_;
        description = description_;
        underlyingToken = underlyingToken_;

        updateTimeLimit = updateTimeLimit_;
        fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;

        (rescaleFactor, shouldUpscale) = getRescaleFactor(underlyingPriceFeed);

        if (fallbackPriceFeed != address(0)) (fallbackRescaleFactor, shouldUpscaleFallback) = getRescaleFactor(fallbackPriceFeed);
    }

    function setPriceFeeds(
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        uint16 updateTimeLimit_,
        uint16 fallbackUpdateTimeLimit_
    ) external onlyAuthorized {
        if (underlyingPriceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();

        underlyingPriceFeed = underlyingPriceFeed_;
        updateTimeLimit = updateTimeLimit_;
        fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;

        (rescaleFactor, shouldUpscale) = getRescaleFactor(underlyingPriceFeed_);

        fallbackPriceFeed = fallbackPriceFeed_;
        if (fallbackPriceFeed_ != address(0)) {
            (fallbackRescaleFactor, shouldUpscaleFallback) = getRescaleFactor(fallbackPriceFeed_);
        } else {
            shouldUpscaleFallback = false;
            fallbackRescaleFactor = 0;
        }

        emit PriceFeedsUpdated(underlyingPriceFeed_, fallbackPriceFeed_, updateTimeLimit_, fallbackUpdateTimeLimit_);
    }

    /**
     * @notice Price for the latest round
     * @return roundId Round id from the underlying price feed
     * @return answer Latest price for the asset in terms of ETH
     * @return startedAt Timestamp when the round was started; passed on from underlying price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from underlying price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from underlying price feed
     **/
    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(underlyingPriceFeed).latestRoundData();

        if (answer <= 0 || updateTimeLimit < block.timestamp - updatedAt) {
            if (fallbackPriceFeed == address(0)) revert PriceNotAvailable();

            (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(fallbackPriceFeed).latestRoundData();

            if (answer <= 0 || fallbackUpdateTimeLimit < block.timestamp - updatedAt) revert PriceNotAvailable();

            answer = scalePrice(answer, true);
            return (roundId, answer, startedAt, updatedAt, answeredInRound);
        }

        answer = scalePrice(answer, false);
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    function scalePrice(int256 price, bool isFallback) internal view returns (int256 scaledPrice) {
        if (isFallback) {
            shouldUpscaleFallback ? scaledPrice = price * fallbackRescaleFactor : scaledPrice = price / fallbackRescaleFactor;
        } else {
            shouldUpscale ? scaledPrice = price * rescaleFactor : scaledPrice = price / rescaleFactor;
        }
    }

    function getRescaleFactor(address priceFeed) internal view returns (int256, bool) {
        uint8 priceFeedDecimals = AggregatorV3Interface(priceFeed).decimals();
        bool isUpscale = priceFeedDecimals < decimals ? true : false;
        int256 factor = (isUpscale ? signed256(10 ** (decimals - priceFeedDecimals)) : signed256(10 ** (priceFeedDecimals - decimals)));
        return (factor, isUpscale);
    }
}
