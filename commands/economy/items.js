
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'items',
  description: 'View inventory items of yourself or another user',
  category: 'Economy',
  aliases: ['inventory', 'inv', 'bag'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      let targetUserId = userId;
      let targetUsername = username;
      let targetUserInfo = msg.from;

      // Check if replying to someone
      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
        targetUserInfo = msg.reply_to_message.from;
      }
      // Check for text mention
      else if (msg.entities && msg.entities.length > 0) {
        const mention = msg.entities.find(e => e.type === 'text_mention');
        if (mention?.user) {
          targetUserId = mention.user.id.toString();
          targetUsername = mention.user.username || mention.user.first_name || 'User';
          targetUserInfo = mention.user;
        }
      }

      const user = await getUser(targetUserId, targetUsername, targetUserInfo);
      const rankEmoji = getRankEmoji(user.rank);
      const isOwnItems = targetUserId === userId;
      
      let itemsList = `🎒 *${isOwnItems ? 'Your' : targetUsername + "'s"} Inventory*\n\n` +
        `👤 ${user.username}\n` +
        `${rankEmoji} ${user.rank}\n\n`;

      // Show inventory items
      if (user.inventory && user.inventory.length > 0) {
        itemsList += `📦 *ITEMS*\n`;
        
        // Group items by category
        const shopItems = user.inventory.filter(i => !['shield', 'lockpick', 'disguise', 'alibi'].includes(i.item));
        const protectionItems = user.inventory.filter(i => ['shield', 'lockpick', 'disguise', 'alibi'].includes(i.item));
        
        if (shopItems.length > 0) {
          itemsList += `\n🛒 *Shop Items*\n`;
          shopItems.forEach(item => {
            itemsList += `• ${item.name || item.item} x${item.quantity}\n`;
          });
        }
        
        if (protectionItems.length > 0) {
          itemsList += `\n🛡️ *Protection Items*\n`;
          protectionItems.forEach(item => {
            const itemEmoji = {
              'shield': '🛡️',
              'lockpick': '🔓',
              'disguise': '🎭',
              'alibi': '📝'
            };
            itemsList += `${itemEmoji[item.item] || '•'} ${item.name || item.item} x${item.quantity}\n`;
          });
        }
      } else {
        itemsList += `📦 *NO ITEMS*\n\n_${isOwnItems ? 'Visit /shop to buy items!' : 'This user has no items yet.'}_\n`;
      }

      // Show properties if any
      if (user.properties && user.properties.length > 0) {
        itemsList += `\n🏠 *PROPERTIES* (${user.properties.length})\n`;
        user.properties.forEach(prop => {
          const propName = prop.name || prop.propertyId;
          const propEmoji = prop.propertyId?.includes('house') ? '🏠' : 
                           prop.propertyId?.includes('car') ? '🚗' : 
                           prop.propertyId?.includes('dog') || prop.propertyId?.includes('cat') ? '🐾' : '📍';
          itemsList += `${propEmoji} ${propName}\n`;
        });
      }

      // Show businesses if any
      if (user.businesses && user.businesses.length > 0) {
        itemsList += `\n💼 *BUSINESSES* (${user.businesses.length})\n`;
        user.businesses.forEach(biz => {
          itemsList += `🏢 ${biz.name}\n`;
        });
      }

      itemsList += `\n_Use /stats to view full economy stats_`;
      
      await bot.sendMessage(chatId, itemsList, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Items command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
