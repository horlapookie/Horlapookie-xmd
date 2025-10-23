import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'demote',
  description: '👨🏿‍💼 Demote admin to member',
  adminOnly: true,
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
          return await bot.sendMessage(chatId, '❌ Please reply to a user message or tag them to demote.');
        }

        // Check if target is admin
        const targetIsAdmin = admins.some(admin => admin.user.id === targetUserId);
        if (!targetIsAdmin) {
          return await bot.sendMessage(chatId, '❌ This member is not an admin!');
        }

        // Check if target is creator
        const targetIsCreator = admins.find(admin => admin.user.id === targetUserId)?.status === 'creator';
        if (targetIsCreator) {
          return await bot.sendMessage(chatId, '❌ Cannot demote the group creator!');
        }

        // Demote the user
        await bot.promoteChatMember(chatId, targetUserId, {
          can_manage_chat: false,
          can_delete_messages: false,
          can_manage_video_chats: false,
          can_restrict_members: false,
          can_promote_members: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        });

        await bot.sendMessage(chatId, `✅ ${targetUser?.first_name || 'User'} has been demoted from admin.`);

      } catch (error) {
        console.error('Telegram demote error:', error);
        await bot.sendMessage(parseInt(from), `❌ Error demoting member: ${error.message}`);
      }
      return;
    }

    // WhatsApp logic
    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: '❌ This command only works in groups!'
      }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(from);
      const participants = metadata.participants;

      let targetUser = null;

      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetUser = msg.message.extendedTextMessage.contextInfo.participant;
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      else if (args.length > 0) {
        targetUser = args[0].includes('@') ? args[0] : `${args[0]}@s.whatsapp.net`;
      } else {
        return await sock.sendMessage(from, {
          text: '❌ Please reply to a user message, mention a user, or provide their number to demote.'
        }, { quoted: msg });
      }

      const targetAdmin = participants.find(p => p.id === targetUser)?.admin;

      if (!targetAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ This member is not an admin!'
        }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(from, [targetUser], 'demote');

      await sock.sendMessage(from, {
        text: `✅ @${targetUser.split('@')[0]} has been demoted from admin.`,
        mentions: [targetUser]
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success, key: msg.key }
      });

    } catch (error) {
      console.error('Demote error:', error);
      await sock.sendMessage(from, {
        text: `❌ Error demoting member: ${error.message}`
      }, { quoted: msg });
    }
  }
};
