// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract Fauceteer is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Mapping of user address -> asset address -> last time the user
    /// received that asset
    mapping(address => mapping(address => uint256)) public lastReceived;

    /// @notice Mapping of asset address -> amount
    /// @dev This mapping holds the amounts of each asset that can be dripped
    mapping(address => uint256) public amounts;

    error BalanceTooLow();
    error RequestedTooFrequently();
    error TransferFailed();

    constructor(address owner_, address[] memory tokens_, uint256[] memory amounts_) Ownable(owner_) {
        for (uint256 i = 0; i < tokens_.length; i++) {
            amounts[tokens_[i]] = amounts_[i];
        }
    }

    function drip(address token) public {
        uint balance = IERC20(token).balanceOf(address(this));
        if (balance <= 0) revert BalanceTooLow();

        if (block.timestamp - lastReceived[msg.sender][token] < 1 days) revert RequestedTooFrequently();

        lastReceived[msg.sender][token] = block.timestamp;

        IERC20(token).safeTransfer(msg.sender, balance / 10000); // 0.01%
    }
}
