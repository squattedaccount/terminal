import { web3Handler } from '../web3-handler.js';
import i18n from '../i18n/i18n.js';
import { createTerminalMessage, createTerminalError } from '../utils/messaging.js';

export default {
  name: 'disconnect',
  category: 'web3',

  handler() {
    try {
      web3Handler.disconnectWallet();
      return createTerminalMessage('web3.success.walletDisconnected');
    } catch (error) {
      return createTerminalError('web3.error.notConnected');
    }
  },

  get help() {
    return {
      summary: i18n.t('help.disconnect.summary'),
      detailed: i18n.t('help.disconnect.detailed', { returnObjects: true }),
    };
  },
};
