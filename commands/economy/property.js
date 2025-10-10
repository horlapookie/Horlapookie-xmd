
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const properties = {
  'apartment': {
    type: 'house',
    name: '🏢 Apartment',
    price: 10000,
    bonus: { type: 'income', value: 0.02, description: '+2% income boost' }
  },
  'house': {
    type: 'house',
    name: '🏠 House',
    price: 50000,
    bonus: { type: 'income', value: 0.05, description: '+5% income boost' }
  },
  'mansion': {
    type: 'house',
    name: '🏰 Mansion',
    price: 200000,
    bonus: { type: 'income', value: 0.10, description: '+10% income boost' }
  },
  'sedan': {
    type: 'car',
    name: '🚗 Sedan',
    price: 15000,
    bonus: { type: 'work', value: 0.03, description: '+3% work earnings' }
  },
  'sports_car': {
    type: 'car',
    name: '🏎️ Sports Car',
    price: 75000,
    bonus: { type: 'work', value: 0.08, description: '+8% work earnings' }
  },
  'dog': {
    type: 'pet',
    name: '🐕 Dog',
    price: 5000,
    bonus: { type: 'protection', value: 0.20, description: '20% robbery protection' }
  },
  'cat': {
    type: 'pet',
    name: '🐈 Cat',
    price: 3000,
    bonus: { type: 'luck', value: 0.05, description: '+5% luck in games' }
  }
};

export default {
  name: 'property',
  description: '🏠 Buy properties, cars, and pets',
  category: 'Economy',
  aliases: ['prop', 'buy property'],
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
      
      // Show property menu
      if (!args[0]) {
        const rankEmoji = getRankEmoji(user.rank);
        let propMenu = `🏠 *PROPERTY MARKET*\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `💰 Balance: ${user.balance.toLocaleString()} coins\n\n`;
        
        // Group by type
        const houses = Object.entries(properties).filter(([_, p]) => p.type === 'house');
        const cars = Object.entries(properties).filter(([_, p]) => p.type === 'car');
        const pets = Object.entries(properties).filter(([_, p]) => p.type === 'pet');

        if (houses.length > 0) {
          propMenu += `*🏠 HOUSES*\n`;
          houses.forEach(([id, prop]) => {
            const owned = user.properties?.find(p => p.propertyId === id);
            propMenu += `${owned ? '✅' : ''} ${prop.name}\n` +
              `💵 ${prop.price.toLocaleString()} coins\n` +
              `📈 ${prop.bonus.description}\n` +
              `${owned ? '' : `/property buy ${id}`}\n\n`;
          });
        }

        if (cars.length > 0) {
          propMenu += `*🚗 VEHICLES*\n`;
          cars.forEach(([id, prop]) => {
            const owned = user.properties?.find(p => p.propertyId === id);
            propMenu += `${owned ? '✅' : ''} ${prop.name}\n` +
              `💵 ${prop.price.toLocaleString()} coins\n` +
              `📈 ${prop.bonus.description}\n` +
              `${owned ? '' : `/property buy ${id}`}\n\n`;
          });
        }

        if (pets.length > 0) {
          propMenu += `*🐾 PETS*\n`;
          pets.forEach(([id, prop]) => {
            const owned = user.properties?.find(p => p.propertyId === id);
            propMenu += `${owned ? '✅' : ''} ${prop.name}\n` +
              `💵 ${prop.price.toLocaleString()} coins\n` +
              `📈 ${prop.bonus.description}\n` +
              `${owned ? '' : `/property buy ${id}`}\n\n`;
          });
        }

        propMenu += `\n📋 View owned: /property list`;

        return await bot.sendMessage(chatId, propMenu, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();

      if (action === 'list') {
        if (!user.properties || user.properties.length === 0) {
          return await bot.sendMessage(chatId, '❌ You don\'t own any properties!');
        }

        let list = `🏠 *YOUR PROPERTIES*\n\n`;
        user.properties.forEach(prop => {
          const property = properties[prop.propertyId];
          list += `${property.name}\n` +
            `💰 Value: ${prop.value.toLocaleString()} coins\n` +
            `📈 ${property.bonus.description}\n` +
            `📅 Bought: ${new Date(prop.boughtAt).toLocaleDateString()}\n\n`;
        });

        return await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
      }

      if (action === 'buy') {
        const propId = args[1]?.toLowerCase();
        const property = properties[propId];

        if (!property) {
          return await bot.sendMessage(chatId, '❌ Invalid property! Use /property to see options.');
        }

        const owned = user.properties?.find(p => p.propertyId === propId);
        if (owned) {
          return await bot.sendMessage(chatId, `❌ You already own ${property.name}!`);
        }

        if (user.balance < property.price) {
          return await bot.sendMessage(chatId,
            `❌ Insufficient funds!\n\n` +
            `💰 Price: ${property.price.toLocaleString()} coins\n` +
            `💵 Balance: ${user.balance.toLocaleString()} coins`
          );
        }

        await updateBalance(userId, -property.price, username);

        if (!user.properties) user.properties = [];
        user.properties.push({
          propertyId: propId,
          type: property.type,
          name: property.name,
          value: property.price,
          bonus: property.bonus,
          boughtAt: new Date()
        });

        await user.save();

        return await bot.sendMessage(chatId,
          `✅ *PROPERTY PURCHASED!*\n\n` +
          `${property.name}\n` +
          `💰 Price: ${property.price.toLocaleString()} coins\n` +
          `📈 Bonus: ${property.bonus.description}\n` +
          `💵 New Balance: ${user.balance.toLocaleString()} coins\n\n` +
          `🎉 Property benefits are now active!`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[PROPERTY] Error:', error);
      await bot.sendMessage(chatId, '❌ Property error. Try again.');
    }
  }
};
