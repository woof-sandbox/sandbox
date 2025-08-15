// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { IPriceFeed } from "contracts/interfaces/IPriceFeed.sol";
import { AccessControl } from "contracts/pricefeeds/AccessControl.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";

/**
 * @title Constant price feed
 * @notice A custom price feed that always returns a constant price
 * @author Compound
 */
contract ConstantPriceFeed is AccessControl, IPriceFeed {
    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Description of the price feed
    string public constant description = "Constant price feed";

    /// @notice Number of decimals for returned prices
    uint8 public immutable decimals;

    /// @notice The constant price
    int256 public immutable CONSTANT_PRICE;

    /// @notice The underlying token
    address public immutable underlyingToken;

    /// @notice The Chainlink sequencer address
    address public sequencer;

    /**
     * @notice Emitted when the sequencer address is updated.
     * @param newSequencer The address of the new sequencer.
     */
    event SequencerUpdated(address indexed newSequencer);

    /// @dev Reverts if the passed value is zero.
    error ZeroValue();

    /// @dev Reverts if the passed value is not between 1 and 18.
    error BadDecimals();

    /// @dev Reverts if the sequencer is invalid.
    error InvalidSequencer();

    /// @dev Reverts if the price is not available.
    error PriceNotAvailable();

    /**
     * @notice Construct a new scaling price feed
     * @param dao_ The address of the DAO that can update the sequencer
     * @param sequencer_ The address of the Chainlink sequencer
     * @param decimals_ The number of decimals for the returned prices
     * @param constantPrice_ The constant price
     * @param underlyingToken_ The address of the underlying token
     * @dev The constant price must be non-zero and the decimals must be between 1 and 18
     **/
    constructor(address dao_, address sequencer_, uint8 decimals_, int256 constantPrice_, address underlyingToken_) AccessControl(dao_) {
        if (decimals_ == 0 || decimals_ > 18) revert BadDecimals();
        if (constantPrice_ <= 0) revert ZeroValue();
        if (underlyingToken_ == address(0)) revert ZeroAddress();

        decimals = decimals_;
        CONSTANT_PRICE = constantPrice_;
        underlyingToken = underlyingToken_;
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
     * @return answer Latest price for the asset (will always be a constant price)
     * @return startedAt Timestamp when the round was started; passed on from underlying price feed
     * @return updatedAt Timestamp when the round was last updated; passed on from underlying price feed
     * @return answeredInRound Round id in which the answer was computed; passed on from underlying price feed
     **/
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        if (sequencer != address(0)) {
            (, answer, , , ) = AggregatorV3Interface(sequencer).latestRoundData();
            if (answer == 1) revert PriceNotAvailable();
        }

        return (1, CONSTANT_PRICE, block.timestamp, block.timestamp, 1);
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
