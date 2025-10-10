
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'rob',
  description: 'Rob another user (50% success rate, cooldown: 1 hour)',
  category: 'Economy',
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
      // Get target user from reply or mention
      let targetUserId = null;
      let targetUsername = 'User';
      let targetUserInfo = null;
      
      // Priority 1: Check for reply (most reliable)
      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
        targetUserInfo = msg.reply_to_message.from;
      }
      // Priority 2: Check for text mention (when user has privacy settings)
      else if (msg.entities && msg.entities.length > 0) {
        const mention = msg.entities.find(e => e.type === 'text_mention');
        if (mention?.user) {
          targetUserId = mention.user.id.toString();
          targetUsername = mention.user.username || mention.user.first_name || 'User';
          targetUserInfo = mention.user;
        }
      }
      
      if (!targetUserId) {
        return await bot.sendMessage(chatId, 
          '❌ Please reply to or tag the user you want to rob!\n\n' +
          'Usage:\n' +
          '• Reply to their message: /rob\n' +
          '• Or tag them: /rob @username'
        );
      }
      
      // Check if trying to rob yourself
      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, 
          '😂 You can\'t rob yourself!'
        );
      }
      
      const robber = await getUser(userId, username);
      
      // Check cooldown (1 hour)
      if (robber.lastRob) {
        const hoursSinceLastRob = (Date.now() - new Date(robber.lastRob).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRob < 1) {
          const minutesLeft = Math.ceil((1 - hoursSinceLastRob) * 60);
          return await bot.sendMessage(chatId, 
            `⏰ You can rob again in ${minutesLeft} minutes!`
          );
        }
      }
      
      // Check if robber has minimum balance
      if (robber.balance < 100) {
        return await bot.sendMessage(chatId, 
          '❌ You need at least 100 coins to attempt a robbery!'
        );
      }
      
      // Get target user - MUST use userId if available
      let target;
      if (targetUserId) {
        target = await getUser(targetUserId, targetUsername);
      } else {
        // If no ID, we can't rob them (need a valid user ID)
        return await bot.sendMessage(chatId, 
          '❌ Cannot identify user. Please reply to their message to rob them!'
        );
      }
      
      // Check if target has enough to rob
      if (target.balance < 100) {
        return await bot.sendMessage(chatId, 
          '❌ Target doesn\'t have enough coins to rob!'
        );
      }
      
      // 50% success rate
      const success = Math.random() > 0.5;
      const amount = Math.floor(Math.random() * (target.balance * 0.3)) + 50; // Rob 50 to 30% of target's balance
      
      // Update last rob time
      robber.lastRob = new Date();
      await robber.save();
      
      if (success) {
        // Successful robbery
        await updateBalance(userId, amount, username);
        await updateBalance(targetUserId, -amount, targetUsername);
        
        const robberRank = getRankEmoji(robber.rank);
        
        await bot.sendMessage(chatId,
          `🎭 *Robbery Successful!*\n\n` +
          `✅ You robbed ${amount} coins from @${targetUsername}!\n` +
          `💰 Your Balance: ${robber.balance + amount} coins\n` +
          `${robberRank} Rank: ${robber.rank}\n\n` +
          `_${targetUsername} lost ${amount} coins!_`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Failed robbery - lose coins
        const penalty = Math.floor(amount / 2);
        await updateBalance(userId, -penalty, username);
        
        await bot.sendMessage(chatId,
          `❌ *Robbery Failed!*\n\n` +
          `You got caught and paid ${penalty} coins in fines!\n` +
          `💰 Your Balance: ${robber.balance - penalty} coins\n\n` +
          `_Better luck next time!_`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('Rob command error:', error);
      console.error('Error details:', error.message);
      await bot.sendMessage(chatId, 
        '❌ An error occurred while robbing. Please try again later.'
      );
    }
  }
};
