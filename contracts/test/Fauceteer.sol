// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

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

    /// @dev The multiplier for the tokens
    uint48 public constant TOKENS_MULTIPLIER = 5000;

    /// @dev The list of tokens to be added to the faucet
    address[] public tokens;

    /// @dev The list of amounts to be added to the faucet and dripped from the faucet for each token
    uint256[] public dripAmounts;

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

    /// @dev Thrown when a user tries to drip tokens but their balance is too low on specific token
    error BalanceTooLow();

    /// @dev Thrown when setting a zero length to faucet
    error InvalidLength();

    /**
     * @notice Constructor to initialize the faucet with a list of tokens and their corresponding amounts.
     * @param owner_ The address of the owner of the faucet
     * @param tokens_ The list of token addresses to be added to the faucet
     * @param amounts_ The list of amounts corresponding to each token
     */
    constructor(address owner_, address[] memory tokens_, uint256[] memory amounts_) Ownable(owner_) {
        uint256 length = tokens_.length;

        if (length == 0 || length != amounts_.length) revert InvalidLength();

        for (uint256 i = 0; i < tokens_.length; i++) {
            tokens.push(tokens_[i]);
            dripAmounts.push(amounts_[i]);
            emit AddedToken(tokens_[i], amounts_[i]);
        }
    }

    /**
     * @notice Allows users to drip tokens from the faucet
     * @param recipient The address of the recipient to drip tokens to
     */
    function drip(address recipient) external payable {
        uint256 balance = IERC20(tokens[0]).balanceOf(address(this));
        if (balance < dripAmounts[0]) revert BalanceTooLow();

        uint256 length = tokens.length;
        for (uint256 i = 0; i < length; i++) {
            address token = tokens[i];
            uint256 amount = dripAmounts[i];

            IERC20(token).safeTransfer(recipient, amount);
            emit Drip(recipient, token, amount);
        }

        Address.sendValue(payable(recipient), msg.value);
    }

    /**
     * @notice Allows the owner to add tokens to the faucet
     */
    function addTokens() external {
        uint256 length = tokens.length;
        for (uint256 i = 0; i < length; i++) {
            address token = tokens[i];
            uint256 amount = dripAmounts[i];

            IERC20(token).safeTransferFrom(owner(), address(this), amount * TOKENS_MULTIPLIER);
        }
    }
}
