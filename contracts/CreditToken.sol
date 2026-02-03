// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0; 
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import "@openzeppelin/contracts/access/Ownable.sol"; 
 
contract CreditToken is ERC20, Ownable { 
    uint256 public constant CRAWL_JOB_COST = 100 * 10**18; 
    uint256 public constant EVENT_INDEX_COST = 50 * 10**18; 
    
    mapping(address => uint256) public creditBalance; 
    
    event CreditsPurchased(address indexed user, uint256 amount); 
    event CreditsSpent(address indexed user, uint256 amount, string jobType); 
    
    constructor() ERC20("IndexNode Credits", "INC") Ownable(msg.sender) { 
        _mint(msg.sender, 1000000 * 10**18); 
    } 
    
    function purchaseCredits(uint256 amount) external { 
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance"); 
        _transfer(msg.sender, address(this), amount); 
        creditBalance[msg.sender] += amount; 
        emit CreditsPurchased(msg.sender, amount); 
    } 
    
    function spendCredits(address user, uint256 amount, string memory jobType) external onlyOwner { 
        require(creditBalance[user] >= amount, "Insufficient credits"); 
        creditBalance[user] -= amount; 
        emit CreditsSpent(user, amount, jobType); 
    } 
    
    function getCreditBalance(address user) external view returns (uint256) { 
        return creditBalance[user]; 
    } 
} 
