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
      
      // Initialize health if not exists
      if (!user.health) {
        user.health = 100;
        await user.save();
      }

      const healthBar = '█'.repeat(Math.floor(user.health / 10)) + '░'.repeat(10 - Math.floor(user.health / 10));
      const pvpWins = user.pvpStats?.wins || 0;
      const pvpLosses = user.pvpStats?.losses || 0;
      
      const balanceMsg = `💰 *Your Balance & Stats*\n\n` +
        `👤 ${user.username}\n` +
        `${rankEmoji} ${user.rank} • Level ${user.level}\n` +
        `💵 Balance: ${user.balance.toLocaleString()} coins\n` +
        `❤️ Health: ${user.health}/100 HP\n` +
        `${healthBar}\n\n` +
        `⚔️ *PVP Stats:*\n` +
        `🏆 Wins: ${pvpWins}\n` +
        `💀 Losses: ${pvpLosses}\n\n` +
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
