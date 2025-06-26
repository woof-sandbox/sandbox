// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

/**
 * @title IUnifiedInterface
 * @author WOOF Software
 * @notice Унифицированный интерфейс для приема различных типов параметров
 * @dev Предоставляет несколько подходов для унификации параметров функций
 */
interface IUnifiedInterface {
    
    /// @notice Универсальная структура для передачи параметров
    /// @dev Позволяет передавать различные типы данных в одной структуре
    struct UniversalParams {
        uint256[] uintValues;      // Для uint параметров
        address[] addressValues;   // Для address параметров
        bool[] boolValues;         // Для bool параметров
        bytes[] bytesValues;       // Для bytes параметров
        string[] stringValues;     // Для string параметров
        uint8 paramType;           // Тип параметров (0-255)
    }
    
    /// @notice Универсальная функция для обработки различных типов параметров
    /// @param params Универсальная структура с параметрами
    /// @return result Результат выполнения
    function processUniversalParams(UniversalParams memory params) external returns (bytes memory result);
    
    /// @notice Функция с динамическими параметрами через bytes
    /// @param encodedParams Закодированные параметры в bytes
    /// @param paramType Тип параметров
    /// @return result Результат выполнения
    function processEncodedParams(bytes memory encodedParams, uint8 paramType) external returns (bytes memory result);
    
    /// @notice Функция с массивом значений и типов
    /// @param values Массив значений (все как uint256)
    /// @param types Массив типов для каждого значения
    /// @return result Результат выполнения
    function processTypedValues(uint256[] memory values, uint8[] memory types) external returns (bytes memory result);
    
    /// @notice Функция с calldata для вызова других контрактов
    /// @param targets Массив адресов целевых контрактов
    /// @param values Массив значений для передачи
    /// @param calldatas Массив calldata для вызовов
    /// @return results Массив результатов
    function batchCall(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (bytes[] memory results);
}

/**
 * @title IProposalInterface
 * @author WOOF Software
 * @notice Специализированный интерфейс для работы с предложениями
 */
interface IProposalInterface {
    
    /// @notice Типы предложений
    enum ProposalType {
        CuratorProposal,           // 0
        CollateralTokenAdd,        // 1
        CollateralTokenRemove,     // 2
        MarketTransfer,           // 3
        ConfigurationChange,      // 4
        FeeChange,                // 5
        GuardianChange            // 6
    }
    
    /// @notice Универсальная структура предложения
    struct UniversalProposal {
        address proposer;
        uint256 proposalId;
        uint256 creationTime;
        uint256 expirationTime;
        ProposalType proposalType;
        UniversalParams params;
        bool executed;
        bool canceled;
    }
    
    /// @notice Создает универсальное предложение
    /// @param proposalType Тип предложения
    /// @param params Универсальные параметры
    /// @return proposalId ID созданного предложения
    function createUniversalProposal(
        ProposalType proposalType,
        IUnifiedInterface.UniversalParams memory params
    ) external returns (uint256 proposalId);
    
    /// @notice Выполняет предложение
    /// @param proposalId ID предложения для выполнения
    function executeProposal(uint256 proposalId) external;
    
    /// @notice Отменяет предложение
    /// @param proposalId ID предложения для отмены
    function cancelProposal(uint256 proposalId) external;
    
    /// @notice Получает информацию о предложении
    /// @param proposalId ID предложения
    /// @return proposal Структура предложения
    function getProposal(uint256 proposalId) external view returns (UniversalProposal memory proposal);
} 