// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

interface IConfigControllerErrors {
    error AlreadyInitialized();
    error ZeroAddress();
    error Unauthorized();
    error NoCurveRegistered();
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
    error InvalidProposalType();
    error InvalidSelector();
    error ProposalAlreadyExists();
    error UnknownComet();
    error IncorrectValue();
    error ProposalNotMatured();
    error ProposalNotTimelocked();
    error CometCallFailed();
    error MaxCollateralTokensReached();
    error CollateralTokenNotAdded();
    error CollateralRemovalInProgress();
    error CurveTransitionAlreadyInitiated();
    error MarketAlreadyDeprecated();
    error InvalidConfigController();
    error InvalidOwner();
}
