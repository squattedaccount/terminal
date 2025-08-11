import { loadScript } from './utils/script-loader.js';
import i18n from './i18n/i18n.js';
import logger from './core/logger.js';
import { NETWORK_CONFIG, CONTRACT_ADDRESS, CONTRACT_ABI, PUBLIC_RPC_URL } from './web3-config.js';

const WEB3_CDN_URL = 'https://cdn.jsdelivr.net/npm/web3@4.9.0/dist/web3.min.js';

let Web3; // Will be assigned after loading the script
let web3;
let contract;
let connectedAccount;
let providers = [];

// Promise to ensure Web3.js is loaded only once.
let web3LoadPromise = null;

/**
 * Ensures the Web3.js library is loaded, dynamically injecting it if needed.
 */
function ensureWeb3Loaded() {
  if (web3LoadPromise) {
    return web3LoadPromise;
  }

  web3LoadPromise = new Promise((resolve, reject) => {
    if (window.Web3) {
      Web3 = window.Web3;
      return resolve();
    }

    loadScript(WEB3_CDN_URL)
      .then(() => {
        Web3 = window.Web3;
        resolve();
      })
      .catch(error => {
        logger.error("CRITICAL: Failed to load Web3.js from CDN.", error);
        reject(error);
      });
  });

  return web3LoadPromise;
}

/**
 * Wires standard EIP-1193 provider events to keep local state in sync.
 */
function wireProviderEvents(provider) {
  if (!provider || !provider.on) return;

  provider.on('accountsChanged', (accounts) => {
    connectedAccount = Array.isArray(accounts) && accounts.length ? accounts[0] : null;
  });

  provider.on('chainChanged', (_chainId) => {
    // no-op; consumers may refresh UI if needed
  });

  provider.on('disconnect', () => {
    connectedAccount = null;
  });
}

/**
 * Initializes web3 with an externally selected EIP-1193 provider.
 * Requests accounts, sets up network, wires events, and prepares the contract instance.
 * @param {any} provider - An EIP-1193 compatible provider (injected or WC/AppKit returned)
 * @returns {Promise<string>} The connected account address
 */
async function connectWithProvider(provider) {
  await ensureWeb3Loaded();
  if (!provider) throw new Error(i18n.t('web3.error.notConnected'));

  web3 = new Web3(provider);
  try {
    // Request accounts if available
    let accounts = [];
    if (provider.request) {
      accounts = await provider.request({ method: 'eth_requestAccounts' });
    } else if (web3.eth && web3.eth.getAccounts) {
      accounts = await web3.eth.getAccounts();
    }

    connectedAccount = accounts && accounts.length ? accounts[0] : null;
    if (!connectedAccount) {
      throw new Error(i18n.t('web3.error.connectionFailed', { message: 'No account returned' }));
    }

    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    await setupNetwork(provider);

    wireProviderEvents(provider);
    return connectedAccount;
  } catch (error) {
    logger.error('Provider connection error:', error);
    if (error.code === 4001) {
      throw new Error(i18n.t('web3.error.connectionDenied'));
    }
    throw new Error(i18n.t('web3.error.connectionFailed', { message: error.message }));
  }
}

/**
 * Keeps providers unique by their info.uuid.
 */
function addProviderUniquely(newProvider) {
  if (!providers.find(p => p.info.uuid === newProvider.info.uuid)) {
    providers.push(newProvider);
  }
}


/**
 * Uses MIPD to discover all available EIP-6963 wallet providers.
 */
function discoverWallets() {
  // Listen for wallet announcements per EIP-6963.
  window.addEventListener('eip6963:announceProvider', (event) => {
    addProviderUniquely(event.detail);
  });
}

/**
 * Actively requests that injected wallets announce themselves (EIP-6963).
 * Call this right before you want the list – e.g. in the `connect` command.
 */
