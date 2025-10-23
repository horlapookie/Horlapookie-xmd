
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'beg',
  description: '🙏 Beg for coins (cooldown: 30 min)',
  category: 'Economy',
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
      
      if (!user.lastBeg) user.lastBeg = null;

      // Check cooldown (30 minutes)
      if (user.lastBeg) {
        const minutesSinceBeg = (Date.now() - new Date(user.lastBeg).getTime()) / (1000 * 60);
        if (minutesSinceBeg < 30) {
          const minutesLeft = Math.ceil(30 - minutesSinceBeg);
          return await bot.sendMessage(chatId, 
            `⏰ People are tired of you! Wait ${minutesLeft} more minutes.`
          );
        }
      }

      // 70% success rate
      const success = Math.random() > 0.3;
      
      if (!success) {
        user.lastBeg = new Date();
        await user.save();
        
        return await bot.sendMessage(chatId,
          `😢 *Nobody gave you anything!*\n\n_Try again in 30 minutes_`,
          { parse_mode: 'Markdown' }
        );
      }

      // Random earnings (10-100 coins)
      const earnings = Math.floor(Math.random() * 91) + 10;
      const givers = [
        '🧓 an old lady',
        '👨‍💼 a businessman',
        '👩‍🎓 a student',
        '👮 a police officer',
        '👨‍🍳 a chef',
        '🧑‍⚕️ a doctor',
        '🧑‍🚀 an astronaut',
        '👩‍🎨 an artist'
      ];
      
      const giver = givers[Math.floor(Math.random() * givers.length)];

      await updateBalance(userId, earnings, username);
      user.lastBeg = new Date();
      await user.save();

      const updatedUser = await getUser(userId);
      const rankEmoji = getRankEmoji(updatedUser.rank);

      await bot.sendMessage(chatId,
        `🙏 *BEGGING SUCCESSFUL!*\n\n` +
        `${giver} gave you ${earnings} coins\n\n` +
        `${rankEmoji} ${user.username}\n` +
        `💰 Earned: ${earnings} coins\n` +
        `💵 New Balance: ${updatedUser.balance} coins\n\n` +
        `_You can beg again in 30 minutes_`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[BEG] Error:', error);
      await bot.sendMessage(chatId, '❌ Begging failed. Try again.');
    }
  }
};
