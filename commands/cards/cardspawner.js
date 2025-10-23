
import config from '../../config.js';
import { addCardGroup, removeCardGroup, getCardGroups } from '../../handlers/cardSpawner.js';

export default {
  name: 'cardspawner',
  description: '🎴 Control card spawning in groups (Creator only)',
  category: 'Cards',
  aliases: ['cspawn', 'spawner'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const isGroup = chatId.includes('@g.us') || chatId.includes('-');

    // Check if user is the creator
    if (userId !== config.cardSpawnerCreatorId) {
      return await bot.sendMessage(chatId, 
        '❌ Only the bot creator can control card spawning!'
      );
    }

    if (!args[0]) {
      const groups = getCardGroups();
      const status = groups.length > 0 
        ? `✅ Active in ${groups.length} group(s)\n\nGroups:\n${groups.map(g => `• ${g}`).join('\n')}`
        : '❌ No active groups';

      return await bot.sendMessage(chatId, 
        `🎴 *Card Spawner Control*\n\n` +
        `⏱️ Interval: Every ${config.cardSpawnInterval} minutes\n` +
        `${status}\n\n` +
        `*Commands:*\n` +
        `/cardspawner on - Enable in this group\n` +
        `/cardspawner off - Disable in this group\n` +
        `/cardspawner list - Show active groups`,
        { parse_mode: 'Markdown' }
      );
    }

    const action = args[0].toLowerCase();

    if (action === 'on') {
      if (!isGroup) {
        return await bot.sendMessage(chatId, 
          '❌ This command only works in groups!'
        );
      }

      addCardGroup(chatId);
      await bot.sendMessage(chatId, 
        `✅ Card spawner enabled!\n\n` +
        `🎴 Cards will spawn every ${config.cardSpawnInterval} minutes\n` +
        `💰 Users can collect cards using /collect <captcha>`
      );
    } else if (action === 'off') {
      if (!isGroup) {
        return await bot.sendMessage(chatId, 
          '❌ This command only works in groups!'
        );
      }

      removeCardGroup(chatId);
      await bot.sendMessage(chatId, 
        '❌ Card spawner disabled in this group'
      );
    } else if (action === 'list') {
      const groups = getCardGroups();
      if (groups.length === 0) {
        return await bot.sendMessage(chatId, 
          '📋 No groups have card spawning enabled'
        );
      }

      await bot.sendMessage(chatId, 
        `📋 *Active Card Spawner Groups*\n\n` +
        `Total: ${groups.length}\n\n` +
        groups.map((g, i) => `${i + 1}. ${g}`).join('\n'),
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, 
        '❓ Invalid action. Use: on, off, or list'
      );
    }
  }
};
