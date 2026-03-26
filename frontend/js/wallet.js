/**
 * wallet.js — INC token wallet integration for IndexNode
 *
 * Uses ethers.js v6 with window.ethereum (MetaMask, Coinbase Wallet extension,
 * Brave, Frame, Rainbow, and any EIP-1193 compatible injected wallet).
 *
 * For broader mobile wallet support (WalletConnect QR, deep links) integrate
 * Web3Modal / AppKit here when migrating to a React-based frontend.
 */

'use strict';

if (typeof ethers === 'undefined') {
  console.error('[wallet.js] ethers.js failed to load. Wallet functionality will not work.');
}

// ── Chain & contract configuration ────────────────────────────────────────────
// Update contractAddress entries when contracts are deployed to testnet/mainnet.
const SUPPORTED_CHAINS = {
  31337: {
    name: 'Local Anvil',
    shortName: 'Local',
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
  1: {
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    contractAddress: null, // TODO: set after mainnet deploy
  },
  137: {
    name: 'Polygon PoS',
    shortName: 'Polygon',
    contractAddress: null, // TODO: set after mainnet deploy
  },
  11155111: {
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    contractAddress: null, // TODO: set after testnet deploy
  },
  80002: {
    name: 'Polygon Amoy',
    shortName: 'Amoy',
    contractAddress: null, // TODO: set after testnet deploy
  },
};

// Minimal ABI — only the functions wallet.js needs
const INC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function getCreditBalance(address user) view returns (uint256)',
  'function purchaseCredits(uint256 amount)',
  'function withdrawCredits(uint256 amount)',
];

// ── Module state ──────────────────────────────────────────────────────────────
let provider = null;
let signer   = null;
let contract = null;
let walletAddress = null;
let chainId = null;

// Callbacks registered by account.js
const listeners = { connect: [], disconnect: [], chainChanged: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINC(wei) {
  // ethers v6: formatUnits is on ethers object
  const n = Number(ethers.formatUnits(wei, 18));
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';
}

function chainInfo(id) {
  return SUPPORTED_CHAINS[id] || { name: `Chain ${id}`, shortName: `#${id}`, contractAddress: null };
}

function buildContract(addr) {
  if (!signer || !addr) return null;
  return new ethers.Contract(addr, INC_ABI, signer);
}

function emit(event, payload) {
  (listeners[event] || []).forEach(fn => fn(payload));
}

// ── Public API ────────────────────────────────────────────────────────────────

const wallet = {

  /** Returns true if an EIP-1193 wallet is available in the browser */
  isAvailable() {
    return !!(window.ethereum);
  },

  /** Register a callback for wallet events */
  on(event, fn) {
    if (listeners[event]) listeners[event].push(fn);
  },

  /** Current wallet address, or null */
  get address() { return walletAddress; },

  /** Current chain ID, or null */
  get chain() { return chainId; },

  /** Connect wallet. Throws on rejection or no wallet. */
  async connect() {
    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or Coinbase Wallet.');
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    walletAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    chainId = Number(network.chainId);

    const info = chainInfo(chainId);
    contract = buildContract(info.contractAddress);

    // Register INC token with MetaMask so it tracks balance updates automatically.
    if (info.contractAddress && window.ethereum.request) {
      window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: info.contractAddress,
            symbol: 'INC',
            decimals: 18,
          },
        },
      }).catch(() => {}); // ignore if wallet doesn't support it
    }

    // Listen for account / chain changes
    window.ethereum.on('accountsChanged', accounts => {
      if (accounts.length === 0) {
        wallet.disconnect();
      } else {
        walletAddress = accounts[0];
        provider.getSigner().then(s => {
          signer = s;
          contract = buildContract(chainInfo(chainId).contractAddress);
          emit('connect', { address: walletAddress, chainId });
        });
      }
    });

    window.ethereum.on('chainChanged', hexChainId => {
      chainId = parseInt(hexChainId, 16);
      provider.getSigner().then(s => {
        signer = s;
        contract = buildContract(chainInfo(chainId).contractAddress);
        emit('chainChanged', { chainId });
      });
    });

    return { address: walletAddress, chainId };
  },

  /** Disconnect (local state only — cannot revoke wallet permissions) */
  disconnect() {
    provider = signer = contract = walletAddress = chainId = null;
    emit('disconnect', {});
  },

  /** INC wallet balance (tokens held in wallet) */
  async walletBalance() {
    if (!contract) throw new Error('Wallet not connected or unsupported chain.');
    return contract.balanceOf(walletAddress);
  },

  /** INC credit balance (tokens locked in contract for platform use) */
  async creditBalance() {
    if (!contract) throw new Error('Wallet not connected or unsupported chain.');
    return contract.getCreditBalance(walletAddress);
  },

  /** Lock `amount` INC into credits. amount is a JS number (whole INC). */
  async purchaseCredits(amount) {
    if (!contract) throw new Error('Wallet not connected or unsupported chain.');
    const wei = ethers.parseUnits(String(amount), 18);
    const tx = await contract.purchaseCredits(wei);
    return tx.wait();
  },

  /** Unlock `amount` INC credits back to wallet. amount is a JS number. */
  async withdrawCredits(amount) {
    if (!contract) throw new Error('Wallet not connected or unsupported chain.');
    const wei = ethers.parseUnits(String(amount), 18);
    const tx = await contract.withdrawCredits(wei);
    return tx.wait();
  },

  /** Refresh and return both balances as formatted strings */
  async balances() {
    const [walBal, credBal] = await Promise.all([
      wallet.walletBalance(),
      wallet.creditBalance(),
    ]);
    return {
      walletRaw:  walBal,
      creditRaw:  credBal,
      walletFmt:  formatINC(walBal),
      creditFmt:  formatINC(credBal),
    };
  },

  /** Chain display info for current chain */
  chainInfo() {
    return chainId ? chainInfo(chainId) : null;
  },

  /** True if the current chain has a known contract address */
  isChainSupported() {
    if (!chainId) return false;
    return !!chainInfo(chainId).contractAddress;
  },

  /** Switch MetaMask to Local Anvil (adds it first if not already in wallet) */
  async switchToAnvil() {
    if (!window.ethereum) throw new Error('No wallet detected.');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7A69' }], // 31337 in hex
      });
    } catch (err) {
      // 4902 = chain not added yet
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7A69',
            chainName: 'Local Anvil',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8546'],
          }],
        });
      } else {
        throw err;
      }
    }
  },

  shortAddr,
  formatINC,
};

window.IndexWallet = wallet;
