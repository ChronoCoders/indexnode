// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0; 
 
contract TimestampRegistry { 
    mapping(bytes32 => uint256) public timestamps; 
    event HashCommitted(bytes32 indexed contentHash, uint256 blockNumber); 
     
    function commitHash(bytes32 contentHash) external { 
        require(timestamps[contentHash] == 0, "Hash already committed"); 
        timestamps[contentHash] = block.number; 
        emit HashCommitted(contentHash, block.number); 
    } 
     
    function verifyHash(bytes32 contentHash) external view returns (uint256) { 
        return timestamps[contentHash]; 
    } 
} 
