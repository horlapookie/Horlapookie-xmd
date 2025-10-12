
import { getUser, isMainBot } from '../../lib/economy.js';
import mongoose from 'mongoose';

const color = (text, colorCode) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return colors[colorCode] ? colors[colorCode] + text + colors.reset : text;
};

export default {
  name: 'unpair',
  description: '🔓 Revoke and remove your deployed bot',
  category: 'Economy',
  aliases: ['revoke', 'removebot'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = msg.key.participant || msg.from.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ This command only works on the main bot. Visit @Horla1stbot!',
        { parse_mode: 'Markdown' }
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);

      if (!user.botDeployed) {
        return await bot.sendMessage(chatId,
          `❌ *You don't have any deployed bot!*\n\n` +
          `_Use /pair to deploy a bot_`,
          { parse_mode: 'Markdown' }
        );
      }

      // Ask for confirmation with buttons
      const botUsername = user.botUsername;
      
      await bot.sendMessage(chatId,
        `⚠️ *CONFIRM BOT REMOVAL*\n\n` +
        `Are you sure you want to remove @${botUsername}?\n\n` +
        `This action will:\n` +
        `• Stop your bot\n` +
        `• Remove bot token from database\n` +
        `• This cannot be undone`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, Remove Bot', callback_data: `unpair_confirm_${userId}` },
                { text: '❌ Cancel', callback_data: `unpair_cancel_${userId}` }
              ]
            ]
          }
        }
      );

    } catch (error) {
      console.error('[UNPAIR] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin.',
        { parse_mode: 'Markdown' }
      );
    }
  }
};

// Handle unpair confirmation via callback
export async function handleUnpairCallback(query, bot) {
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const username = query.from.username || query.from.first_name || 'User';
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('unpair_cancel_')) {
      await bot.editMessageText(
        '❌ *Bot removal cancelled*\n\n_Your bot is still active_',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    if (data.startsWith('unpair_confirm_')) {
      const user = await getUser(userId, username);

      if (!user.botDeployed) {
        return await bot.editMessageText(
          '❌ You don\'t have any deployed bot!',
          {
            chat_id: chatId,
            message_id: query.message.message_id
          }
        );
      }

      const botUsername = user.botUsername;

      // Remove bot deployment info
      user.botToken = null;
      user.botUsername = null;
      user.botDeployed = false;
      user.deployedAt = null;
      user.updatedAt = new Date();

      await user.save();

      await bot.editMessageText(
        `✅ *BOT REMOVED SUCCESSFULLY!*\n\n` +
        `🤖 @${botUsername} has been revoked and will stop within 30 seconds\n` +
        `💰 You can deploy a new bot anytime using /pair\n\n` +
        `_Your coins balance remains unchanged_`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );

      console.log(color(`[UNPAIR] User ${userId} unpaired bot @${botUsername}`, 'cyan'));
    }

  } catch (error) {
    console.error('[UNPAIR CALLBACK] Error:', error);
    await bot.answerCallbackQuery(query.id, { 
      text: `Error: ${error.message}` 
    });
  }
}
