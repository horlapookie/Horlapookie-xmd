export default {
  name: 'announce',
  description: '📢 Make an announcement in the group',
  category: 'Group',
  async execute(msg, { sock, bot, args, isOwner }) {
    const chatId = msg.key.remoteJid;
    const chat = await bot.getChat(chatId);

    // Only in groups/supergroups
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      return await bot.sendMessage(chatId, 'This command works only in groups!');
    }

    const senderId = msg.key.participant;

    try {
      // Check if sender is admin or owner
      const admins = await bot.getChatAdministrators(chatId);
      const isAdmin = admins.some(admin => admin.user.id.toString() === senderId);
      
      if (!isAdmin && !isOwner) {
        return await bot.sendMessage(chatId, '❌ You must be an admin or the owner to use this command.');
      }

      if (args.length === 0) {
        return await bot.sendMessage(chatId, 'Usage: /announce Your announcement here');
      }

      const announcementText = args.join(' ');

      const message = 
        `📢 *ANNOUNCEMENT* 📢\n\n` +
        `${announcementText}\n\n` +
        `_— Group Administration_`;

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id
      });
      
    } catch (error) {
      console.error('Announce error:', error);
      await bot.sendMessage(chatId, '❌ Error making announcement: ' + error.message);
    }
  }
};
