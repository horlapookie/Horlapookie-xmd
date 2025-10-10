export default {
  name: 'kick',
  description: 'Kick a user from the group. Use by replying to the user or tagging them: $kick',
  adminOnly: true,
  async execute(msg, { sock, bot, args }) {
    const remoteJid = msg.key.remoteJid;

    // Check if Telegram bot
    if (bot) {
      try {
        const chatId = parseInt(remoteJid);
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
            // Get all chat members (this may require bot to be admin)
            const chatMember = await bot.getChatMember(chatId, `@${usernameArg}`).catch(() => null);
            if (chatMember && chatMember.user) {
              targetUserId = chatMember.user.id;
              targetUser = chatMember.user;
            }
          } catch (e) {
            console.log('Could not find user by username:', e.message);
          }
        }
        
        if (!targetUserId) {
          return await bot.sendMessage(chatId, '❌ Please reply to a user message or tag them to kick.');
        }

        // Check if target is admin or creator
        const targetMember = admins.find(admin => admin.user.id === targetUserId);
        if (targetMember) {
          if (targetMember.status === 'creator') {
            return await bot.sendMessage(chatId, '❌ Cannot kick the group creator!');
          }
          if (targetMember.status === 'administrator') {
            return await bot.sendMessage(chatId, '❌ Cannot kick an admin!');
          }
        }

        // Kick the user (ban and unban)
        await bot.banChatMember(chatId, targetUserId);
        await bot.unbanChatMember(chatId, targetUserId);

        await bot.sendMessage(chatId, `✅ Successfully kicked ${targetUser?.first_name || 'User'}`);

      } catch (error) {
        console.error('Telegram kick error:', error);
        await bot.sendMessage(parseInt(remoteJid), `❌ Failed to kick user: ${error.message}`);
      }
      return;
    }

    // WhatsApp logic
    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(remoteJid);

      let userToKick = null;
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

      if (contextInfo?.mentionedJid?.length) {
        userToKick = contextInfo.mentionedJid[0];
      } else if (contextInfo?.participant) {
        userToKick = contextInfo.participant;
      }

      if (!userToKick) {
        return sock.sendMessage(remoteJid, { text: '❌ Please reply to or tag the user you want to kick.' }, { quoted: msg });
      }

      const botNumber = sock.user.id.split(':')[0];
      if (userToKick.split('@')[0] === botNumber) {
        return sock.sendMessage(remoteJid, { text: '❌ I cannot kick myself!' }, { quoted: msg });
      }

      if (metadata.owner === userToKick) {
        return sock.sendMessage(remoteJid, { text: '❌ Cannot kick the group owner!' }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(remoteJid, [userToKick], 'remove');
      await sock.sendMessage(remoteJid, {
        text: `✅ Successfully kicked @${userToKick.split('@')[0]}`,
        mentions: [userToKick]
      }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(remoteJid, { text: `❌ Failed to kick user: ${error.message}` }, { quoted: msg });
    }
  }
};
