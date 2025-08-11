// Lightweight WalletConnect v2 (Reown) integration via jsDelivr ESM
// Exports connectWithWalletConnect() that resolves to an EIP-1193 provider

import { NETWORK_CONFIG } from '../web3-config.js';

const JSDELIVR_WC_PROVIDER = 'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2/dist/index.js';

function toDecimalChainId(hexId) {
  try { return parseInt(hexId, 16); } catch { return undefined; }
}

function getSiteMetadata() {
  return {
    name: 'techno_punks',
    description: 'post‑AGI survivor club terminal / punk protocol',
    url: 'https://technopunks.xyz/',
    icons: ['https://technopunks.xyz/assets/images/logo-400x400.png'],
  };
}

export async function connectWithWalletConnect(projectId) {
  const chainIdHex = NETWORK_CONFIG.CHAIN_ID; // e.g., '0x3e7'
  const chainId = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x')
    ? toDecimalChainId(chainIdHex)
    : Number(chainIdHex);

  if (!projectId) throw new Error('Missing WalletConnect Project ID');
  if (!chainId || Number.isNaN(chainId)) throw new Error('Invalid chain id');

  // Dynamic ESM import from jsDelivr
  const { EthereumProvider } = await import(JSDELIVR_WC_PROVIDER);

  const meta = getSiteMetadata();
  const provider = await EthereumProvider.init({
    projectId,
    showQrModal: true,
    optionalChains: [chainId],
    rpcMap: { [chainId]: NETWORK_CONFIG.RPC_URL },
    metadata: {
      name: meta.name,
      description: meta.description,
      url: meta.url,
      icons: meta.icons,
    },
  });

  // Request accounts (triggers QR if not connected yet)
  await provider.enable?.();
  return provider;
}
