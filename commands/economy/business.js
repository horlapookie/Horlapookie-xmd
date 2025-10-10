
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const businessTypes = {
  'bar': {
    name: '🍺 Bar',
    cost: 15000,
    income: 500,
    incomeInterval: 6 // hours
  },
  'restaurant': {
    name: '🍽️ Restaurant',
    cost: 25000,
    income: 1000,
    incomeInterval: 6
  },
  'tech': {
    name: '💻 Tech Startup',
    cost: 50000,
    income: 2500,
    incomeInterval: 8
  },
  'casino': {
    name: '🎰 Casino',
    cost: 100000,
    income: 5000,
    incomeInterval: 12
  },
  'bank': {
    name: '🏦 Private Bank',
    cost: 250000,
    income: 15000,
    incomeInterval: 24
  }
};

export default {
  name: 'business',
  description: '💼 Buy and manage businesses',
  category: 'Economy',
  aliases: ['biz', 'enterprise'],
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
      
      // Show business menu
      if (!args[0]) {
        let bizMenu = `💼 *BUSINESS EMPIRE*\n\n` +
          `${getRankEmoji(user.rank)} ${user.username}\n` +
          `💰 Balance: ${user.balance} coins\n\n`;
        
        Object.entries(businessTypes).forEach(([id, biz]) => {
          const owned = user.businesses?.find(b => b.type === id);
          bizMenu += `${biz.name}\n` +
            `💵 Cost: ${biz.cost.toLocaleString()} coins\n` +
            `📈 Income: ${biz.income} coins/${biz.incomeInterval}h\n` +
            `${owned ? '✅ Owned' : `🛒 /business buy ${id}`}\n\n`;
        });
        
        bizMenu += `\n📊 *Commands:*\n` +
          `/business buy <type> - Purchase business\n` +
          `/business collect - Collect income\n` +
          `/business list - Your businesses`;

        return await bot.sendMessage(chatId, bizMenu, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();

      if (action === 'list') {
        if (!user.businesses || user.businesses.length === 0) {
          return await bot.sendMessage(chatId, '❌ You don\'t own any businesses yet!');
        }

        let list = `💼 *YOUR BUSINESSES*\n\n`;
        user.businesses.forEach(biz => {
          const bizType = businessTypes[biz.type];
          list += `${bizType.name}\n` +
            `📈 Income: ${bizType.income} coins/${bizType.incomeInterval}h\n` +
            `📅 Bought: ${new Date(biz.boughtAt).toLocaleDateString()}\n\n`;
        });

        return await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
      }

      if (action === 'buy') {
        const bizId = args[1]?.toLowerCase();
        const bizType = businessTypes[bizId];

        if (!bizType) {
          return await bot.sendMessage(chatId, '❌ Invalid business type! Use /business to see options.');
        }

        const owned = user.businesses?.find(b => b.type === bizId);
        if (owned) {
          return await bot.sendMessage(chatId, `❌ You already own ${bizType.name}!`);
        }

        if (user.balance < bizType.cost) {
          return await bot.sendMessage(chatId,
            `❌ Insufficient funds!\n\n` +
            `💰 Need: ${bizType.cost.toLocaleString()} coins\n` +
            `💵 Have: ${user.balance.toLocaleString()} coins`
          );
        }

        await updateBalance(userId, -bizType.cost, username);

        if (!user.businesses) user.businesses = [];
        user.businesses.push({
          type: bizId,
          name: bizType.name,
          income: bizType.income,
          incomeInterval: bizType.incomeInterval,
          boughtAt: new Date()
        });

        if (!user.lastBusinessIncome) {
          user.lastBusinessIncome = new Date();
        }

        await user.save();

        return await bot.sendMessage(chatId,
          `✅ *BUSINESS PURCHASED!*\n\n` +
          `${bizType.name}\n` +
          `💰 Cost: ${bizType.cost.toLocaleString()} coins\n` +
          `📈 Income: ${bizType.income} coins/${bizType.incomeInterval}h\n` +
          `💵 New Balance: ${user.balance.toLocaleString()} coins\n\n` +
          `💡 Use /business collect to claim your income!`,
          { parse_mode: 'Markdown' }
        );
      }

      if (action === 'collect') {
        if (!user.businesses || user.businesses.length === 0) {
          return await bot.sendMessage(chatId, '❌ You don\'t own any businesses!');
        }

        const now = new Date();
        const lastCollect = user.lastBusinessIncome ? new Date(user.lastBusinessIncome) : new Date(0);
        const hoursElapsed = (now - lastCollect) / (1000 * 60 * 60);

        let incomeDetails = '';
        let totalIncome = 0;
        
        user.businesses.forEach(biz => {
          const bizType = businessTypes[biz.type];
          const periods = Math.floor(hoursElapsed / bizType.incomeInterval);
          
          // Add realistic fluctuation: -20% to +30%
          const fluctuation = (Math.random() - 0.2) * 0.5;
          const fluctuatedIncome = Math.floor(bizType.income * (1 + fluctuation));
          const bizTotalIncome = fluctuatedIncome * periods;
          
          totalIncome += bizTotalIncome;
          
          const change = fluctuation >= 0 ? '📈' : '📉';
          const changePercent = (fluctuation * 100).toFixed(1);
          
          incomeDetails += `${bizType.name}\n` +
            `  💰 ${bizTotalIncome.toLocaleString()} coins ${change} ${changePercent}%\n`;
        });

        if (totalIncome === 0) {
          return await bot.sendMessage(chatId, 
            '⏰ No income available yet!\n\nWait for your businesses to generate more income.'
          );
        }

        await updateBalance(userId, totalIncome, username);
        user.lastBusinessIncome = now;
        await user.save();

        const updatedUser = await getUser(userId);

        return await bot.sendMessage(chatId,
          `✅ *INCOME COLLECTED!*\n\n` +
          `📊 *Live Business Performance:*\n${incomeDetails}\n` +
          `💰 Total Collected: ${totalIncome.toLocaleString()} coins\n` +
          `🏢 From ${user.businesses.length} business(es)\n` +
          `💵 New Balance: ${updatedUser.balance.toLocaleString()} coins\n\n` +
          `📈 Market conditions affect your earnings!`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[BUSINESS] Error:', error);
      await bot.sendMessage(chatId, '❌ Business error. Try again.');
    }
  }
};
