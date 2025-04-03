// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface ISandboxErrors {
    error ZeroAddress();
    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();
    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error InvalidFactors();
    error NotOwner(address caller);
    error NotDao(address caller);
    error NotAuthorized(address caller);
}
