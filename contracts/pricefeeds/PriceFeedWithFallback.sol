// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";

contract PriceFeedWithFallback is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /// @notice The primary price feed address
    address public underlyingPriceFeed;

    /// @notice The fallback price feed address
    address public fallbackPriceFeed;

    /// @notice The maximum allowed time (in seconds) between price updates for the primary feed
    uint24 public updateTimeLimit;

    /// @notice The maximum allowed time (in seconds) between price updates for the fallback feed
    uint24 public fallbackUpdateTimeLimit;

    /// @notice Description of the price feed
    string public description;

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /**
     * @notice Emitted when the price feeds are updated.
     * @param priceFeed The address of the price feed.
     * @param updateTimeLimit The maximum allowed time (in seconds) between price updates.
     * @param isPrimary Whether the price feed is primary or fallback.
     */
    event PriceFeedsUpdated(address indexed priceFeed, uint24 updateTimeLimit, bool isPrimary);

    /// @dev Reverts if the update time limit is zero.
    error InvalidUpdateTimeLimit();

    /// @dev Reverts if the decimals are invalid.
    error BadDecimals();

    /// @dev Reverts if the price is not available.
    error PriceNotAvailable();

    /// @dev Reverts if the decimals do not match from price feeds.
    error DecimalsNotMatched();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /**
     * @notice Initializes the price feed contract.
     * @param _dao The address of the DAO.
     * @param _sequencer The address of the sequencer.
     * @param _underlyingToken The address of the underlying token.
     * @param _underlyingPriceFeed The address of the underlying price feed.
     * @param _fallbackPriceFeed The address of the fallback price feed.
     * @param _updateTimeLimit The maximum allowed time (in seconds) between price updates for the primary feed.
     * @param _fallbackUpdateTimeLimit The maximum allowed time (in seconds) between price updates for the fallback feed.
     * @param _decimals The number of decimals for the price feed.
     * @param _description The description of the price feed.
     */
    constructor(
        address _dao,
        address _sequencer,
        address _underlyingToken,
        address _underlyingPriceFeed,
        address _fallbackPriceFeed,
        uint24 _updateTimeLimit,
        uint24 _fallbackUpdateTimeLimit,
        uint8 _decimals,
        string memory _description
    ) AccessControl(_dao) {
        if (_underlyingToken == address(0)) revert ZeroAddress();
        if (_decimals == 0 || _decimals > 18) revert BadDecimals();

        decimals = _decimals;
        underlyingToken = _underlyingToken;
        description = _description;

        _validateAndSetSequencer(_sequencer);
        _validateAndSetPriceFeed(_underlyingPriceFeed, _updateTimeLimit);
        _validateAndSetFallbackPriceFeed(_fallbackPriceFeed, _fallbackUpdateTimeLimit);
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
     * @notice Sets the price feeds.
     * @param underlyingPriceFeed_ The address of the underlying price feed.
     * @param fallbackPriceFeed_ The address of the fallback price feed.
     * @param updateTimeLimit_ The maximum allowed time (in seconds) between price updates for the primary feed.
     * @param fallbackUpdateTimeLimit_ The maximum allowed time (in seconds) between price updates for the fallback feed.
     * @notice Available only to the authorized users.
     */
    function setPriceFeeds(
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_
    ) external onlyAuthorized {
        _validateAndSetPriceFeed(underlyingPriceFeed_, updateTimeLimit_);
        _validateAndSetFallbackPriceFeed(fallbackPriceFeed_, fallbackUpdateTimeLimit_);
    }

    /**
     * @notice WBTC price for the latest round
     * @return roundId Round id from the BTC / USD price feed
     * @return answer Latest price for WBTC / USD
     * @return startedAt Timestamp when the round was started; passed on from the BTC / USD price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from the BTC / USD price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from the BTC / USD price feed
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

            return (roundId, answer, startedAt, updatedAt, answeredInRound);
        }
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

    /**
     * @notice Validates and sets the price feed address and update time limit.
     * @notice Emits a PriceFeedsUpdated event.
     * @param priceFeed_ The address of the price feed.
     * @param updateTimeLimit_ The maximum allowed time (in seconds) between price updates.
     */
    function _validateAndSetPriceFeed(address priceFeed_, uint24 updateTimeLimit_) internal {
        if (priceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0) revert InvalidUpdateTimeLimit();

        uint8 decimalsPriceFeed = AggregatorV3Interface(priceFeed_).decimals();
        if (decimalsPriceFeed != decimals) revert DecimalsNotMatched();

        underlyingPriceFeed = priceFeed_;
        updateTimeLimit = updateTimeLimit_;

        emit PriceFeedsUpdated(underlyingPriceFeed, updateTimeLimit, true);
    }

    /**
     * @notice Validates and sets the fallback price feed address and update time limit.
     * @notice Emits a PriceFeedsUpdated event.
     * @param fallbackPriceFeed_ The address of the fallback price feed.
     * @param fallbackUpdateTimeLimit_ The maximum allowed time (in seconds) between price updates for the fallback feed.
     */
    function _validateAndSetFallbackPriceFeed(address fallbackPriceFeed_, uint24 fallbackUpdateTimeLimit_) internal {
        if (fallbackPriceFeed_ != address(0)) {
            if (fallbackUpdateTimeLimit_ == 0) revert InvalidUpdateTimeLimit();

            uint8 decimalsFallbackPriceFeed = AggregatorV3Interface(fallbackPriceFeed_).decimals();
            if (decimalsFallbackPriceFeed != decimals) revert DecimalsNotMatched();

            fallbackPriceFeed = fallbackPriceFeed_;
            fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
        } else {
            fallbackPriceFeed = address(0);
            fallbackUpdateTimeLimit = 0;
        }

        emit PriceFeedsUpdated(fallbackPriceFeed, fallbackUpdateTimeLimit, false);
    }
}
