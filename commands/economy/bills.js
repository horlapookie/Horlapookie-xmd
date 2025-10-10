import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'bills',
  description: '💸 Check your daily bills based on rank',
  category: 'Economy',
  aliases: ['tax', 'fees'],
  async execute(msg, { bot, args }) {
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

      const billRates = {
        'Newbie': 0,
        'Bronze': 500,
        'Silver': 1500,
        'Gold': 3000,
        'Platinum': 7500,
        'Diamond': 15000,
        'Legend': 30000
      };

      const rankRequirements = {
        'Newbie': 0,
        'Bronze': 10000,
        'Silver': 100000,
        'Gold': 1000000,
        'Platinum': 10000000,
        'Diamond': 100000000,
        'Legend': 1000000000
      };

      const currentBill = billRates[user.rank] || 0;
      const nextRank = {
        'Newbie': 'Bronze',
        'Bronze': 'Silver',
        'Silver': 'Gold',
        'Gold': 'Platinum',
        'Platinum': 'Diamond',
        'Diamond': 'Legend',
        'Legend': 'Legend'
      }[user.rank];

      const nextRankReq = rankRequirements[nextRank] || rankRequirements['Legend'];
      const nextBill = billRates[nextRank] || currentBill;

      const lastBillTime = user.lastTax ? new Date(user.lastTax) : null;
      const nextBillTime = lastBillTime ? new Date(lastBillTime.getTime() + 24 * 60 * 60 * 1000) : new Date();
      const hoursUntilBill = lastBillTime ? Math.max(0, Math.floor((nextBillTime - new Date()) / (1000 * 60 * 60))) : 0;

      let message = `💸 *DAILY BILLS SYSTEM*\n\n` +
        `${rankEmoji} Current Rank: ${user.rank}\n` +
        `💵 Balance: ${user.balance} coins\n` +
        `📉 Daily Bills: ${currentBill} coins\n\n`;

      if (user.rank !== 'Legend') {
        message += `📈 *NEXT RANK: ${nextRank}*\n` +
          `🎯 Required Balance: ${nextRankReq} coins\n` +
          `💸 Next Bills: ${nextBill} coins/day\n\n`;
      }

      message += `📊 *RANK REQUIREMENTS:*\n` +
        `🆕 Newbie: 0 coins (No bills)\n` +
        `🥉 Bronze: 10,000 coins (500/day)\n` +
        `🥈 Silver: 100,000 coins (1,500/day)\n` +
        `🥇 Gold: 1,000,000 coins (3,000/day)\n` +
        `💎 Platinum: 10,000,000 coins (7,500/day)\n` +
        `💠 Diamond: 100,000,000 coins (15,000/day)\n` +
        `👑 Legend: 1,000,000,000 coins (30,000/day)\n\n` +
        `_Bills are automatically deducted every 24 hours_`;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[BILLS] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to check bills. Try again.');
    }
  }
};