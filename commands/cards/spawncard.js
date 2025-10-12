import { spawnCardInGroup, addCardGroup } from '../../handlers/cardSpawner.js';

// Cooldown tracking (5 minutes per user per group)
const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export default {
  name: 'spawncard',
  description: '🎴 Spawn a new card (5 min cooldown)',
  category: 'Cards',
  aliases: ['spawn'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Check if it's a group (Telegram format)
    const isGroup = chatId.includes('@g.us') || chatId.includes('-');
    if (!isGroup) {
      return await bot.sendMessage(chatId, '❌ This command only works in groups!');
    }

    // Check cooldown
    const userCooldownKey = `${userId}_${chatId}`;
    const lastUse = cooldowns.get(userCooldownKey);
    const now = Date.now();

    if (lastUse) {
      const timeLeft = COOLDOWN_MS - (now - lastUse);
      if (timeLeft > 0) {
        const minutesLeft = Math.ceil(timeLeft / 60000);
        return await bot.sendMessage(chatId,
          `⏰ *Card Spawn Cooldown*\n\n` +
          `❌ You must wait ${minutesLeft} minute(s) before spawning another card.\n\n` +
          `💡 Each user can spawn a card every 5 minutes.`,
          { parse_mode: 'Markdown' }
        );
      }
    }

    // Add group to card system if not already added
    addCardGroup(chatId);

    await bot.sendMessage(chatId, 
      `🎴 *Spawning Card...*\n\n` +
      `🔄 Generating a random card for the group...`,
      { parse_mode: 'Markdown' }
    );

    // Spawn the card
    const spawned = await spawnCardInGroup(bot, chatId);

    if (spawned) {
      // Set cooldown
      cooldowns.set(userCooldownKey, now);
      
      // Clean up old cooldowns (optional, to prevent memory leaks)
      setTimeout(() => {
        cooldowns.delete(userCooldownKey);
      }, COOLDOWN_MS);
    } else {
      await bot.sendMessage(chatId,
        '❌ Failed to spawn card. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  }
};
