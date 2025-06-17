import {
    FaucetToken,
    SandboxComet,
    ConfigController,
  } from "../build/types";
  import {
    ethers,
    expect,
    exp,
    makeProtocol,
    wait,
    event
  } from "./helper/helpers";
  

  describe("closeMarket & pause flags", () => {

    async function openPosition(
      comet: SandboxComet,
      base: FaucetToken,
      coll: FaucetToken,
      user: string,
      amountBaseWei: bigint = 1_000_000n,
    ) {
      await coll.allocateTo(user, exp(2, await coll.decimals()));
      const signer = await ethers.getSigner(user);
      await coll.connect(signer).approve(comet.address, exp(2, await coll.decimals()));
      await comet.connect(signer).supply(coll.address, exp(2, await coll.decimals()));
      await comet.connect(signer).withdraw(base.address, amountBaseWei);
    }
  
    it("pays out correct reserves to DAO on closeMarket", async () => {
      const protocol = await makeProtocol({
        base: "USDC",
        seedReserves: 1_000_000,
        targetPercent: 0.5,
        assets: {
          USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
          WETH: { initial: 1e4, decimals: 18, initialPrice: 3_000 },
        },
      });

      console.log("INITIAL");
  
      const { comet, tokens, configController, sandboxController, dao, owner } = protocol;
      const { USDC, WETH } = tokens;

      await WETH.allocateTo(comet.address, exp(10, 18));
      await USDC.allocateTo(comet.address, 5_000_000);
  
      await comet.accrueAccount(comet.address);
  
      const tl = (await sandboxController.controllerConfiguration()).marketCloseTime;
  
      await configController.connect(owner).closeMarket(comet.address);
  
      await ethers.provider.send("evm_increaseTime", [Number(tl) - 60]);
      await expect(configController.connect(owner).closeMarket(comet.address))
        .to.be.revertedWithCustomError(configController, "TimelockActive");
  
      await ethers.provider.send("evm_increaseTime", [120]);
      const tx = await wait(configController.connect(owner).closeMarket(comet.address));
      
      expect(event(tx, 2)).to.deep.equal({
        ClosureExecuted: {
          comet: comet.address,
        },
      });
      
      const isClosed = await comet.isClosed();
      expect(isClosed).to.be.true;
    });

    it("DAO withdraw limited to reserves minus seed", async () => {
      const protocol = await makeProtocol({ base: "USDC", seedReserves: 500_000 });
      const { comet, tokens, dao } = protocol;
      const { USDC } = tokens;
  
      await USDC.allocateTo(comet.address, 3_000_000);
      await comet.accrueAccount(comet.address);
      
      await comet.connect(dao).daoWithdrawReserves();
      expect(await USDC.balanceOf(dao.address)).to.equal(3_000_000);
  
      await expect(
        comet.connect(await ethers.getSigner(dao.address)).daoWithdrawReserves(),
      ).to.be.revertedWithCustomError(comet, "InsufficientReserves");
    });
  

    it("blocks new collateral supply and transfers after market is closed", async () => {
      const protocol = await makeProtocol({ base: "USDC" });
      const { comet, tokens, configController, owner } = protocol;
      const { WETH } = tokens;

      await configController.connect(owner).closeMarket(comet.address);
      await ethers.provider.send("evm_increaseTime", [7*24 * 60 * 60]);
      await configController.connect(owner).closeMarket(comet.address);
  
      const user = protocol.users[0];
      await WETH.allocateTo(user.address, exp(1, 18));
      await WETH.connect(user).approve(comet.address, exp(1, 18));
  
      await expect(comet.connect(user).supply(WETH.address, exp(1, 18)))
        .to.be.revertedWithCustomError(comet, "Paused");
      await expect(comet.connect(user).transfer(protocol.users[1].address, 1))
        .to.be.revertedWithCustomError(comet, "Paused");
    });
  

    it("respects newly added pause bits", async () => {
      const protocol = await makeProtocol({ base: "USDC", baseBorrowMin: 1});
      const { comet, tokens, configController, users, owner, guardian} = protocol;
      const { USDC, WETH } = tokens;
      const alice = users[0];


      await configController.connect(guardian).pauseMarket(
        comet.address,
        false, false, false, false, false,
        true,
        false,
        false
      );
      await USDC.allocateTo(comet.address, 1_000_000);
      await USDC.allocateTo(alice.address, 1_000_000);
      await USDC.connect(alice).approve(comet.address, 1_000_000);
      await expect(
        comet.connect(alice).supply(USDC.address, 100_000),
      ).to.be.revertedWithCustomError(comet, "Paused");
  
      await openPosition(comet, USDC as FaucetToken, WETH as FaucetToken, alice.address, 10_000n);

      await configController.connect(guardian).pauseMarket(
        comet.address,
        false, false, false, false, false,
        true,
        true,
        true
      );
      await expect(comet.connect(alice).supply(USDC.address, 50_000)).to.not.be
        .reverted;
      await configController.connect(guardian).pauseMarket(
          comet.address,
          false, false, false, false, false,
          false,
          false,
          false
        );
      await expect(
        comet.connect(alice).supply(WETH.address, exp(1, 18)),
      ).to.be.revertedWithCustomError(comet, "Paused");
  
      await expect(
        comet.connect(alice).withdraw(USDC.address, 1_000),
      ).to.be.revertedWithCustomError(comet, "Paused");
    });
  });
  