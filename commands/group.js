
export default {
  name: 'group',
  description: '🔐 Open or close group for messages',
  async execute(msg, { sock, bot, args, settings }) {
    const from = msg.key.remoteJid;
    const chatId = parseInt(from);
    
    // Check if this is a Telegram group
    if (bot) {
      try {
        const chat = await bot.getChat(chatId);
        
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          return await sock.sendMessage(from, {
            text: '❌ This command only works in groups!'
          }, { quoted: msg });
        }

        const userId = msg.key.participant;
        const botUser = await bot.getMe();
        
        // Check if user is admin
        const chatMember = await bot.getChatMember(chatId, userId);
        const isUserAdmin = chatMember.status === 'administrator' || chatMember.status === 'creator';
        
        // Check if bot is admin
        const botMember = await bot.getChatMember(chatId, botUser.id);
        const isBotAdmin = botMember.status === 'administrator' || botMember.status === 'creator';

        if (!isBotAdmin) {
          return await sock.sendMessage(from, {
            text: '❌ Bot needs admin privileges to change group settings!'
          }, { quoted: msg });
        }

        if (!isUserAdmin) {
          return await sock.sendMessage(from, {
            text: '❌ You need to be an admin to use this command!'
          }, { quoted: msg });
        }

        if (!args[0]) {
          return await sock.sendMessage(from, {
            text: `❌ Instructions:\n\nType ${settings.prefix}group open or ${settings.prefix}group close`
          }, { quoted: msg });
        }

        const action = args[0].toLowerCase();
        const permissions = {
          can_send_messages: action === 'open',
          can_send_media_messages: action === 'open',
          can_send_polls: action === 'open',
          can_send_other_messages: action === 'open',
          can_add_web_page_previews: action === 'open',
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        };

        switch (action) {
          case 'open':
            await bot.setChatPermissions(chatId, permissions);
            await sock.sendMessage(from, {
              text: '✅ Group opened! All members can now send messages.'
            }, { quoted: msg });
            break;

          case 'close':
            await bot.setChatPermissions(chatId, permissions);
            await sock.sendMessage(from, {
              text: '🔒 Group closed! Only admins can send messages now.'
            }, { quoted: msg });
            break;

          default:
            await sock.sendMessage(from, {
              text: '❌ Invalid option! Use "open" or "close"'
            }, { quoted: msg });
        }

      } catch (error) {
        console.error('Group command error:', error);
        await sock.sendMessage(from, {
          text: `❌ Error: ${error.message}`
        }, { quoted: msg });
      }
    }
  }
};
