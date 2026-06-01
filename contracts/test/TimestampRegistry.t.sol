pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../TimestampRegistry.sol";

contract TimestampRegistryV2 is TimestampRegistry {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract TimestampRegistryTest is Test {
    TimestampRegistry registry;
    address constant OWNER  = address(0xA11);
    address constant ALICE  = address(0xA11CE);

    function setUp() public {
        TimestampRegistry impl = new TimestampRegistry();
        bytes memory data = abi.encodeCall(TimestampRegistry.initialize, (OWNER));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        registry = TimestampRegistry(address(proxy));
    }

    function test_commitHash_records_block_number() public {
        bytes32 h = keccak256("event-batch-1");
        uint256 expectedBlock = block.number;

        vm.prank(ALICE);
        registry.commitHash(h);

        assertEq(registry.timestamps(h),  expectedBlock);
        assertEq(registry.verifyHash(h),  expectedBlock);
    }

    function test_commitHash_reverts_on_duplicate() public {
        bytes32 h = keccak256("event-batch-1");
        vm.prank(ALICE);
        registry.commitHash(h);

        vm.prank(ALICE);
        vm.expectRevert(bytes("Hash already committed"));
        registry.commitHash(h);
    }

    function test_verifyHash_returns_zero_for_uncommitted_hash() public view {
        assertEq(registry.verifyHash(keccak256("nope")), 0);
    }

    function test_upgrade_authorized_by_owner() public {
        TimestampRegistryV2 v2 = new TimestampRegistryV2();
        vm.prank(OWNER);
        registry.upgradeToAndCall(address(v2), "");

        assertEq(TimestampRegistryV2(address(registry)).version(), "v2");
    }

    function test_upgrade_rejects_non_owner() public {
        TimestampRegistryV2 v2 = new TimestampRegistryV2();
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, ALICE)
        );
        registry.upgradeToAndCall(address(v2), "");
    }
}
