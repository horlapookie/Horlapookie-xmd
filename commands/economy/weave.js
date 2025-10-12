import { isMainBot } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'weave',
  description: '🌀 Weave to avoid attacks (80% success)',
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

      // Weave has 80% success rate
      const weaveSuccess = Math.random() <= 0.8;
      player.weaving = weaveSuccess;

      battle.turn = opponent.id;
      activeBattles.set(battleKey, battle);

      if (weaveSuccess) {
        await bot.sendMessage(chatId,
          `🌀 *WEAVE STANCE!*\n\n` +
          `${player.username} is weaving defensively!\n` +
          `🎯 80% chance to avoid next attack\n\n` +
          `${opponent.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(chatId,
          `❌ *WEAVE FAILED!*\n\n` +
          `${player.username}'s weave timing was off!\n\n` +
          `${opponent.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[WEAVE] Error:', error);
      await bot.sendMessage(chatId, '❌ Weave error.');
    }
  }
};
