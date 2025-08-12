import { expect } from "./helper/helpers";

// todo: fix this
describe.skip("12. getReserves", function () {
  async function netReserves(comet, seedReserves) {
    const raw = await comet.getReserves();
    return BigInt(raw.toString()) - BigInt(seedReserves);
  }
  it("stores non-zero seedReserves value", async () => {
    let protocol; // = await makeProtocol({ base: "USDC" });
    const { seedReserves } = protocol;

    expect(seedReserves).to.be.gt(0n);
  });

  it("getReserves equals seedReserves right after deployment", async () => {
    let protocol; // = await makeProtocol({ base: "USDC" });
    const { comet, seedReserves } = protocol;

    const raw = await comet.getReserves();
    expect(BigInt(raw.toString())).to.equal(seedReserves);
    expect(await netReserves(comet, seedReserves)).to.equal(0n);
  });

  it("calculates 0 reserves", async () => {
    let protocol; // = await makeProtocol({ base: "USDC" });
    const { comet, tokens, seedReserves } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100);

    //await setTotalsBasic(comet, {
    //  baseSupplyIndex: 4e15,
    //  baseBorrowIndex: 3e15,
    //  totalSupplyBase: 25n,
    //  totalBorrowBase: 0n,
    //});

    expect(await netReserves(comet, seedReserves)).to.equal(0n);
  });

  it("calculates positive reserves", async () => {
    let protocol; // = await makeProtocol({ base: "USDC" });
    const { comet, tokens, seedReserves } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100);

    //await setTotalsBasic(comet, {
    //  baseSupplyIndex: 2e15,
    //  baseBorrowIndex: 5e15,
    //  totalSupplyBase: 50n,
    //  totalBorrowBase: 10n,
    //});

    expect(await netReserves(comet, seedReserves)).to.equal(50n);
  });

  it("calculates negative reserves", async () => {
    let protocol; // = await makeProtocol({ base: "USDC" });
    const { comet, seedReserves } = protocol;

    //await setTotalsBasic(comet, {
    //  baseSupplyIndex: 2e15,
    //  baseBorrowIndex: 3e15,
    //  totalSupplyBase: 50n,
    //  totalBorrowBase: 0n,
    //});

    expect(await netReserves(comet, seedReserves)).to.equal(-100n);
  });
});
