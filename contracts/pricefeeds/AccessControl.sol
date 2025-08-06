// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

abstract contract AccessControl {
    address public contractor;
    address public dao;

    event DaoTransferred(address indexed previousDao, address indexed newDao);
    event ContractorSet(address indexed previousContractor, address indexed newContractor);

    error ZeroAddress();
    error NotDao(address caller);
    error NotContractor(address caller);
    error Unauthorized();
    error InvalidAddress();

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
        if (msg.sender != contractor && msg.sender != dao) revert Unauthorized();
        _;
    }

    modifier onlyContractor() {
        if (msg.sender != contractor) revert NotContractor(msg.sender);
        _;
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert ZeroAddress();

        dao = _dao;

        emit DaoTransferred(address(0), _dao);
    }

    function setContractor(address newContractor) external onlyDao {
        if (newContractor == contractor) revert InvalidAddress();

        emit ContractorSet(contractor, newContractor);

        contractor = newContractor;
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external onlyDao {
        if (newDao == address(0)) revert ZeroAddress();
        if (newDao == dao) revert InvalidAddress();

        emit DaoTransferred(dao, newDao);

        dao = newDao;
    }
}
