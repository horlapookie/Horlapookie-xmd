
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'bonus',
  description: '💰 Give bonus coins to a user (Owner only)',
  category: 'Economy',
  async execute(msg, { bot, args, isOwner }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    if (!isOwner) {
      return await bot.sendMessage(chatId, '❌ This command is for the bot owner only!');
    }

    try {
      // If no args, give 2 billion to the command sender
      if (!args[0]) {
        const user = await getUser(userId, username, msg.from);
        
        const bonusAmount = 2000000000;
        user.balance += bonusAmount;
        user.totalEarned += bonusAmount;
        user.rank = 'Legend';
        user.updatedAt = new Date();
        await user.save();

        const rankEmoji = getRankEmoji(user.rank);

        return await bot.sendMessage(chatId,
          `🎁 *BONUS RECEIVED!*\n\n` +
          `${rankEmoji} ${user.username}\n\n` +
          `💰 Bonus: ${bonusAmount.toLocaleString()} coins\n` +
          `💵 New Balance: ${user.balance.toLocaleString()} coins\n` +
          `👑 Rank: ${user.rank}\n\n` +
          `_You are now a Legend!_`,
          { parse_mode: 'Markdown' }
        );
      }

      // If args provided, parse amount and optional target
      const amount = parseInt(args[0]);
      
      if (!amount || amount <= 0) {
        return await bot.sendMessage(chatId, '❌ Invalid amount!');
      }

      const user = await getUser(userId, username, msg.from);
      
      user.balance += amount;
      user.totalEarned += amount;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      return await bot.sendMessage(chatId,
        `🎁 *BONUS RECEIVED!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💰 Bonus: ${amount.toLocaleString()} coins\n` +
        `💵 New Balance: ${user.balance.toLocaleString()} coins\n` +
        `👑 Rank: ${user.rank}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[BONUS] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to give bonus.');
    }
  }
};
