import { getLeaderboard, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'leaderboard',
  description: '🏆 View the richest users',
  category: 'Economy',
  aliases: ['lb', 'top', 'rich'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;

    // Check MongoDB connection
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const topUsers = await getLeaderboard(10);
      
      if (topUsers.length === 0) {
        return await bot.sendMessage(chatId, 
          '📊 *Leaderboard*\n\nNo users found. Be the first to claim daily rewards!',
          { parse_mode: 'Markdown' }
        );
      }

      let leaderboardText = '🏆 *TOP 10 RICHEST USERS* 🏆\n\n';
      
      topUsers.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const rankEmoji = getRankEmoji(user.rank);
        leaderboardText += `${medal} *${user.username}*\n`;
        leaderboardText += `   ${rankEmoji} ${user.rank} | Level ${user.level}\n`;
        leaderboardText += `   💰 ${user.balance} coins\n`;
        leaderboardText += `   🎮 ${user.gamesWon}/${user.gamesPlayed} wins\n`;
        leaderboardText += `   ${user.botDeployed ? '🤖 Bot Owner' : ''}\n\n`;
      });

      leaderboardText += '_Use /daily to start earning coins!_';

      await bot.sendMessage(chatId, leaderboardText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Leaderboard command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
