import { getUser, deployBot, isMainBot } from '../../lib/economy.js';

export default {
  name: 'pair',
  description: '🤖 Deploy your own bot (Costs 1000 coins)',
  category: 'Economy',
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = msg.key.participant || msg.from.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Check if this is the main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ This command is only available on the main bot.\n\n' +
        'Visit @Horla1stbot to deploy your own bot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      
      // Check if user already has a deployed bot
      if (user.botDeployed) {
        return await bot.sendMessage(chatId,
          `✅ *You already have a deployed bot!*\n\n` +
          `🤖 Bot Username: @${user.botUsername}\n` +
          `📅 Deployed: ${user.deployedAt.toLocaleDateString()}\n\n` +
          `_Your bot is running and ready to use!_`,
          { parse_mode: 'Markdown' }
        );
      }

      // Check balance
      if (user.balance < 1000) {
        return await bot.sendMessage(chatId,
          `❌ *Insufficient Balance!*\n\n` +
          `💰 Your Balance: ${user.balance} coins\n` +
          `💵 Required: 1000 coins\n\n` +
          `_Use /daily to earn coins or play games to increase your balance!_`,
          { parse_mode: 'Markdown' }
        );
      }

      // Ask for bot token
      await bot.sendMessage(chatId,
        `🤖 *BOT DEPLOYMENT SERVICE*\n\n` +
        `💰 Cost: 1000 coins\n` +
        `💵 Your Balance: ${user.balance} coins\n\n` +
        `📝 *How to get your bot token:*\n` +
        `1\\. Go to @BotFather on Telegram\n` +
        `2\\. Send /newbot and follow instructions\n` +
        `3\\. Copy the bot token you receive\n` +
        `4\\. Send it here in this format:\n\n` +
        `\`/pair <bot\\_token>\`\n\n` +
        `⚠️ *Warning:* Never share your bot token with anyone else\\!`,
        { parse_mode: 'MarkdownV2' }
      );

    } catch (error) {
      console.error('[PAIR] Error:', error);
      console.error('[PAIR] Full error details:', error.message, error.stack);
      
      if (error.message && error.message.includes('E11000')) {
        await bot.sendMessage(chatId, 
          '❌ Database error. Your user account needs to be reset. Please contact the admin.'
        );
      } else {
        await bot.sendMessage(chatId, 
          '❌ Economy system unavailable.\n\n' +
          'MongoDB may not be configured properly.\n' +
          'Admin: Please set MONGODB_URL in Replit Secrets.'
        );
      }
    }
  }
};

// Handle pair with token
export async function handlePairToken(msg, bot, token) {
  const chatId = msg.key.remoteJid;
  const userId = msg.key.participant || msg.from.id.toString();
  const username = msg.from?.username || msg.from?.first_name || 'User';

  try {
    // Validate token format (basic check)
    if (!token || token.length < 40 || !token.includes(':')) {
      return await bot.sendMessage(chatId,
        '❌ Invalid bot token format!\n\n' +
        'Bot tokens should look like:\n' +
        '`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`\n\n' +
        'Get your token from @BotFather',
        { parse_mode: 'Markdown' }
      );
    }

    // Try to get bot info to verify token
    let botInfo;
    try {
      const TelegramBot = (await import('node-telegram-bot-api')).default;
      const testBot = new TelegramBot(token);
      botInfo = await testBot.getMe();
      testBot.stopPolling();
    } catch (error) {
      return await bot.sendMessage(chatId,
        '❌ Invalid bot token!\n\n' +
        'The token you provided is not valid or the bot has been deleted.\n' +
        'Please check your token and try again.'
      );
    }

    // Deploy the bot
    const result = await deployBot(userId, token, botInfo.username);

    if (!result.success) {
      return await bot.sendMessage(chatId, `❌ ${result.message}`);
    }

    await bot.sendMessage(chatId,
      `✅ *BOT DEPLOYED SUCCESSFULLY!*\n\n` +
      `🤖 Bot Username: @${botInfo.username}\n` +
      `💰 Cost: 1000 coins\n` +
      `💵 New Balance: ${result.user.balance} coins\n\n` +
      `🎉 *Your bot is now active!*\n\n` +
      `⚠️ *Important:* Your bot will start automatically within 3 minutes. If it doesn't respond, please contact the admin.\n\n` +
      `📱 Search for @${botInfo.username} on Telegram to start using it.\n\n` +
      `_Thank you for using our deployment service!_`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('[PAIR TOKEN] Error:', error);
    await bot.sendMessage(chatId, '❌ Error deploying bot. Please try again later.');
  }
}
