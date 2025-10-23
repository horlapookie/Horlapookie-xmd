import { getUser, setPassword, isMainBot } from '../../lib/economy.js';

export default {
  name: 'setpassword',
  description: '🔐 Set password for website login',
  category: 'Economy',
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = msg.key.participant || msg.from.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';
    const isGroup = msg.key.remoteJid.includes('@g.us') || chatId.toString().startsWith('-');

    // Only work in DM
    if (isGroup) {
      return await bot.sendMessage(chatId,
        `❌ *Security Warning!*\n\n` +
        `Passwords can only be set in DM!\n` +
        `Send this command privately to the bot.`,
        { parse_mode: 'Markdown' }
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);

      if (args.length === 0) {
        return await bot.sendMessage(chatId,
          `🔐 *SET PASSWORD*\n\n` +
          `Usage: /setpassword <your_password>\n\n` +
          `⚠️ This password will be used for website login\n` +
          `📱 Make sure to remember it!`,
          { parse_mode: 'Markdown' }
        );
      }

      if (isGroup) {
        return await bot.sendMessage(chatId,
          `❌ *Security Warning!*\n\n` +
          `Don't set passwords in groups!\n` +
          `Use this command in DM with the bot.`,
          { parse_mode: 'Markdown' }
        );
      }

      const password = args.join(' ');

      if (password.length < 6) {
        return await bot.sendMessage(chatId,
          `❌ Password must be at least 6 characters long!`,
          { parse_mode: 'Markdown' }
        );
      }

      await setPassword(userId, password);

      await bot.sendMessage(chatId,
        `✅ *PASSWORD SET SUCCESSFULLY!*\n\n` +
        `🔐 Your password has been saved\n` +
        `📱 You can now login to the website\n\n` +
        `_Keep your password safe!_`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[SETPASSWORD] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to set password. Please try again.');
    }
  }
};