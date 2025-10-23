import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load emojis
const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: "hneko",
  description: "Sends random NSFW neko images (group only).",
  category: "NSFW",

  async execute(msg, { sock }) {
    const dest = msg.key.remoteJid;
    const from = dest;
    const userName = msg.from?.first_name || msg.from?.username || 'User';
    const isGroup = from.toString().includes('@g.us') || from.toString().startsWith('-');

    // Only allowed in groups
    if (!isGroup) {
      await sock.sendMessage(dest, {
        text: `${emojis.error} This command can only be used in group chats.`,
      }, { quoted: msg });
      return;
    }

    const url = 'https://api.waifu.pics/nsfw/neko';

    try {
      await sock.sendMessage(dest, {
        react: { text: emojis.processing, key: msg.key }
      });

      for (let i = 0; i < 5; i++) {
        const response = await axios.get(url);
        const imageUrl = response.data.url;
        const caption = `Random Neko image ${i + 1}/5`; // Added a caption for each image

        const chatId = parseInt(from) || from;
        await sock.sendPhoto(chatId, imageUrl, {
          caption: caption
        });
      }

      await sock.sendMessage(dest, {
        react: { text: emojis.success, key: msg.key }
      });

    } catch (error) {
      console.error('Error fetching neko images:', error); // Log the error for debugging
      await sock.sendMessage(dest, {
        text: `${emojis.error} Failed to fetch neko images.\n\nError: ${error.message}`,
      }, { quoted: msg });
    }
  }
};