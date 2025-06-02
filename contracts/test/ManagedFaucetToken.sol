// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title The Compound Faucet Test Token
 * @author Compound
 * @notice A simple test token that lets anyone get more of it.
 */
contract ManagedFaucetToken is ERC20 {
    address public admin;
    uint8 public immutable decimals_;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) ERC20(_tokenName, _tokenSymbol) {
        _mint(msg.sender, _initialAmount);
        admin = msg.sender;
        decimals_ = _decimalUnits;
    }

    function decimals() public view override returns (uint8) {
        return decimals_;
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 value
    ) internal override {}

    function changeAdmin(address newAdmin) public {
        require(msg.sender == admin, "Only admin");
        admin = newAdmin;
    }

    function allocateTo(address _owner, uint256 value) public {
        require(msg.sender == admin, "Only admin");
        _mint(_owner, value);
    }
}
