// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../SandboxController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract SandboxControllerNoCurvesTest is SandboxController {
    constructor(
        address _owner,
        address _dao,
        address _treasury,
        bool _feeEnabled,
        uint256 _targetPercent,
        uint64 _storeFrontPriceFactor,
        uint256 _minUpdateTime,
        uint256 _maxUpdateTime,
        uint256 _suggestedAmountOfSeedReserves,
        uint256 _suggestedLockTimeOfSeedReserves,
        uint64[3] memory _reserveCommissions,
        uint64[3] memory _protocolCommissions
    )
        SandboxController(
            _owner,
            _dao,
            _treasury,
            _feeEnabled,
            _targetPercent,
            _storeFrontPriceFactor,
            _minUpdateTime,
            _maxUpdateTime,
            _suggestedAmountOfSeedReserves,
            _suggestedLockTimeOfSeedReserves,
            _reserveCommissions,
            _protocolCommissions
        )
    {}

    function whitelistBaseAssetWithNoCurve(address token, address priceFeed) external {
        /// @dev this token is already whitelisted
        if (isBaseTokenWhitelisted(token)) revert BaseTokenAlreadyWhitelisted();

        /// @dev the price feed is not associated with the token
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying();
        tokenToPriceFeed[token] = priceFeed;
        uint8 decimals = IERC20NonStandard(token).decimals();

        _baseAssets[token].priceFeed = priceFeed;
        _baseAssets[token].decimals = decimals;
        _baseAssets[token].minBorrow = 0;
    }
}
