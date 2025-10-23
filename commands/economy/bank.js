
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'bank',
  description: '🏦 View your bank account and savings',
  category: 'Economy',
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      
      // Initialize bank if not exists
      if (!user.bank) user.bank = 0;
      if (!user.bankLimit) user.bankLimit = 10000;
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);
      const available = user.bankLimit - user.bank;

      await bot.sendMessage(chatId,
        `🏦 *YOUR BANK ACCOUNT*\n\n` +
        `👤 ${user.username}\n` +
        `${rankEmoji} ${user.rank} | Level ${user.level}\n\n` +
        `💰 Wallet: ${user.balance} coins\n` +
        `🏦 Bank: ${user.bank}/${user.bankLimit} coins\n` +
        `📊 Available Space: ${available} coins\n` +
        `💵 Total Assets: ${user.balance + user.bank} coins\n\n` +
        `_Use /deposit to save money_\n` +
        `_Use /withdraw to take money out_`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('[BANK] Error:', error);
      await bot.sendMessage(chatId, '❌ Economy system unavailable.');
    }
  }
};
