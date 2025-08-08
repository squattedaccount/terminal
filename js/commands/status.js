import i18n from '../i18n/i18n.js';
import { web3Handler } from '../web3-handler.js';
import logger from '../core/logger.js';
import { createTerminalError } from '../utils/messaging.js';
import terminalView from '../core/terminal-view.js';
import { Spinner } from '../core/spinner.js';

export default {
  name: 'status',
  category: 'web3',

  async handler(args, onMessage) {
    onMessage([{ type: 'html', content: '' }]); // Add empty line before spinner
    const spinner = new Spinner(terminalView, i18n.t('web3.info.fetchingCollectionInfo'));
    spinner.start();
    try {
      const info = await web3Handler.getCollectionInfo();
      spinner.stop();
      const output = [
        { type: 'html', content: '' }, // Add empty line before info
        { type: 'html', content: `<strong class="command-title">${i18n.t('web3.status.title')}</strong>` },
        { type: 'html', content: `${i18n.t('web3.status.name')}: ${info.name} (${info.symbol})` },
        { type: 'html', content: `${i18n.t('web3.status.contractAddress')}: ${info.contractAddress}` },
        { type: 'html', content: `${i18n.t('web3.status.price')}: ${info.price} ETH` },
        { type: 'html', content: `${i18n.t('web3.status.minted')}: ${info.totalSupply} / ${info.maxSupply}` },
        { type: 'html', content: '' } // Add empty line after info
      ];
      onMessage(output);
      return [];
    } catch (error) {
      spinner.stop();
      logger.error(`Status error: ${error.message}`);
      return createTerminalError(error.message);
    }
  },

  get help() {
    return {
      summary: i18n.t('help.status.summary'),
      detailed: i18n.t('help.status.detailed', { returnObjects: true }),
    };
  },
};
