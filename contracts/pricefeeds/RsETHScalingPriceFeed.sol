// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { ILRTOracle } from "contracts/interfaces/ILRTOracle.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";

/**
 * @title Scaling price feed for rsETH
 * @notice A custom price feed that scales up or down the price received from an underlying Kelp price feed and returns the result
 * @author Compound
 */
contract RsETHScalingPriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant override version = 1;

    /// @notice Number of decimals for returned prices
    uint8 public immutable override decimals;

    /// @notice Underlying Kelp price feed where prices are fetched from
    address public immutable underlyingPriceFeed;

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

    /// @notice Reverts when an invalid int256 is encountered
    error InvalidInt256();

    /// @notice Reverts when bad decimals are provided
    error BadDecimals();

    /// @notice Reverts when the price is not available
    error PriceNotAvailable();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /**
     * @notice Construct a new scaling price feed
     * @param dao_ The address of the DAO
     * @param sequencer_ The address of the Chainlink sequencer
     * @param underlyingPriceFeed_ The address of the underlying price feed to fetch prices from
     * @param decimals_ The number of decimals for the returned prices
     * @param description_ The description of the price feed
     * @param underlyingToken_ The address of the underlying token
     **/
    constructor(
        address dao_,
        address sequencer_,
        address underlyingPriceFeed_,
        uint8 decimals_,
        string memory description_,
        address underlyingToken_
    ) AccessControl(dao_) {
        if (underlyingPriceFeed_ == address(0) || underlyingToken_ == address(0)) revert ZeroAddress();
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();

        _validateAndSetSequencer(sequencer_);

        underlyingPriceFeed = underlyingPriceFeed_;
        underlyingToken = underlyingToken_;
        decimals = decimals_;
        description = description_;

        uint8 underlyingPriceFeedDecimals = 18;
        rescaleFactor = signed256(10 ** (underlyingPriceFeedDecimals - decimals_));
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

        int256 rsETHPrice = signed256(ILRTOracle(underlyingPriceFeed).rsETHPrice());

        if (rsETHPrice == 0) revert PriceNotAvailable();

        int256 price = rsETHPrice / rescaleFactor;

        return (1, price, block.timestamp, block.timestamp, 1);
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
