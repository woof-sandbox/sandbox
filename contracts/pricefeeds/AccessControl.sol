// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

abstract contract AccessControl {
    address public owner;
    address public dao;

    error ZeroAddress();
    error NotOwner(address caller);
    error NotDao(address caller);
    error Unauthorized();

    /**
     * @dev Modifier to check if the caller is the owner.
     */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    /**
     * @dev Modifier to check if the caller is the DAO.
     */
    modifier onlyDao() {
        if (msg.sender != dao) revert NotDao(msg.sender);
        _;
    }

    /**
     * @dev Both owner and dao are considered "authorized."
     *      If you want them to have separate powers, use onlyOwner or onlyDao
     *      in the relevant functions. For shared powers, use onlyAuthorized.
     */
    modifier onlyAuthorized() {
        if (msg.sender != owner && msg.sender != dao) revert Unauthorized();
        _;
    }

    constructor(address _owner, address _dao) {
        if (_owner == address(0) || _dao == address(0)) revert ZeroAddress();

        owner = _owner;
        dao = _dao;
    }

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event DaoTransferred(address indexed previousDao, address indexed newDao);

    /**
     * @notice Transfers the owner privileges to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external onlyDao {
        if (newDao == address(0)) revert ZeroAddress();
        emit DaoTransferred(dao, newDao);
        dao = newDao;
    }
}
