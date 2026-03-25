// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/CreditToken.sol";
import "../contracts/TimestampRegistry.sol";
import "../contracts/DataMarketplace.sol";
import "../contracts/ERC1967ProxyHelper.sol";

/**
 * @notice Deploys all three IndexNode contracts in order:
 *   1. CreditToken (INC) — immutable ERC-20
 *   2. TimestampRegistry  — UUPS upgradeable proxy
 *   3. DataMarketplace    — UUPS upgradeable proxy
 *
 * Required environment variables:
 *   DEPLOYER_PRIVATE_KEY   — private key of the deploying wallet
 *   ECOSYSTEM_WALLET       — receives 30% ecosystem allocation
 *   TEAM_WALLET            — receives 20% team allocation
 *   TREASURY_WALLET        — receives 20% treasury allocation
 *   PUBLIC_SALE_WALLET     — receives 15% public-sale allocation
 *   INVESTOR_WALLET        — receives 10% investor allocation
 *   LIQUIDITY_WALLET       — receives 5% liquidity allocation
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url $RPC_URL \
 *     --private-key $DEPLOYER_PRIVATE_KEY --broadcast --verify
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address ecosystem  = vm.envAddress("ECOSYSTEM_WALLET");
        address team       = vm.envAddress("TEAM_WALLET");
        address treasury   = vm.envAddress("TREASURY_WALLET");
        address publicSale = vm.envAddress("PUBLIC_SALE_WALLET");
        address investors  = vm.envAddress("INVESTOR_WALLET");
        address liquidity  = vm.envAddress("LIQUIDITY_WALLET");

        vm.startBroadcast(deployerKey);

        // ── 1. CreditToken (INC) ─────────────────────────────────────────────
        CreditToken creditToken = new CreditToken(
            ecosystem,
            team,
            treasury,
            publicSale,
            investors,
            liquidity
        );
        console2.log("CreditToken deployed:", address(creditToken));

        // ── 2. TimestampRegistry (UUPS proxy) ────────────────────────────────
        TimestampRegistry tsImpl = new TimestampRegistry();
        bytes memory tsInit = abi.encodeCall(TimestampRegistry.initialize, (deployer));
        ERC1967Proxy tsProxy = new ERC1967Proxy(address(tsImpl), tsInit);
        TimestampRegistry timestampRegistry = TimestampRegistry(address(tsProxy));
        console2.log("TimestampRegistry proxy:", address(timestampRegistry));
        console2.log("TimestampRegistry impl: ", address(tsImpl));

        // ── 3. DataMarketplace (UUPS proxy) ──────────────────────────────────
        DataMarketplace mktImpl = new DataMarketplace();
        bytes memory mktInit = abi.encodeCall(
            DataMarketplace.initialize,
            (address(creditToken), deployer)
        );
        ERC1967Proxy mktProxy = new ERC1967Proxy(address(mktImpl), mktInit);
        DataMarketplace marketplace = DataMarketplace(address(mktProxy));
        console2.log("DataMarketplace proxy:", address(marketplace));
        console2.log("DataMarketplace impl: ", address(mktImpl));

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────────────────────────────────
        console2.log("\n=== Deployment complete ===");
        console2.log("CREDIT_CONTRACT_ADDRESS=", address(creditToken));
        console2.log("TIMESTAMP_REGISTRY_ADDRESS=", address(timestampRegistry));
        console2.log("MARKETPLACE_CONTRACT_ADDRESS=", address(marketplace));
        console2.log("\nAdd these to your .env and docker-compose.yml");
    }
}
