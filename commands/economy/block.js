import { isMainBot } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'block',
  description: '🛡️ Block to reduce damage by 50%',
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

      // Block always works but only reduces damage
      player.blocking = true;

      battle.turn = opponent.id;
      activeBattles.set(battleKey, battle);

      await bot.sendMessage(chatId,
        `🛡️ *BLOCKING!*\n\n` +
        `${player.username} raises their guard!\n` +
        `📉 Next attack damage reduced by 50%\n\n` +
        `${opponent.username}'s turn!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[BLOCK] Error:', error);
      await bot.sendMessage(chatId, '❌ Block error.');
    }
  }
};
