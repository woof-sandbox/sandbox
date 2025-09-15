// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { SandboxController } from "../SandboxController.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IPriceFeed } from "../interfaces/external/IPriceFeed.sol";

/**
 * @title ConfigController for testing purposes
 */
contract SandboxControllerNoCurvesTest is SandboxController {
    constructor(
        address _treasury,
        bool _feeEnabled,
        SandboxControllerConfiguration memory _config,
        uint64[3] memory _reserveCommissions,
        uint64[3] memory _protocolCommissions
    ) SandboxController(_treasury, _feeEnabled, _config, _reserveCommissions, _protocolCommissions) {}

    function whitelistBaseAssetWithNoCurve(address token, address priceFeed) external {
        /// @dev this token is already whitelisted
        if (isBaseTokenWhitelisted(token)) revert BaseTokenAlreadyWhitelisted();

        /// @dev the price feed is not associated with the token
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying();
        tokenToPriceFeed[token] = priceFeed;
        uint8 decimals = IERC20Metadata(token).decimals();

        _baseAssets[token].priceFeed = priceFeed;
        _baseAssets[token].decimals = decimals;
        _baseAssets[token].minBorrow = 0;
    }
}
