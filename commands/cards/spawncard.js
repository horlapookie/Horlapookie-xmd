import { spawnCardInGroup, addCardGroup } from '../../handlers/cardSpawner.js';
import { getUser, updateBalance } from '../../lib/economy.js';

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

    // Parse filter arguments
    let tierFilter = null;
    let nameFilter = null;

    for (const arg of args) {
      if (arg.startsWith('--tier=')) {
        tierFilter = arg.split('=')[1].toUpperCase();
      } else if (arg.startsWith('--name=')) {
        nameFilter = arg.split('=')[1];
      }
    }

    // Check if user is trying to spawn tier S or 6 - requires 1 billion coins
    if (tierFilter === 'S' || tierFilter === '6') {
      try {
        const user = await getUser(userId, username);
        const cost = 1000000000; // 1 billion
        
        if (user.balance < cost) {
          return await bot.sendMessage(chatId,
            `💎 *PREMIUM TIER SPAWN* 💎\n\n` +
            `❌ Spawning tier ${tierFilter} cards requires 1,000,000,000 coins!\n\n` +
            `💰 Your balance: ${user.balance.toLocaleString()} coins\n` +
            `💸 Required: ${cost.toLocaleString()} coins\n` +
            `📉 Short by: ${(cost - user.balance).toLocaleString()} coins`,
            { parse_mode: 'Markdown' }
          );
        }

        // Deduct the cost
        await updateBalance(userId, -cost, username);
        
        await bot.sendMessage(chatId,
          `✅ *Payment Confirmed!*\n\n` +
          `💸 Deducted: 1,000,000,000 coins\n` +
          `🎴 Spawning tier ${tierFilter} card...`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('[SPAWNCARD] Economy check failed:', error);
        return await bot.sendMessage(chatId,
          '❌ Failed to process payment. Try again.'
        );
      }
    }

    // Add group to card system if not already added
    addCardGroup(chatId);

    let statusMsg = '🎴 *Spawning Card...*\n\n';
    if (tierFilter) {
      statusMsg += `🎯 Tier Filter: ${tierFilter}\n`;
    }
    if (nameFilter) {
      statusMsg += `🔍 Name Filter: ${nameFilter}\n`;
    }
    statusMsg += `🔄 Generating card for the group...`;

    await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });

    // Spawn the card with filters
    const spawned = await spawnCardInGroup(bot, chatId, 0, tierFilter, nameFilter);

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
