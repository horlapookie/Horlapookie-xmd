
import { getSpawnedCard } from '../../lib/cards/mongoDb.js';
import { getCardGroups } from '../../handlers/cardSpawner.js';
import config from '../../config.js';

export default {
  name: 'cardstatus',
  description: '📊 Check card system status',
  category: 'Cards',
  aliases: ['cstatus', 'cardinfo'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.includes('@g.us') || chatId.includes('-');
    
    try {
      const activeGroups = getCardGroups();
      const spawnedCard = await getSpawnedCard(chatId);
      
      let status = `📊 *CARD SYSTEM STATUS*\n\n`;
      
      // Storage info
      status += `💾 *Storage:* SQLite Database\n`;
      status += `📁 *Location:* lib/data/cards/card.sqlite\n\n`;
      
      // Spawn settings
      status += `⏱️ *Spawn Interval:* ${config.cardSpawnInterval} minutes\n`;
      status += `👤 *Controller:* Creator Only (ID: ${config.cardSpawnerCreatorId})\n`;
      status += `🌐 *Active Groups:* ${activeGroups.length}\n\n`;
      
      // Current group status
      if (isGroup) {
        const isActive = activeGroups.includes(chatId);
        status += `📍 *This Group:*\n`;
        status += `• Status: ${isActive ? '✅ Active' : '❌ Inactive'}\n`;
        status += `• Current Card: ${spawnedCard ? '🎴 Yes' : '❌ None'}\n\n`;
      }
      
      // Commands
      status += `*Available Commands:*\n`;
      status += `• /cardspawner - Control spawning (creator only)\n`;
      status += `• /collect <captcha> - Claim spawned card\n`;
      status += `• /deck - View your deck (max 12)\n`;
      status += `• /collection - View all cards\n`;
      status += `• /cards - Display all your cards\n`;
      status += `• /buycard - Purchase from market\n`;
      status += `• /salecard - Sell your cards\n`;
      status += `• /swap - Swap deck positions\n\n`;
      
      status += `_Database: Cards stored in SQLite_\n`;
      status += `_Economy: Balance stored in MongoDB_`;
      
      await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('[CARD STATUS] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ Error checking card status. Please try again.'
      );
    }
  }
};
