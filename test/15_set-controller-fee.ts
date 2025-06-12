import { expect, makeProtocol } from './helper/helpers';


describe('setControllerFee', () => {

  it('initial flag is **enabled** (disabled = false)', async () => {
    const { comet } = await makeProtocol({});
    expect(await comet.controllerFeeDisabled()).to.equal(false);
  });

  it('owner of ConfigController can disable and re-enable the fee', async () => {
    const { comet, configController, owner} = await makeProtocol({});

    await expect(
      configController
        .connect(owner)
        .setControllerFee(comet.address, true),
    )
      .to.emit(comet, 'ControllerFeeDisabled')
      .withArgs(true);

    expect(await comet.controllerFeeDisabled()).to.equal(true);

    await expect(
      configController
        .connect(owner)
        .setControllerFee(comet.address, false),
    )
      .to.emit(comet, 'ControllerFeeDisabled')
      .withArgs(false);

    expect(await comet.controllerFeeDisabled()).to.equal(false);
  });

  it('reverts when a non-owner calls through the ConfigController', async () => {
    const { comet, configController, users } = await makeProtocol({});
    const [, nonOwner] = users;

    await expect(
      configController
        .connect(nonOwner)
        .setControllerFee(comet.address, true),
    ).to.be.revertedWith("custom error 'Unauthorized()'");
  });
});
