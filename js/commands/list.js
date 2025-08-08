import i18n from '../i18n/i18n.js';
import { web3Handler } from '../web3-handler.js';
import { CONTRACT_ADDRESS } from '../web3-config.js';
import { createTerminalMessage, createTerminalError } from '../utils/messaging.js';
import terminalView from '../core/terminal-view.js';
import { Spinner } from '../core/spinner.js';

export default {
  name: 'list',
  category: 'web3',

  async handler() {
    if (!web3Handler.getConnectedAccount()) {
      return createTerminalError('web3.error.notConnected');
    }

    const spinner = new Spinner(terminalView, i18n.t('web3.info.contactingBlockchain'));
    spinner.start();
    try {
      const nfts = await web3Handler.getOwnedNFTs();
      spinner.stop();

      if (nfts.length === 0) {
        return createTerminalMessage('web3.info.noNFTsFound');
      }

      const nftElements = nfts.map(nft => {
        const hyperliquidUrl = `https://www.hyperscan.com/token/${CONTRACT_ADDRESS}/instance/${nft.tokenId}`;
        
        // Use full SVG without cropping to preserve background colors
        // Scaling and centering will be handled by CSS
        let svgContent = nft.svgImage;
        
        // Sanitize the SVG content before rendering to prevent XSS attacks
        return `<a href="${hyperliquidUrl}" target="_blank" class="nft-card">${DOMPurify.sanitize(svgContent)}</a>`;
      }).join('');

      // Note the 'nfts-container' class for styling
      const htmlOutput = `
<br/>
<div class="nfts-container">
  ${nftElements}
</div>
<br/>
`;

      return [{ type: 'html', content: htmlOutput }];

    } catch (error) {
      spinner.stop();
      return createTerminalError(error.message);
    }
  },

  get help() {
    return {
      summary: i18n.t('help.list.summary'),
      detailed: i18n.t('help.list.detailed', { returnObjects: true }),
    };
  },
};
