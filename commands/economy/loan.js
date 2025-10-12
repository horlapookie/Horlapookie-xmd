
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'loan',
  description: '💳 Borrow coins (must repay with interest)',
  category: 'Economy',
  aliases: ['borrow'],
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
      
      if (!user.loan) user.loan = 0;
      if (!user.loanDue) user.loanDue = null;

      // Check if user has active loan
      if (user.loan > 0) {
        const dueDate = new Date(user.loanDue);
        const now = new Date();
        const hoursLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60));
        
        return await bot.sendMessage(chatId,
          `❌ *You already have an active loan!*\n\n` +
          `💳 Loan Amount: ${user.loan} coins\n` +
          `⏰ Due in: ${hoursLeft > 0 ? hoursLeft + ' hours' : 'OVERDUE!'}\n\n` +
          `Use /repay to pay it back`,
          { parse_mode: 'Markdown' }
        );
      }

      if (args.length === 0) {
        const maxLoanByRank = {
          'Newbie': 5000,
          'Bronze': 10000,
          'Silver': 25000,
          'Gold': 50000,
          'Platinum': 100000,
          'Diamond': 250000,
          'Legend': 500000
        };
        const maxLoan = maxLoanByRank[user.rank] || 5000;
        
        return await bot.sendMessage(chatId,
          `💳 *LOAN SYSTEM*\n\n` +
          `📊 Borrow coins with 10% interest\n` +
          `⏰ Must repay within 48 hours\n` +
          `📈 Max loan (${user.rank}): ${maxLoan} coins\n` +
          `⚠️ Work every 30 min to earn and repay!\n\n` +
          `📝 To apply for a loan, click the button below:`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '📝 Apply for Loan', callback_data: `loan_apply_${userId}` }
              ]]
            }
          }
        );
      }

      const amount = parseInt(args[0]);
      
      if (!amount || amount <= 0) {
        return await bot.sendMessage(chatId, '❌ Invalid amount!');
      }

      // Calculate max loan based on rank
      const maxLoanByRank = {
        'Newbie': 5000,
        'Bronze': 10000,
        'Silver': 25000,
        'Gold': 50000,
        'Platinum': 100000,
        'Diamond': 250000,
        'Legend': 500000
      };
      
      const maxLoan = maxLoanByRank[user.rank] || 5000;
      
      if (amount > maxLoan) {
        return await bot.sendMessage(chatId, `❌ Maximum loan for ${user.rank} rank is ${maxLoan} coins!`);
      }

      // Check if user has submitted loan application
      if (!user.loanApplication) {
        return await bot.sendMessage(chatId,
          `❌ *Loan Application Required!*\n\n` +
          `Before taking a loan, you must submit an application form.\n\n` +
          `Use: /loan (without amount) to start your application`,
          { parse_mode: 'Markdown' }
        );
      }

      // Calculate interest (10%)
      const interest = Math.floor(amount * 0.1);
      const totalDue = amount + interest;
      
      // Set loan due date (48 hours)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 48);

      // Give loan
      user.balance += amount;
      user.loan = totalDue;
      user.loanDue = dueDate;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.sendMessage(chatId,
        `✅ *LOAN APPROVED!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💰 Borrowed: ${amount} coins\n` +
        `📈 Interest (10%): ${interest} coins\n` +
        `💳 Total to Repay: ${totalDue} coins\n` +
        `⏰ Due: 48 hours\n` +
        `💵 New Balance: ${user.balance} coins\n\n` +
        `_Use /repay to pay back your loan_`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[LOAN] Error:', error);
      await bot.sendMessage(chatId, '❌ Loan failed. Try again.');
    }
  }
};
