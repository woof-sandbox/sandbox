// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";

interface IConfigControllerEvents {
    event CometCreated(address comet, address baseToken, address priceFeed, uint cometId, uint baseTokenCurveId);
    event CuratorProposed(uint256 indexed proposalId, address indexed currentCurator, address indexed proposedCurator, uint expiry);
    event CuratorAccepted(uint256 indexed proposalId, address indexed oldCurator, address indexed newCurator);
    event CuratorCanceled(address indexed oldCurator);
    event CuratorProposalCancelled(address indexed proposedCurator);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event CometFeeEnabled(address configController, address _comet, bool _enabled);

    event ProposeNewCollateralToken(uint256 indexed proposalId, address indexed proposer);

    event ProposalDurationsUpdated(
        uint oldCuratorDuration,
        uint newCuratorDuration,
        uint oldProposalDuration,
        uint newProposalDuration
    );

    event ProposalAccepted(
        uint8 indexed proposalType,
        address indexed accepter,
        bytes32 proposalData
    );

    event ProposeNewCollateralTokenAccepted(uint256 indexed proposalId, address indexed proposer);

    event ProposalCanceled(uint256 indexed proposalId, address indexed canceler);

    event OwnershipGranted(address indexed oldOwner, address indexed newOwner);

    event ProposeCollateralRemoval(uint256 indexed proposalId, address indexed proposer, address indexed collateralToken);

    event ProposeCollateralRemovalAccepted(uint256 indexed proposalId, address indexed accepter, address indexed collateralToken);

    event ProposeCurveTransition(uint256 indexed proposalId, address indexed proposer, uint8 curveId);

    event ProposeCurveTransitionAccepted(uint256 indexed proposalId, address indexed accepter, uint8 curveId);

    event ProposeMarketDeprecation(uint256 indexed proposalId, address indexed proposer);

    event ProposeMarketDeprecationAccepted(uint256 indexed proposalId, address indexed accepter, address indexed market);

    event ProposalTimelockSetted(uint256 indexed proposalId, address indexed accepter, uint40 timelock);

    event ProposeMarketTransfer(uint256 indexed proposalId, address indexed proposer, address indexed configController);

    event ProposeMarketTransferAccepted(uint256 indexed proposalId, address indexed accepter, address indexed configController);

    event CometAccepted(address indexed comet);
}
