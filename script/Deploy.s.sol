// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
 * After deployment, ownership of all three contracts is transferred from the
 * deployer EOA to MULTISIG_OWNER inside the same broadcast — the deployer key
 * has upgrade authority only during this transaction and never afterwards.
 *
 * Required environment variables:
 *   DEPLOYER_PRIVATE_KEY   — private key of the deploying wallet
 *   MULTISIG_OWNER         — final owner of all three contracts (multisig)
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
    struct Config {
        uint256 deployerKey;
        address deployer;
        address multisig;
        address ecosystem;
        address team;
        address treasury;
        address publicSale;
        address investors;
        address liquidity;
    }

    function run() external {
        // Pass the config by memory pointer so its fields don't each consume a
        // stack slot in run() — keeps us under EVM's 16-slot limit.
        Config memory cfg = _readConfig();

        vm.startBroadcast(cfg.deployerKey);

        CreditToken creditToken = _deployCreditToken(cfg);
        TimestampRegistry timestampRegistry = _deployTimestampRegistry(cfg.deployer);
        DataMarketplace marketplace = _deployMarketplace(cfg.deployer, address(creditToken));

        // Hand off ownership to the multisig within the same broadcast. After
        // this returns, the deployer EOA has no further authority on any of
        // the three contracts.
        creditToken.transferOwnership(cfg.multisig);
        timestampRegistry.transferOwnership(cfg.multisig);
        marketplace.transferOwnership(cfg.multisig);

        vm.stopBroadcast();

        _logSummary(creditToken, timestampRegistry, marketplace, cfg.multisig);
    }

    /// @notice Reads every required env var and validates it. Reverts before
    /// any broadcast happens if anything is missing or zero.
    function _readConfig() internal view returns (Config memory cfg) {
        cfg.deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        cfg.deployer    = vm.addr(cfg.deployerKey);
        cfg.multisig    = vm.envAddress("MULTISIG_OWNER");
        cfg.ecosystem   = vm.envAddress("ECOSYSTEM_WALLET");
        cfg.team        = vm.envAddress("TEAM_WALLET");
        cfg.treasury    = vm.envAddress("TREASURY_WALLET");
        cfg.publicSale  = vm.envAddress("PUBLIC_SALE_WALLET");
        cfg.investors   = vm.envAddress("INVESTOR_WALLET");
        cfg.liquidity   = vm.envAddress("LIQUIDITY_WALLET");

        require(cfg.multisig   != address(0), "MULTISIG_OWNER not set");
        require(cfg.ecosystem  != address(0), "ECOSYSTEM_WALLET not set");
        require(cfg.team       != address(0), "TEAM_WALLET not set");
        require(cfg.treasury   != address(0), "TREASURY_WALLET not set");
        require(cfg.publicSale != address(0), "PUBLIC_SALE_WALLET not set");
        require(cfg.investors  != address(0), "INVESTOR_WALLET not set");
        require(cfg.liquidity  != address(0), "LIQUIDITY_WALLET not set");
    }

    function _deployCreditToken(Config memory cfg) internal returns (CreditToken creditToken) {
        creditToken = new CreditToken(
            cfg.ecosystem,
            cfg.team,
            cfg.treasury,
            cfg.publicSale,
            cfg.investors,
            cfg.liquidity
        );
        console2.log("CreditToken deployed:", address(creditToken));
    }

    function _deployTimestampRegistry(address deployer)
        internal
        returns (TimestampRegistry timestampRegistry)
    {
        TimestampRegistry impl = new TimestampRegistry();
        bytes memory data = abi.encodeCall(TimestampRegistry.initialize, (deployer));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        timestampRegistry = TimestampRegistry(address(proxy));
        console2.log("TimestampRegistry proxy:", address(timestampRegistry));
        console2.log("TimestampRegistry impl: ", address(impl));
    }

    function _deployMarketplace(address deployer, address creditToken)
        internal
        returns (DataMarketplace marketplace)
    {
        DataMarketplace impl = new DataMarketplace();
        bytes memory data = abi.encodeCall(DataMarketplace.initialize, (creditToken, deployer));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        marketplace = DataMarketplace(address(proxy));
        console2.log("DataMarketplace proxy:", address(marketplace));
        console2.log("DataMarketplace impl: ", address(impl));
    }

    function _logSummary(
        CreditToken creditToken,
        TimestampRegistry timestampRegistry,
        DataMarketplace marketplace,
        address multisig
    ) internal pure {
        console2.log("\n=== Deployment complete ===");
        console2.log("CREDIT_CONTRACT_ADDRESS=", address(creditToken));
        console2.log("TIMESTAMP_REGISTRY_ADDRESS=", address(timestampRegistry));
        console2.log("MARKETPLACE_CONTRACT_ADDRESS=", address(marketplace));
        console2.log("Ownership transferred to multisig:", multisig);
        console2.log("\nAdd these to your .env and docker-compose.yml");
    }
}
