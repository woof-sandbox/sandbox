// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { CometStorage } from "contracts/CometStorage.sol";
import { CometMath } from "contracts/CometMath.sol";
import { ICometErrors } from "contracts/interfaces/ICometErrors.sol";
import { ICometEvents } from "contracts/interfaces/ICometEvents.sol";

abstract contract CometCore is CometStorage, CometMath, ICometErrors, ICometEvents {
    /**
     * @notice Determine if the manager has permission to act on behalf of the owner
     * @param owner The owner account
     * @param manager The manager account
     * @param asset The address of the asset being checked
     * @param amount The amount of the asset being checked
     * @return Whether or not the manager has permission
     */
    function hasPermission(address owner, address manager, address asset, uint256 amount) public view returns (bool) {
        return owner == manager || allowance[owner][manager][asset] >= amount;
    }

    /**
     * @notice Determine if the manager has permission to act on behalf of the owner for the whole balance
     * @notice The function gives an atomic one-spend permission, which will be discarded
     * @param owner The owner account
     * @param manager The manager account
     * @notice works for the base asset only
     * @return Whether or not the manager has permission
     */
    function hasPermissionAll(address owner, address manager) public view returns (bool) {
        return owner == manager || allowanceAll[owner][manager];
    }

    /**
     * @notice Spend the allowance of an asset for a spender on behalf of an owner
     * @param owner The owner account
     * @param manager The spender account
     * @param asset The asset being spent
     * @param amount The amount to spend
     */
    function spendAllowance(address owner, address manager, address asset, uint256 amount) internal {
        if (owner == manager) return;
        if (amount == 0) revert ZeroAmount();

        allowInternal(owner, manager, asset, allowance[owner][manager][asset] - amount);
    }

    /**
     * @notice Spend the allowance of an asset for a spender on behalf of an owner
     * @param owner The owner account
     * @param manager The spender account
     * @notice works for the base asset only
     */
    function spendAllowanceAll(address owner, address manager) internal {
        if (owner == manager) return;

        allowAllInternal(owner, manager, false);
    }

    /**
     * @dev Allows a manager to spend an owner's allowance on a specific asset
     * @param owner The owner of the assets
     * @param manager The manager account
     * @param asset The asset being spent
     * @param amount The amount to spend
     */
    function allowInternal(address owner, address manager, address asset, uint256 amount) internal {
        uint8 index = collateralAssetIndex[asset];
        if (owner == address(0) || manager == address(0) || asset == address(0)) revert ZeroAddress();
        if (asset != baseToken && (collateralAssets[index].collateralToken != asset)) revert WrongToken(asset);
        if (amount == type(uint256).max) revert MaxAllowanceRestricted();

        allowance[owner][manager][asset] = amount;

        emit Approval(owner, manager, asset, amount);
    }

    /**
     * @dev Allows a manager to spend an owner's allowance on a specific asset
     * @param owner The owner of the assets
     * @param manager The manager account
     * @param approved Flag to set
     * @notice works for the base asset only
     */
    function allowAllInternal(address owner, address manager, bool approved) internal {
        if (owner == address(0) || manager == address(0)) revert ZeroAddress();

        if (allowanceAll[owner][manager] == approved) revert IncorrectApproval();

        allowanceAll[owner][manager] = approved;

        emit ApprovalAll(owner, manager, baseToken, approved);
    }

    /**
     * @dev The positive present supply balance if positive or the negative borrow balance if negative
     */
    function presentValue(int104 principalValue_) internal view returns (int256) {
        if (principalValue_ >= 0) {
            return signed256(presentValueSupply(baseSupplyIndex, uint104(principalValue_)));
        } else {
            return -signed256(presentValueBorrow(baseBorrowIndex, uint104(-principalValue_)));
        }
    }

    /**
     * @dev The principal amount projected forward by the supply index
     * Performs calculation in uint256, increasing the type for intermediate result to avoid overflow in uint104
     * uint104 is approx (2*1e48), so 100bln supply (1e11*1e18) with full index (approx 1e4*1e15) may cause overflow
     * @return _ Total supply as present value (in tokens). uint256 return type is kept for compatibility with ERC20
     * balance types and for ease internal conversions. But in can be safely shortened to uint104
     */
    function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256) {
        /// once intermediate results are calculated, total supply can be cut into uint104 by any caller-function
        /// as it is highly unlikely to have any supply above 2*1e30 of tokens with 18 decimals

        return (uint256(principalValue_) * baseSupplyIndex_) / BASE_INDEX_SCALE;
    }

    /**
     * @dev The principal amount projected forward by the borrow index
     * Performs calculation in uint256, increasing the type for intermediate result to avoid overflow in uint104
     * uint104 is approx (2*1e48), so 100bln supply (1e11*1e18) with full index (approx 1e4*1e15) may cause overflow
     * @return _ Total borrow as present value (in tokens). uint256 return type is kept for compatibility with ERC20
     * balance types and for ease internal conversions. But in can be safely shortened to uint104
     */
    function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256) {
        /// once intermediate results are calculated, total borrow can be cut into uint104 by any caller-function
        /// as it is highly unlikely to have any borrow above 2*1e30 of tokens with 18 decimals

        return (uint256(principalValue_) * baseBorrowIndex_) / BASE_INDEX_SCALE;
    }

    /**
     * @dev The positive principal if positive or the negative principal if negative
     */
    function principalValue(int256 presentValue_) internal view returns (int104) {
        if (presentValue_ >= 0) {
            return signed104(principalValueSupply(baseSupplyIndex, uint256(presentValue_)));
        } else {
            return -signed104(principalValueBorrow(baseBorrowIndex, uint256(-presentValue_)));
        }
    }

    /**
     * @dev The present value projected backward by the supply index (rounded down)
     *  Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals.
     */
    function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return safe104((presentValue_ * BASE_INDEX_SCALE) / baseSupplyIndex_);
    }

    /**
     * @dev The present value projected backward by the borrow index (rounded up)
     *  Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals.
     */
    function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return safe104((presentValue_ * BASE_INDEX_SCALE + baseBorrowIndex_ - 1) / baseBorrowIndex_);
    }
}
