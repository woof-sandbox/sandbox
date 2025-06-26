// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../contracts/interfaces/IUnifiedInterface.sol";
import "../contracts/interfaces/IProposalInterface.sol";

/**
 * @title UnifiedInterfaceExample
 * @author WOOF Software
 * @notice Примеры использования унифицированного интерфейса
 * @dev Демонстрирует различные способы передачи параметров
 */
contract UnifiedInterfaceExample {
    
    /// @notice Пример использования универсальных параметров
    /// @dev Показывает как передавать различные типы данных
    function exampleUniversalParams() public pure returns (IUnifiedInterface.UniversalParams memory) {
        // Создаем массивы для разных типов данных
        uint256[] memory uintValues = new uint256[](3);
        uintValues[0] = 1000;
        uintValues[1] = 2000;
        uintValues[2] = 3000;
        
        address[] memory addressValues = new address[](2);
        addressValues[0] = 0x1234567890123456789012345678901234567890;
        addressValues[1] = 0x0987654321098765432109876543210987654321;
        
        bool[] memory boolValues = new bool[](2);
        boolValues[0] = true;
        boolValues[1] = false;
        
        bytes[] memory bytesValues = new bytes[](1);
        bytesValues[0] = abi.encode("Hello", "World");
        
        string[] memory stringValues = new string[](2);
        stringValues[0] = "Parameter1";
        stringValues[1] = "Parameter2";
        
        return IUnifiedInterface.UniversalParams({
            uintValues: uintValues,
            addressValues: addressValues,
            boolValues: boolValues,
            bytesValues: bytesValues,
            stringValues: stringValues,
            paramType: 0 // Тип для uint параметров
        });
    }
    
    /// @notice Пример использования закодированных параметров
    /// @dev Показывает как кодировать параметры в bytes
    function exampleEncodedParams() public pure returns (bytes memory, uint8) {
        // Кодируем uint256 параметры
        uint256[] memory values = new uint256[](3);
        values[0] = 100;
        values[1] = 200;
        values[2] = 300;
        
        bytes memory encoded = abi.encode(values);
        uint8 paramType = 0; // Тип для uint параметров
        
        return (encoded, paramType);
    }
    
    /// @notice Пример использования типизированных значений
    /// @dev Показывает как передавать значения с типами
    function exampleTypedValues() public pure returns (uint256[] memory, uint8[] memory) {
        uint256[] memory values = new uint256[](4);
        values[0] = 1000; // uint256
        values[1] = uint256(uint160(0x1234567890123456789012345678901234567890)); // address
        values[2] = 2000; // uint256
        values[3] = uint256(uint160(0x0987654321098765432109876543210987654321)); // address
        
        uint8[] memory types = new uint8[](4);
        types[0] = 0; // uint256
        types[1] = 1; // address
        types[2] = 0; // uint256
        types[3] = 1; // address
        
        return (values, types);
    }
    
    /// @notice Пример создания предложения
    /// @dev Показывает как создать универсальное предложение
    function exampleProposal() public pure returns (IProposalInterface.ProposalType, IUnifiedInterface.UniversalParams memory) {
        // Создаем параметры для предложения изменения комиссии
        uint256[] memory feeValues = new uint256[](1);
        feeValues[0] = 500; // 5% комиссия
        
        address[] memory emptyAddresses = new address[](0);
        bool[] memory emptyBools = new bool[](0);
        bytes[] memory emptyBytes = new bytes[](0);
        string[] memory emptyStrings = new string[](0);
        
        IUnifiedInterface.UniversalParams memory params = IUnifiedInterface.UniversalParams({
            uintValues: feeValues,
            addressValues: emptyAddresses,
            boolValues: emptyBools,
            bytesValues: emptyBytes,
            stringValues: emptyStrings,
            paramType: 0
        });
        
        IProposalInterface.ProposalType proposalType = IProposalInterface.ProposalType.FeeChange;
        
        return (proposalType, params);
    }
    
    /// @notice Пример пакетного вызова
    /// @dev Показывает как выполнить несколько вызовов одновременно
    function exampleBatchCall() public pure returns (address[] memory, uint256[] memory, bytes[] memory) {
        address[] memory targets = new address[](2);
        targets[0] = 0x1234567890123456789012345678901234567890;
        targets[1] = 0x0987654321098765432109876543210987654321;
        
        uint256[] memory values = new uint256[](2);
        values[0] = 0; // Нет ETH
        values[1] = 0; // Нет ETH
        
        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSignature("transfer(address,uint256)", 
            0x1111111111111111111111111111111111111111, 1000);
        calldatas[1] = abi.encodeWithSignature("approve(address,uint256)", 
            0x2222222222222222222222222222222222222222, 2000);
        
        return (targets, values, calldatas);
    }
    
    /// @notice Пример декодирования результатов
    /// @dev Показывает как декодировать результаты из bytes
    function decodeResults(bytes[] memory results) public pure returns (uint256[] memory decodedResults) {
        decodedResults = new uint256[](results.length);
        
        for (uint i = 0; i < results.length; i++) {
            if (results[i].length > 0) {
                // Декодируем результат как uint256
                decodedResults[i] = abi.decode(results[i], (uint256));
            } else {
                decodedResults[i] = 0;
            }
        }
        
        return decodedResults;
    }
    
    /// @notice Пример валидации параметров
    /// @dev Показывает как валидировать универсальные параметры
    function validateParams(IUnifiedInterface.UniversalParams memory params) public pure returns (bool) {
        // Проверяем, что хотя бы один массив не пустой
        if (params.uintValues.length == 0 && 
            params.addressValues.length == 0 && 
            params.boolValues.length == 0 && 
            params.bytesValues.length == 0 && 
            params.stringValues.length == 0) {
            return false;
        }
        
        // Проверяем тип параметров
        if (params.paramType > 5) { // Максимальный поддерживаемый тип
            return false;
        }
        
        return true;
    }
} 