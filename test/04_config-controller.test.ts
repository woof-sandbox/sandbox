import { ethers, expect, makeConfigController } from "./helper/helpers";

describe("ConfigController", () => {
  describe("grantOwnership", () => {
    it("should transfer ownership", async () => {
      const { configController, users } = await makeConfigController();

      await configController.grantOwnership(users[4].address);

      expect(await configController.owner()).to.equal(users[4].address);
    });

    it("reverts if newOwner is zero address", async () => {
      const { configController } = await makeConfigController();

      await expect(configController.grantOwnership(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if not owner", async () => {
      const { configController, users } = await makeConfigController();

      await expect(configController.connect(users[4]).grantOwnership(users[5].address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("setGuardian", () => {
    it("should allow owner to set new guardian", async () => {
      const { configController, users } = await makeConfigController();
      const newGuardian = users[4].address;
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(newGuardian))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, newGuardian);
      expect(await configController.guardian()).to.equal(newGuardian);
    });

    it("should allow owner to set guardian to zero address", async () => {
      const { configController } = await makeConfigController();
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(ethers.constants.AddressZero))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, ethers.constants.AddressZero);
      expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to set guardian", async () => {
      const { configController, users } = await makeConfigController();
      const newGuardian = users[4].address;
      await expect(configController.connect(users[4]).setGuardian(newGuardian)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });
});
