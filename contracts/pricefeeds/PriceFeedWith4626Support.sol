// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";

/**
 * @title Price feed for ERC4626 assets
 * @notice A custom price feed that calculates the price for an ERC4626 asset
 * @author Compound
 */
contract PriceFeedWith4626Support is IPriceFeed, AccessControl {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Scale of this price feed
    int256 public immutable priceFeedScale;

    /// @notice Number of decimals for the 4626 rate provider
    uint8 internal immutable rateProviderDecimals;

    /// @notice 4626 rate provider
    address public immutable rateProvider;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice Chainlink oracle for the underlying asset
    address public underlyingPriceFeed;

    /// @notice Fallback provider for the underlying asset
    address public fallbackPriceFeed;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /// @notice Combined scale of the two underlying price feeds
    int256 public combinedScale;

    /// @notice Combined scale of the two fallback underlying price feeds
    int256 public fallbackCombinedScale;

    /// @notice Time limit for the primary price feed to be updated
    uint24 public updateTimeLimit;

    /// @notice Time limit for the fallback price feed to be updated
    uint24 public fallbackUpdateTimeLimit;

    /// @notice Number of decimals for the underlying asset
    uint8 internal underlyingDecimals;

    /// @notice Number of decimals for the fallback underlying asset
    uint8 public fallbackUnderlyingDecimals;

    /// @notice Description of the price feed
    string public description;

    /**
     * @notice Emitted when a price feed is set
     * @param priceFeed The address of the price feed to set
     * @param updateTimeLimit The time limit for the price feed to be updated
     * @param isPrimaryPriceFeed Whether the price feed is the primary price feed
     */
    event PriceFeedSet(address indexed priceFeed, uint24 indexed updateTimeLimit, bool isPrimaryPriceFeed);

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /// @notice Reverts when invalid decimals are provided
    error BadDecimals();

    /// @notice Reverts when int256 oveerflow
    error InvalidInt256();

    /// @notice Reverts when update time limit is 0
    error InvalidUpdateTimeLimit();

    /// @notice Reverts when price is not available
    error PriceNotAvailable();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /**
     * @notice Construct a new 4626 price feed
     * @param dao_ The address of the DAO that can set price feeds
     * @param sequencer_ The address of the Chainlink sequencer
     * @param rateProvider_ The address of the 4626 rate provider
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param underlyingToken_ The address of the underlying token
     * @param updateTimeLimit_ The time limit for the primary price feed to be updated
     * @param fallbackUpdateTimeLimit_ The time limit for the fallback price feed to be updated
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     **/
    constructor(
        address dao_,
        address sequencer_,
        address rateProvider_,
        address underlyingPriceFeed_,
        address fallbackPriceFeed_,
        address underlyingToken_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_,
        uint8 decimals_,
        string memory description_
    ) AccessControl(dao_) {
        if (underlyingPriceFeed_ == address(0) || rateProvider_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();
        _validateAndSetSequencer(sequencer_);

        rateProvider = rateProvider_;
        underlyingPriceFeed = underlyingPriceFeed_;
        fallbackPriceFeed = fallbackPriceFeed_;
        decimals = decimals_;
        priceFeedScale = signed256(10 ** decimals);
        underlyingToken = underlyingToken_;
        updateTimeLimit = updateTimeLimit_;
        description = description_;

        rateProviderDecimals = IERC4626(rateProvider_).decimals();

        underlyingDecimals = AggregatorV3Interface(underlyingPriceFeed_).decimals();
        combinedScale = signed256(10 ** (rateProviderDecimals + underlyingDecimals));

        if (fallbackPriceFeed_ != address(0)) {
            fallbackUnderlyingDecimals = AggregatorV3Interface(fallbackPriceFeed_).decimals();
            fallbackCombinedScale = signed256(10 ** (rateProviderDecimals + fallbackUnderlyingDecimals));
            fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
        }

        emit PriceFeedSet(underlyingPriceFeed, updateTimeLimit, true);
        emit PriceFeedSet(fallbackPriceFeed, fallbackUpdateTimeLimit, false);
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
     * @notice Set the price feeds for the underlying asset
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param fallbackPriceFeed_ The address of the fallback price feed to fetch prices from
     * @param updateTimeLimit_ The time limit for the primary price feed to be updated
     * @param fallbackUpdateTimeLimit_ The time limit for the fallback price feed to be updated
     **/
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
        underlyingDecimals = AggregatorV3Interface(underlyingPriceFeed_).decimals();
        combinedScale = signed256(10 ** (rateProviderDecimals + underlyingDecimals));

        if (fallbackPriceFeed_ != address(0)) {
            fallbackUnderlyingDecimals = AggregatorV3Interface(fallbackPriceFeed_).decimals();
            fallbackCombinedScale = signed256(10 ** (rateProviderDecimals + fallbackUnderlyingDecimals));
            fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
            fallbackPriceFeed = fallbackPriceFeed_;
        } else {
            fallbackPriceFeed = address(0);
            fallbackUpdateTimeLimit = 0;
            fallbackUnderlyingDecimals = 0;
            fallbackCombinedScale = 0;
        }

        emit PriceFeedSet(underlyingPriceFeed, updateTimeLimit, true);
        emit PriceFeedSet(fallbackPriceFeed, fallbackUpdateTimeLimit, false);
    }

    /**
     * @notice Get the latest price for the underlying asset
     * @return roundId Round id from the underlying asset price feed
     * @return answer Latest price for the underlying asset
     * @return startedAt Timestamp when the round was started; passed on from the underlying asset price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from the underlying asset price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from the underlying asset price feed
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

        uint256 rate = IERC4626(rateProvider).convertToAssets(10 ** rateProviderDecimals);

        if (rate == 0) revert PriceNotAvailable();

        (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(underlyingPriceFeed).latestRoundData();

        /// @dev If the answer is zero or the update time limit has passed, use the fallback price feed
        if (answer <= 0 || updateTimeLimit < block.timestamp - updatedAt) {
            if (fallbackPriceFeed == address(0)) revert PriceNotAvailable();

            (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(fallbackPriceFeed).latestRoundData();

            if (answer <= 0 || fallbackUpdateTimeLimit < block.timestamp - updatedAt) revert PriceNotAvailable();

            answer = (signed256(rate) * answer * priceFeedScale) / fallbackCombinedScale;
            return (roundId, answer, startedAt, updatedAt, answeredInRound);
        }

        answer = (signed256(rate) * answer * priceFeedScale) / combinedScale;
    }

    /**
     * @notice Convert a uint256 to int256
     * @param n The uint256 number to convert
     **/
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
