import i18n from '../i18n/i18n.js';
import { web3Handler } from '../web3-handler.js';
import logger from '../core/logger.js';
import { createTerminalError, createRawTerminalError } from '../utils/messaging.js';
import terminalView from '../core/terminal-view.js';
import { Spinner } from '../core/spinner.js';
import { CONTRACT_ADDRESS } from '../web3-config.js';

export default {
  name: 'mint',
  category: 'web3',

  async handler(args, onMessage) {
    if (!web3Handler.getConnectedAccount()) {
      return createTerminalError('web3.error.notConnectedBeforeMint');
    }

    // --- Argument Parsing ---
    if (!args.length) {
      return createTerminalError('help.mint.error.missingArgs');
    }

    const collectionName = args[0];
    let quantity = 1; // Default to 1
    if (args[1]) {
      quantity = parseInt(args[1], 10);
    }

    const bgIndex = args.indexOf('--bg');
    const textIndex = args.indexOf('--text');
    const bgColor = bgIndex !== -1 && args[bgIndex + 1] ? args[bgIndex + 1] : null;
    const textColor = textIndex !== -1 && args[textIndex + 1] ? args[textIndex + 1] : null;

    // --- Input Validation ---
    if (!collectionName || collectionName.toLowerCase() !== 'techno_punks') {
      return createTerminalError('terminal.error.unknownCollection', { collectionName: collectionName || '' });
    }
    if (isNaN(quantity) || quantity < 1 || quantity > 20) {
      return createTerminalError('help.mint.error.invalidQuantity');
    }
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    if (bgColor && !hexColorRegex.test(bgColor)) {
      return createTerminalError('terminal.error.invalidBgColor', { bgColor });
    }
    if (textColor && !hexColorRegex.test(textColor)) {
      return createTerminalError('terminal.error.invalidTextColor', { textColor });
    }

    // --- Execution ---
    const spinner = new Spinner(terminalView, i18n.t('web3.info.contactingBlockchain'));
    spinner.start();

    // Set up 2-minute timeout warning
    const timeoutWarning = setTimeout(() => {
      onMessage([{
        type: 'text',
        content: i18n.t('terminal.info.transactionTakingLong')
      }]);
    }, 120000); // 2 minutes

    try {
      // --- Step 1: Mint the NFTs ---
      // Unified minting: use mintNFT for both single and multiple quantities with progress callback
      const mintResults = await web3Handler.mintNFT(quantity, (progressMessage) => {
        // Check if message contains a transaction hash and make it clickable
        const hashRegex = /(0x[a-fA-F0-9]{64})/g;
        if (hashRegex.test(progressMessage)) {
          const messageWithLinks = progressMessage.replace(hashRegex, (hash) => {
            return `<a href="https://explorer.hyperliquid-testnet.xyz/tx/${hash}" target="_blank" style="text-decoration: none; color: inherit;">${hash}</a>`;
          });
          onMessage([{
            type: 'html',
            content: messageWithLinks
          }]);
        } else {
          onMessage([{
            type: 'text',
            content: progressMessage
          }]);
        }
      });

      clearTimeout(timeoutWarning);
      spinner.stop();
      const successMessage = i18n.t('terminal.success.minted', { count: mintResults.length }).replace(/[{}]/g, '');

      // Build the full message array before sending
      const messages = [
        { type: 'html', content: `<b>${successMessage}</b>` },
        { type: 'text', content: i18n.t('terminal.success.mintedTokensList') }
      ];

      mintResults.forEach(result => {
        const pair = result.pair.replace(/[{}]/g, '');
        const hyperliquidUrl = `https://www.hyperscan.com/token/${CONTRACT_ADDRESS}/instance/${result.tokenId}`;
        messages.push({
          type: 'html',
          content: `&nbsp;&nbsp;- #${result.tokenId} <a href="${hyperliquidUrl}" target="_blank" style="text-decoration: none; color: inherit;">(${pair})</a>`
        });
      });

      onMessage(messages);

      // --- Step 2: Set Colors (if provided) ---
      if (bgColor && textColor) {
        onMessage([
          { type: 'text', content: `\n${i18n.t('terminal.info.customizationStart', { count: mintResults.length })}` },
          { type: 'text', content: i18n.t('terminal.info.approveTransactions') }
        ]);

        for (let i = 0; i < mintResults.length; i++) {
          const result = mintResults[i];
          onMessage([{ type: 'text', content: i18n.t('terminal.info.customizingToken', { tokenId: result.tokenId, i: i + 1, count: mintResults.length }) }]);
          
          const colorTxHash = await web3Handler.customizeToken(result.tokenId, { backgroundColor: bgColor, textColor: textColor }, () => {
            onMessage([
              { type: 'text', content: i18n.t('web3.info.colorTxApproved', { tokenId: result.tokenId }) }
            ]);
          });
          
          onMessage([{ type: 'html', content: `&nbsp;&nbsp;- ${i18n.t('terminal.success.colorsUpdated', { tokenId: result.tokenId })} <a href="https://sepolia.etherscan.io/tx/${colorTxHash}" target="_blank">${i18n.t('web3.info.viewOnExplorer')}</a>` }]);
        }
      }

      return []; // Return empty array on success

    } catch (error) {
      clearTimeout(timeoutWarning);
      spinner.stop();
      return createTerminalError('web3.error.generic', { message: error.message });
    }
  },

  get help() {
    return {
      summary: i18n.t('help.mint.summary'),
      detailed: i18n.t('help.mint.detailed', { returnObjects: true }),
      error: i18n.t('help.mint.error', { returnObjects: true }),
    };
  },
};
