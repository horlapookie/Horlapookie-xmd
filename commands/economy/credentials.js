
import { getUser, isMainBot } from '../../lib/economy.js';

export default {
  name: 'credentials',
  description: '🔑 View your login credentials for the website',
  category: 'Economy',
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';
    const isGroup = chatId.toString().includes('@g.us') || chatId.toString().startsWith('-');

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    // Only work in DM
    if (isGroup) {
      return await bot.sendMessage(chatId,
        `❌ *Security Warning!*\n\n` +
        `Credentials can only be viewed in DM!\n` +
        `Send this command privately to the bot.`,
        { parse_mode: 'Markdown' }
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);

      if (!user.password) {
        return await bot.sendMessage(chatId,
          `🔑 *YOUR CREDENTIALS*\n\n` +
          `👤 Username: ${user.username}\n` +
          `🆔 User ID: ${userId}\n` +
          `🔐 Password: ❌ Not Set\n\n` +
          `⚠️ Use /setpassword to set your password first!`,
          { parse_mode: 'Markdown' }
        );
      }

      await bot.sendMessage(chatId,
        `🔑 *YOUR LOGIN CREDENTIALS*\n\n` +
        `👤 Username: \`${user.username}\`\n` +
        `🆔 User ID: \`${userId}\`\n` +
        `🔐 Password: \`${user.password}\`\n\n` +
        `🌐 Website: Coming Soon\n` +
        `⚠️ Keep these credentials safe!\n` +
        `🔒 Never share with anyone!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[CREDENTIALS] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to retrieve credentials.');
    }
  }
};
