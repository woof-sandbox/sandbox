// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxController.sol";
import "hardhat/console.sol";
import "./IMarketFactory.sol";

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
    ) external returns(address) {
        if (msg.sender != owner) revert Unauthorized();

        if (_marketConfig.baseToken == ZERO_ADDRESS) revert ZeroAddress();
        if (sandboxController.getBaseAssetByAddress(_marketConfig.baseToken).priceFeed == ZERO_ADDRESS) revert BaseTokenNotWhitelisted();

        if (!sandboxController.isPriceFeedWhitelisted(_marketConfig.priceFeed)) revert WrongPriceFeed();
        if (_marketConfig.collateraTokens.length == 0) revert ZeroCollateralAssets();
        // Gas saving.
        uint length = _marketConfig.collateraTokens.length;
        CollateralTokenConfig memory collateralTokenConfig;
        ISandboxController.CollateralTokenConfig memory collateralAssetLimitations;
        address[] memory addedCollateralTokens = new address[](length);
        for (uint i; i < length;) {
            unchecked {
                collateralTokenConfig = _marketConfig.collateraTokens[i]; 
                collateralAssetLimitations = sandboxController.getCollateralAssetByAddress(collateralTokenConfig.collateralToken);
                // Default checks.
                if (collateralTokenConfig.collateralToken == _marketConfig.baseToken) revert WrongCollateralTokenSettings(); 
                if (collateralTokenConfig.collateralToken == ZERO_ADDRESS) revert ZeroAddress();
                if (sandboxController.getCollateralAssetByAddress(collateralTokenConfig.collateralToken).priceFeed == ZERO_ADDRESS) revert CollateralTokenNotWhitelisted();
                if (!sandboxController.isPriceFeedWhitelisted(collateralTokenConfig.priceFeed)) revert WrongPriceFeed();
                for (uint j; j < addedCollateralTokens.length; j++) {
                    if (addedCollateralTokens[j] == collateralTokenConfig.collateralToken) revert CollateralTokenAlreadyAdded();
                }
                if (collateralTokenConfig.supplyCap == 0) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.borrowCollateralFactor == 0) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.liquidateCollateralFactor == 0) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.liquidationFactor == 0) revert WrongCollateralTokenSettings();
                // Check the borrow factor.
                if (collateralTokenConfig.borrowCollateralFactor < collateralAssetLimitations.minBorrowCollateralFactor) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.borrowCollateralFactor > collateralAssetLimitations.maxBorrowCollateralFactor) revert WrongCollateralTokenSettings();
                // Check the liquidate collateral factor.
                // TODO: Check if the difference between the liquidate and borrow factor is not too low.
                if (collateralTokenConfig.liquidateCollateralFactor < collateralTokenConfig.borrowCollateralFactor) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.liquidateCollateralFactor > collateralAssetLimitations.maxLiquidateCollateralFactor) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.liquidateCollateralFactor < collateralAssetLimitations.minLiquidateCollateralFactor) revert WrongCollateralTokenSettings();
                // Check the liquidation factor.
                if (collateralTokenConfig.liquidationFactor > collateralAssetLimitations.maxLiquidationFactor) revert WrongCollateralTokenSettings();
                if (collateralTokenConfig.liquidationFactor < collateralAssetLimitations.minLiquidationFactor) revert WrongCollateralTokenSettings();
                
                addedCollateralTokens[i] = collateralTokenConfig.collateralToken;
                
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
