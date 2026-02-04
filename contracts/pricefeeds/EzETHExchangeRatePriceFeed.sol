// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { IBalancerRateProvider } from "contracts/interfaces/IBalancerRateProvider.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";

/**
 * @title ezETH Scaling price feed
 * @notice A custom price feed that scales up or down the price received from an underlying Renzo ezETH / ETH exchange rate
 * price feed and returns the result
 * @author Compound
 */
contract EzETHExchangeRatePriceFeed is AccessControl, IPriceFeed {
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

    /// @notice ezETH price feed where prices are fetched from
    address public immutable underlyingPriceFeed;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /// @notice Description of the price feed
    string public description;

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /// @notice Reverts if the uint256 value is over the int256 max value
    error InvalidInt256();

    /// @notice Reverts if the decimals are greater than 18 or equal to 0
    error BadDecimals();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /// @notice Reverts if the price is not available
    error PriceNotAvailable();

    /**
     * @notice Construct a new ezETH scaling price feed
     * @param dao_ The address of the DAO that can update the sequencer
     * @param sequencer_ The address of the Chainlink sequencer
     * @param ezETHRateProvider The address of the underlying price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(
        address dao_,
        address sequencer_,
        address ezETHRateProvider,
        uint8 decimals_,
        string memory description_,
        address underlyingToken_
    ) AccessControl(dao_) {
        if (ezETHRateProvider == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();

        underlyingPriceFeed = ezETHRateProvider;
        decimals = decimals_;
        description = description_;
        underlyingToken = underlyingToken_;

        rescaleFactor = signed256(10 ** (EZETH_RATE_PROVIDER_DECIMALS - decimals_));
        _validateAndSetSequencer(sequencer_);
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
