
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'rob',
  description: 'Rob another user with optional weapon (reply to user)',
  category: 'Economy',
  async execute(msg, { bot, args }) {
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
      
      // Check if target has shield protection (single-use)
      const shieldIndex = target.inventory?.findIndex(i => i.item === 'shield' && i.quantity > 0);
      if (shieldIndex !== -1) {
        // Remove one shield (single-use)
        target.inventory[shieldIndex].quantity -= 1;
        if (target.inventory[shieldIndex].quantity === 0) {
          target.inventory.splice(shieldIndex, 1);
        }
        await target.save();
        
        const remainingShields = target.inventory?.find(i => i.item === 'shield')?.quantity || 0;
        
        return await bot.sendMessage(chatId,
          `🛡️ *ROBBERY BLOCKED!*\n\n` +
          `@${targetUsername}'s shield blocked your attack!\n` +
          `💥 Shield destroyed (single-use)\n` +
          `🛡️ Remaining shields: ${remainingShields}\n\n` +
          `_Better luck next time!_`,
          { parse_mode: 'Markdown' }
        );
      }
      
      // Check if target has a dog (20% protection chance)
      const hasDog = target.properties?.find(p => p.propertyId === 'dog');
      if (hasDog && Math.random() < 0.20) {
        return await bot.sendMessage(chatId,
          `🐕 *ROBBERY FAILED!*\n\n` +
          `@${targetUsername}'s dog scared you away!\n` +
          `💨 You ran before getting caught!\n\n` +
          `_Their pet protected them!_`,
          { parse_mode: 'Markdown' }
        );
      }
      
      // Check weapon parameter
      const weaponType = args[0]?.toLowerCase();
      let successRate = 0.5; // Base 50% success rate
      let maxRobPercent = 0.3; // Base 30% max
      let weaponUsed = null;
      let weaponBonus = '';

      if (weaponType && ['gun', 'knife', 'bottle'].includes(weaponType)) {
        const hasWeapon = robber.inventory?.find(i => i.item === weaponType && i.quantity > 0);
        
        if (hasWeapon) {
          weaponUsed = weaponType;
          
          // Remove weapon (single use)
          const weaponItem = robber.inventory.find(i => i.item === weaponType);
          weaponItem.quantity -= 1;
          if (weaponItem.quantity === 0) {
            robber.inventory = robber.inventory.filter(i => i.item !== weaponType);
          }
          
          // Weapon bonuses
          switch (weaponType) {
            case 'gun':
              successRate = 0.7; // 70% success with gun
              maxRobPercent = 0.5; // Up to 50%
              weaponBonus = '🔫 Gun intimidation bonus!';
              break;
            case 'knife':
              successRate = 0.65; // 65% success with knife
              maxRobPercent = 0.4; // Up to 40%
              weaponBonus = '🔪 Knife threat bonus!';
              break;
            case 'bottle':
              successRate = 0.55; // 55% success with bottle
              maxRobPercent = 0.35; // Up to 35%
              weaponBonus = '🍾 Bottle smash bonus!';
              break;
          }
        }
      }
      
      const success = Math.random() < successRate;
      const amount = Math.floor(Math.random() * (target.balance * maxRobPercent)) + 50;
      
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
          `${weaponUsed ? weaponBonus + '\n' : ''}` +
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
          `${weaponUsed ? `💸 Lost weapon: ${weaponUsed}\n` : ''}` +
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
