// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./interfaces/IConfigController.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/IMarketFactory.sol";

contract ConfigController is IConfigController {
    /// @notice The admin of the protocol
    address public owner;
    address public curator;
    address public guardian;
    ISandboxController public sandboxController;
    IMarketFactory public marketFactory;
    address[] public markets;
    uint public marketsLength;

    constructor(
        address _owner,
        address _curator,
        address _guardian,
        address _sandboxController,
        address _marketFactory
    ) {
        unchecked {
            if (_owner == ZERO_ADDRESS) revert ZeroAddress();
        }
        curator = _curator;
        owner = _owner;
        guardian = _guardian;
        sandboxController = ISandboxController(_sandboxController);
        marketFactory = IMarketFactory(_marketFactory);
    }

    function createMarket(
        MarketConfig memory _marketConfig
    ) external returns (address) {
        if (msg.sender != owner) revert Unauthorized();

        if (_marketConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        if (
            sandboxController
                .baseAssets(_marketConfig.baseToken)
                .priceFeed == ZERO_ADDRESS
        ) revert BaseTokenNotWhitelisted();

        if (!sandboxController.isPriceFeedWhitelisted(_marketConfig.priceFeed))
            revert WrongPriceFeed();
        if (_marketConfig.collateralTokens.length == 0)
            revert ZeroCollateralAssets();
        // Gas saving.
        uint length = _marketConfig.collateralTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralAssetConfiguration
            memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        for (uint i; i < length; ) {
            unchecked {
                collateralTokenConfig = _marketConfig.collateralTokens[i];
                collateralAssetLimitations = sandboxController
                    .collateralAssets(
                        collateralTokenConfig.collateralToken
                    );
                // Default checks.
                // more gas efficient than if statements
                if (
                    collateralTokenConfig.supplyCap == 0 ||
                    collateralTokenConfig.borrowCollateralFactor == 0 ||
                    collateralTokenConfig.liquidateCollateralFactor == 0 ||
                    collateralTokenConfig.liquidationFactor == 0 ||
                    collateralTokenConfig.borrowCollateralFactor <
                    collateralAssetLimitations.minBorrowCollateralFactor ||
                    collateralTokenConfig.borrowCollateralFactor >
                    collateralAssetLimitations.maxBorrowCollateralFactor ||
                    collateralTokenConfig.liquidateCollateralFactor <
                    collateralTokenConfig.borrowCollateralFactor ||
                    collateralTokenConfig.liquidateCollateralFactor >
                    collateralAssetLimitations.maxLiquidateCollateralFactor ||
                    collateralTokenConfig.liquidateCollateralFactor <
                    collateralAssetLimitations.minLiquidateCollateralFactor ||
                    collateralTokenConfig.liquidationFactor >
                    collateralAssetLimitations.maxLiquidationFactor ||
                    collateralTokenConfig.liquidationFactor <
                    collateralAssetLimitations.minLiquidationFactor
                ) revert WrongCollateralTokenSettings();

                addedCollateralTokens[i] = collateralTokenConfig
                    .collateralToken;

                i++;
            }
        }
        unchecked {
            marketsLength++;
        }
        markets.push(marketFactory.createMarket(_marketConfig));

        emit MarketConfigurationCreated(
            markets[marketsLength - 1],
            _marketConfig.baseToken,
            _marketConfig.priceFeed,
            marketsLength
        );

        return markets[markets.length - 1];
    }

    function grantOwnership(address _newOwner) external {
        if (msg.sender != owner) revert Unauthorized();
        owner = _newOwner;
    }
}
