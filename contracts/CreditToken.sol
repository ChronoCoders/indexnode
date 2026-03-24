// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditToken (INC)
 * @notice Immutable ERC-20 utility token for the IndexNode platform.
 *
 * Total supply: 1,000,000,000 INC (fixed, no minting).
 *
 * Distribution at deployment:
 *   - Ecosystem / Platform Rewards : 30% (300,000,000 INC)
 *   - Team                         : 20% (200,000,000 INC)  — vest off-chain or via separate vesting contract
 *   - Treasury                     : 20% (200,000,000 INC)
 *   - Public Sale                  : 15% (150,000,000 INC)
 *   - Investors / Seed             : 10% (100,000,000 INC)  — vest off-chain or via separate vesting contract
 *   - Liquidity (DEX seed)         : 5%  ( 50,000,000 INC)
 *
 * Credit mechanics:
 *   - purchaseCredits(amount)  : lock INC into this contract as platform credits
 *   - withdrawCredits(amount)  : unlock unused credits back to wallet
 *   - spendCredits(...)        : owner burns credits on job execution (deflationary)
 */
contract CreditToken is ERC20, Ownable {
    // ── Job costs ─────────────────────────────────────────────────────────────
    uint256 public constant CRAWL_JOB_COST        = 100 * 10 ** 18;
    uint256 public constant EVENT_INDEX_COST      =  50 * 10 ** 18;

    // ── Supply ────────────────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY          = 1_000_000_000 * 10 ** 18;

    uint256 public constant ECOSYSTEM_ALLOC       =   300_000_000 * 10 ** 18; // 30%
    uint256 public constant TEAM_ALLOC            =   200_000_000 * 10 ** 18; // 20%
    uint256 public constant TREASURY_ALLOC        =   200_000_000 * 10 ** 18; // 20%
    uint256 public constant PUBLIC_SALE_ALLOC     =   150_000_000 * 10 ** 18; // 15%
    uint256 public constant INVESTOR_ALLOC        =   100_000_000 * 10 ** 18; // 10%
    uint256 public constant LIQUIDITY_ALLOC       =    50_000_000 * 10 ** 18; //  5%

    // ── Credit ledger ─────────────────────────────────────────────────────────
    mapping(address => uint256) public creditBalance;

    // ── Events ────────────────────────────────────────────────────────────────
    event CreditsPurchased(address indexed user, uint256 amount);
    event CreditsWithdrawn(address indexed user, uint256 amount);
    event CreditsSpent(address indexed user, uint256 amount, string jobType);

    /**
     * @param ecosystem   Ecosystem / rewards wallet
     * @param team        Team wallet (apply vesting externally)
     * @param treasury    Protocol treasury wallet
     * @param publicSale  Public sale / IDO wallet
     * @param investors   Investor / seed wallet (apply vesting externally)
     * @param liquidity   DEX liquidity seeding wallet
     */
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

    // ── Credit mechanics ──────────────────────────────────────────────────────

    /// @notice Lock INC tokens as platform credits.
    function purchaseCredits(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
        _transfer(msg.sender, address(this), amount);
        creditBalance[msg.sender] += amount;
        emit CreditsPurchased(msg.sender, amount);
    }

    /// @notice Withdraw unused locked credits back to wallet.
    function withdrawCredits(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(creditBalance[msg.sender] >= amount, "Insufficient credit balance");
        creditBalance[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        emit CreditsWithdrawn(msg.sender, amount);
    }

    /// @notice Burn credits on job execution. Only callable by the platform owner.
    function spendCredits(address user, uint256 amount, string memory jobType) external onlyOwner {
        require(creditBalance[user] >= amount, "Insufficient credits");
        creditBalance[user] -= amount;
        _burn(address(this), amount);
        emit CreditsSpent(user, amount, jobType);
    }

    /// @notice Returns locked credit balance for a user.
    function getCreditBalance(address user) external view returns (uint256) {
        return creditBalance[user];
    }
}
