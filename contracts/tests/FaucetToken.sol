// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title The Compound Faucet Test Token
 * @author Compound
 * @notice A simple test token that lets anyone get more of it.
 */
contract FaucetToken is ERC20 {
    uint8 public immutable decimals_;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) ERC20(_tokenName, _tokenSymbol) {
        decimals_ = _decimalUnits;

        _mint(msg.sender, _initialAmount);
    }

    function decimals() public view override returns (uint8) {
        return decimals_;
    }

    function allocateTo(address _owner, uint256 value) public {
        _mint(_owner, value);
    }
}
