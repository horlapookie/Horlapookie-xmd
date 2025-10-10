
export default {
  name: 'pp',
  description: 'Get user profile picture (Telegram)',
  category: 'User',
  aliases: ['profilepic', 'avatar'],
  async execute(msg, { sock, bot, args, settings }) {
    const from = msg.key.remoteJid;

    // Telegram handling
    if (bot) {
      const chatId = parseInt(from);
      const replyMsg = msg.message?.reply_to_message;
      const mentionedUser = msg.message?.entities?.find(e => e.type === 'text_mention')?.user;
      
      let targetUserId = msg.from.id;
      let targetUser = msg.from;
      
      // Check if replying to someone
      if (replyMsg) {
        targetUserId = replyMsg.from.id;
        targetUser = replyMsg.from;
      }
      // Check if mentioning someone
      else if (mentionedUser) {
        targetUserId = mentionedUser.id;
        targetUser = mentionedUser;
      }
      
      try {
        // Get user profile photos
        const photos = await bot.getUserProfilePhotos(targetUserId, { limit: 1 });
        
        if (!photos.total_count || photos.photos.length === 0) {
          return await bot.sendMessage(chatId, 
            `❌ *No profile picture found*\n\n` +
            `👤 *User:* ${targetUser.first_name || 'Unknown'}\n` +
            `🆔 *ID:* ${targetUserId}`,
            { parse_mode: 'Markdown' }
          );
        }
        
        const photo = photos.photos[0][photos.photos[0].length - 1];
        const file = await bot.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        
        // Download the photo
        const axios = (await import('axios')).default;
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        const userName = targetUser.first_name + (targetUser.last_name ? ' ' + targetUser.last_name : '');
        const userUsername = targetUser.username ? `@${targetUser.username}` : 'No username';
        
        await bot.sendPhoto(chatId, buffer, {
          caption: 
            `📸 *Profile Picture*\n\n` +
            `👤 *Name:* ${userName}\n` +
            `🆔 *Username:* ${userUsername}\n` +
            `🔢 *ID:* ${targetUserId}\n\n` +
            `_Powered by HORLA POOKIE Bot_`,
          parse_mode: 'Markdown'
        });
        
      } catch (error) {
        console.error('PP command error:', error);
        await bot.sendMessage(chatId, 
          `❌ Failed to fetch profile picture: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    // WhatsApp - redirect to getpp
    return await sock.sendMessage(from, {
      text: `Use ${settings.prefix}getpp for WhatsApp profile pictures`
    }, { quoted: msg });
  }
};
