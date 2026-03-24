// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title TimestampRegistry
 * @notice UUPS-upgradeable registry for committing content hashes on-chain,
 *         providing provable existence proofs.
 */
contract TimestampRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(bytes32 => uint256) public timestamps;

    event HashCommitted(bytes32 indexed contentHash, uint256 blockNumber);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        require(_owner != address(0), "zero address: owner");
        __Ownable_init(_owner);
    }

    /// @notice Commit a content hash. Each hash can only be committed once.
    function commitHash(bytes32 contentHash) external {
        require(timestamps[contentHash] == 0, "Hash already committed");
        timestamps[contentHash] = block.number;
        emit HashCommitted(contentHash, block.number);
    }

    /// @notice Returns the block number when the hash was committed, or 0 if not committed.
    function verifyHash(bytes32 contentHash) external view returns (uint256) {
        return timestamps[contentHash];
    }

    // ── UUPS ──────────────────────────────────────────────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
