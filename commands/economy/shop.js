
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const shopItems = {
  'shield': {
    name: '🛡️ Robbery Shield',
    price: 5000,
    description: 'Protects you from 1 robbery attempt',
    type: 'protection'
  },
  'lock': {
    name: '🔒 Bank Lock',
    price: 3000,
    description: 'Extra protection for your bank savings',
    type: 'protection'
  },
  'detector': {
    name: '📡 Cop Detector',
    price: 4000,
    description: 'Warns you when cops are near (reduces cop fees by 50%)',
    type: 'utility'
  },
  'fake_id': {
    name: '🪪 Fake ID',
    price: 8000,
    description: 'Reduces jail time by 50%',
    type: 'crime'
  },
  'lockpick': {
    name: '🔓 Lockpick',
    price: 6000,
    description: 'Increases heist success rate by 20%',
    type: 'crime'
  },
  'hack_tool': {
    name: '💻 Hacking Tool',
    price: 10000,
    description: 'Required for high-level crime missions',
    type: 'crime'
  },
  'carjammer': {
    name: '📡 Car Signal Jammer',
    price: 25000,
    description: 'Required for luxury carjacking (single use)',
    type: 'crime',
    singleUse: true
  },
  'glasscutter': {
    name: '🔪 Glass Cutter',
    price: 50000,
    description: 'Required for art gallery theft (single use)',
    type: 'crime',
    singleUse: true
  },
  'advancedhackkit': {
    name: '💾 Advanced Hacking Kit',
    price: 100000,
    description: 'Required for international cybercrime (single use)',
    type: 'crime',
    singleUse: true
  },
  'thermaldrill': {
    name: '🔥 Thermal Drill',
    price: 200000,
    description: 'Burns through vault doors (single use)',
    type: 'operation',
    singleUse: true
  },
  'vaultblueprint': {
    name: '📋 Vault Blueprint',
    price: 150000,
    description: 'Detailed vault schematics (single use)',
    type: 'operation',
    singleUse: true
  },
  'disguisekit': {
    name: '🎭 Master Disguise Kit',
    price: 180000,
    description: 'Professional disguise equipment (single use)',
    type: 'operation',
    singleUse: true
  },
  'empdevice': {
    name: '⚡ EMP Device',
    price: 300000,
    description: 'Disables security systems (single use)',
    type: 'operation',
    singleUse: true
  },
  'satellitejammer': {
    name: '🛰️ Satellite Jammer',
    price: 250000,
    description: 'Blocks all communications (single use)',
    type: 'operation',
    singleUse: true
  },
  'escapechopper': {
    name: '🚁 Escape Helicopter',
    price: 500000,
    description: 'Ultimate getaway vehicle (single use)',
    type: 'operation',
    singleUse: true
  }
};

export default {
  name: 'shop',
  description: '🏪 Buy items and protection',
  category: 'Economy',
  aliases: ['store', 'buy'],
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
      
      // If no args, show shop menu
      if (!args[0]) {
        let shopMenu = `🏪 *ITEM SHOP*\n\n` +
          `💰 Your Balance: ${user.balance} coins\n\n`;
        
        Object.entries(shopItems).forEach(([id, item]) => {
          shopMenu += `${item.name}\n` +
            `💵 Price: ${item.price} coins\n` +
            `📝 ${item.description}\n` +
            `🛒 Buy: /shop ${id}\n\n`;
        });
        
        shopMenu += `\n📦 View your items: /inventory`;

        return await bot.sendMessage(chatId, shopMenu, { parse_mode: 'Markdown' });
      }

      // Buy item
      const itemId = args[0].toLowerCase();
      const item = shopItems[itemId];

      if (!item) {
        return await bot.sendMessage(chatId, '❌ Item not found! Use /shop to see available items.');
      }

      if (user.balance < item.price) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient funds!\n\n` +
          `💰 Price: ${item.price} coins\n` +
          `💵 Your Balance: ${user.balance} coins\n` +
          `❌ You need ${item.price - user.balance} more coins`
        );
      }

      // Check if already owned (for single-use and protection items)
      const hasItem = user.inventory?.find(i => i.item === itemId);
      if (hasItem && (item.type === 'protection' || item.singleUse)) {
        return await bot.sendMessage(chatId, `❌ You already own ${item.name}!`);
      }

      // Purchase item
      await updateBalance(userId, -item.price, username);
      
      if (!user.inventory) user.inventory = [];
      
      const existingItem = user.inventory.find(i => i.item === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        user.inventory.push({
          item: itemId,
          name: item.name,
          quantity: 1,
          boughtAt: new Date()
        });
      }

      await user.save();

      const rankEmoji = getRankEmoji(user.rank);
      const updatedUser = await getUser(userId);

      await bot.sendMessage(chatId,
        `✅ *PURCHASE SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `🛍️ Bought: ${item.name}\n` +
        `💰 Price: ${item.price} coins\n` +
        `💵 New Balance: ${updatedUser.balance} coins\n\n` +
        `📦 View your items: /inventory`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[SHOP] Error:', error);
      await bot.sendMessage(chatId, '❌ Shop error. Try again.');
    }
  }
};
