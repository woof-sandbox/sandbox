// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { IWstETH } from "contracts/interfaces/IWstETH.sol";

/**
 * @title wstETH price feed
 * @notice A custom price feed that calculates the price for wstETH / ETH
 * @author Compound
 */
contract WstETHPriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant override version = 1;

    /// @notice Description of the price feed
    string public constant override description = "Custom price feed for wstETH / ETH";

    /// @notice The underlying token
    /// @notice wstETH contract address
    address public immutable override underlyingToken;

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Scale for WstETH contract
    int256 public immutable wstETHScale;

    /// @notice Number of decimals for the stETH / ETH price feed
    uint256 public immutable stETHToETHPriceFeedDecimals;

    /// @notice Chainlink stETH / ETH price feed
    address public stETHtoETHPriceFeed;

    /// @notice Fallback price feed address when stETH / ETH price feed is not working properly
    address public fallbackPriceFeed;

    /// @notice The time limit for the price feed update
    /// @notice If the price feed is not updated within this time limit, it will fallback to the fallback price feed
    uint24 public updateTimeLimit;

    /// @notice The time limit for the fallback price feed update
    /// @notice If the fallback price feed is not updated within this time limit, it will
    uint24 public fallbackUpdateTimeLimit;

    /// @notice Emitted when the price feeds are set
    /// @param stETHtoETHPriceFeed The address of the stETH / ETH price feed
    /// @param fallbackPriceFeed The address of the fallback price feed
    /// @param updateTimeLimit The time limit for the price feed update
    /// @param fallbackUpdateTimeLimit The time limit for the fallback price feed update
    event PriceFeedsSet(
        address indexed stETHtoETHPriceFeed,
        address indexed fallbackPriceFeed,
        uint24 updateTimeLimit,
        uint24 fallbackUpdateTimeLimit
    );

    /// @notice Thrown when the decimals value is invalid or not supported.
    error BadDecimals();

    /// @notice Thrown when an invalid int256 value is encountered.
    error InvalidInt256();

    /// @notice Thrown when the update time limit is set to zero.
    error InvalidUpdateTimeLimit();

    /// @notice Thrown when the price is not available from the feed.
    error PriceNotAvailable();

    /**
     * @notice Construct a new wstETH price feed
     * @param stETHtoETHPriceFeed_ The address of the stETH / ETH price feed to fetch prices from
     * @param fallbackPriceFeed_ The address of the fallback price feed to use when the stETH / ETH price feed is not available
     * @param wstETH_ The address of the wstETH contract
     * @param decimals_ The number of decimals for the returned prices
     * @param updateTimeLimit_ The time limit for the price feed update
     * @param fallbackUpdateTimeLimit_ The time limit for the fallback price feed update
     * @param dao_ The address of the DAO that has permission to update the price feeds
     **/
    constructor(
        address stETHtoETHPriceFeed_,
        address fallbackPriceFeed_,
        address wstETH_,
        uint8 decimals_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_,
        address dao_
    ) AccessControl(dao_) {
        if (stETHtoETHPriceFeed_ == address(0) || wstETH_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();

        stETHtoETHPriceFeed = stETHtoETHPriceFeed_;
        underlyingToken = wstETH_;

        stETHToETHPriceFeedDecimals = AggregatorV3Interface(stETHtoETHPriceFeed_).decimals();
        if (decimals_ == 0 || decimals_ > stETHToETHPriceFeedDecimals) revert BadDecimals();
        // Note: Safe to convert directly to an int256 because wstETH.decimals == 18
        wstETHScale = signed256(10 ** IWstETH(underlyingToken).decimals());

        // Note: stETH / ETH price feed has 18 decimals so `decimals_` should always be less than or equals to that
        decimals = decimals_;
        updateTimeLimit = updateTimeLimit_;

        if (fallbackPriceFeed_ == address(0)) {
            fallbackUpdateTimeLimit = 0;
        } else {
            fallbackPriceFeed = fallbackPriceFeed_;
            fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
        }
    }

    /**
     * @notice Set the price feeds and update time limits
     * @param stETHtoETHPriceFeed_ The address of the stETH / ETH price feed
     * @param fallbackPriceFeed_ The address of the fallback price feed
     * @param updateTimeLimit_ The update time limit for the stETH / ETH price feed
     * @param fallbackUpdateTimeLimit_ The update time limit for the fallback price feed
     */
    function setPriceFeeds(
        address stETHtoETHPriceFeed_,
        address fallbackPriceFeed_,
        uint24 updateTimeLimit_,
        uint24 fallbackUpdateTimeLimit_
    ) external onlyAuthorized {
        if (stETHtoETHPriceFeed_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || (fallbackPriceFeed_ != address(0) && fallbackUpdateTimeLimit_ == 0)) revert InvalidUpdateTimeLimit();

        updateTimeLimit = updateTimeLimit_;
        stETHtoETHPriceFeed = stETHtoETHPriceFeed_;

        if (fallbackPriceFeed_ == address(0)) {
            fallbackPriceFeed = address(0);
            fallbackUpdateTimeLimit = 0;
            emit PriceFeedsSet(stETHtoETHPriceFeed_, address(0), updateTimeLimit_, 0);
        } else {
            fallbackPriceFeed = fallbackPriceFeed_;
            fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
            emit PriceFeedsSet(stETHtoETHPriceFeed_, fallbackPriceFeed_, updateTimeLimit_, fallbackUpdateTimeLimit_);
        }
    }

    /**
     * @notice WstETH price for the latest round
     * @return roundId Round id from the stETH price feed
     * @return answer Latest price for wstETH / USD
     * @return startedAt Timestamp when the round was started; passed on from stETH price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from stETH price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from stETH price feed
     **/
    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(stETHtoETHPriceFeed).latestRoundData();

        // Note: If the primary price feed is unavailable or returns invalid data,
        // fallback to the designated fallback price feed.
        if (answer <= 0 || block.timestamp - updatedAt > updateTimeLimit) {
            if (fallbackPriceFeed == address(0)) revert PriceNotAvailable();

            (roundId, answer, startedAt, updatedAt, answeredInRound) = AggregatorV3Interface(fallbackPriceFeed).latestRoundData();

            if (answer <= 0 || block.timestamp - updatedAt > fallbackUpdateTimeLimit) revert PriceNotAvailable();
        }

        uint256 tokensPerStEth = IWstETH(underlyingToken).tokensPerStEth();
        int256 price = (answer * wstETHScale) / signed256(tokensPerStEth);

        // Note: The stETH price feed should always have an equal or larger amount of decimals than this price feed
        // (enforced by validation in constructor)
        answer = price / signed256(10 ** (stETHToETHPriceFeedDecimals - decimals));
    }

    /**
     * @notice Converts an unsigned integer to a signed integer
     * @param n The unsigned integer to convert to signed
     * @return The signed integer representation of the input
     */
    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }
}
