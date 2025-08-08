// --- WEB3 CONFIGURATION ---
import contractAddress from './contract-address.json';
import contractAbi from './contract-abi.json';

// Hyperliquid EVM Mainnet Configuration
export const NETWORK_CONFIG = {
    RPC_URL: 'https://rpc.hyperliquid.xyz/evm',
    CHAIN_ID: '0x3e7', // Hexadecimal for 999
    CHAIN_NAME: 'Hyperliquid EVM Mainnet',
    CURRENCY_SYMBOL: 'ETH',
    CURRENCY_NAME: 'Ethereum',
    CURRENCY_DECIMALS: 18
};

// The public RPC endpoint for read-only operations when a wallet is not connected.
export const PUBLIC_RPC_URL = NETWORK_CONFIG.RPC_URL;

// Smart Contract Configuration
export const CONTRACT_ADDRESS = contractAddress.address;
export const CONTRACT_ABI = contractAbi;
