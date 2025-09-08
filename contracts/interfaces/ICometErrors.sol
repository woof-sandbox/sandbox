// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

interface ICometErrors {
    /**
     * @notice Error thrown when an address is zero
     */
    error ZeroAddress();

    /**
     * @notice Error thrown when an amount is zero
     */
    error ZeroAmount();

    /**
     * @notice Error thrown when attempting to initialize a contract that has already been initialized
     */
    error AlreadyInitialized();

    /**
     * @notice Error thrown when an amount is too small to meet minimum requirements
     */
    error AmountTooSmall();

    /**
     * @notice Error thrown when an asset is not supported or not properly configured in the protocol
     */
    error BadAsset();

    /**
     * @notice Error thrown when a token's decimal configuration is invalid or unsupported
     */
    error BadDecimals();

    /**
     * @notice Error thrown when a price feed returns an invalid price (zero or negative)
     */
    error BadPrice();

    /**
     * @notice Error thrown when attempting to borrow an amount below the minimum borrow threshold
     */
    error BorrowTooSmall();

    /**
     * @notice Error thrown when contract initialization parameters are invalid or missing
     */
    error IncorrectInitialization();

    /**
     * @notice Error thrown when attempting to withdraw reserves that exceed available reserves
     */
    error InsufficientReserves();

    /**
     * @notice Error thrown when attempting to transfer tokens to the same address (self-transfer)
     */
    error NoSelfTransfer();

    /**
     * @notice Error thrown when an account lacks sufficient collateral to support their position
     */
    error NotCollateralized();

    /**
     * @notice Error thrown when attempting to liquidate an account that is not underwater
     */
    error NotLiquidatable();

    /**
     * @notice Error thrown when attempting an action that is currently paused by protocol governance
     */
    error Paused();

    /**
     * @notice Error thrown when a reentrant call is detected and blocked by the reentrancy guard
     */
    error ReentrantCallBlocked();

    /**
     * @notice Error thrown when attempting to supply collateral beyond the configured supply cap
     */
    error SupplyCapExceeded();

    /**
     * @notice Error thrown when a timestamp value exceeds the maximum allowed value
     */
    error TimestampTooLarge();

    /**
     * @notice Error thrown when attempting to configure more collateral assets than the protocol supports
     */
    error TooManyAssets();

    /**
     * @notice Error thrown when the price slippage during collateral purchase exceeds acceptable limits
     */
    error TooMuchSlippage();

    /**
     * @notice Error thrown when the caller lacks permission to perform the requested action
     */
    error Unauthorized();

    /**
     * @notice Error thrown when insufficient allowance exists for the requested token transfer
     * @param token The token address for which allowance is insufficient
     * @param owner The token owner address
     * @param manager The address attempting to spend tokens
     */
    error InsufficientAllowance(address token, address owner, address manager);

    /**
     * @notice Error thrown when the operation is performed with neither base nor collateral token
     * @param token Detected token
     */
    error WrongToken(address token);

    error MaxAllowanceRestricted();

    error IncorrectApproval();

    error PrincipalDecreaseOnSupply();

    error ExceedsSupportedUtilization();
}
