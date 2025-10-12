import { activeChallenges } from './challenge.js';
import { isMainBot } from '../../lib/economy.js';

export default {
  name: 'decline',
  description: '❌ Decline a PVP challenge',
  category: 'Combat',
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, '❌ Combat commands only work on the main bot!');
    }

    try {
      // Find challenge where this user is the target
      let foundChallenge = null;
      let challengeKey = null;

      for (const [key, challenge] of activeChallenges.entries()) {
        if (challenge.targetId === userId && challenge.chatId === chatId) {
          foundChallenge = challenge;
          challengeKey = key;
          break;
        }
      }

      if (!foundChallenge) {
        return await bot.sendMessage(chatId, '❌ No active challenge found for you!');
      }

      // Remove challenge
      activeChallenges.delete(challengeKey);

      await bot.sendMessage(chatId,
        `❌ *CHALLENGE DECLINED*\n\n` +
        `${foundChallenge.targetUsername} declined the fight with ${foundChallenge.challengerUsername}!\n\n` +
        `😨 Maybe next time...`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[DECLINE] Error:', error);
      await bot.sendMessage(chatId, '❌ Error declining challenge.');
    }
  }
};
