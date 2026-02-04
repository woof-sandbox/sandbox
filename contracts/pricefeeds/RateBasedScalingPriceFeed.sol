// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { IRateProvider } from "contracts/interfaces/IRateProvider.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";

/**
 * @title Scaling price feed for rate based oracles
 * @notice A custom price feed that scales up or down the price received from an underlying price feed and returns the result
 * @author Compound
 */
contract RateBasedScalingPriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Underlying price feed where prices are fetched from
    address public immutable underlyingPriceFeed;

    /// @notice Whether or not the price should be upscaled
    bool internal immutable shouldUpscale;

    /// @notice The amount to upscale or downscale the price by
    int256 internal immutable rescaleFactor;

    /// @notice The underlying token
    address public immutable override underlyingToken;

    /// @notice Description of the price feed
    string public description;

    /// @notice The Chainlink sequencer address
    address public sequencer;

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
     * @notice Construct a new scaling price feed
     * @param dao_ The address of the DAO
     * @param sequencer_ The address of the Chainlink sequencer
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param underlyingDecimals_ The number of decimals for the underlying price feed
     * @param description_ The description of the price feed
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(
        address dao_,
        address sequencer_,
        address underlyingPriceFeed_,
        address underlyingToken_,
        uint8 underlyingDecimals_,
        uint8 decimals_,
        string memory description_
    ) AccessControl(dao_) {
        if (underlyingPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (decimals_ == 0 || decimals_ > 18 || underlyingDecimals_ == 0 || underlyingDecimals_ > 18) revert BadDecimals();
        _validateAndSetSequencer(sequencer_);

        underlyingPriceFeed = underlyingPriceFeed_;
        decimals = decimals_;
        description = description_;
        underlyingToken = underlyingToken_;

        shouldUpscale = underlyingDecimals_ < decimals_ ? true : false;
        rescaleFactor = (
            shouldUpscale ? signed256(10 ** (decimals_ - underlyingDecimals_)) : signed256(10 ** (underlyingDecimals_ - decimals_))
        );
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

        uint256 rate = IRateProvider(underlyingPriceFeed).getRate();

        if (rate == 0) revert PriceNotAvailable();

        return (1, scalePrice(signed256(rate)), block.timestamp, block.timestamp, 1);
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    function scalePrice(int256 price) internal view returns (int256) {
        return shouldUpscale ? price * rescaleFactor : price / rescaleFactor;
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
