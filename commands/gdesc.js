export default {
  name: 'gdesc',
  description: '📝 Change group description',
  async execute(msg, { sock, bot, args, settings }) {
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
          return await bot.sendMessage(chatId, '❌ I need admin rights to change group description!');
        }

        if (!args[0]) {
          return await bot.sendMessage(chatId, `❌ Please enter the new group description!\n\nUsage: ${settings?.prefix || '/'}gdesc <new description>`);
        }

        const newDesc = args.join(' ');
        await bot.setChatDescription(chatId, newDesc);

        await bot.sendMessage(chatId, `✅ Group description updated to: *${newDesc}*`, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Telegram gdesc error:', error);
        await bot.sendMessage(parseInt(from), '❌ Error changing group description: ' + error.message);
      }
      return;
    }

    // WhatsApp logic
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: '❌ This is a group command only!'
      }, { quoted: msg });
    }

    try {
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants;
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const senderNumber = msg.key.participant || msg.key.remoteJid;
      
      const botAdmin = participants.find(p => p.id === botNumber)?.admin;
      const senderAdmin = participants.find(p => p.id === senderNumber)?.admin;

      if (!senderAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ You are not an admin!'
        }, { quoted: msg });
      }

      if (!botAdmin) {
        return await sock.sendMessage(from, {
          text: '❌ I need admin rights to change group description!'
        }, { quoted: msg });
      }

      if (!args[0]) {
        return await sock.sendMessage(from, {
          text: '❌ Please enter the new group description!\n\nUsage: ?gdesc <new description>'
        }, { quoted: msg });
      }

      const newDesc = args.join(' ');
      await sock.groupUpdateDescription(from, newDesc);

      await sock.sendMessage(from, {
        text: `✅ Group description updated to: *${newDesc}*`
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(from, {
        text: '❌ Error changing group description!'
      }, { quoted: msg });
    }
  }
};
