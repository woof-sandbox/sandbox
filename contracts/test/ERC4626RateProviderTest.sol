// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ERC4626, ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract ERC4626RateProviderTest is ERC4626 {
    uint8 internal decimals_;
    uint256 public rate_;

    constructor(address asset_, string memory name_, string memory symbol_, uint8 _decimals) ERC4626(IERC20(asset_)) ERC20(name_, symbol_) {
        decimals_ = _decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return decimals_;
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        return rate_; // For testing purposes, assume 1:1 conversion
    }

    function setRate(uint256 rate) external {
        rate_ = rate;
    }
}
