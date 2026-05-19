// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../CreditToken.sol";

contract CreditTokenTest is Test {
    CreditToken token;

    address constant ECOSYSTEM   = address(0xE1);
    address constant TEAM        = address(0xE2);
    address constant TREASURY    = address(0xE3);
    address constant PUBLIC_SALE = address(0xE4);
    address constant INVESTORS   = address(0xE5);
    address constant LIQUIDITY   = address(0xE6);

    address constant ALICE = address(0xA11CE);
    address constant BOB   = address(0xB0B);

    uint256 constant ALICE_INC = 1_000e18;

    function setUp() public {
        token = new CreditToken(ECOSYSTEM, TEAM, TREASURY, PUBLIC_SALE, INVESTORS, LIQUIDITY);
        // Fund Alice from the ecosystem allocation so she has tokens to lock.
        vm.prank(ECOSYSTEM);
        token.transfer(ALICE, ALICE_INC);
    }

    // ── Deployment ────────────────────────────────────────────────────────────

    function test_distribution_matches_allocations() public view {
        // ECOSYSTEM started with 300M but seeded ALICE_INC to Alice in setUp.
        assertEq(token.balanceOf(ECOSYSTEM),   token.ECOSYSTEM_ALLOC()   - ALICE_INC);
        assertEq(token.balanceOf(TEAM),        token.TEAM_ALLOC());
        assertEq(token.balanceOf(TREASURY),    token.TREASURY_ALLOC());
        assertEq(token.balanceOf(PUBLIC_SALE), token.PUBLIC_SALE_ALLOC());
        assertEq(token.balanceOf(INVESTORS),   token.INVESTOR_ALLOC());
        assertEq(token.balanceOf(LIQUIDITY),   token.LIQUIDITY_ALLOC());
    }

    function test_total_supply_equals_one_billion() public view {
        assertEq(token.totalSupply(), 1_000_000_000e18);
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    function test_job_cost_constants() public view {
        assertEq(token.CRAWL_JOB_COST(),   100e18);
        assertEq(token.EVENT_INDEX_COST(),  50e18);
    }

    // ── purchaseCredits ───────────────────────────────────────────────────────

    function test_purchaseCredits_locks_tokens_and_credits_user() public {
        uint256 amount = 200e18;
        uint256 contractBalBefore = token.balanceOf(address(token));

        vm.prank(ALICE);
        token.purchaseCredits(amount);

        assertEq(token.creditBalance(ALICE),         amount);
        assertEq(token.balanceOf(ALICE),             ALICE_INC - amount);
        assertEq(token.balanceOf(address(token)),    contractBalBefore + amount);
    }

    function test_purchaseCredits_reverts_when_insufficient_balance() public {
        // Bob has zero INC.
        vm.prank(BOB);
        vm.expectRevert(bytes("Insufficient token balance"));
        token.purchaseCredits(1e18);
    }

    function test_purchaseCredits_reverts_on_zero_amount() public {
        vm.prank(ALICE);
        vm.expectRevert(bytes("Amount must be greater than zero"));
        token.purchaseCredits(0);
    }

    // ── spendCredits ──────────────────────────────────────────────────────────

    function test_spendCredits_burns_from_contract_and_decrements_user() public {
        uint256 amount = 200e18;
        vm.prank(ALICE);
        token.purchaseCredits(amount);

        uint256 supplyBefore = token.totalSupply();
        uint256 spend = 80e18;

        token.spendCredits(ALICE, spend, "http_crawl");

        assertEq(token.creditBalance(ALICE),     amount - spend);
        assertEq(token.balanceOf(address(token)), amount - spend);
        assertEq(token.totalSupply(),            supplyBefore - spend);
    }

    function test_spendCredits_reverts_when_non_owner() public {
        vm.prank(ALICE);
        token.purchaseCredits(200e18);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, BOB)
        );
        token.spendCredits(ALICE, 1e18, "http_crawl");
    }

    function test_spendCredits_reverts_when_insufficient_credits() public {
        vm.prank(ALICE);
        token.purchaseCredits(10e18);

        vm.expectRevert(bytes("Insufficient credits"));
        token.spendCredits(ALICE, 11e18, "http_crawl");
    }

    // ── withdrawCredits ───────────────────────────────────────────────────────

    function test_withdrawCredits_returns_tokens_to_user() public {
        uint256 amount = 200e18;
        vm.prank(ALICE);
        token.purchaseCredits(amount);

        vm.prank(ALICE);
        token.withdrawCredits(amount);

        assertEq(token.creditBalance(ALICE),       0);
        assertEq(token.balanceOf(ALICE),           ALICE_INC);
        assertEq(token.balanceOf(address(token)),  0);
    }

    function test_withdrawCredits_reverts_when_insufficient() public {
        vm.prank(ALICE);
        vm.expectRevert(bytes("Insufficient credit balance"));
        token.withdrawCredits(1e18);
    }

    // ── Invariant ─────────────────────────────────────────────────────────────

    function test_invariant_contract_balance_matches_total_credits() public {
        // After a series of purchase/spend/withdraw operations, the locked
        // ERC-20 balance must equal the sum of every user's creditBalance.
        vm.prank(ECOSYSTEM);
        token.transfer(BOB, 500e18);

        vm.prank(ALICE);
        token.purchaseCredits(300e18);
        vm.prank(BOB);
        token.purchaseCredits(400e18);

        token.spendCredits(ALICE, 50e18, "http_crawl");

        vm.prank(BOB);
        token.withdrawCredits(100e18);

        uint256 sumCredits = token.creditBalance(ALICE) + token.creditBalance(BOB);
        assertEq(token.balanceOf(address(token)), sumCredits);
    }
}
