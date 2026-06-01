pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditToken is ERC20, Ownable {
    uint256 public constant CRAWL_JOB_COST        = 100 * 10 ** 18;
    uint256 public constant EVENT_INDEX_COST      =  50 * 10 ** 18;

    uint256 public constant TOTAL_SUPPLY          = 1_000_000_000 * 10 ** 18;

    uint256 public constant ECOSYSTEM_ALLOC       =   300_000_000 * 10 ** 18;
    uint256 public constant TEAM_ALLOC            =   200_000_000 * 10 ** 18;
    uint256 public constant TREASURY_ALLOC        =   200_000_000 * 10 ** 18;
    uint256 public constant PUBLIC_SALE_ALLOC     =   150_000_000 * 10 ** 18;
    uint256 public constant INVESTOR_ALLOC        =   100_000_000 * 10 ** 18;
    uint256 public constant LIQUIDITY_ALLOC       =    50_000_000 * 10 ** 18;

    mapping(address => uint256) public creditBalance;

    event CreditsPurchased(address indexed user, uint256 amount);
    event CreditsWithdrawn(address indexed user, uint256 amount);
    event CreditsSpent(address indexed user, uint256 amount, string jobType);

    constructor(
        address ecosystem,
        address team,
        address treasury,
        address publicSale,
        address investors,
        address liquidity
    ) ERC20("IndexNode Credits", "INC") Ownable(msg.sender) {
        require(ecosystem   != address(0), "zero address: ecosystem");
        require(team        != address(0), "zero address: team");
        require(treasury    != address(0), "zero address: treasury");
        require(publicSale  != address(0), "zero address: publicSale");
        require(investors   != address(0), "zero address: investors");
        require(liquidity   != address(0), "zero address: liquidity");

        _mint(ecosystem,  ECOSYSTEM_ALLOC);
        _mint(team,       TEAM_ALLOC);
        _mint(treasury,   TREASURY_ALLOC);
        _mint(publicSale, PUBLIC_SALE_ALLOC);
        _mint(investors,  INVESTOR_ALLOC);
        _mint(liquidity,  LIQUIDITY_ALLOC);
    }

    function purchaseCredits(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
        _transfer(msg.sender, address(this), amount);
        creditBalance[msg.sender] += amount;
        emit CreditsPurchased(msg.sender, amount);
    }

    function withdrawCredits(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(creditBalance[msg.sender] >= amount, "Insufficient credit balance");
        creditBalance[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        emit CreditsWithdrawn(msg.sender, amount);
    }

    function spendCredits(address user, uint256 amount, string memory jobType) external onlyOwner {
        require(creditBalance[user] >= amount, "Insufficient credits");
        creditBalance[user] -= amount;
        _burn(address(this), amount);
        emit CreditsSpent(user, amount, jobType);
    }

    function getCreditBalance(address user) external view returns (uint256) {
        return creditBalance[user];
    }
}
