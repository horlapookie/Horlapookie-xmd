
import { getBotInfo, isMainBot } from '../../lib/economy.js';

export default {
  name: 'mybots',
  description: '🤖 Check your deployed bot information',
  category: 'Economy',
  aliases: ['mybot', 'botinfo'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = msg.key.participant || msg.from.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ This command only works on the main bot\\. Visit @Horla1stbot\\!',
        { parse_mode: 'MarkdownV2' }
      );
    }

    try {
      const botInfo = await getBotInfo(userId);

      if (!botInfo) {
        return await bot.sendMessage(chatId,
          `❌ *You haven't deployed any bot yet\\!*\n\n` +
          `💰 Deploy a bot for 1000 coins using /pair\n\n` +
          `_Use /balance to check your coins_`,
          { parse_mode: 'MarkdownV2' }
        );
      }

      const deployDate = new Date(botInfo.deployedAt).toLocaleDateString();
      
      await bot.sendMessage(chatId,
        `🤖 *YOUR DEPLOYED BOT*\n\n` +
        `📱 Bot Username: @${botInfo.botUsername}\n` +
        `📅 Deployed: ${deployDate}\n` +
        `✅ Status: Active\n\n` +
        `_Use /unpair to revoke and remove your bot_`,
        { parse_mode: 'MarkdownV2' }
      );

    } catch (error) {
      console.error('[MYBOTS] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable\\. Please contact admin\\.',
        { parse_mode: 'MarkdownV2' }
      );
    }
  }
};
