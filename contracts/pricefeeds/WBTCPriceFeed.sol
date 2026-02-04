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
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Description of the price feed
    string public constant description = "Custom price feed for WBTC / USD";

    /// @notice Scale of this price feed
    int256 public immutable priceFeedScale;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The underlying token
    address public immutable override underlyingToken;

    /// @notice Combined scale of the two underlying Chainlink price feeds
    int256 public combinedScale;

    /// @notice Chainlink WBTC / BTC price feed
    address public WBTCtoBTCPriceFeed;

    /// @notice Update time limit for the underlying price feed
    uint24 public updateTimeLimit;

    /// @notice Chainlink BTC / USD price feed
    address public BTCtoUSDPriceFeed;

    /// @notice Update time limit for the fallback price feed
    uint24 public fallbackUpdateTimeLimit;

    /// @notice Fallback Chainlink BTC / USD price feed
    address public fallbackBTCtoUSDPriceFeed;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /**
     * @notice Set the price feeds and update time limits
     * @param WBTCtoBTCPriceFeed The address of the WBTC / BTC price feed
     * @param BTCtoUSDPriceFeed The address of the BTC / USD price feed
     * @param fallbackBTCtoUSDPriceFeed The address of the fallback BTC / USD price feed
     * @param updateTimeLimit The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit The update time limit for the fallback price feed
     */
    event PriceFeedsSet(
        address indexed WBTCtoBTCPriceFeed,
        address indexed BTCtoUSDPriceFeed,
        address indexed fallbackBTCtoUSDPriceFeed,
        uint24 updateTimeLimit,
        uint24 fallbackUpdateTimeLimit
    );

    /// @notice Reverts when bad decimals are provided
    error BadDecimals();

    /// @notice Reverts when int256 overflows during signing
    error InvalidInt256();

    /// @notice Reverts when zero update time limit is provided
    error ZeroUpdateTimeLimit();

    /// @notice Reverts when price is not available
    error PriceNotAvailable();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /**
     * @notice Construct a new WBTC / USD price feed
     * @param dao_ The address of the DAO
     * @param sequencer_ The address of the sequencer
     * @param WBTCtoBTCPriceFeed_ The address of the WBTC / BTC price feed to fetch prices from
     * @param BTCtoUSDPriceFeed_ The address of the BTC / USD price feed to fetch prices from
     * @param fallbackBTCtoUSDPriceFeed_ The address of the fallback BTC / USD price feed to fetch prices from
     * @param updateTimeLimit_ The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit_ The update time limit for the fallback price feed
     * @param decimals_ The number of decimals for the returned prices
     * @param underlyingToken_ The address of the underlying token
     */
    constructor(
        address dao_,
        address sequencer_,
        address WBTCtoBTCPriceFeed_,
        address BTCtoUSDPriceFeed_,
        address fallbackBTCtoUSDPriceFeed_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_,
        uint8 decimals_,
        address underlyingToken_
    ) AccessControl(dao_) {
        if (WBTCtoBTCPriceFeed_ == address(0) || BTCtoUSDPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || fallbackUpdateTimeLimit_ == 0) revert ZeroUpdateTimeLimit();

        _validateAndSetSequencer(sequencer_);

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

    /**
     * @notice Sets the sequencer address.
     * @param _sequencer The address of the new sequencer.
     * @notice Available only to the DAO.
     */
    function setSequencer(address _sequencer) external onlyDao {
        _validateAndSetSequencer(_sequencer);
    }

    /**
     * @notice Set the price feeds and update time limits
     * @param WBTCtoBTCPriceFeed_ The address of the WBTC / BTC price feed
     * @param BTCtoUSDPriceFeed_ The address of the BTC / USD price feed
     * @param fallbackBTCtoUSDPriceFeed_ The address of the fallback BTC / USD price feed
     * @param updateTimeLimit_ The update time limit for the underlying price feed
     * @param fallbackUpdateTimeLimit_ The update time limit for the fallback price feed
     */
    function setPriceFeeds(
        address WBTCtoBTCPriceFeed_,
        address BTCtoUSDPriceFeed_,
        address fallbackBTCtoUSDPriceFeed_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_
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
        if (sequencer != address(0)) {
            (, int256 answer, , , ) = AggregatorV3Interface(sequencer).latestRoundData();
            if (answer == 1) revert PriceNotAvailable();
        }

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

    /**
     * @notice Converts an unsigned integer to a signed integer
     * @param n The unsigned integer to convert to signed
     */
    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
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
