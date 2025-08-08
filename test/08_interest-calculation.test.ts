// import { ethers, expect } from "./helper/helpers";

describe.skip("8. interest calculation", function () {
  it("supply index is not growing without borrows", async () => {
    // wip
  });

  it("supply interest will not exceed seed reserves in case of no borrows for new market", async () => {
    // wip
    // todo: add changes in code
    /// No borrows - keep interest until the seed reserves exhaustion
    /// if (utilization == 0 && totalSupply() >= IERC20(baseToken).balanceOf(address(this))) return 0;
  });
  // placeholder for interest calculation as extension on supply and withdraw tests
});
