import isAdmin from '../lib/isAdmin.js';

export default {
  name: 'remove',
  description: '😱 Remove member from group',
  async execute(msg, { sock, bot, args, settings }) {
    const from = msg.key.remoteJid;
    
    // Telegram bot handling
    if (bot) {
      const chatId = parseInt(from);
      const chat = await bot.getChat(chatId);
      
      if (chat.type !== 'group' && chat.type !== 'supergroup') {
        return await bot.sendMessage(chatId, '❌ This is a group command only!');
      }
      
      const sender = msg.key.participant;
      const admins = await bot.getChatAdministrators(chatId);
      const normalizedSenderId = parseInt(sender.split('@')[0]);
      const isAdmin = admins.some(admin => admin.user.id === normalizedSenderId);
      
      if (!isAdmin) {
        return await bot.sendMessage(chatId, '❌ You are not an admin!');
      }
      
      // Get target user from reply or mention
      let targetUserId = null;
      let targetUser = null;
      
      // Check for reply
      let replyMsg = msg.message?.reply_to_message || msg.key?.quotedMessage;
      if (replyMsg) {
        targetUserId = replyMsg.from?.id || replyMsg.user?.id;
        targetUser = replyMsg.from || replyMsg.user;
      }
      
      // Check for entities (mentions)
      if (!targetUserId && msg.message?.entities) {
        const mention = msg.message.entities.find(e => e.type === 'text_mention');
        if (mention && mention.user) {
          targetUserId = mention.user.id;
          targetUser = mention.user;
        }
      }
      
      // Check for @username in text
      if (!targetUserId && args.length > 0) {
        const usernameArg = args[0].replace('@', '');
        try {
          const chatMembers = await bot.getChatAdministrators(chatId);
          const mentioned = chatMembers.find(m => m.user?.username === usernameArg);
          if (mentioned) {
            targetUserId = mentioned.user.id;
            targetUser = mentioned.user;
          }
        } catch (e) {
          console.log('Could not find user by username:', e.message);
        }
      }
      
      if (!targetUserId) {
        return await bot.sendMessage(chatId, '❌ Please reply to a user\'s message or tag them to remove!');
      }
      const targetIsAdmin = admins.some(admin => admin.user.id === targetUserId);
      
      if (targetIsAdmin) {
        return await bot.sendMessage(chatId, '❌ Cannot remove admin members! Demote them first.');
      }
      
      await bot.banChatMember(chatId, targetUserId);
      await bot.unbanChatMember(chatId, targetUserId);
      
      await bot.sendMessage(chatId, `${targetUser?.first_name || 'User'} has been removed from the group.`);
      return;
    }
    
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: '❌ This is a group command only!'
      }, { quoted: msg });
    }

    try {
      const senderNumber = msg.key.participant || msg.key.remoteJid;
      const { isBotAdmin, isSenderAdmin } = await isAdmin(sock, from, senderNumber);

      if (!isSenderAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ You are not an admin!'
        }, { quoted: msg });
      }

      if (!isBotAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ I need admin rights to remove members!'
        }, { quoted: msg });
      }

      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants;

      // Check if replying to a message
      if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return await sock.sendMessage(from, {
          text: '❌ Please reply to a user\'s message to remove them!\n\nUsage: Reply to message + ?remove'
        }, { quoted: msg });
      }

      const targetUser = msg.message.extendedTextMessage.contextInfo.participant;
      const targetAdmin = participants.find(p => p.id === targetUser)?.admin;

      if (targetAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ Cannot remove admin members! Demote them first.'
        }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(from, [targetUser], "remove");

      await sock.sendMessage(from, {
        text: `@${targetUser.split('@')[0]} has been removed from the group.`,
        mentions: [targetUser]
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(from, {
        text: '❌ Error removing member!'
      }, { quoted: msg });
    }
  }
};
