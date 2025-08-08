// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

/**
 * @title AccessControl contract designed to manage access control for contracts.
 * @author WOOF!
 * @notice This contract provides a framework for managing access
 * control within a system, allowing for the designation of specific roles and permissions.
 */
abstract contract AccessControl {
    /// @notice The address of the contractor who can perform actions allowed only for authorized users or only contractor.
    address public contractor;

    /// @notice The address of the DAO that can perform actions allowed only for DAO or authorized users.
    address public dao;

    /**
     * @notice Emitted when the DAO is transferred.
     * @param previousDao The address of the previous DAO.
     * @param newDao The address of the new DAO.
     */
    event DaoTransferred(address indexed previousDao, address indexed newDao);

    /**
     * @notice Emitted when the contractor is set.
     * @param previousContractor The address of the previous contractor.
     * @param newContractor The address of the new contractor.
     */
    event ContractorSet(address indexed previousContractor, address indexed newContractor);

    /// @notice Reverts if zero address is provided.
    error ZeroAddress();

    /// @notice Reverts if the caller is not the DAO.
    error NotDao(address caller);

    /// @notice Reverts if the caller is not the contractor.
    error NotContractor(address caller);

    /// @notice Reverts if the caller is not authorized.
    error Unauthorized();

    /// @notice Reverts if the address is invalid.
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

    /// @dev Modifier to check if the caller is the contractor.
    modifier onlyContractor() {
        if (msg.sender != contractor) revert NotContractor(msg.sender);
        _;
    }

    /// @notice Constructor to set the DAO address during deployment.
    constructor(address _dao) {
        if (_dao == address(0)) revert ZeroAddress();

        dao = _dao;

        emit DaoTransferred(address(0), _dao);
    }

    /**
     * @notice Sets the contractor address.
     * @param newContractor The address of the new contractor.
     * @dev Only callable by the DAO.
     */
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
