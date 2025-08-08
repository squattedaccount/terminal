import { enter as enterDrawMode } from '../draw/draw-controller.js';
import i18n from '../i18n/i18n.js';

const handler = async () => {
  enterDrawMode();
  return [];
};

const drawCommand = {
  name: 'draw',
  handler,
  category: 'other',
  get help() {
    return {
      summary: i18n.t('help.draw.summary'),
      detailed: i18n.t('help.draw.detailed', { returnObjects: true }),
    };
  },
};

export default [drawCommand];
