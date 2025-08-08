import i18n from '../i18n/i18n.js';

export default {
  name: 'supply',
  category: 'info',

  async handler() {
    const content = i18n.t('commands.supply');
    return content.map(line => ({ type: 'text', content: line }));
  },

  get help() {
    return {
      summary: i18n.t('help.supply.summary'),
      detailed: i18n.t('help.supply.detailed', { returnObjects: true }),
    };
  },
};
