
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const pharmacyItems = {
  'painkiller': {
    name: '💊 Painkiller',
    price: 50000,
    healthBoost: 10,
    description: 'Relieves minor pain (+10% health)'
  },
  'antibiotics': {
    name: '💉 Antibiotics',
    price: 200000,
    healthBoost: 25,
    description: 'Treats infections (+25% health)'
  },
  'vitamins': {
    name: '🧪 Vitamins',
    price: 100000,
    healthBoost: 15,
    mentalBoost: 10,
    description: 'Boosts immunity (+15% health, +10% mental)'
  },
  'surgery': {
    name: '🏥 Surgery',
    price: 1000000,
    healthBoost: 50,
    description: 'Major medical procedure (+50% health)'
  },
  'premium_care': {
    name: '⭐ Premium Care Package',
    price: 5000000,
    healthBoost: 100,
    mentalBoost: 100,
    description: 'Full recovery (restore to 100%)'
  }
};

export default {
  name: 'pharmacy',
  description: '💊 Buy medicine and health items',
  category: 'Economy',
  aliases: ['medicine', 'hospital', 'doctor'],
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

      if (!user.health) user.health = 100;
      if (!user.mental) user.mental = 100;

      // Show pharmacy menu
      if (!args[0]) {
        let menu = `💊 *PHARMACY & MEDICAL CENTER*\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `💰 Balance: ${user.balance.toLocaleString()} coins\n` +
          `❤️ Health: ${user.health}%\n` +
          `🧠 Mental: ${user.mental}%\n\n`;

        if (user.health < 30) {
          menu += `⚠️ *CRITICAL CONDITION!*\nYour health is dangerously low!\n\n`;
        } else if (user.health < 50) {
          menu += `⚠️ *WARNING:* Low health detected\n\n`;
        }

        menu += `*📋 AVAILABLE TREATMENTS*\n\n`;
        
        Object.entries(pharmacyItems).forEach(([id, item]) => {
          menu += `${item.name}\n` +
            `💰 Price: ${item.price.toLocaleString()} coins\n` +
            `📝 ${item.description}\n\n`;
        });

        menu += `*💡 USAGE*\n` +
          `/pharmacy <item>\n\n` +
          `_Examples: /pharmacy painkiller, /pharmacy surgery_`;

        return await bot.sendMessage(chatId, menu, { parse_mode: 'Markdown' });
      }

      // Buy item
      const itemId = args[0].toLowerCase();
      const item = pharmacyItems[itemId];

      if (!item) {
        return await bot.sendMessage(chatId, '❌ Item not found! Use /pharmacy to see menu.');
      }

      if (user.balance < item.price) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient funds!\n\n` +
          `💰 Price: ${item.price.toLocaleString()} coins\n` +
          `💵 Your Balance: ${user.balance.toLocaleString()} coins`
        );
      }

      // Deduct cost
      await updateBalance(userId, -item.price, username);

      // Apply health boost
      const oldHealth = user.health;
      const oldMental = user.mental;
      
      user.health = Math.min(100, user.health + (item.healthBoost || 0));
      
      if (item.mentalBoost) {
        user.mental = Math.min(100, user.mental + item.mentalBoost);
      }

      await user.save();

      const updatedUser = await getUser(userId);
      
      let result = `✅ *TREATMENT SUCCESSFUL*\n\n` +
        `${item.name} administered\n\n` +
        `❤️ Health: ${oldHealth}% → ${user.health}%\n`;
      
      if (item.mentalBoost) {
        result += `🧠 Mental: ${oldMental}% → ${user.mental}%\n`;
      }
      
      result += `\n💰 Cost: ${item.price.toLocaleString()} coins\n` +
        `💵 Balance: ${updatedUser.balance.toLocaleString()} coins\n\n`;

      if (user.health === 100) {
        result += `✨ You're in perfect health!`;
      } else if (user.health >= 70) {
        result += `😊 You're feeling much better!`;
      } else {
        result += `🏥 Continue treatment for full recovery`;
      }

      await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[PHARMACY] Error:', error);
      await bot.sendMessage(chatId, '❌ Pharmacy error. Try again.');
    }
  }
};
