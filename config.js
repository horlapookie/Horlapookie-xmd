import settings from './settings.js';

export default {
  prefix: process.env.BOT_PREFIX || '/',
  ownerNumber: process.env.BOT_OWNER || '7708066760',
  botName: process.env.BOT_NAME || '✦✦✦ 𝐇 𝐎 𝐑 𝐋 𝐀 𝐏 𝐎 𝐎 𝐊 𝐈 𝐄 ✦✦✦',
  ownerName: process.env.BOT_OWNER_NAME || '𝓗𝓞𝓡𝓛𝓐𝓟𝓞𝓞𝓚𝓘𝓔',
  BOOM_MESSAGE_LIMIT: 50,

  openaiApiKey: settings.openaiApiKey,
  giphyApiKey: settings.giphyApiKey,
  geminiApiKey: settings.geminiApiKey,
  imgurClientId: settings.imgurClientId,
  copilotApiKey: settings.copilotApiKey,
  FOOTBALL_API_KEY: settings.FOOTBALL_API_KEY,
};
