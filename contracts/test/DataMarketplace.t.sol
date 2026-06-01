pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../DataMarketplace.sol";
import "../CreditToken.sol";

contract DataMarketplaceV2 is DataMarketplace {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract ReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    string  public constant name     = "Reentrant";
    string  public constant symbol   = "REN";
    uint8   public constant decimals = 18;

    DataMarketplace public target;
    uint256 public attackListingId;
    bool    public reentering;

    function armReentry(DataMarketplace t, uint256 listingId) external {
        target = t;
        attackListingId = listingId;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply   += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;

        if (address(target) != address(0) && !reentering) {
            reentering = true;
            // Reenter — the marketplace's nonReentrant guard must reject this.
            target.purchaseDataset(attackListingId);
        }
        return true;
    }
}

contract DataMarketplaceTest is Test {
    DataMarketplace marketplace;
    CreditToken inc;

    address constant OWNER  = address(0xA11);
    address constant SELLER = address(0x5E11E2);
    address constant BUYER  = address(0xB0BB1E);
    address constant ATTACKER = address(0xACEACE);

    address constant ECOSYSTEM   = address(0xE1);
    address constant TEAM        = address(0xE2);
    address constant TREASURY    = address(0xE3);
    address constant PUBLIC_SALE = address(0xE4);
    address constant INVESTORS   = address(0xE5);
    address constant LIQUIDITY   = address(0xE6);

    function setUp() public {
        inc = new CreditToken(ECOSYSTEM, TEAM, TREASURY, PUBLIC_SALE, INVESTORS, LIQUIDITY);

        DataMarketplace impl = new DataMarketplace();
        bytes memory data = abi.encodeCall(DataMarketplace.initialize, (address(inc), OWNER));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        marketplace = DataMarketplace(address(proxy));

        vm.prank(ECOSYSTEM);
        inc.transfer(BUYER, 10_000e18);
    }

    function test_createListing_stores_listing() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);

        DataMarketplace.Listing memory l = marketplace.getListingDetails(1);
        assertEq(l.seller, SELLER);
        assertEq(l.price,  100e18);
        assertTrue(l.active);
        assertEq(l.sales,  0);
        assertEq(marketplace.listingCount(), 1);
    }

    function test_createListing_reverts_when_price_zero() public {
        vm.prank(SELLER);
        vm.expectRevert(bytes("Price must be greater than zero"));
        marketplace.createListing("QmCid", "ipfs://meta", 0);
    }

    function test_purchaseDataset_happy_path() public {
        uint256 price = 100e18;
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", price);

        vm.prank(BUYER);
        inc.approve(address(marketplace), price);

        uint256 buyerBefore  = inc.balanceOf(BUYER);
        uint256 sellerBefore = inc.balanceOf(SELLER);

        vm.prank(BUYER);
        marketplace.purchaseDataset(1);

        assertEq(inc.balanceOf(SELLER),             sellerBefore + 95e18);
        assertEq(inc.balanceOf(BUYER),              buyerBefore  - price);
        assertEq(inc.balanceOf(address(marketplace)), 5e18);
        assertEq(marketplace.purchaseCount(),       1);
        assertEq(marketplace.sellerReputation(SELLER), 1);

        DataMarketplace.Listing memory l = marketplace.getListingDetails(1);
        assertEq(l.sales, 1);
    }

    function test_purchaseDataset_fee_math_exact() public {
        uint256 price = 100e18;
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", price);
        vm.prank(BUYER);
        inc.approve(address(marketplace), price);

        vm.prank(BUYER);
        marketplace.purchaseDataset(1);

        assertEq(inc.balanceOf(address(marketplace)), 5e18);
        assertEq(inc.balanceOf(SELLER),             95e18);
    }

    function test_purchaseDataset_reverts_when_listing_inactive() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);
        vm.prank(SELLER);
        marketplace.deactivateListing(1);

        vm.prank(BUYER);
        inc.approve(address(marketplace), 100e18);

        vm.prank(BUYER);
        vm.expectRevert(bytes("Listing not active"));
        marketplace.purchaseDataset(1);
    }

    function test_purchaseDataset_reverts_when_buyer_is_seller() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);

        vm.prank(SELLER);
        vm.expectRevert(bytes("Cannot buy own listing"));
        marketplace.purchaseDataset(1);
    }

    function test_purchaseDataset_nonReentrant_blocks_reentry() public {
        ReentrantToken bad = new ReentrantToken();
        DataMarketplace impl = new DataMarketplace();
        bytes memory data = abi.encodeCall(DataMarketplace.initialize, (address(bad), OWNER));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        DataMarketplace mkt = DataMarketplace(address(proxy));

        vm.prank(SELLER);
        mkt.createListing("Qm", "meta", 100e18);

        bad.armReentry(mkt, 1);
        bad.mint(ATTACKER, 1_000e18);

        vm.prank(ATTACKER);
        bad.approve(address(mkt), 1_000e18);

        vm.prank(ATTACKER);
        vm.expectRevert(bytes("ReentrancyGuard: reentrant call"));
        mkt.purchaseDataset(1);
    }

    function test_deactivateListing_by_seller() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);

        vm.prank(SELLER);
        marketplace.deactivateListing(1);

        DataMarketplace.Listing memory l = marketplace.getListingDetails(1);
        assertFalse(l.active);
    }

    function test_deactivateListing_reverts_when_not_seller() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);

        vm.prank(BUYER);
        vm.expectRevert(bytes("Not listing owner"));
        marketplace.deactivateListing(1);
    }

    function test_withdrawFees_transfers_accumulated_fees() public {
        vm.prank(SELLER);
        marketplace.createListing("QmCid", "ipfs://meta", 100e18);
        vm.prank(BUYER);
        inc.approve(address(marketplace), 100e18);
        vm.prank(BUYER);
        marketplace.purchaseDataset(1);

        address recipient = address(0xFEE);
        vm.prank(OWNER);
        marketplace.withdrawFees(recipient);

        assertEq(inc.balanceOf(recipient),             5e18);
        assertEq(inc.balanceOf(address(marketplace)),  0);
    }

    function test_withdrawFees_reverts_when_non_owner() public {
        vm.prank(BUYER);
        vm.expectRevert(
            abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, BUYER)
        );
        marketplace.withdrawFees(BUYER);
    }

    function test_upgrade_authorized_by_owner() public {
        DataMarketplaceV2 v2 = new DataMarketplaceV2();
        vm.prank(OWNER);
        marketplace.upgradeToAndCall(address(v2), "");

        assertEq(DataMarketplaceV2(address(marketplace)).version(), "v2");
    }

    function test_upgrade_rejects_non_owner() public {
        DataMarketplaceV2 v2 = new DataMarketplaceV2();
        vm.prank(BUYER);
        vm.expectRevert(
            abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, BUYER)
        );
        marketplace.upgradeToAndCall(address(v2), "");
    }
}
