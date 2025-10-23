import { isMainBot } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'dodge',
  description: '💨 Attempt to dodge the next attack',
  category: 'Combat',
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, '❌ Combat commands only work on the main bot!');
    }

    try {
      let battle = null;
      let battleKey = null;
      let isPlayer1 = false;

      for (const [key, b] of activeBattles.entries()) {
        if (b.chatId === chatId && (b.player1.id === userId || b.player2.id === userId)) {
          battle = b;
          battleKey = key;
          isPlayer1 = b.player1.id === userId;
          break;
        }
      }

      if (!battle) {
        return await bot.sendMessage(chatId, '❌ You\'re not in an active battle!');
      }

      if (battle.turn !== userId) {
        return await bot.sendMessage(chatId, '❌ Not your turn!');
      }

      const player = isPlayer1 ? battle.player1 : battle.player2;
      const opponent = isPlayer1 ? battle.player2 : battle.player1;

      // Set dodge flag with 60% success rate
      const dodgeSuccess = Math.random() <= 0.6;
      player.dodging = dodgeSuccess;

      battle.turn = opponent.id;
      activeBattles.set(battleKey, battle);

      if (dodgeSuccess) {
        await bot.sendMessage(chatId,
          `💨 *DODGE READY!*\n\n` +
          `${player.username} is prepared to dodge!\n` +
          `🎯 60% chance to evade next attack\n\n` +
          `${opponent.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(chatId,
          `❌ *DODGE FAILED!*\n\n` +
          `${player.username} tried to dodge but failed!\n\n` +
          `${opponent.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[DODGE] Error:', error);
      await bot.sendMessage(chatId, '❌ Dodge error.');
    }
  }
};
