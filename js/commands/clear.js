import { eventBus } from '../utils/events.js';
import i18n from '../i18n/i18n.js';

const handler = async () => {
  eventBus.emit('terminal:clear');
  eventBus.emit('terminal:showWelcome');
  return []; // Return an empty array for commands with no text output
};

const clearCommand = {
  name: 'clear',
  handler,
  category: 'core',
  get help() {
    return {
      summary: i18n.t('help.clear.summary'),
      detailed: i18n.t('help.clear.detailed', { returnObjects: true }),
    };
  },
};

const clsCommand = {
  name: 'cls',
  handler,
  category: 'core',
  get help() {
    return {
      summary: i18n.t('help.cls.summary'),
      detailed: i18n.t('help.cls.detailed', { returnObjects: true }),
    };
  },
};

export default [clearCommand, clsCommand];
