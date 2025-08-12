// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Fauceteer
 * @author WOOF!
 * @notice A faucet contract that allows users to drip ERC20 tokens.
 */
contract Fauceteer is Ownable {
    /**
     * @notice Utilizes the SafeERC20 library to perform safe operations with ERC20 tokens.
     * @notice SafeERC20 is used to handle ERC20 token transfers and approvals securely,
     *  preventing common issues such as missing return values or failed transactions.
     *  This helps ensure that token interactions do not inadvertently fail or behave unexpectedly.
     */
    using SafeERC20 for IERC20;

    /**
     * @notice Mapping of user address -> asset address -> last time the user received that asset
     */
    mapping(address => mapping(address => uint256)) public lastReceived;

    /**
     * @notice Mapping of asset address -> amount
     * @dev This mapping holds the amounts of each asset that can be dripped
     */
    mapping(address => uint256) public amounts;

    /**
     * @notice Emitted when a user receives a drip of tokens
     * @param user The address of the user receiving the tokens
     * @param token The address of the token being dripped
     * @param amount The amount of tokens being dripped
     */
    event Drip(address indexed user, address indexed token, uint256 amount);

    /**
     * @notice Emitted when a new token is added to the faucet
     * @param token The address of the token being added
     * @param amount The amount of tokens being added
     */
    event AddedToken(address indexed token, uint256 amount);

    /**
     * @notice Emitted when a token is removed from the faucet
     * @param token The address of the token being removed
     */
    event RemovedToken(address indexed token);

    /// @dev Thrown when a user tries to drip tokens but their balance is too low on specific token
    error BalanceTooLow(address token);

    /// @dev Thrown when a user tries to drip tokens but their request is too frequent
    error RequestedTooFrequently();

    /// @dev Thrown when a user tries to drip tokens but the transfer fails
    error TransferFailed();

    /// @dev Thrown when a user tries to drip tokens but the token is unknown
    error UnknownToken(address token);

    /// @dev Thrown when setting a zero token to faucet
    error InvalidAddress();

    /// @dev Thrown when setting a zero amount to faucet
    error InvalidAmount();

    /**
     * @notice Constructor to initialize the faucet with a list of tokens and their corresponding amounts.
     * @param owner_ The address of the owner of the faucet
     * @param tokens_ The list of token addresses to be added to the faucet
     * @param amounts_ The list of amounts corresponding to each token
     */
    constructor(address owner_, address[] memory tokens_, uint256[] memory amounts_) Ownable(owner_) {
        for (uint256 i = 0; i < tokens_.length; i++) {
            amounts[tokens_[i]] = amounts_[i];
        }
    }

    /**
     * @notice Allows users to drip tokens from the faucet
     * @param token The address of the token to drip
     */
    function drip(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 amount = amounts[token];

        if (amount == 0) revert UnknownToken(token);
        if (balance < amount) revert BalanceTooLow(token);
        if (block.timestamp - lastReceived[msg.sender][token] < 1 days) revert RequestedTooFrequently();

        lastReceived[msg.sender][token] = block.timestamp;

        emit Drip(msg.sender, token, amounts[token]);

        IERC20(token).safeTransfer(msg.sender, amounts[token]);
    }

    /*//////////////////////////////////////////////////////////////
                             ADMINISTRATIVE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Adds a new token to the faucet
     * @param token The address of the token to add
     * @param amount The amount of tokens to add
     */
    function addToken(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        amounts[token] = amount;

        emit AddedToken(token, amount);
    }

    /**
     * @notice Removes a token from the faucet
     * @param token The address of the token to remove
     */
    function removeToken(address token) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();

        delete amounts[token];

        emit RemovedToken(token);
    }
}
