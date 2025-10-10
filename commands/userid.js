export default {
  name: 'userid',
  description: 'Get Telegram user ID',
  aliases: ['id', 'getid', 'myid'],
  async execute(msg, { sock, bot, args }) {
    const from = msg.key.remoteJid;

    // Check if Telegram bot
    if (bot) {
      try {
        const chatId = parseInt(from);
        const senderId = msg.key.participant || msg.key.remoteJid;
        const normalizedSenderId = parseInt(senderId.split('@')[0]);

        // If replying to someone, get their ID
        if (msg.message?.reply_to_message) {
          const targetUser = msg.message.reply_to_message.from;
          const userInfo = `👤 *User Information*\n\n` +
            `📛 Name: ${targetUser.first_name}${targetUser.last_name ? ' ' + targetUser.last_name : ''}\n` +
            `🆔 User ID: \`${targetUser.id}\`\n` +
            `👨‍💼 Username: ${targetUser.username ? '@' + targetUser.username : 'None'}\n` +
            `🤖 Is Bot: ${targetUser.is_bot ? 'Yes' : 'No'}`;

          return await bot.sendMessage(chatId, userInfo, { parse_mode: 'Markdown' });
        }

        // Get info about the sender
        try {
          const chat = await bot.getChat(chatId);
          const senderInfo = `👤 *Your Information*\n\n` +
            `🆔 Your User ID: \`${normalizedSenderId}\`\n` +
            `💬 Chat ID: \`${chatId}\`\n` +
            `📱 Chat Type: ${chat.type}\n\n` +
            `💡 *Tip:* Reply to someone's message with /userid to get their ID`;

          await bot.sendMessage(chatId, senderInfo, { parse_mode: 'Markdown' });
        } catch (error) {
          // Fallback if we can't get chat info
          await bot.sendMessage(chatId, `🆔 Your User ID: \`${normalizedSenderId}\`\n\n💡 Reply to someone's message to get their ID`, { parse_mode: 'Markdown' });
        }

      } catch (error) {
        console.error('Telegram userid error:', error);
        await bot.sendMessage(parseInt(from), '❌ Error getting user ID: ' + error.message);
      }
      return;
    }

    // WhatsApp logic
    try {
      const senderId = msg.key.participant || msg.key.remoteJid;
      let response = `👤 *Your Information*\n\n`;
      response += `🆔 Your ID: ${senderId}\n`;
      response += `💬 Chat ID: ${from}\n`;

      // If replying to someone, get their ID
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        const targetId = msg.message.extendedTextMessage.contextInfo.participant;
        response += `\n👤 *Replied User*\n`;
        response += `🆔 User ID: ${targetId}`;
      }

      await sock.sendMessage(from, { text: response }, { quoted: msg });
    } catch (error) {
      console.error('UserID error:', error);
      await sock.sendMessage(from, { text: '❌ Error getting user ID' }, { quoted: msg });
    }
  }
};
