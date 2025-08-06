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
    /** Custom errors **/
    error BadDecimals();
    error InvalidInt256();
    error ZeroUpdateTimeLimit();
    error PriceNotAvailable();

    /// @notice Version of the price feed
    uint public constant override version = 1;

    /// @notice Description of the price feed
    string public constant override description = "Custom price feed for wstETH / ETH";

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Number of decimals for the stETH / ETH price feed
    uint public immutable stETHToETHPriceFeedDecimals;

    /// @notice Scale for WstETH contract
    int public immutable wstETHScale;

    /// @notice The underlying token
    /// @notice wstETH contract address
    address public immutable override underlyingToken;

    /// @notice The time limit for the price feed update
    /// @notice If the price feed is not updated within this time limit, it will fallback to the fallback price feed
    uint16 public immutable updateTimeLimit;

    uint16 public immutable fallbackUpdateTimeLimit;

    /// @notice Chainlink stETH / ETH price feed
    address public stETHtoETHPriceFeed;

    /// @notice Fallback price feed address when stETH / ETH price feed is not working properly
    address public fallbackPriceFeed;

    event PriceFeedsSet(address indexed stETHtoETHPriceFeed, address indexed fallbackPriceFeed);

    /**
     * @notice Construct a new wstETH price feed
     * @param stETHtoETHPriceFeed_ The address of the stETH / ETH price feed
     * @param wstETH_ The address of the wstETH contract
     * @param decimals_ The number of decimals for the returned prices
     * @param dao_ The address of the DAO that can set the contractor
     **/
    constructor(
        address stETHtoETHPriceFeed_,
        address fallbackPriceFeed_,
        address wstETH_,
        uint8 decimals_,
        uint16 updateTimeLimit_,
        uint16 fallbackUpdateTimeLimit_,
        address dao_
    ) AccessControl(dao_) {
        if (stETHtoETHPriceFeed_ == address(0) || wstETH_ == address(0)) revert ZeroAddress();
        if (updateTimeLimit_ == 0 || fallbackUpdateTimeLimit_ == 0) revert ZeroUpdateTimeLimit();

        stETHtoETHPriceFeed = stETHtoETHPriceFeed_;
        fallbackPriceFeed = fallbackPriceFeed_;
        underlyingToken = wstETH_;

        stETHToETHPriceFeedDecimals = AggregatorV3Interface(stETHtoETHPriceFeed_).decimals();
        // Note: Safe to convert directly to an int256 because wstETH.decimals == 18
        wstETHScale = signed256(10 ** IWstETH(underlyingToken).decimals());

        // Note: stETH / ETH price feed has 18 decimals so `decimals_` should always be less than or equals to that
        if (decimals_ == 0 || decimals_ > stETHToETHPriceFeedDecimals) revert BadDecimals();
        decimals = decimals_;
        updateTimeLimit = updateTimeLimit_;
        fallbackUpdateTimeLimit = fallbackUpdateTimeLimit_;
    }

    function setPriceFeeds(address stETHtoETHPriceFeed_, address fallbackPriceFeed_) external onlyAuthorized {
        if (stETHtoETHPriceFeed_ == address(0)) revert ZeroAddress();

        stETHtoETHPriceFeed = stETHtoETHPriceFeed_;
        fallbackPriceFeed = fallbackPriceFeed_;

        emit PriceFeedsSet(stETHtoETHPriceFeed_, fallbackPriceFeed_);
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

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }
}
