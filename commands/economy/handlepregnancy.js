
import { getUser, updateBalance, isMainBot } from '../../lib/economy.js';

export default {
  name: 'handlepregnancy',
  description: '👶 Handle pregnancy decisions',
  category: 'Economy',
  aliases: ['pregnancy', 'abort'],
  async execute(msg, { bot, args }) {
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

      if (!user.pregnancies || user.pregnancies.length === 0) {
        return await bot.sendMessage(chatId, '❌ No pending pregnancies.');
      }

      const pending = user.pregnancies.filter(p => !p.decision);

      if (pending.length === 0) {
        return await bot.sendMessage(chatId, '❌ All pregnancies already handled.');
      }

      if (!args[0]) {
        let msg = `👶 *PREGNANCY DECISIONS*\n\n`;
        pending.forEach((p, i) => {
          const daysLeft = Math.ceil((new Date(p.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
          msg += `${i + 1}. ${p.workerName}\n` +
            `📅 Due: ${daysLeft} days\n` +
            `💰 Abortion: 50M\n` +
            `👶 Keep: 10M/month for 18 years\n\n`;
        });
        msg += `*USAGE*\n` +
          `/handlepregnancy abort <number>\n` +
          `/handlepregnancy keep <number>`;
        return await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();
      const index = parseInt(args[1]) - 1;

      if (index < 0 || index >= pending.length) {
        return await bot.sendMessage(chatId, '❌ Invalid pregnancy number!');
      }

      const pregnancy = pending[index];

      if (action === 'abort') {
        if (user.balance < 50000000) {
          return await bot.sendMessage(chatId,
            `❌ Insufficient funds!\n\n` +
            `💰 Abortion cost: 50M\n` +
            `💵 Your balance: ${user.balance.toLocaleString()}`
          );
        }

        await updateBalance(userId, -50000000, username);
        pregnancy.decision = 'aborted';
        pregnancy.abortionDate = new Date();
        
        await user.save();

        return await bot.sendMessage(chatId,
          `💊 *ABORTION COMPLETED*\n\n` +
          `💰 Cost: 50M coins\n` +
          `💵 Balance: ${(await getUser(userId)).balance.toLocaleString()} coins`,
          { parse_mode: 'Markdown' }
        );
      } else if (action === 'keep') {
        pregnancy.decision = 'keep';
        pregnancy.childSupportStart = new Date(pregnancy.dueDate);
        pregnancy.childSupportEnd = new Date(new Date(pregnancy.dueDate).getTime() + 18 * 365 * 24 * 60 * 60 * 1000);
        
        await user.save();

        return await bot.sendMessage(chatId,
          `👶 *KEEPING THE BABY*\n\n` +
          `📅 Due: ${new Date(pregnancy.dueDate).toLocaleDateString()}\n` +
          `💰 Child support: 10M/month\n` +
          `⏰ Duration: 18 years\n\n` +
          `_Payments will auto-deduct monthly_`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('[PREGNANCY] Error:', error);
      await bot.sendMessage(chatId, '❌ Pregnancy handler error.');
    }
  }
};
