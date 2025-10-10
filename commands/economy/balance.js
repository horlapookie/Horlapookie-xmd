import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'balance',
  description: 'Check your coin balance',
  category: 'Economy',
  aliases: ['bal', 'wallet', 'coins'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      const rankEmoji = getRankEmoji(user.rank);
      
      const balanceMsg = `💰 *Your Balance*\n\n` +
        `👤 ${user.username}\n` +
        `${rankEmoji} ${user.rank} • Level ${user.level}\n` +
        `💵 Balance: ${user.balance} coins\n\n` +
        `_Use /inventory for full stats_`;
      
      await bot.sendMessage(chatId, balanceMsg, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Balance command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
