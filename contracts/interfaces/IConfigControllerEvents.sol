// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface IConfigControllerEvents {
    event CometCreated(address comet, address baseToken, address priceFeed, uint cometId, uint baseTokenCurveId);
    event CuratorProposed(address indexed currentCurator, address indexed proposedCurator, uint expiry);
    event CuratorAccepted(address indexed oldCurator, address indexed newCurator);
    event CuratorCanceled(address indexed oldCurator);
    event CuratorProposalCancelled(address indexed proposedCurator);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    
    event ProposalDurationsUpdated(
        uint oldCuratorDuration,
        uint newCuratorDuration,
        uint oldProposalDuration,
        uint newProposalDuration
    );


    event CometFeeEnabled(address indexed controller, address indexed comet, bool enabled);

}