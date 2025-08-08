import { web3Handler } from '../web3-handler.js';
import i18n from '../i18n/i18n.js';
import { createRawTerminalError, createTerminalError } from '../utils/messaging.js';
import ThemeManager from '../themes/manager.js';

const command = {
  name: 'set',
  category: 'system',
  async handler(args, onMessage) {
    if (args.length < 1) {
      return createTerminalError('web3.error.setMissingArgs');
    }

    const subcommand = args[0];

    // Handle theme subcommand
    if (subcommand === 'theme') {
      return await this.handleThemeCommand(args.slice(1), onMessage);
    }

    if (!web3Handler.getConnectedAccount()) {
      return createTerminalError('web3.error.notConnected');
    }

    // Handle token customization (existing functionality)
    if (args.length < 2) {
      return createTerminalError('web3.error.setMissingArgs');
    }

    const tokenId = args[0];
    const backgroundColor = getArgValue(args, '--bg');
    const textColor = getArgValue(args, '--text');

    if (!backgroundColor && !textColor) {
      return createTerminalError('web3.error.setInvalidArgs');
    }

    try {
      const owner = await web3Handler.getOwnerOf(tokenId);
      const connectedAccount = web3Handler.getConnectedAccount();

      if (owner.toLowerCase() !== connectedAccount.toLowerCase()) {
        return createTerminalError('web3.error.notOwner', { tokenId });
      }

      onMessage({ type: 'info', message: i18n.t('web3.info.sendingCustomization', { tokenId }) });
      
      const txHash = await web3Handler.customizeToken(tokenId, backgroundColor, textColor, (hash) => {
        onMessage({ type: 'info', message: i18n.t('web3.info.txSent', { hash }) });
      });

      onMessage({ type: 'success', message: i18n.t('web3.info.customizationSuccess', { tokenId, txHash }) });

    } catch (error) {
      return createTerminalError(error.message);
    }
  },

  async handleThemeCommand(args, onMessage) {
    const backgroundColor = getArgValue(args, '--bg');
    const textColor = getArgValue(args, '--text');

    // Check for predefined theme names
    if (args.length === 1 && ['dark', 'light'].includes(args[0])) {
      try {
        ThemeManager.setTheme(args[0]);
        onMessage({ type: 'success', message: i18n.t('theme.switched', { themeName: args[0] }) });
        return;
      } catch (error) {
        return createRawTerminalError(i18n.t('theme.setFailed', { message: error.message }));
      }
    }

    // Handle custom theme
    if (!backgroundColor || !textColor) {
        const customThemeError = `${i18n.t('theme.customMissingParams')}\n${i18n.t('theme.customUsage')}\n${i18n.t('theme.customOr')}`;
        return createRawTerminalError(customThemeError);
    }

    try {
      ThemeManager.setCustomTheme(backgroundColor, textColor);
      const successMessage = `${i18n.t('theme.customApplied')}\n${i18n.t('theme.customBackground', { backgroundColor })}\n${i18n.t('theme.customText', { textColor })}\n${i18n.t('theme.customUsageHint')}`;
      onMessage({ type: 'success', message: successMessage });
    } catch (error) {
      throw new Error(i18n.t('terminal.error.failedToSetCustomTheme', { message: error.message }));
    }
  },
  get help() {
    return {
      summary: i18n.t('help.set.summary'),
      detailed: i18n.t('help.set.detailed', { returnObjects: true }),
    };
  },
};

function getArgValue(args, argName) {
  const index = args.indexOf(argName);
  if (index !== -1 && args.length > index + 1) {
    return args[index + 1];
  }
  return null;
}

export default command;
