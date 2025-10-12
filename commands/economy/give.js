
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'give',
  description: '🎁 Give coins to another user',
  category: 'Economy',
  aliases: ['gift', 'send', 'transfer'],
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
      // Get target user from reply or mention
      let targetUserId = null;
      let targetUsername = 'User';
      let targetUserInfo = null;
      
      // Priority 1: Check for reply
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
          '❌ Please reply to or tag the user you want to give coins to!\n\n' +
          'Usage:\n' +
          '• Reply to their message: /give <amount>\n' +
          '• Or tag them: /give <amount> @username'
        );
      }
      
      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, '😂 You can\'t give coins to yourself!');
      }

      const amount = parseInt(args[0]);
      
      if (!amount || amount <= 0) {
        return await bot.sendMessage(chatId, 
          '❌ Invalid amount! Specify how many coins to give.\n\n' +
          'Example: /give 100'
        );
      }

      const giver = await getUser(userId, username);
      
      if (giver.balance < amount) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient balance!\n\n💰 You have: ${giver.balance} coins\n💸 Need: ${amount} coins`
        );
      }

      // Transfer coins
      await updateBalance(userId, -amount, username);
      await updateBalance(targetUserId, amount, targetUsername);

      const giverRank = getRankEmoji(giver.rank);

      await bot.sendMessage(chatId,
        `🎁 *GIFT SENT!*\n\n` +
        `${giverRank} ${username} gave ${amount} coins to @${targetUsername}\n\n` +
        `💰 Your new balance: ${giver.balance - amount} coins\n\n` +
        `_What a generous person!_`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[GIVE] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to transfer coins. Try again.');
    }
  }
};
