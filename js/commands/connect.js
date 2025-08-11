import { web3Handler } from '../web3-handler.js';
import { showWalletPicker } from '../wallet/wallet-ui.js';
import { connectWithWalletConnect } from '../wallet/walletconnect.js';
import { WALLETCONNECT_PROJECT_ID } from '../web3-config.js';
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

      // Try injected wallets first via EIP-6963 picker
      web3Handler.requestWalletAnnouncements();
      await new Promise(r => setTimeout(r, 250));
      const wallets = web3Handler.getDiscoveredWallets();

      if (wallets && wallets.length) {
        // Open lightweight picker modal
        const providerChoice = await new Promise((resolve) => {
          showWalletPicker({
            wallets,
            onSelect: (w) => resolve(w),
            onCancel: () => resolve(null),
          });
        });

        if (!providerChoice) {
          return createTerminalMessage('web3.info.connectionCancelled');
        }

        if (providerChoice.type === 'walletconnect') {
          spinner.start();
          try {
            const wcProvider = await connectWithWalletConnect(WALLETCONNECT_PROJECT_ID);
            const newAccount = await web3Handler.connectWithProvider(wcProvider);
            spinner.stop();
            const message = i18n.t('web3.success.walletConnected', { account: newAccount });
            return [{ type: 'text', content: message }];
          } catch (e) {
            spinner.stop();
            return createRawTerminalError(i18n.t('web3.error.connectionFailed', { message: e.message }));
          }
        }

        const selectedProvider = providerChoice.provider;
        if (!selectedProvider) {
          return createRawTerminalError(i18n.t('web3.error.connectionFailed', { message: 'No provider' }));
        }

        spinner.start();
        const newAccount = await web3Handler.connectWithProvider(selectedProvider);
        spinner.stop();
        const message = i18n.t('web3.success.walletConnected', { account: newAccount });
        return [{ type: 'text', content: message }];
      }

      // Fallback to legacy connect (MetaMask-first) if no wallets discovered
      spinner.start();
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
