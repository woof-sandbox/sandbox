// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;
import "./FaucetToken.sol";

/**
 * @title The Compound Faucet Test Token
 * @author Compound
 * @notice A simple test token that lets anyone get more of it.
 */
contract ManagedFaucetToken is StandardToken {
    address public admin;
    constructor(uint256 _initialAmount, string memory _tokenName, uint8 _decimalUnits, string memory _tokenSymbol)
        StandardToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        admin = msg.sender;
    }

    function changeAdmin(address newAdmin) public {
        require(msg.sender == admin, "Only admin");
        admin = newAdmin;
    }

    function allocateTo(address _owner, uint256 value) public {
        require(msg.sender == admin, "Only admin");
        balanceOf[_owner] += value;
        totalSupply += value;
        emit Transfer(address(this), _owner, value);
    }
}
