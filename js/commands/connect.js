import { web3Handler } from '../web3-handler.js';
import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';
import { createTerminalMessage, createRawTerminalError } from '../utils/messaging.js';
import terminalView from '../core/terminal-view.js';
import { Spinner } from '../core/spinner.js';

export default {
  name: 'connect',
  category: 'web3',

  async handler(args, onMessage) {
    const spinner = new Spinner(terminalView, i18n.t('web3.info.connecting'));

    try {
      const connectedAccount = web3Handler.getConnectedAccount();
      if (connectedAccount) {
        return createTerminalMessage('web3.info.walletAlreadyConnected', { account: connectedAccount });
      }

      spinner.start();

      // Delegate connection logic entirely to the web3 handler.
      // It will find the best provider or throw a translated error if none is found.
      const newAccount = await web3Handler.connectWallet();
      
      spinner.stop();

      const message = i18n.t('web3.success.walletConnected', { account: newAccount });
      return [{ type: 'text', content: message }];

    } catch (error) {
      spinner.stop(); 
      logger.error(`Connect command failed: ${error.message}`);
      // The error from web3-handler should already be translated.
      // Stop the spinner and then display the error message;
      return createRawTerminalError(error.message);
    }
  },

  get help() {
    return {
      summary: i18n.t('help.connect.summary'),
      detailed: i18n.t('help.connect.detailed', { returnObjects: true }),
    };
  },
};
