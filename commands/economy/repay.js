
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'repay',
  description: '💸 Repay your loan',
  category: 'Economy',
  aliases: ['payloan', 'payback'],
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
      
      if (!user.loan || user.loan === 0) {
        return await bot.sendMessage(chatId, '❌ You don\'t have any active loans!');
      }

      if (user.balance < user.loan) {
        return await bot.sendMessage(chatId,
          `❌ Insufficient balance to repay loan!\n\n` +
          `💳 Loan Due: ${user.loan} coins\n` +
          `💰 Your Balance: ${user.balance} coins\n` +
          `📉 Need: ${user.loan - user.balance} more coins`,
          { parse_mode: 'Markdown' }
        );
      }

      // Repay loan
      const loanAmount = user.loan;
      user.balance -= loanAmount;
      user.loan = 0;
      user.loanDue = null;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.sendMessage(chatId,
        `✅ *LOAN REPAID!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💸 Repaid: ${loanAmount} coins\n` +
        `💵 New Balance: ${user.balance} coins\n\n` +
        `_You can borrow again anytime!_`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[REPAY] Error:', error);
      await bot.sendMessage(chatId, '❌ Repayment failed. Try again.');
    }
  }
};
