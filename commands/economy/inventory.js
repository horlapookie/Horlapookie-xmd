
import { getUser, isMainBot, getRankEmoji, hasDeployedBot } from '../../lib/economy.js';

export default {
  name: 'inventory',
  description: 'Check your full economy stats and inventory',
  category: 'Economy',
  aliases: ['inv', 'stats', 'profile'],
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
      const user = await getUser(userId, username, msg.from);
      const rankEmoji = getRankEmoji(user.rank);
      const hasBot = await hasDeployedBot(userId);
      
      let stats = `💰 *Your Economy Stats*\n\n` +
        `👤 User: ${user.username}\n` +
        `${rankEmoji} Rank: ${user.rank}\n` +
        `⭐ Level: ${user.level} | XP: ${user.xp}\n` +
        `💵 Balance: ${user.balance.toLocaleString()} coins\n` +
        `🏦 Bank: ${(user.bank || 0).toLocaleString()}/${(user.bankLimit || 10000).toLocaleString()} coins\n` +
        `📈 Total Earned: ${user.totalEarned.toLocaleString()} coins\n` +
        `📉 Total Spent: ${user.totalSpent.toLocaleString()} coins\n\n` +
        `*🏥 HEALTH & LIFESTYLE*\n` +
        `❤️ Health: ${user.health || 100}% ${user.health < 30 ? '⚠️ CRITICAL!' : user.health < 50 ? '⚠️ Low' : '✅'}\n` +
        `🧠 Mental: ${user.mental || 100}% ${user.mental < 30 ? '⚠️ CRITICAL!' : user.mental < 50 ? '⚠️ Low' : '✅'}\n` +
        `😊 Satisfaction: ${user.satisfaction || 0}%\n` +
        `${user.isSick ? '🤒 Status: SICK - Medical fees: 1M/day\n' : '✅ Status: Healthy\n'}` +
        `${user.onHardDrugs ? '💉 Drug Addiction: Active - Medical: 1M/day\n' : ''}\n` +
        `*🚗 TRANSPORTATION*\n` +
        `${user.properties?.find(p => p.type === 'car') ? '🚗 Car: ✅ Owned' : '🚗 Car: ❌ Not owned'}\n` +
        `${user.properties?.find(p => p.type === 'helicopter') ? '🚁 Helicopter: ✅ Owned' : '🚁 Helicopter: ❌ Not owned'}\n\n` +
        `🎮 Games Played: ${user.gamesPlayed}\n` +
        `🏆 Games Won: ${user.gamesWon}\n` +
        `🤖 Bot Deployed: ${hasBot ? '✅ Yes' : '❌ No'}\n` +
        `📅 Member Since: ${new Date(user.createdAt).toLocaleDateString()}\n`;

      // Add inventory items
      if (user.inventory && user.inventory.length > 0) {
        stats += `\n📦 *YOUR ITEMS*\n`;
        user.inventory.forEach(item => {
          stats += `${item.name} x${item.quantity}\n`;
        });
      } else {
        stats += `\n📦 *YOUR ITEMS*\nNo items yet! Visit /shop to buy items.\n`;
      }

      // Add properties if any
      if (user.properties && user.properties.length > 0) {
        stats += `\n🏠 *PROPERTIES* (${user.properties.length})\n`;
        user.properties.forEach(prop => {
          stats += `${prop.name || prop.propertyId}\n`;
        });
      }

      // Add businesses if any
      if (user.businesses && user.businesses.length > 0) {
        stats += `\n💼 *BUSINESSES* (${user.businesses.length})\n`;
        user.businesses.forEach(biz => {
          stats += `${biz.name}\n`;
        });
      }

      // Add investments if any
      if (user.stocks && user.stocks.length > 0) {
        stats += `\n📊 *STOCKS* (${user.stocks.length} types)\n`;
      }
      if (user.crypto && user.crypto.length > 0) {
        stats += `💎 *CRYPTO* (${user.crypto.length} types)\n`;
      }

      stats += `\n_Use /daily to claim your daily reward!_`;
      
      await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Inventory command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