function requestWalletAnnouncements() {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Returns the list of discovered wallet providers.
 * @returns {Array} A list of wallet provider objects.
 */
function getDiscoveredWallets() {
  return providers;
}

/**
 * Initializes a default read-only provider using the public RPC URL.
 * This allows the app to perform read operations before a wallet is connected.
 */
async function initializeDefaultProvider() {
  await ensureWeb3Loaded();
  if (PUBLIC_RPC_URL) {
    try {
      const provider = new Web3.providers.HttpProvider(PUBLIC_RPC_URL);
      web3 = new Web3(provider);
      contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      logger.debug('Default read-only provider initialized.');
    } catch (error) {
      logger.error('Failed to initialize default provider:', error);
    }
  }
}

/**
 * Connects to the user's Ethereum wallet (e.g., MetaMask).
 * @returns {Promise<string>} The connected account address.
 */
async function connectWallet() {
  await ensureWeb3Loaded();
  let selectedProvider = null;

  // Helper to identify a genuine MetaMask provider, avoiding imposters.
  const isMetaMask = (p) => {
    if (!p) return false;
    // EIP-6963 providers have an `info` object.
    const isMetaMaskByName = p.info && p.info.name && p.info.name.toLowerCase().includes('metamask');
    // The legacy `isMetaMask` flag check has been removed to avoid
    // triggering unwanted behavior in non-MetaMask wallets like Brave.
    return isMetaMaskByName;
  };

  // Actively request announcements to get the most up-to-date list of wallets.
  requestWalletAnnouncements();
  await new Promise(r => setTimeout(r, 300)); // Give wallets time to announce.

  const wallets = getDiscoveredWallets();
  const metaMaskWallet = wallets.find(isMetaMask);

  if (metaMaskWallet) {
    selectedProvider = metaMaskWallet.provider;
  }

  // If no MetaMask provider was found, throw an error.
  if (!selectedProvider) {
    throw new Error(i18n.t('web3.error.metaMaskRequired'));
  }

  // Proceed with connection using the identified MetaMask provider.
  web3 = new Web3(selectedProvider);
  try {
    const accounts = await selectedProvider.request({ method: 'eth_requestAccounts' });
    connectedAccount = accounts[0];
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    await setupNetwork(selectedProvider);
    return connectedAccount;
  } catch (error) {
    logger.error("MetaMask connection error:", error);
    if (error.code === 4001) { // EIP-1193 user rejection error
      throw new Error(i18n.t('web3.error.connectionDenied'));
    }
    throw new Error(i18n.t('web3.error.connectionFailed', { message: error.message }));
  }
}

/**
 * Adds the configured network to MetaMask if not already present.
 */
async function setupNetwork(provider) {
  const { CHAIN_ID, CHAIN_NAME, RPC_URL, CURRENCY_NAME, CURRENCY_SYMBOL, CURRENCY_DECIMALS } = NETWORK_CONFIG;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID,
            chainName: CHAIN_NAME,
            rpcUrls: [RPC_URL],
            nativeCurrency: {
              name: CURRENCY_NAME,
              symbol: CURRENCY_SYMBOL,
              decimals: CURRENCY_DECIMALS,
            },
          }],
        });
      } catch (addError) {
        logger.error(`Failed to add the ${CHAIN_NAME} network`, addError);
        throw new Error(i18n.t('web3.error.addNetwork', { chainName: CHAIN_NAME }));
      }
    }
  }
}

/**
 * Gets the currently connected account.
 * @returns {string|null} The connected account address or null.
 */
function getConnectedAccount() {
  return connectedAccount;
}

/**
 * Fetches NFT collection information from the smart contract.
 * @returns {Promise<object>} An object with collection info.
 */
async function getCollectionInfo() {
  try {
    const localContract = contract;
    const localWeb3 = web3;

    if (!localContract) {
      // If there's no contract instance, the default provider failed or wasn't available.
      throw new Error(i18n.t('web3.error.notConnected'));
    }

    const name = await localContract.methods.name().call();
    const symbol = await localContract.methods.symbol().call();
    const totalSupply = await localContract.methods.getMintedCount().call();
    const maxSupply = await localContract.methods.MAX_SUPPLY().call();
    const price = await localContract.methods.MINT_PRICE().call();

    return {
      name,
      symbol,
      contractAddress: CONTRACT_ADDRESS, // Add contract address to the returned object
      totalSupply: totalSupply.toString(),
      maxSupply: maxSupply.toString(),
      price: localWeb3.utils.fromWei(price, 'ether'),
    };
  } catch (error) {
    logger.error("Error fetching collection info:", error);
    throw new Error(i18n.t('web3.error.fetchInfo', { message: error.message }));
  }
}

