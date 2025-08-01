// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ERC4626, ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract ERC4626RateProviderTest is ERC4626 {
    uint8 internal decimals_;

    constructor(address asset_, string memory name_, string memory symbol_, uint8 decimals_) ERC4626(IERC20(asset_)) ERC20(name_, symbol_) {
        decimals_ = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return decimals_;
    }

    function convertToAssets(uint256 shares) public pure override returns (uint256) {
        return shares; // For testing purposes, assume 1:1 conversion
    }
}
