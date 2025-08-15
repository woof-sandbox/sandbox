// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { IBalancerRateProvider } from "contracts/interfaces/IBalancerRateProvider.sol";

/**
 * @title ezETH Scaling price feed
 * @notice A custom price feed that scales up or down the price received from an underlying Renzo ezETH / ETH exchange rate
 * price feed and returns the result
 * @author Compound
 */
contract EzETHExchangeRatePriceFeed is IPriceFeed {
    /// @notice Version of the price feed
    uint public constant version = 1;

    /// @notice Number of decimals for the ezETH rate provider
    uint8 public constant EZETH_RATE_PROVIDER_DECIMALS = 18;

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The amount to upscale or downscale the price by
    int256 internal immutable rescaleFactor;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice Description of the price feed
    string public description;

    /// @notice ezETH price feed where prices are fetched from
    address public immutable underlyingPriceFeed;

    /// @notice Reverts if the uint256 value is over the int256 max value
    error InvalidInt256();

    /// @notice Reverts if the address is zero
    error ZeroAddress();

    /// @notice Reverts if the decimals are greater than 18 or equal to 0
    error BadDecimals();

    /// @notice Reverts if the price is not available
    error PriceNotAvailable();

    /**
     * @notice Construct a new ezETH scaling price feed
     * @param ezETHRateProvider The address of the underlying price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(address ezETHRateProvider, uint8 decimals_, string memory description_, address underlyingToken_) {
        if (ezETHRateProvider == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();

        underlyingPriceFeed = ezETHRateProvider;
        decimals = decimals_;
        description = description_;
        underlyingToken = underlyingToken_;

        rescaleFactor = signed256(10 ** (EZETH_RATE_PROVIDER_DECIMALS - decimals_));
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
        uint256 rate = IBalancerRateProvider(underlyingPriceFeed).getRate();
        if (rate == 0) revert PriceNotAvailable();

        answer = signed256(rate) / rescaleFactor;
        // protocol uses only the answer value. Other data fields are not provided by the underlying pricefeed and are not used
        // in Comet protocol
        // https://etherscan.io/address/0x387dBc0fB00b26fb085aa658527D5BE98302c84C#readProxyContract
        return (1, answer, block.timestamp, block.timestamp, 1);
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }
}
