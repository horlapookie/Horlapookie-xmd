
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'work',
  description: '💼 Work to earn coins (cooldown: 1 hour)',
  category: 'Economy',
  aliases: ['job'],
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
      
      if (!user.lastWork) user.lastWork = null;

      // Check cooldown (1 hour)
      if (user.lastWork) {
        const hoursSinceWork = (Date.now() - new Date(user.lastWork).getTime()) / (1000 * 60 * 60);
        if (hoursSinceWork < 1) {
          const minutesLeft = Math.ceil((1 - hoursSinceWork) * 60);
          return await bot.sendMessage(chatId, 
            `⏰ You're tired! Rest for ${minutesLeft} more minutes.`
          );
        }
      }

      // Random earnings (500-2000 coins)
      const earnings = Math.floor(Math.random() * 1501) + 500;
      const jobs = [
        '👨‍💻 coded a website',
        '🍕 delivered pizza',
        '📦 sorted packages',
        '🚗 drove a taxi',
        '🎨 painted a mural',
        '📚 taught a class',
        '🔧 fixed computers',
        '🎭 performed on stage',
        '📸 did photography',
        '🏗️ worked construction'
      ];
      
      const job = jobs[Math.floor(Math.random() * jobs.length)];

      // Update user
      await updateBalance(userId, earnings, username);
      user.lastWork = new Date();
      await user.save();

      const updatedUser = await getUser(userId);
      const rankEmoji = getRankEmoji(updatedUser.rank);

      let message = `💼 *WORK COMPLETED!*\n\n` +
        `${rankEmoji} ${user.username} ${job}\n\n` +
        `💰 Earned: ${earnings} coins\n` +
        `💵 New Balance: ${updatedUser.balance} coins\n\n` +
        `_You can work again in 1 hour_`;
      
      // Add loan reminder if user has outstanding loan
      if (updatedUser.loan && updatedUser.loan > 0) {
        const hoursLeft = Math.ceil((new Date(updatedUser.loanDue) - Date.now()) / (1000 * 60 * 60));
        message += `\n\n⚠️ *LOAN REMINDER*\n💳 Outstanding: ${updatedUser.loan} coins\n⏰ Due in: ${hoursLeft > 0 ? hoursLeft + ' hours' : 'OVERDUE!'}`;
      }

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[WORK] Error:', error);
      await bot.sendMessage(chatId, '❌ Work failed. Try again.');
    }
  }
};
