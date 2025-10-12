export default {
  name: 'lock',
  description: 'Lock the group chat (admin only)',
  adminOnly: true,
  execute: async (msg, { sock, bot, args }) => {
    const jid = msg.key.remoteJid;

    // Check if Telegram bot
    if (bot) {
      try {
        const chatId = parseInt(jid);
        const chat = await bot.getChat(chatId);
        
        // Check if it's a group
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          return await bot.sendMessage(chatId, '❌ This command only works in groups!');
        }

        // Check if sender is admin
        const admins = await bot.getChatAdministrators(chatId);
        const senderId = msg.key.participant;
        // Normalize sender ID (remove @telegram suffix if present)
        const normalizedSenderId = parseInt(senderId.split('@')[0]);
        const isAdmin = admins.some(admin => admin.user.id === normalizedSenderId);
        
        if (!isAdmin) {
          return await bot.sendMessage(chatId, '❌ Only group admins can use this command!');
        }

        // Check if bot is admin
        const botInfo = await bot.getMe();
        const botIsAdmin = admins.some(admin => admin.user.id === botInfo.id);
        
        if (!botIsAdmin) {
          return await bot.sendMessage(chatId, '❌ I need admin rights to lock the group!');
        }

        // Lock the group (set permissions so only admins can send messages)
        await bot.setChatPermissions(chatId, {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        });

        await bot.sendMessage(chatId, '🔒 Group is now locked (only admins can send messages).');

      } catch (error) {
        console.error('Telegram lock error:', error);
        await bot.sendMessage(parseInt(jid), `❌ Failed to lock group: ${error.message}`);
      }
      return;
    }

    // WhatsApp logic
    if (!jid.endsWith('@g.us')) {
      return await sock.sendMessage(jid, { text: '❌ This command works only in groups.' });
    }

    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await sock.sendMessage(jid, { text: '🔒 Group is now locked (only admins can send messages).' });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to lock group: ${err.message}` });
    }
  }
};
