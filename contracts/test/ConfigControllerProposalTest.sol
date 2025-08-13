// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerProposalTest is ConfigController {
    function createProposal2(
        bytes calldata _calldata,
        address _comet,
        uint256 _proposalType
    ) external returns (uint256) {
        // Increment proposal counter
        proposalCounter++;
        uint256 proposalId = proposalCounter;

        proposals[proposalId] = Proposal({
                proposer: msg.sender,
                proposalType: ProposalType(_proposalType),
                maturityTime: uint40(block.timestamp + 1 weeks), /// TODO: Change to sandboxController.proposalBoundaries()
                expirationTime: uint40(block.timestamp + 2 weeks), /// TODO: Change to sandboxController.proposalBoundaries()
                timelock: 0, /// TODO: Change to sandboxController.proposalBoundaries()
                comet: _comet,
                call: _calldata
            });

        emit ProposeNewCollateralToken(proposalId, msg.sender);
        
        return proposalId;
    }

    function addCollateralAsset(
        uint256 _proposalId
    ) external {
        Proposal memory _proposal = proposals[_proposalId];
        (bool success, bytes memory result) = _proposal.comet.call(_proposal.call);
        if (!success) revert CometCallFailed();
    }
}