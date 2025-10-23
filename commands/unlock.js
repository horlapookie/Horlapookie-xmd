import isAdmin from '../lib/isAdmin.js';

export default {
  name: 'unlock',
  description: 'Allow all members to send messages in the group',
  aliases: ['open'],
  category: 'Group',
  async execute(msg, { sock, bot, args }) {
    const from = msg.key.remoteJid;

    // Check if Telegram bot
    if (bot) {
      try {
        const chatId = parseInt(from);
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
          return await bot.sendMessage(chatId, '❌ I need admin rights to unlock the group!');
        }

        // Unlock the group (allow all members to send messages)
        await bot.setChatPermissions(chatId, {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        });

        await bot.sendMessage(chatId, '🔓 *Group Unlocked!*\n\nAll members can now send messages in this group.', { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Telegram unlock error:', error);
        await bot.sendMessage(parseInt(from), '❌ Failed to unlock group: ' + error.message);
      }
      return;
    }

    // WhatsApp logic
    const isGroup = from.endsWith('@g.us');

    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '❌ This command can only be used in groups.'
      }, { quoted: msg });
    }

    try {
      const senderId = msg.key.participant || msg.key.remoteJid;
      const { isBotAdmin, isSenderAdmin } = await isAdmin(sock, from, senderId);
      
      if (!isBotAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ Bot needs admin privileges to unlock the group!'
        }, { quoted: msg });
      }

      if (!isSenderAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ Only admins can unlock the group!'
        }, { quoted: msg });
      }

      await sock.groupSettingUpdate(from, 'not_announcement');

      await sock.sendMessage(from, {
        text: '🔓 *Group Unlocked!*\n\nAll members can now send messages in this group.'
      }, { quoted: msg });

    } catch (error) {
      console.error('Unlock group error:', error);
      await sock.sendMessage(from, {
        text: '❌ Failed to unlock group: ' + error.message
      }, { quoted: msg });
    }
  }
};
