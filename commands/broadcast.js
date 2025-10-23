import fs from 'fs';
import path from 'path';

export default {
  name: 'broadcast',
  description: 'Send message to all groups the bot is in (owner only)',
  aliases: ['spread'],
  category: 'Owner',
  async execute(msg, { sock, bot, args, isOwner }) {
    const chatId = msg.key.remoteJid;

    if (!args[0]) {
      return await bot.sendMessage(chatId, "Usage: /broadcast <message>");
    }

    if (!isOwner) {
      return await bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
    }

    try {
      // Get all chats where bot is member (stored in data/bot_groups.json)
      const groupsFile = path.join(process.cwd(), 'data', 'bot_groups.json');
      let groups = [];
      
      if (fs.existsSync(groupsFile)) {
        groups = JSON.parse(fs.readFileSync(groupsFile, 'utf8'));
      } else {
        return await bot.sendMessage(chatId, "❌ No groups found. The bot needs to track groups first.");
      }

      const groupIds = groups.filter(g => g.type === 'group' || g.type === 'supergroup').map(g => g.id);

      if (groupIds.length === 0) {
        return await bot.sendMessage(chatId, "❌ No groups to broadcast to.");
      }

      await bot.sendMessage(chatId, `🌐 *HORLA POOKIE XMD* is sending your message to ${groupIds.length} groups...`);

      const broadcastMessage = "*🌟 HORLA POOKIE BROADCAST 🌟*\n\n" + args.join(" ") + "\n\n_— Bot Owner_";

      let successCount = 0;
      for (let groupId of groupIds) {
        try {
          await bot.sendMessage(groupId, broadcastMessage, {
            parse_mode: 'Markdown'
          });
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid rate limits
        } catch (err) {
          console.error(`Failed to broadcast to ${groupId}:`, err.message);
        }
      }

      await bot.sendMessage(chatId, `✅ Broadcast sent to ${successCount} out of ${groupIds.length} groups successfully!`);

    } catch (error) {
      console.error('Broadcast error:', error);
      await bot.sendMessage(chatId, "❌ Error sending broadcast: " + error.message);
    }
  }
};
