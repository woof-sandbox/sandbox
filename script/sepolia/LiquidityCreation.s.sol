// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { MockERC20 } from "contracts/test/MockERC20.sol";
import { AggregatorV3Interface } from "contracts/interfaces/AggregatorV3Interface.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { INonfungiblePositionManager } from "contracts/interfaces/INonfungiblePositionManager.sol";

contract LiquidityCreation is Script {
    uint256 ownerPrivateKey = uint256(vm.envUint("OWNER_PRIVATE_KEY"));

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        INonfungiblePositionManager nfpm = INonfungiblePositionManager(0x1238536071E1c677A632429e3655c799b22cDA52);

        address[] memory tokens = new address[](10);
        tokens[0] = config.usdc.tokenAddress;
        tokens[1] = config.wbtc.tokenAddress;
        tokens[2] = config.weth.tokenAddress;
        tokens[3] = config.link.tokenAddress;
        tokens[4] = config.stETH.tokenAddress;
        tokens[5] = config.wstETH.tokenAddress;
        tokens[6] = config.sUSDe.tokenAddress;
        tokens[7] = config.snx.tokenAddress;
        tokens[8] = config.jpy.tokenAddress;
        tokens[9] = config.oETH.tokenAddress;

        address[] memory aggregators = new address[](10);
        aggregators[0] = config.usdc.priceFeed;
        aggregators[1] = config.wbtc.priceFeed;
        aggregators[2] = config.weth.priceFeed;
        aggregators[3] = config.link.priceFeed;
        aggregators[4] = config.stETH.priceFeed;
        aggregators[5] = config.wstETH.priceFeed;
        aggregators[6] = config.sUSDe.priceFeed;
        aggregators[7] = config.snx.priceFeed;
        aggregators[8] = config.jpy.priceFeed;
        aggregators[9] = config.oETH.priceFeed;

        uint24 fee = 500;

        vm.startBroadcast(ownerPrivateKey);

        for (uint256 i = 0; i < tokens.length; i++) {
            for (uint256 k = 1; k < tokens.length; k++) {
                address poolToken0 = tokens[i];
                address poolToken1 = tokens[k];

                address priceFeed0 = aggregators[i];
                address priceFeed1 = aggregators[k];

                if (poolToken0 == poolToken1) continue;

                bool reversedPair = poolToken0 > poolToken1;
                if (reversedPair) {
                    (poolToken0, poolToken1) = (poolToken1, poolToken0);
                    (priceFeed0, priceFeed1) = (priceFeed1, priceFeed0);
                }

                (, int256 price0, , , ) = AggregatorV3Interface(priceFeed0).latestRoundData();
                (, int256 price1, , , ) = AggregatorV3Interface(priceFeed1).latestRoundData();

                uint256 token0Price = uint256(price0);
                uint256 token1Price = uint256(price1);

                uint256 amount0;
                uint256 amount1;

                if (token0Price > token1Price) {
                    amount0 = 1 * 10 ** MockERC20(poolToken0).decimals();
                    amount1 = (token0Price / token1Price) * 10 ** MockERC20(poolToken1).decimals();
                } else {
                    amount0 = (token1Price / token0Price) * 10 ** MockERC20(poolToken0).decimals();
                    amount1 = 1 * 10 ** MockERC20(poolToken1).decimals();
                }

                uint160 sqrtPriceX96 = encodeSqrtRatioX96(amount1, amount0);

                address pool = nfpm.createAndInitializePoolIfNecessary(poolToken0, poolToken1, fee, sqrtPriceX96);

                string memory token0Name = MockERC20(poolToken0).name();
                string memory token1Name = MockERC20(poolToken1).name();

                console.log("-----------");
                console.log("Pool created", pool);
                console.log("Token0:", token0Name, "Token1:", token1Name);
                console.log("Fee:");
                console.logUint(uint256(fee));
                console.log("-----------");

                MockERC20(poolToken0).approve(address(nfpm), type(uint256).max);
                MockERC20(poolToken1).approve(address(nfpm), type(uint256).max);

                assert(amount0 > 0);
                assert(amount1 > 0);

                // Mint position on nearly created pool
                INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                    token0: poolToken0,
                    token1: poolToken1,
                    fee: fee,
                    tickLower: -887272,
                    tickUpper: 887272,
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: msg.sender,
                    deadline: block.timestamp + 100
                });

                (uint256 tokenId, uint128 liquidity, uint256 amount0Taken, uint256 amount1Taken) = nfpm.mint(params);

                console.log("Minted position:");
                console.log("Token ID:", tokenId);
                console.log("Liquidity:", liquidity);
                console.log("Amount0 Taken:", amount0Taken);
                console.log("Amount1 Taken:", amount1Taken);
                console.log("-----------");
            }
        }

        vm.stopBroadcast();
    }

    /**
     * @notice Encode a price between token0 and token1 as a sqrt ratio x96
     * @notice In case when decimals are the same
     * do not use price including decimals
     * In case when decimals are not the same
     * use price including decimals
     * Example:
     * 1 ETH = 1000 USDC (USDC = 6 decimals)
     * 1 ETH = 1000e6 USDC
     * amount0 = 1 ether; // 1+18 decimals
     * amount1 = 1000e6; // 1000+6 decimals
     * @param amount1 The amount of token1 as a price
     * @param amount0 The amount of token0 as a price
     * @return sqrtPriceX96 The encoded price
     */
    function encodeSqrtRatioX96(uint256 amount1, uint256 amount0) internal pure returns (uint160 sqrtPriceX96) {
        require(amount0 > 0, "PriceMath: division by zero");
        // Multiply amount1 by 2^192 (left shift by 192) to preserve precision after the square root.
        uint256 ratioX192 = (amount1 << 192) / amount0;
        uint256 sqrtRatio = Math.sqrt(ratioX192);
        require(sqrtRatio <= type(uint160).max, "PriceMath: sqrt overflow");
        sqrtPriceX96 = uint160(sqrtRatio);
    }
}
