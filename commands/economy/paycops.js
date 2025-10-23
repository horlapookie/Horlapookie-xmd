
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'paycops',
  description: '👮 Pay cops (based on wealth)',
  category: 'Economy',
  aliases: ['cops', 'bribe'],
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
      
      // Check cooldown (6 hours)
      if (user.lastCops) {
        const hoursSinceLastCops = (Date.now() - new Date(user.lastCops).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCops < 6) {
          const hoursLeft = (6 - hoursSinceLastCops).toFixed(1);
          return await bot.sendMessage(chatId, 
            `⏰ Cops already paid!\n\nYou can pay them again in ${hoursLeft} hours.`
          );
        }
      }

      // Calculate cop fee based on total wealth (balance + bank)
      const totalWealth = user.balance + (user.bank || 0);
      let copFee;

      if (totalWealth < 5000) {
        copFee = 100;
      } else if (totalWealth < 15000) {
        copFee = 500;
      } else if (totalWealth < 50000) {
        copFee = 1500;
      } else if (totalWealth < 100000) {
        copFee = 3000;
      } else if (totalWealth < 250000) {
        copFee = 7500;
      } else {
        copFee = 15000;
      }

      // Check if user has cop detector (50% discount)
      const hasDetector = user.inventory?.find(i => i.item === 'detector');
      if (hasDetector) {
        copFee = Math.floor(copFee * 0.5);
      }

      if (user.balance < copFee) {
        return await bot.sendMessage(chatId,
          `❌ *Insufficient funds!*\n\n` +
          `👮 Cop Fee: ${copFee} coins${hasDetector ? ' (50% off with Cop Detector)' : ''}\n` +
          `💰 Your Balance: ${user.balance} coins\n` +
          `❌ You need ${copFee - user.balance} more coins`,
          { parse_mode: 'Markdown' }
        );
      }

      // Pay cops
      await updateBalance(userId, -copFee, username);
      user.lastCops = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);
      const updatedUser = await getUser(userId);

      await bot.sendMessage(chatId,
        `✅ *COPS PAID!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `👮 Fee Paid: ${copFee} coins${hasDetector ? ' (50% discount)' : ''}\n` +
        `💰 Total Wealth: ${totalWealth.toLocaleString()} coins\n` +
        `💵 New Balance: ${updatedUser.balance} coins\n\n` +
        `🛡️ You're safe from cops for 6 hours!\n` +
        `${!hasDetector ? '\n💡 Tip: Buy a 📡 Cop Detector from /shop for 50% discount!' : ''}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[PAY COPS] Error:', error);
      await bot.sendMessage(chatId, '❌ Payment error. Try again.');
    }
  }
};
