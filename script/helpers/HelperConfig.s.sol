// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";

contract HelperConfig is Script {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/
    struct NetworkConfig {
        address wstETH;
        address stETH;
        address usdc;
        address weth;
        address wbtc;
        address comp;
        address link;
        address usdcPriceFeed;
        address wethPriceFeed;
        address wbtcPriceFeed;
        address compPriceFeed;
        address linkPriceFeed;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 public constant SEPOLIA_TESTNET_CHAIN_ID = 11155111;
    uint256 public constant ARBITRUM_MAINNET_CHAIN_ID = 42161;

    mapping(uint256 => NetworkConfig) public networkConfigs;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    constructor() {
        networkConfigs[SEPOLIA_TESTNET_CHAIN_ID] = getSepoliaTestnetConfig();
        networkConfigs[ARBITRUM_MAINNET_CHAIN_ID] = getArbitrumMainnetConfig();
    }

    function getConfig() public view returns (NetworkConfig memory) {
        uint256 chainId = block.chainid;
        if (networkConfigs[chainId].usdc != address(0)) {
            return networkConfigs[chainId];
        } else {
            revert HelperConfig__InvalidChainId();
        }
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    function getSepoliaTestnetConfig() public pure returns (NetworkConfig memory) {
        return
            NetworkConfig({
                wstETH: 0x1044EE6eCA0b6a44057BfB46EF488fA8471875d4,
                stETH: 0xB14a20F994E578f600834aEdA91cE18529ad2520,
                usdc: 0x306134121e8B55dfA9faBA05De590E639a1F7D6B,
                weth: 0x4F8037F0A814A191fBF03E7F31e77cc118F19A95,
                wbtc: 0xb01f67f936b018edf565311A0ab55F3e1A05dBaf,
                comp: 0x2001c123a7d08d355b323d21E2c24b4bcB35C2FE,
                link: 0x75B3598A06aBF790A25FF4B956799945c38D0bf5,
                usdcPriceFeed: 0xA512C74c637108FD1Cae88163176480452B1Fb8E,
                wethPriceFeed: 0xf48275a25d45b22151265B7B7a686b6469e13841,
                wbtcPriceFeed: 0x651D96AfbeE282C1D58ECFce0D2dd8515255e020,
                compPriceFeed: 0x9d82DcF7Fe854EBCE8AF6D0B2206E2Cfb62a8EcE,
                linkPriceFeed: 0x62E979Ddfc74A6d4E23624cF1EdF0612E501c7a5
            });
    }

    function getArbitrumMainnetConfig() public pure returns (NetworkConfig memory) {
        return
            NetworkConfig({
                wstETH: 0x0fBcbaEA96Ce0cF7Ee00A8c19c3ab6f5Dc8E1921,
                stETH: 0x000000000000000000000000000000000000dEaD,
                usdc: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
                weth: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
                wbtc: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f,
                comp: 0x354A6dA3fcde098F8389cad84b0182725c6C91dE,
                link: 0xf97f4df75117a78c1A5a0DBb814Af92458539FB4,
                usdcPriceFeed: 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3,
                wethPriceFeed: 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612,
                wbtcPriceFeed: 0x6ce185860a4963106506C203335A2910413708e9,
                compPriceFeed: 0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884,
                linkPriceFeed: 0x86E53CF1B870786351Da77A57575e79CB55812CB
            });
    }
}
