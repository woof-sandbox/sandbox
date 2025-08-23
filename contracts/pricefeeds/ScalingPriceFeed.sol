// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

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
    uint256 public constant override version = 1;

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice The underlying token
    address public immutable override underlyingToken;

    /// @notice Description of the price feed
    string public description;

    /// @notice Underlying price feed where prices are fetched from
    address public underlyingPriceFeed;

    /// @notice Fallback price feed address
    address public fallbackPriceFeed;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /// @notice The amount to upscale or downscale the price by
    int256 public rescaleFactor;

    /// @notice The amount to upscale or downscale the price by for the fallback price feed
    int256 public fallbackRescaleFactor;

    /// @notice Update time limit for the underlying price feed
    uint24 public updateTimeLimit;

    /// @notice Update time limit for the fallback price feed
    uint24 public fallbackUpdateTimeLimit;

    /// @notice Whether or not the price should be upscaled
    bool internal shouldUpscale;

    /// @notice Whether or not the fallback price should be upscaled
    bool internal shouldUpscaleFallback;

    /**
     * @notice Emitted when the price feeds are updated
     * @param underlyingPriceFeed The address of the underlying price feed
     * @param fallbackPriceFeed The address of the fallback price feed
     * @param updateTimeLimit The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit The update time limit for the fallback price feed
     */
    event PriceFeedsUpdated(
        address indexed underlyingPriceFeed,
        address indexed fallbackPriceFeed,
        uint24 updateTimeLimit,
        uint24 fallbackUpdateTimeLimit
    );

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /// @notice Reverts if the update time limit is invalid.
    error InvalidUpdateTimeLimit();

    /// @notice Reverts if the uint256 value is over the int256 max value
    error InvalidInt256();

    /// @notice Reverts if the decimals are greater than 18 or equal to 0
    error BadDecimals();

    /// @notice Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /// @notice Reverts if the price is not available
    error PriceNotAvailable();

    /**
     * @notice Construct a new scaling price feed
     * @param dao_ The address of the DAO
     * @param sequencer_ The address of the Chainlink sequencer
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param underlyingToken_ The address of the underlying token
     * @param updateTimeLimit_ The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit_ The update time limit for the fallback price feed
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     **/
    constructor(
        address dao_,
        address sequencer_,
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        address underlyingToken_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_,
        uint8 decimals_,
        string memory description_
    ) AccessControl(dao_) {
        if (underlyingPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();
        _validateAndSetSequencer(sequencer_);

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

    /**
     * @notice Sets the sequencer address.
     * @param _sequencer The address of the new sequencer.
     * @notice Available only to the DAO.
     */
    function setSequencer(address _sequencer) external onlyDao {
        _validateAndSetSequencer(_sequencer);
    }

    /**
     * @notice Set the price feeds for the contract
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit_ The update time limit for the fallback price feed
     */
    function setPriceFeeds(
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_
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
        if (sequencer != address(0)) {
            (, answer, , , ) = AggregatorV3Interface(sequencer).latestRoundData();
            if (answer == 1) revert PriceNotAvailable();
        }

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

    /**
     * @notice Converts an unsigned integer to a signed integer
     * @param n The unsigned integer to convert to signed
     */
    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    /**
     * @notice Scales the price based on the rescale factor
     * @param price The price to scale
     * @param isFallback Whether the price is from the fallback price feed
     * @return scaledPrice The scaled price
     */
    function scalePrice(int256 price, bool isFallback) internal view returns (int256 scaledPrice) {
        if (isFallback) {
            shouldUpscaleFallback ? scaledPrice = price * fallbackRescaleFactor : scaledPrice = price / fallbackRescaleFactor;
        } else {
            shouldUpscale ? scaledPrice = price * rescaleFactor : scaledPrice = price / rescaleFactor;
        }
    }

    /**
     * @notice Gets the rescale factor for the price feed
     * @param priceFeed The address of the price feed to get the rescale factor for
     * @return factor The rescale factor
     * @return isUpscale Whether the price feed is being upscaled
     */
    function getRescaleFactor(address priceFeed) internal view returns (int256, bool) {
        uint8 priceFeedDecimals = AggregatorV3Interface(priceFeed).decimals();
        bool isUpscale = priceFeedDecimals < decimals ? true : false;
        int256 factor = (isUpscale ? signed256(10 ** (decimals - priceFeedDecimals)) : signed256(10 ** (priceFeedDecimals - decimals)));
        return (factor, isUpscale);
    }

    /**
     * @notice Validates and sets the sequencer address.
     * @notice Emits a SequencerUpdated event.
     * @param _sequencer The address of the new sequencer.
     */
    function _validateAndSetSequencer(address _sequencer) internal {
        if ((block.chainid != 1 && _sequencer == address(0)) || _sequencer == sequencer) revert InvalidSequencer();

        sequencer = _sequencer;

        emit SequencerUpdated(_sequencer);
    }
}
