
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'bail',
  description: '🔓 Bail someone out of jail',
  category: 'Economy',
  aliases: ['bailout', 'rescue'],
  async execute(msg, { bot }) {
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

      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
      } else if (msg.entities && msg.entities.length > 0) {
        const mention = msg.entities.find(e => e.type === 'text_mention');
        if (mention?.user) {
          targetUserId = mention.user.id.toString();
          targetUsername = mention.user.username || mention.user.first_name || 'User';
        }
      }

      if (!targetUserId) {
        return await bot.sendMessage(chatId, 
          '❌ Reply to or tag the person you want to bail out!\n\n' +
          'Usage:\n' +
          '• Reply to their message: /bail\n' +
          '• Or tag them: /bail @username'
        );
      }

      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, '❌ You can\'t bail yourself out!');
      }

      const bailer = await getUser(userId, username);
      const jailed = await getUser(targetUserId, targetUsername);

      if (!jailed.isJailed) {
        return await bot.sendMessage(chatId, `❌ ${targetUsername} is not in jail!`);
      }

      const now = new Date();
      const releaseTime = new Date(jailed.jailReleaseTime);

      if (now >= releaseTime) {
        jailed.isJailed = false;
        jailed.jailReleaseTime = null;
        await jailed.save();
        return await bot.sendMessage(chatId, `✅ ${targetUsername} has already served their time!`);
      }

      // Calculate bail (5000 coins flat fee)
      const bailFee = 5000;

      if (bailer.balance < bailFee) {
        return await bot.sendMessage(chatId,
          `❌ Insufficient funds!\n\n` +
          `💰 Bail Fee: ${bailFee} coins\n` +
          `💵 Your Balance: ${bailer.balance} coins`
        );
      }

      // Process bail
      await updateBalance(userId, -bailFee, username);
      jailed.isJailed = false;
      jailed.jailReleaseTime = null;
      await jailed.save();

      const rankEmoji = getRankEmoji(bailer.rank);

      await bot.sendMessage(chatId,
        `✅ *BAIL SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${username} bailed out ${targetUsername}\n\n` +
        `💰 Bail Fee: ${bailFee} coins\n` +
        `💵 New Balance: ${bailer.balance} coins\n\n` +
        `🔓 ${targetUsername} is now free!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[BAIL] Error:', error);
      await bot.sendMessage(chatId, '❌ Bail error. Try again.');
    }
  }
};