/**
 * Polls for transaction receipt with extended timeout handling
 * @param {string} transactionHash - The transaction hash to poll for
 * @param {function} onProgress - Progress callback function
 * @returns {Promise<object|null>} The transaction receipt or null if timeout
 */
async function pollForReceipt(transactionHash, onProgress) {
  const maxAttempts = 120; // 10 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      if (receipt) {
        return receipt;
      }
      
      // Show progress every 30 seconds
      if (attempt > 0 && attempt % 6 === 0) {
        const elapsed = Math.floor((attempt * pollInterval) / 1000);
        if (onProgress) onProgress(i18n.t('web3.progress.stillWaiting', { elapsed, hash: transactionHash }));
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logger.warn(`Error polling for receipt (attempt ${attempt + 1}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  return null; // Timeout after max attempts
}

/**
 * Initiates the NFT minting process.
 * @returns {Promise<string>} The transaction hash.
 */
async function mintNFT(quantity, onProgress) {
  if (!contract || !connectedAccount) throw new Error(i18n.t('web3.error.notConnected'));

  const mintedTokens = [];
  let transactionHash = null;
  
  try {
    const unitPrice = await contract.methods.MINT_PRICE().call();

    // --- Single Mint Path ---
    if (quantity === 1) {
      if (onProgress) onProgress(i18n.t('web3.progress.preparingTx'));

      const txPromise = contract.methods.mintNFT().send({ 
        from: connectedAccount, 
        value: BigInt(unitPrice)
      });
      
      txPromise.on('transactionHash', (hash) => {
        transactionHash = hash;
        if (onProgress) onProgress(i18n.t('web3.progress.txSubmitted', { hash }));
      });

      try {
        const txReceipt = await txPromise;
        if (onProgress) onProgress(i18n.t('web3.progress.txConfirmed'));
        
        const mintedEvent = txReceipt.events.NFTMinted;
        if (mintedEvent) {
          const { tokenId, pair } = mintedEvent.returnValues;
          mintedTokens.push({ tokenId: tokenId.toString(), pair, transactionHash: txReceipt.transactionHash });
        } else {
          mintedTokens.push({ tokenId: 'N/A', pair: 'N/A', transactionHash: txReceipt.transactionHash });
        }
        return mintedTokens;
      } catch (timeoutError) {
        // Handle Web3.js timeout - transaction might still succeed
        if (transactionHash && timeoutError.message.includes('not mined within')) {
          if (onProgress) onProgress(i18n.t('web3.progress.txTimeout', { hash: transactionHash }));
          
          // Try to get receipt manually with extended polling
          const receipt = await pollForReceipt(transactionHash, onProgress);
          if (receipt) {
            if (onProgress) onProgress(i18n.t('web3.progress.txConfirmed'));
            
            const mintedEvent = receipt.events && receipt.events.NFTMinted;
            if (mintedEvent) {
              const { tokenId, pair } = mintedEvent.returnValues;
              mintedTokens.push({ tokenId: tokenId.toString(), pair, transactionHash: receipt.transactionHash });
            } else {
              mintedTokens.push({ tokenId: 'N/A', pair: 'N/A', transactionHash: receipt.transactionHash });
            }
            return mintedTokens;
          }
        }
        throw timeoutError;
      }
    }

    // --- Batch Mint Path ---
    if (onProgress) onProgress(i18n.t('web3.progress.preparingBatchTx', { quantity }));

    // Record current minted count to derive token IDs later
    const preSupply = await contract.methods.getMintedCount().call();

    // Compute totalPrice safely: use web3.utils.toBN if available, otherwise fallback to BigInt
    let totalPriceBN;
    if (web3.utils && typeof web3.utils.toBN === 'function') {
      totalPriceBN = web3.utils.toBN(unitPrice).mul(web3.utils.toBN(quantity)).toString();
    } else {
      // web3 v4.x removed toBN; use native BigInt instead
      totalPriceBN = BigInt(unitPrice) * BigInt(quantity);
    }
    
    const txPromise = contract.methods.mintBatch(quantity).send({ from: connectedAccount, value: totalPriceBN });

    txPromise.on('transactionHash', (hash) => {
      transactionHash = hash;
      if (onProgress) onProgress(i18n.t('web3.progress.batchTxSubmitted', { hash, quantity }));
    });

    let txReceipt;
    try {
      txReceipt = await txPromise;
      if (onProgress) onProgress(i18n.t('web3.progress.batchTxConfirmed', { quantity }));
    } catch (timeoutError) {
      // Handle Web3.js timeout for batch minting
      if (transactionHash && timeoutError.message.includes('not mined within')) {
        if (onProgress) onProgress(i18n.t('web3.progress.batchTxTimeout', { hash: transactionHash, quantity }));
        
        // Try to get receipt manually with extended polling
        txReceipt = await pollForReceipt(transactionHash, onProgress);
        if (txReceipt) {
          if (onProgress) onProgress(i18n.t('web3.progress.batchTxConfirmed', { quantity }));
        } else {
          throw timeoutError;
        }
      } else {
        throw timeoutError;
      }
    }

    // Extract all NFTMinted events from receipt, accounting for various Web3 shapes
    // Decode every NFTMinted log manually from raw logs to capture all occurrences
    const nftMintedAbi = CONTRACT_ABI.find(item => item.name === 'NFTMinted' && item.type === 'event');
    const topicHash = web3.utils.sha3('NFTMinted(address,uint256,string)');

    txReceipt.logs.forEach(log => {
      if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics[0] === topicHash) {
        try {
          const decoded = web3.eth.abi.decodeLog(nftMintedAbi.inputs, log.data, log.topics.slice(1));
          mintedTokens.push({ tokenId: decoded.tokenId.toString(), pair: decoded.pair, transactionHash: txReceipt.transactionHash });
        } catch (err) {
          logger.warn('Failed to decode NFTMinted log', err);
        }
      }
    });

    // If some tokens still missing, extract from Transfer events
    if (mintedTokens.length < quantity) {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const transferEvents = Object.values(txReceipt.events || {}).filter(ev => ev && ev.event === 'Transfer');
      transferEvents.forEach(ev => {
        if (ev.returnValues && ev.returnValues.from.toLowerCase() === zeroAddress && ev.returnValues.to.toLowerCase() === connectedAccount.toLowerCase()) {
          const tokenId = ev.returnValues.tokenId.toString();
          const alreadyPresent = mintedTokens.some(t => t.tokenId === tokenId);
          if (!alreadyPresent) {
            mintedTokens.push({ tokenId, pair: 'N/A', transactionHash: txReceipt.transactionHash });
          }
        }
      });
    }

    // Fetch pair for any tokens lacking it
    for (const token of mintedTokens) {
      if (token.tokenId !== 'N/A' && token.pair === 'N/A') {
        try {
          const tokenURI = await contract.methods.tokenURI(token.tokenId).call();
          const jsonString = atob(tokenURI.substring('data:application/json;base64,'.length));
          const metadata = JSON.parse(jsonString);
          // Assume name field contains pair in parentheses e.g. "Techno Punk (#id) ({pair})"
          const match = metadata.name && metadata.name.match(/\(([^)]+)\)$/);
          if (match) {
            token.pair = match[1];
          }
        } catch (err) {
          // Silently continue if pair fetch fails
        }
      }
    }

    // If still missing, derive IDs sequentially from preSupply
    if (mintedTokens.length < quantity) {
      const startId = BigInt(preSupply) + 1n;
      for (let offset = 0; offset < quantity; offset++) {
        const candidateId = (startId + BigInt(offset)).toString();
        const alreadyPresent = mintedTokens.some(t => t.tokenId === candidateId);
        if (!alreadyPresent) {
          let pair = 'N/A';
          try {
            const tokenURI = await contract.methods.tokenURI(candidateId).call();
            const jsonStr = atob(tokenURI.substring('data:application/json;base64,'.length));
            const md = JSON.parse(jsonStr);
            const m = md.name && md.name.match(/\(([^)]+)\)$/);
            if (m) pair = m[1];
          } catch { }
          mintedTokens.push({ tokenId: candidateId, pair, transactionHash: txReceipt.transactionHash });
        }
      }
    }

    return mintedTokens;

  } catch (error) {
    logger.error("Error minting NFT:", error);
    if (error.code === 4001) {
      // Add context about which mint failed if possible
      throw new Error(i18n.t('web3.error.mintRejected', { count: mintedTokens.length + 1, quantity }));
    }
    throw new Error(i18n.t('web3.error.mintFailed', { count: mintedTokens.length + 1 }));
  }
}

async function getTokenColors(tokenId) {
  if (!contract) {
    // If no public RPC, we can't get info without a wallet connection.
    throw new Error(i18n.t('web3.error.notConnected'));
  }
  try {
    const colors = await contract.methods.customTokenColors(tokenId).call();
    return colors;
  } catch (error) {
    logger.error("Error fetching token colors:", error);
    throw new Error(i18n.t('web3.error.fetchColors', { tokenId }));
  }
}

async function customizeToken(tokenId, backgroundColor, textColor, onTransactionSent) {
  if (!contract || !connectedAccount) throw new Error(i18n.t('web3.error.notConnected'));

  try {
    const bgColor = backgroundColor || "";
    const txtColor = textColor || "";

    const txPromise = contract.methods.customizeToken(tokenId, bgColor, txtColor).send({ from: connectedAccount });

    if (onTransactionSent) {
      txPromise.on('transactionHash', onTransactionSent);
    }

    const txReceipt = await txPromise;
    return txReceipt.transactionHash;

  } catch (error) {
    logger.error("Error customizing token:", error);
    if (error.code === 4001) {
      throw new Error(i18n.t('web3.error.customizationRejected'));
    }
    throw new Error(i18n.t('web3.error.customizationFailed'));
  }
}

/**
 * Disconnects the user's wallet from the app.
 * Resets the connection state and re-initializes the default provider.
 */
function disconnectWallet() {
  if (!connectedAccount) {
    // If no account is connected, there's nothing to do.
    // We can throw an error to be caught by the command handler.
    throw new Error(i18n.t('web3.error.notConnected'));
  }

  connectedAccount = null;
  // Re-initialize the default provider to restore read-only functionality
  initializeDefaultProvider();
  logger.debug('Wallet disconnected. Switched back to default provider.');
  // No return value needed, success is implied if no error is thrown.
}

async function getOwnerOf(tokenId) {
  if (!contract) {
    await initializeDefaultProvider();
    if (!contract) throw new Error(i18n.t('web3.error.notConnected'));
  }
  try {
    const owner = await contract.methods.ownerOf(tokenId).call();
    return owner;
  } catch (error) {
    logger.error(`Error fetching owner for token ${tokenId}:`, error);
    throw new Error(i18n.t('web3.error.tokenNotFound', { tokenId }));
  }
}

async function getOwnedNFTs() {
  if (!contract || !connectedAccount) {
    throw new Error(i18n.t('web3.error.notConnected'));
  }

  // Use ERC721Enumerable to get the token balance of the owner
  const balance = await contract.methods.balanceOf(connectedAccount).call();

  if (balance == 0) {
    return [];
  }

  const nfts = [];
  // Fetch all owned tokenIds in one call
  const ownedTokenIds = await contract.methods.tokensOfOwner(connectedAccount).call();
  for (const tokenId of ownedTokenIds) {
    try {
      const tokenURI = await contract.methods.tokenURI(tokenId).call();
      const jsonString = atob(tokenURI.substring('data:application/json;base64,'.length));
      const metadata = JSON.parse(jsonString);
      const svgString = atob(metadata.image.substring('data:image/svg+xml;base64,'.length));

      nfts.push({
        tokenId: tokenId.toString(),
        svgImage: svgString,
      });
    } catch (error) {
      logger.error(`Could not query token ${tokenId}:`, error.message);
    }
  }

  return nfts;
}

export const web3Handler = {
  discoverWallets,
  getDiscoveredWallets,
  requestWalletAnnouncements,
  connectWallet,
  connectWithProvider,
  disconnectWallet,
  getConnectedAccount,
  getCollectionInfo,
  mintNFT,
  customizeToken,
  getTokenColors,
  getOwnerOf,
  getOwnedNFTs,
  getWeb3Instance,
};

// Discover wallets when the module loads.
// The default provider will be initialized on-demand when a web3 function is called.
discoverWallets();

function getWeb3Instance() {
  return web3;
}
