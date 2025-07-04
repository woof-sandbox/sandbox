// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./CometStorage.sol";
import "./CometMath.sol";

abstract contract CometCore is CometStorage, CometMath {
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
     * @notice Spend the allowance of an asset for a spender on behalf of an owner
     * @param owner The owner account
     * @param manager The spender account
     * @param asset The asset being spent
     * @param amount The amount to spend
     * @return Whether or not the allowance was successfully spent
     */
    function spendAllowance(address owner, address manager, address asset, uint256 amount) internal returns (bool) {
        if (owner == manager) return true;
        unchecked {
            allowance[owner][manager][asset] -= amount;
        }
        return true;
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
     */
    function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256) {
        return (uint256(principalValue_) * baseSupplyIndex_) / BASE_INDEX_SCALE;
    }

    /**
     * @dev The principal amount projected forward by the borrow index
     */
    function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256) {
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
