// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface IConfigControllerErrors {
    error AlreadyInitialized();
    error ZeroAddress();
    error Unauthorized();
    error NoCurveRegistered();
    error WrongCurveParams();
    error ZeroCollateralAssets();
    error SupplyCapCantBeZero();
    error WrongCollateralTokenSettings();
    error LiquidateCollateralFactorTooLow();
    error LiquidateCollateralFactorTooHigh();
    error LiquidationFactorTooLow();
    error LiquidationFactorTooHigh();
    error BorrowCollateralFactorTooLow();
    error BorrowCollateralFactorTooHigh();
    error BaseTokenNotWhitelisted();
    error CollateralTokenNotWhitelisted();
    error CollateralTokenAlreadyAdded();
    error InvalidFeePercentage();
    error InvalidCurator();
    error ProposalExpired();
    error NoActiveProposal();
    error ProposalDurationTooShort();
    error ProposalDurationTooLong();
    error InvalidCurveId();
    error IncorrectValue();
    error UnknownComet();
}