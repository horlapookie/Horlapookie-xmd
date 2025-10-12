
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'barstats',
  description: '📊 Check your bar stats and active effects',
  category: 'Economy',
  aliases: ['effects', 'mystats'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      const rankEmoji = getRankEmoji(user.rank);

      // Clean up expired effects
      if (user.barEffects) {
        const now = new Date();
        user.barEffects = user.barEffects.filter(e => new Date(e.endTime) > now);
        await user.save();
      }

      let stats = `📊 *BAR STATISTICS*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `*💪 CURRENT STATUS*\n` +
        `❤️ Health: ${user.health || 100}%\n` +
        `🧠 Mental: ${user.mental || 100}%\n` +
        `😊 Satisfaction: ${user.satisfaction || 0}%\n`;
      
      if (user.isSick) {
        const sickDays = Math.floor((new Date() - new Date(user.sickSince)) / (1000 * 60 * 60 * 24));
        stats += `🤒 Status: SICK (${sickDays} days)\n`;
      }
      stats += '\n';

      // Active effects
      if (user.barEffects && user.barEffects.length > 0) {
        stats += `*🔥 ACTIVE EFFECTS*\n`;
        user.barEffects.forEach(effect => {
          const timeLeft = Math.ceil((new Date(effect.endTime) - new Date()) / (1000 * 60));
          const emoji = {
            'drunk': '🍺',
            'high': '🌿',
            'calm': '😌',
            'euphoria': '🤩',
            'energized': '⚡'
          }[effect.effect] || '💊';
          
          stats += `${emoji} ${effect.effect} (${timeLeft} min left)\n`;
        });
        stats += '\n';
      } else {
        stats += `*🔥 ACTIVE EFFECTS*\nNone\n\n`;
      }

      // Sex stats
      if (user.sexStats && user.sexStats.total > 0) {
        stats += `*💋 COMPANION STATS*\n` +
          `📊 Total Sessions: ${user.sexStats.total}\n` +
          `💰 Total Spent: ${user.sexStats.spent.toLocaleString()} coins\n\n`;
      }

      // Health warnings
      if (user.health < 30) {
        stats += `⚠️ *WARNING: Low health! Rest recommended.*\n`;
      }
      if (user.mental < 30) {
        stats += `⚠️ *WARNING: Mental health declining!*\n`;
      }

      stats += `\n_Use /bar to visit the bar_\n_Use /sexworker for companions_`;

      await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[BARSTATS] Error:', error);
      await bot.sendMessage(chatId, '❌ Stats error. Try again.');
    }
  }
};
