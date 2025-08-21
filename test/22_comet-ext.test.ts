import { ethers, expect, exp } from "./helper/helpers";
import type { SandboxComet } from "../build/types";
//import type { FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
//import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// Define the extended interface for the comet contract with additional methods
interface ExtendedCometHarness extends SandboxComet {
  factorScale(): Promise<bigint>;
  priceScale(): Promise<bigint>;
  getConfiguration(): Promise<any>;
}

// todo: fix test
describe.skip("22. CometExtension", () => {
  let comet: ExtendedCometHarness;
  //let user: SignerWithAddress;
  //let tokens: Record<string, FaucetToken | NonStandardFaucetFeeToken>;

  beforeEach(async () => {
    let protocol;
    const baseComet = protocol.comet;
    //user = protocol.users[0];
    //tokens = protocol.tokens;

    const [signer] = await ethers.getSigners();
    const extAbi = [
      "function factorScale() view returns (uint64)",
      "function priceScale()  view returns (uint64)",
      "function getConfiguration() view returns(" +
        "tuple(" +
        "address configController," +
        "address baseToken," +
        "address baseTokenPriceFeed," +
        "address extensionDelegate," +
        "uint64 supplyKink," +
        "uint64 supplyPerYearInterestRateSlopeLow," +
        "uint64 supplyPerYearInterestRateSlopeHigh," +
        "uint64 supplyPerYearInterestRateBase," +
        "uint64 borrowKink," +
        "uint64 borrowPerYearInterestRateSlopeLow," +
        "uint64 borrowPerYearInterestRateSlopeHigh," +
        "uint64 borrowPerYearInterestRateBase," +
        "uint64 storeFrontPriceFactor," +
        "uint64 trackingIndexScale," +
        "uint64 baseTrackingSupplySpeed," +
        "uint64 baseTrackingBorrowSpeed," +
        "uint104 baseMinForRewards," +
        "uint104 baseBorrowMin," +
        "uint104 targetPercent," +
        "uint104 seedReserves," +
        "uint64 unlockTimestamp," +
        "tuple(address collateralToken, address priceFeed, uint256 borrowCollateralFactor, uint256 liquidateCollateralFactor, uint256 liquidationFactor, uint256 supplyCap, uint256 scale)[] assetConfigs" +
        "))",
    ];
    comet = new ethers.Contract(baseComet.address, [...baseComet.interface.fragments, ...extAbi], signer) as ExtendedCometHarness;

    //await setTotalsBasic(comet, { baseSupplyIndex: 2e15, baseBorrowIndex: 3e15 });
  });

  it("returns factor scale", async () => {
    expect(await comet.factorScale()).to.equal(exp(1, 18));
  });

  it("returns collateralBalance (in units of the collateral asset)", async () => {
    //const { WETH } = tokens;
    //await comet.setCollateralBalance(user.address, WETH.address, exp(5, 18));
    //expect(await comet.collateralBalanceOf(user.address, WETH.address)).to.equal(exp(5, 18));
  });
});
