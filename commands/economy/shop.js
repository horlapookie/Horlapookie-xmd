import { getUser, updateBalance, isMainBot, getRankEmoji, escapeMarkdown } from '../../lib/economy.js';

const shopItems = {
  'shield': {
    name: '🛡️ Shield',
    price: 5000,
    description: 'Single-use protection from robbery (destroyed on block)',
    category: 'protection'
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
    description: 'Warns you when cops are near (reduces cop fees by 50 percent)',
    type: 'utility'
  },
  'fake_id': {
    name: '🪪 Fake ID',
    price: 8000,
    description: 'Reduces jail time by 50 percent',
    type: 'crime'
  },
  'lockpick': {
    name: '🔓 Lockpick',
    price: 6000,
    description: 'Increases heist success rate by 20 percent',
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
  },
  'pistol': {
    name: '🔫 Pistol',
    price: 15000,
    description: 'Basic handgun | Damage: 30-40 HP | Accuracy: 70 percent',
    type: 'weapon',
    damage: { min: 30, max: 40 },
    accuracy: 70,
    singleUse: false
  },
  'rifle': {
    name: '🔫 Assault Rifle',
    price: 75000,
    description: 'High-power rifle | Damage: 40-60 HP | Accuracy: 80 percent',
    type: 'weapon',
    damage: { min: 40, max: 60 },
    accuracy: 80,
    singleUse: false
  },
  'sniper': {
    name: '🎯 Sniper Rifle',
    price: 150000,
    description: 'One-shot precision | Damage: 70-90 HP | Accuracy: 95 percent',
    type: 'weapon',
    damage: { min: 70, max: 90 },
    accuracy: 95,
    singleUse: false
  },
  'shotgun': {
    name: '💥 Shotgun',
    price: 100000,
    description: 'Close-range devastation | Damage: 50-70 HP | Accuracy: 60 percent',
    type: 'weapon',
    damage: { min: 50, max: 70 },
    accuracy: 60,
    singleUse: false
  },
  'knife': {
    name: '🔪 Combat Knife',
    price: 8000,
    description: 'Silent melee weapon | Damage: 20-35 HP | Accuracy: 85 percent',
    type: 'weapon',
    damage: { min: 20, max: 35 },
    accuracy: 85,
    singleUse: false
  },
  'machete': {
    name: '🗡️ Machete',
    price: 20000,
    description: 'Heavy blade weapon | Damage: 30-45 HP | Accuracy: 75 percent',
    type: 'weapon',
    damage: { min: 30, max: 45 },
    accuracy: 75,
    singleUse: false
  },
  'bat': {
    name: '⚾ Baseball Bat',
    price: 5000,
    description: 'Blunt force weapon | Damage: 15-25 HP | Accuracy: 80 percent',
    type: 'weapon',
    damage: { min: 15, max: 25 },
    accuracy: 80,
    singleUse: false
  },
  'bottle': {
    name: '🍾 Broken Bottle',
    price: 2000,
    description: 'Improvised weapon | Damage: 10-20 HP | Accuracy: 65 percent',
    type: 'weapon',
    damage: { min: 10, max: 20 },
    accuracy: 65,
    singleUse: true
  },
  'taser': {
    name: '⚡ Taser',
    price: 25000,
    description: 'Stun weapon | Damage: 5-10 HP | Stuns for 1 turn',
    type: 'weapon',
    damage: { min: 5, max: 10 },
    accuracy: 90,
    special: 'stun',
    singleUse: false
  },
  'grenade': {
    name: '💣 Grenade',
    price: 50000,
    description: 'Explosive weapon | Damage: 60-80 HP | Can\'t be dodged',
    type: 'weapon',
    damage: { min: 60, max: 80 },
    accuracy: 100,
    special: 'explosive',
    singleUse: true
  },
  'armor': {
    name: '🦺 Body Armor',
    price: 35000,
    description: 'Reduces damage by 30 percent | 3 hits protection',
    type: 'defense',
    protection: 30,
    durability: 3
  },
  'helmet': {
    name: '⛑️ Combat Helmet',
    price: 20000,
    description: 'Reduces headshot damage by 50 percent | 2 hits protection',
    type: 'defense',
    protection: 50,
    durability: 2
  },
  'medkit': {
    name: '🏥 First Aid Kit',
    price: 10000,
    description: 'Restore 50 HP during combat',
    type: 'consumable',
    heal: 50,
    singleUse: true
  },
  'bandage': {
    name: '🩹 Bandage',
    price: 3000,
    description: 'Restore 20 HP during combat',
    type: 'consumable',
    heal: 20,
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
          `💰 Your Balance: ${escapeMarkdown(user.balance.toLocaleString())} coins\n\n`;

        Object.entries(shopItems).forEach(([id, item]) => {
          shopMenu += `${item.name}\n` +
            `💵 Price: ${escapeMarkdown(item.price.toLocaleString())} coins\n` +
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
          `💰 Price: ${escapeMarkdown(item.price.toLocaleString())} coins\n` +
          `💵 Your Balance: ${escapeMarkdown(user.balance.toLocaleString())} coins\n` +
          `❌ You need ${escapeMarkdown((item.price - user.balance).toLocaleString())} more coins`
        );
      }

      // Check if already owned (all items are single-purchase)
      const hasItem = user.inventory?.find(i => i.item === itemId);
      if (hasItem) {
        return await bot.sendMessage(chatId, `❌ You already own ${item.name}! Each item can only be purchased once.`);
      }

      // Purchase item
      await updateBalance(userId, -item.price, username);

      if (!user.inventory) user.inventory = [];

      user.inventory.push({
        item: itemId,
        name: item.name,
        quantity: 1,
        boughtAt: new Date()
      });

      await user.save();

      const rankEmoji = getRankEmoji(user.rank);
      const updatedUser = await getUser(userId);

      await bot.sendMessage(chatId,
        `✅ *PURCHASE SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${escapeMarkdown(user.username)}\n\n` +
        `🛍️ Bought: ${item.name}\n` +
        `💰 Price: ${escapeMarkdown(item.price.toLocaleString())} coins\n` +
        `💵 New Balance: ${escapeMarkdown(updatedUser.balance.toLocaleString())} coins\n\n` +
        `📦 View your items: /inventory`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[SHOP] Error:', error);
      console.error('[SHOP] Error stack:', error.stack);
      await bot.sendMessage(chatId, `❌ Shop error: ${error.message}`);
    }
  }
};