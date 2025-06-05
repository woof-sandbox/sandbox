// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../SandboxComet.sol";
import "../interfaces/IConfigController.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract CometHarness is SandboxComet {
    uint public nowOverride;

    constructor() {}

    function getNowInternal() internal view override returns (uint40) {
        return nowOverride > 0 ? uint40(nowOverride) : super.getNowInternal();
    }

    function getNow() public view returns (uint40) {
        return getNowInternal();
    }

    function setNow(uint now_) external {
        nowOverride = now_;
    }

    function collateralBalanceOf(address account, address asset) external view returns (uint128) {
        return userCollateral[account][asset].balance;
    }

    function setTotalsBasic(TotalsBasic memory totals) external {
        baseSupplyIndex = totals.baseSupplyIndex;
        baseBorrowIndex = totals.baseBorrowIndex;
        trackingSupplyIndex = totals.trackingSupplyIndex;
        trackingBorrowIndex = totals.trackingBorrowIndex;
        totalSupplyBase = totals.totalSupplyBase;
        totalBorrowBase = totals.totalBorrowBase;
        lastAccrualTime = totals.lastAccrualTime;
    }

    function setTotalsCollateral(
        address asset,
        TotalsCollateral memory totals
    ) external {
        totalsCollateral[asset] = totals;
    }

    function setBasePrincipal(address account, int104 principal) external {
        userBasic[account].principal = principal;
    }

    function setCollateralBalance(
        address account,
        address asset,
        uint128 balance
    ) external {
        uint128 oldBalance = userCollateral[account][asset].balance;
        userCollateral[account][asset].balance = balance;
        (
            IConfigController.CollateralTokenConfig memory assetInfo,
            uint8 index
        ) = getAssetInfoByAddress(asset);

        updateAssetsIn(account, index, oldBalance, balance);
    }

    function totalsBasic() public view returns (TotalsBasic memory) {
        return
            TotalsBasic({
                baseSupplyIndex: baseSupplyIndex,
                baseBorrowIndex: baseBorrowIndex,
                trackingSupplyIndex: trackingSupplyIndex,
                trackingBorrowIndex: trackingBorrowIndex,
                daoTrackingSupplyIndex: daoTrackingSupplyIndex,
                daoTrackingBorrowIndex: daoTrackingBorrowIndex,
                totalSupplyBase: totalSupplyBase,
                totalBorrowBase: totalBorrowBase,
                lastAccrualTime: lastAccrualTime,
                pauseFlags: pauseFlags
            });
    }

    function getAssetList(
        address account
    ) external view returns (address[] memory result) {
        uint16 assetsIn = userBasic[account].assetsIn;

        uint8 count = 0;
        for (uint8 i = 0; i < numAssets; i++) {
            if (isInAsset(assetsIn, i, userBasic[account]._reserved)) {
                count++;
            }
        }

        result = new address[](count);

        uint j = 0;
        for (uint8 i = 0; i < numAssets; i++) {
            if (isInAsset(assetsIn, i, userBasic[account]._reserved)) {
                result[j] = getAssetInfo(i).collateralToken;
                j++;
            }
        }

        return result;
    }
    
    function updateAssetsInExternal(
        address account,
        address asset,
        uint128 initialUserBalance,
        uint128 finalUserBalance
    ) external {
        (, uint8 index) = getAssetInfoByAddress(asset);
        updateAssetsIn(account, index, initialUserBalance, finalUserBalance);
    }

    function accrue() external {
        accrueInternal();
    }
}