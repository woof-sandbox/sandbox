// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../SandboxComet.sol";

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

    function collateralBalanceOf(address account, address asset) external view returns (uint256) {
        return userCollateral[account][asset];
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

    function setTotalsCollateral(address asset, uint256 totals) external {
        totalsCollateral[asset] = totals;
    }

    function setBasePrincipal(address account, int104 principal) external {
        userBasic[account].principal = principal;
    }

    function setCollateralBalance(address account, address asset, uint256 balance) external {
        uint256 oldBalance = userCollateral[account][asset];
        userCollateral[account][asset] = balance;

        (, uint8 index) = getAssetInfoByAddress(asset);

        updateAssetsIn(account, index, oldBalance, balance);
    }

    function totalsBasic() public view returns (TotalsBasic memory) {
        return
            TotalsBasic({
                baseSupplyIndex: baseSupplyIndex,
                baseBorrowIndex: baseBorrowIndex,
                trackingSupplyIndex: trackingSupplyIndex,
                trackingBorrowIndex: trackingBorrowIndex,
                totalSupplyBase: totalSupplyBase,
                totalBorrowBase: totalBorrowBase,
                lastAccrualTime: lastAccrualTime,
                pauseFlags: pauseFlags
            });
    }

    function getAssetList(address account) external view returns (address[] memory result) {
        uint24 assetsIn = userBasic[account].assetsIn;

        uint8 count = 0;
        for (uint8 i = 0; i < numAssets; i++) {
            if (isInAsset(assetsIn, i)) {
                count++;
            }
        }

        result = new address[](count);

        uint j = 0;
        for (uint8 i = 0; i < numAssets; i++) {
            if (isInAsset(assetsIn, i)) {
                result[j] = getAssetInfo(i).collateralToken;
                j++;
            }
        }

        return result;
    }

    function updateAssetsInExternal(address account, address asset, uint128 initialUserBalance, uint128 finalUserBalance) external {
        (, uint8 index) = getAssetInfoByAddress(asset);
        updateAssetsIn(account, index, initialUserBalance, finalUserBalance);
    }

    function accrue() external {
        accrueInternal();
    }

    function spendAllowanceExternal(address owner, address manager, address asset, uint256 amount) external {
        spendAllowance(owner, manager, asset, amount);
    }

    function targetBorrowCollateralFactor() external pure returns (uint64) {
        return TARGET_BORROW_COLLATERAL_FACTOR;
    }

    function targetLiquidateCollateralFactor() external pure returns (uint64) {
        return TARGET_LIQUIDATE_COLLATERAL_FACTOR;
    }
}
