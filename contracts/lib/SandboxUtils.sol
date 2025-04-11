pragma solidity 0.8.28;

import "../interfaces/ISandboxController.sol";


library SandboxUtils {
        
    function encodeCurve(
        address baseAsset,
        ISandboxController.BaseAssetCurve memory curve
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(
                baseAsset,
                curve.supplyKink,
                curve.supplyPerYearInterestRateSlopeLow,
                curve.supplyPerYearInterestRateSlopeHigh,
                curve.supplyPerYearInterestRateBase,
                curve.borrowKink,
                curve.borrowPerYearInterestRateSlopeLow,
                curve.borrowPerYearInterestRateSlopeHigh,
                curve.borrowPerYearInterestRateBase
            ));
    }

}