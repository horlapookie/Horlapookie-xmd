
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const blackMarketItems = {
  'stealth_suit': {
    name: '🥷 Stealth Suit',
    price: 15000,
    description: 'Increases heist success by 30%',
    requiredCrimes: 10
  },
  'master_key': {
    name: '🗝️ Master Key',
    price: 20000,
    description: 'Opens any lock - unlimited heists',
    requiredCrimes: 15
  },
  'money_printer': {
    name: '🖨️ Money Printer',
    price: 50000,
    description: 'Generates 1000 coins every 12 hours',
    requiredCrimes: 25
  },
  'immunity_pass': {
    name: '🛡️ Immunity Pass',
    price: 75000,
    description: 'Never go to jail (1 use)',
    requiredCrimes: 30
  },
  'golden_lockpick': {
    name: '🔐 Golden Lockpick',
    price: 100000,
    description: 'Never breaks - 100% heist success',
    requiredCrimes: 50
  }
};

export default {
  name: 'blackmarket',
  description: '🕶️ Access the black market',
  category: 'Economy',
  aliases: ['bmarket', 'darkmarket'],
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

      // Check if user has access
      if (!user.blackMarketAccess) {
        return await bot.sendMessage(chatId,
          `🔒 *BLACK MARKET LOCKED*\n\n` +
          `Complete 10 successful crimes to unlock!\n\n` +
          `Current crimes: ${user.crimeRecord || 0}/10`,
          { parse_mode: 'Markdown' }
        );
      }

      // Show black market
      if (!args[0]) {
        const rankEmoji = getRankEmoji(user.rank);
        let marketMenu = `🕶️ *BLACK MARKET*\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `🚨 Crimes: ${user.crimeRecord || 0}\n` +
          `💰 Balance: ${user.balance} coins\n\n`;
        
        Object.entries(blackMarketItems).forEach(([id, item]) => {
          const canBuy = (user.crimeRecord || 0) >= item.requiredCrimes;
          marketMenu += `${canBuy ? '✅' : '🔒'} ${item.name}\n` +
            `💵 Price: ${item.price.toLocaleString()} coins\n` +
            `📝 ${item.description}\n` +
            `🚨 Requires: ${item.requiredCrimes} crimes\n` +
            `${canBuy ? `🛒 /blackmarket buy ${id}` : ''}\n\n`;
        });

        return await bot.sendMessage(chatId, marketMenu, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();

      if (action === 'buy') {
        const itemId = args[1]?.toLowerCase();
        const item = blackMarketItems[itemId];

        if (!item) {
          return await bot.sendMessage(chatId, '❌ Invalid item! Use /blackmarket to see options.');
        }

        if ((user.crimeRecord || 0) < item.requiredCrimes) {
          return await bot.sendMessage(chatId,
            `❌ Not enough crimes!\n\n` +
            `Required: ${item.requiredCrimes} crimes\n` +
            `You have: ${user.crimeRecord || 0} crimes`
          );
        }

        const hasItem = user.inventory?.find(i => i.item === itemId);
        if (hasItem) {
          return await bot.sendMessage(chatId, `❌ You already own ${item.name}!`);
        }

        if (user.balance < item.price) {
          return await bot.sendMessage(chatId,
            `❌ Insufficient funds!\n\n` +
            `💰 Price: ${item.price.toLocaleString()} coins\n` +
            `💵 Balance: ${user.balance.toLocaleString()} coins`
          );
        }

        await updateBalance(userId, -item.price, username);

        if (!user.inventory) user.inventory = [];
        user.inventory.push({
          item: itemId,
          name: item.name,
          quantity: 1,
          boughtAt: new Date()
        });

        await user.save();

        return await bot.sendMessage(chatId,
          `✅ *BLACK MARKET PURCHASE!*\n\n` +
          `🛍️ Bought: ${item.name}\n` +
          `💰 Price: ${item.price.toLocaleString()} coins\n` +
          `💵 New Balance: ${user.balance.toLocaleString()} coins\n\n` +
          `📦 View: /inventory`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[BLACK MARKET] Error:', error);
      await bot.sendMessage(chatId, '❌ Black market error. Try again.');
    }
  }
};
