import { canClaimDaily, claimDaily, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'daily',
  description: 'Claim your daily 10 coins reward',
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
      const canClaim = await canClaimDaily(userId);
      
      if (!canClaim) {
        return await bot.sendMessage(chatId, 
          '⏰ *Daily Reward Already Claimed!*\n\n' +
          'You can claim your daily reward again in 24 hours.\n' +
          'Come back tomorrow for more coins! 💰',
          { parse_mode: 'Markdown' }
        );
      }

      const user = await claimDaily(userId, username);
      const rankEmoji = getRankEmoji(user.rank);
      
      await bot.sendMessage(chatId,
        '🎁 *Daily Reward Claimed!*\n\n' +
        `✅ You received 1000 coins!\n` +
        `💰 New Balance: ${user.balance} coins\n` +
        `${rankEmoji} Rank: ${user.rank}\n` +
        `⭐ Level: ${user.level}\n` +
        `🎯 XP: ${user.xp}\n\n` +
        '_Come back in 24 hours for your next daily reward!_',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Daily command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
