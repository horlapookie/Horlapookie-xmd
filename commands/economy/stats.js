
import { getUser, isMainBot, getRankEmoji, hasDeployedBot } from '../../lib/economy.js';

export default {
  name: 'stats',
  description: 'Check economy stats of yourself or another user',
  category: 'Economy',
  aliases: ['profile', 'eco'],
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
      const hasBot = await hasDeployedBot(targetUserId);
      const isOwnStats = targetUserId === userId;
      
      let stats = `📊 *${isOwnStats ? 'Your' : targetUsername + "'s"} Economy Stats*\n\n` +
        `👤 User: ${user.username}\n` +
        `${rankEmoji} Rank: ${user.rank}\n` +
        `⭐ Level: ${user.level} | XP: ${user.xp}\n\n` +
        `💰 *Wallet & Bank*\n` +
        `💵 Balance: ${user.balance.toLocaleString()} coins\n` +
        `🏦 Bank: ${(user.bank || 0).toLocaleString()}/${(user.bankLimit || 10000).toLocaleString()} coins\n` +
        `📊 Bank Level: ${user.bankLevel || 1}\n\n` +
        `📈 *Statistics*\n` +
        `💸 Total Earned: ${user.totalEarned.toLocaleString()} coins\n` +
        `💳 Total Spent: ${user.totalSpent.toLocaleString()} coins\n` +
        `🎮 Games Played: ${user.gamesPlayed}\n` +
        `🏆 Games Won: ${user.gamesWon}\n`;

      // Add job info if exists
      if (user.job) {
        stats += `\n💼 *Job*\n` +
          `📋 Position: ${user.jobTitle || user.job}\n` +
          `📊 Level: ${user.jobLevel || 0}\n`;
      }

      // Add business count
      if (user.businesses && user.businesses.length > 0) {
        stats += `\n🏢 *Businesses*\n` +
          `📊 Owned: ${user.businesses.length}\n`;
      }

      // Add property count
      if (user.properties && user.properties.length > 0) {
        stats += `\n🏠 *Properties*\n` +
          `📊 Owned: ${user.properties.length}\n`;
      }

      // Add investment info
      const stocksCount = user.stocks?.length || 0;
      const cryptoCount = user.crypto?.length || 0;
      if (stocksCount > 0 || cryptoCount > 0) {
        stats += `\n📈 *Investments*\n`;
        if (stocksCount > 0) stats += `📊 Stocks: ${stocksCount} types\n`;
        if (cryptoCount > 0) stats += `💎 Crypto: ${cryptoCount} types\n`;
      }

      // Add crime stats
      if (user.crimeRecord && user.crimeRecord > 0) {
        stats += `\n🚔 *Crime Record*\n` +
          `🔫 Crimes: ${user.crimeRecord}\n`;
        if (user.isJailed) {
          const releaseTime = new Date(user.jailReleaseTime);
          const now = new Date();
          if (now < releaseTime) {
            const minutesLeft = Math.ceil((releaseTime - now) / (1000 * 60));
            stats += `🔒 Status: In Jail (${minutesLeft} min left)\n`;
          }
        }
        if (user.blackMarketAccess) {
          stats += `🕶️ Black Market: Unlocked\n`;
        }
      }

      stats += `\n🤖 Bot Deployed: ${hasBot ? '✅ Yes' : '❌ No'}\n` +
        `📅 Member Since: ${new Date(user.createdAt).toLocaleDateString()}\n\n` +
        `_Use /items to view ${isOwnStats ? 'your' : 'their'} inventory_`;
      
      await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Stats command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
