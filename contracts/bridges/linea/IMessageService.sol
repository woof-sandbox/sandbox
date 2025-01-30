pragma solidity 0.8.28;

interface IMessageService {
  function sender() external view returns (address);
}
