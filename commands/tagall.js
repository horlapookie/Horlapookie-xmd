export default {
  name: 'tagall',
  description: '📯 Tag all group members',
  async execute(msg, { sock, bot, args }) {
    const chatId = msg.key.remoteJid;
    const chat = await bot.getChat(chatId);

    // Only in groups/supergroups
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      return await bot.sendMessage(chatId, '❌ This command only works in groups!');
    }

    try {
      const admins = await bot.getChatAdministrators(chatId);
      const senderId = msg.key.participant;
      
      // Normalize sender ID (remove @telegram suffix if present)
      const normalizedSenderId = parseInt(senderId.split('@')[0]);
      
      // Check if sender is admin
      const isAdmin = admins.some(admin => admin.user.id === normalizedSenderId);
      if (!isAdmin) {
        return await bot.sendMessage(chatId, '❌ Only group admins can use this command!');
      }

      const message = args.length > 0 ? args.join(' ') : 'No message provided';
      const memberCount = await bot.getChatMemberCount(chatId);
      
      let tagMessage = `┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      tagMessage += `🌟 *HORLA POOKIE XMD TAGS* 🌟\n`;
      tagMessage += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      tagMessage += `👥 Group: ${chat.title}\n`;
      tagMessage += `📜 Message: ${message}\n`;
      tagMessage += `👤 Members: ${memberCount}\n`;
      tagMessage += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n`;
      tagMessage += `@everyone - Everyone has been notified!`;

      await bot.sendMessage(chatId, tagMessage, {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id
      });

    } catch (error) {
      console.error('Tagall error:', error);
      await bot.sendMessage(chatId, '❌ Error tagging members: ' + error.message);
    }
  }
};
