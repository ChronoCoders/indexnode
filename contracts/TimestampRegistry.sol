pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TimestampRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(bytes32 => uint256) public timestamps;

    event HashCommitted(bytes32 indexed contentHash, uint256 blockNumber);

    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        require(_owner != address(0), "zero address: owner");
        __Ownable_init(_owner);
    }

    function commitHash(bytes32 contentHash) external {
        require(timestamps[contentHash] == 0, "Hash already committed");
        timestamps[contentHash] = block.number;
        emit HashCommitted(contentHash, block.number);
    }

    function verifyHash(bytes32 contentHash) external view returns (uint256) {
        return timestamps[contentHash];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    uint256[50] private __gap;
}
