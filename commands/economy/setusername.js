import { getUser, isMainBot } from '../../lib/economy.js';

export default {
  name: 'setusername',
  description: 'Set your custom display username',
  category: 'Economy',
  aliases: ['setname', 'changename'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const currentUsername = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const newUsername = args.join(' ').trim();
      
      if (!newUsername) {
        return await bot.sendMessage(chatId, 
          '❌ Please provide a username!\n\n' +
          'Usage: /setusername <new_name>\n' +
          'Example: /setusername CryptoKing'
        );
      }

      if (newUsername.length > 20) {
        return await bot.sendMessage(chatId, 
          '❌ Username too long! Maximum 20 characters.'
        );
      }

      if (newUsername.length < 3) {
        return await bot.sendMessage(chatId, 
          '❌ Username too short! Minimum 3 characters.'
        );
      }

      const user = await getUser(userId, currentUsername, msg.from);
      const oldUsername = user.username;
      
      user.username = newUsername;
      await user.save();

      await bot.sendMessage(chatId,
        `✅ *Username Updated!*\n\n` +
        `Old: ${oldUsername}\n` +
        `New: ${newUsername}\n\n` +
        `_Your new username will appear in all economy commands!_`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('[SETUSERNAME] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to update username. Try again.');
    }
  }
};
