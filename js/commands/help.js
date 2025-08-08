import i18n from '../i18n/i18n.js';
import CommandRegistry from './registry.js';
import logger from '../core/logger.js';
import { createTerminalError } from '../utils/messaging.js';

export default {
  name: 'help',
  category: 'core',

  /**
   * Main handler for the 'help' command.
   * Dispatches to specific or general help generators.
   * @param {string[]} args - The arguments for the command.
   */
  async handler(args) {
    const commandName = args[0];
    if (commandName) {
      return this._generateSpecificHelp(commandName);
    }
    return this._generateGeneralHelp();
  },

  /**
   * Generates the help output for a specific command.
   * @param {string} commandName - The name of the command.
   * @returns {Array<Object>} The output for the terminal.
   * @private
   */
  _generateSpecificHelp(commandName) {
    const command = CommandRegistry.getCommand(commandName);
    const helpInfo = command?.help?.detailed;

    if (helpInfo) {
      if (Array.isArray(helpInfo)) {
        const output = helpInfo.map(line => ({ type: 'html', content: line }));
        return output;
      }

      const { description, usage, examples, footer } = helpInfo;
      const output = [
        { type: 'html', content: '' },
        { type: 'html', content: `<strong>${command.name}</strong>: ${description || i18n.t('help.specific.noDescription')}` },
        { type: 'html', content: `${i18n.t('help.specific.usagePrefix')} ${usage || i18n.t('help.specific.noUsage')}` }
      ];

      if (examples && Array.isArray(examples) && examples.length > 0) {
        output.push({ type: 'html', content: '' });
        output.push({ type: 'html', content: i18n.t('help.specific.examplesTitle') });
        examples.forEach(example => {
          output.push({ type: 'html', content: `  - ${example}` });
        });
      }

      if (footer) {
        output.push({ type: 'html', content: footer.replace(/\n/g, '<br>') });
      }

      output.push({ type: 'html', content: '' });
      return output;
    }
    return createTerminalError('terminal.error.noHelp', { commandName });
  },

  /**
   * Generates the general help output listing all commands.
   * @returns {Array<Object>} The output for the terminal.
   * @private
   */
  _generateGeneralHelp() {
    const output = [];
    output.push({ type: 'html', content: '' });
    output.push({ type: 'html', content: `<strong>${i18n.t('help.title')}</strong>` });
    output.push({ type: 'html', content: '' });

    const categories = CommandRegistry.commandCategories;
    const categoryOrder = ['core', 'info', 'web3', 'tools', 'other'];

    for (const categoryName of categoryOrder) {
      const commandList = categories[categoryName];
      if (commandList && commandList.length > 0) {
        const categoryKey = `help.categories.${categoryName}`;
        let categoryDisplayName = i18n.t(categoryKey);
        // Remove the word "commands" (case-insensitive) from the end of the category label
        categoryDisplayName = categoryDisplayName.replace(/\s*commands?\s*$/i, '').trim();
        output.push({ type: 'html', content: `<strong>${categoryDisplayName}</strong>` });

        commandList.forEach(commandName => {
          const command = CommandRegistry.getCommand(commandName);
          if (command) {
            const summary = command.help?.summary || i18n.t(`help.${commandName}.summary`);
            output.push({
              type: 'html',
              content: `  <span class="help-command" style="display:inline-block; min-width: 12ch; color: var(--color-accent); white-space:pre;">${commandName}</span> - ${summary}`
            });
          }
        });
        output.push({ type: 'html', content: '' });
      }
    }

        output.push({ type: 'html', content: i18n.t('help.general.footer') });
    output.push({ type: 'html', content: '' });

    return output;
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.help.summary'),
      detailed: i18n.t('help.help.detailed', { returnObjects: true }),
    };
  },
};
