import { getUser, isMainBot } from '../../lib/economy.js';
import { activeChallenges, activeBattles } from './challenge.js';

export default {
  name: 'accept',
  description: '✅ Accept a PVP challenge',
  category: 'Combat',
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

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

      // Remove from challenges
      activeChallenges.delete(challengeKey);

      // Get both users
      const challenger = await getUser(foundChallenge.challengerId, foundChallenge.challengerUsername);
      const target = await getUser(foundChallenge.targetId, foundChallenge.targetUsername);

      // Start battle
      const battleKey = `${foundChallenge.challengerId}_${foundChallenge.targetId}_${chatId}`;
      activeBattles.set(battleKey, {
        player1: {
          id: foundChallenge.challengerId,
          username: challenger.username || foundChallenge.challengerUsername,
          health: challenger.health || 100,
          maxHealth: 100,
          stunned: false
        },
        player2: {
          id: foundChallenge.targetId,
          username: target.username || foundChallenge.targetUsername,
          health: target.health || 100,
          maxHealth: 100,
          stunned: false
        },
        turn: foundChallenge.challengerId,
        chatId,
        startTime: Date.now()
      });

      await bot.sendMessage(chatId,
        `⚔️ *BATTLE STARTED!*\n\n` +
        `🥊 ${challenger.username || foundChallenge.challengerUsername} VS ${target.username || foundChallenge.targetUsername}\n\n` +
        `❤️ ${challenger.username || foundChallenge.challengerUsername}: ${challenger.health}/100 HP\n` +
        `❤️ ${target.username || foundChallenge.targetUsername}: ${target.health}/100 HP\n\n` +
        `🎯 ${challenger.username || foundChallenge.challengerUsername}'s turn!\n\n` +
        `*Available Actions:*\n` +
        `⚔️ /attack <weapon> @opponent\n` +
        `🥊 /punch @opponent\n` +
        `🛡️ /block\n` +
        `💨 /dodge\n` +
        `🌀 /weave\n` +
        `💊 /heal (if you have medkit)\n\n` +
        `💡 Check /shop for weapons!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[ACCEPT] Error:', error);
      await bot.sendMessage(chatId, '❌ Error accepting challenge.');
    }
  }
};
