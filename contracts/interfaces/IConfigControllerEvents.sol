// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

interface IConfigControllerEvents {
    event CometCreated(address comet, address baseToken, address priceFeed, uint256 cometId, uint256 baseTokenCurveId);
    event CuratorProposed(address indexed currentCurator, address indexed proposedCurator, uint64 expiry);
    event CuratorAccepted(address indexed oldCurator, address indexed newCurator);
    event CuratorCanceled(address indexed oldCurator);
    event CuratorProposalCancelled(address indexed proposedCurator);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);

    event ProposalDurationsUpdated(
        uint40 oldCuratorDuration,
        uint40 newCuratorDuration,
        uint40 oldProposalDuration,
        uint40 newProposalDuration
    );

    event CometFeeEnabled(address indexed controller, address indexed comet, bool enabled);

    event OwnershipGranted(address indexed oldOwner, address indexed newOwner);
}
