
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

// Store typing states
if (!global.withdrawTyping) global.withdrawTyping = {};

export default {
  name: 'withdraw',
  description: '💸 Withdraw coins from your bank',
  category: 'Economy',
  aliases: ['with'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    // Only work on main bot
    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      
      // Initialize bank
      if (!user.bank) user.bank = 0;
      if (!user.bankLimit) user.bankLimit = 10000;

      // No amount provided - show keyboard
      if (args.length === 0) {
        global.withdrawTyping[userId] = '';
        
        const keyboard = {
          inline_keyboard: [
            [
              { text: '1', callback_data: `withdraw_type_${userId}_1` },
              { text: '2', callback_data: `withdraw_type_${userId}_2` },
              { text: '3', callback_data: `withdraw_type_${userId}_3` }
            ],
            [
              { text: '4', callback_data: `withdraw_type_${userId}_4` },
              { text: '5', callback_data: `withdraw_type_${userId}_5` },
              { text: '6', callback_data: `withdraw_type_${userId}_6` }
            ],
            [
              { text: '7', callback_data: `withdraw_type_${userId}_7` },
              { text: '8', callback_data: `withdraw_type_${userId}_8` },
              { text: '9', callback_data: `withdraw_type_${userId}_9` }
            ],
            [
              { text: '0', callback_data: `withdraw_type_${userId}_0` },
              { text: '⌫ Clear', callback_data: `withdraw_clear_${userId}` }
            ],
            [
              { text: '💰 All', callback_data: `withdraw_all_${userId}` },
              { text: '✅ Confirm', callback_data: `withdraw_confirm_${userId}` }
            ]
          ]
        };

        return await bot.sendMessage(chatId,
          `💸 *WITHDRAW FROM BANK*\n\n` +
          `👤 ${user.username}\n` +
          `🏦 Bank: ${user.bank} coins\n` +
          `💵 Wallet: ${user.balance} coins\n\n` +
          `📊 Typing: 0\n` +
          `💰 Balance After: ${user.balance} coins\n\n` +
          `_Enter amount to withdraw:_`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      }

      // Process withdraw
      const amount = parseInt(args[0]);

      if (isNaN(amount) || amount <= 0) {
        return await bot.sendMessage(chatId, '❌ Invalid amount! Use a positive number.');
      }

      if (amount > user.bank) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient bank balance!\n\n🏦 You have: ${user.bank} coins`
        );
      }

      // Process withdraw
      user.balance += amount;
      user.bank -= amount;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.sendMessage(chatId,
        `✅ *WITHDRAW SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💸 Withdrawn: ${amount} coins\n` +
        `💵 Wallet: ${user.balance} coins\n` +
        `🏦 Bank: ${user.bank}/${user.bankLimit} coins\n` +
        `📊 Total: ${user.balance + user.bank} coins`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[WITHDRAW] Error:', error);
      await bot.sendMessage(chatId, '❌ Withdraw failed. Try again.');
    }
  }
};

// Handle withdraw typing callbacks
export async function handleWithdrawCallback(query, bot) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();

  try {
    const { getUser, getRankEmoji } = await import('../../lib/economy.js');
    const user = await getUser(userId);
    
    if (!user.bank) user.bank = 0;
    if (!user.bankLimit) user.bankLimit = 10000;

    if (!global.withdrawTyping) global.withdrawTyping = {};
    if (!global.withdrawTyping[userId]) global.withdrawTyping[userId] = '';

    if (data.includes('_type_')) {
      const digit = data.split('_').pop();
      global.withdrawTyping[userId] += digit;
    } else if (data.includes('_clear_')) {
      global.withdrawTyping[userId] = '';
    } else if (data.includes('_all_')) {
      global.withdrawTyping[userId] = user.bank.toString();
    } else if (data.includes('_confirm_')) {
      const amount = parseInt(global.withdrawTyping[userId] || '0');
      delete global.withdrawTyping[userId];
      
      if (amount <= 0) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Invalid amount!' });
        return;
      }
      
      if (amount > user.bank) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Not enough in bank!' });
        return;
      }

      user.balance += amount;
      user.bank -= amount;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.deleteMessage(chatId, query.message.message_id);
      await bot.sendMessage(chatId,
        `✅ *WITHDRAW SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💸 Withdrawn: ${amount} coins\n` +
        `💵 Wallet: ${user.balance} coins\n` +
        `🏦 Bank: ${user.bank}/${user.bankLimit} coins`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const currentAmount = parseInt(global.withdrawTyping[userId] || '0');
    const afterBalance = user.balance + currentAmount;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '1', callback_data: `withdraw_type_${userId}_1` },
          { text: '2', callback_data: `withdraw_type_${userId}_2` },
          { text: '3', callback_data: `withdraw_type_${userId}_3` }
        ],
        [
          { text: '4', callback_data: `withdraw_type_${userId}_4` },
          { text: '5', callback_data: `withdraw_type_${userId}_5` },
          { text: '6', callback_data: `withdraw_type_${userId}_6` }
        ],
        [
          { text: '7', callback_data: `withdraw_type_${userId}_7` },
          { text: '8', callback_data: `withdraw_type_${userId}_8` },
          { text: '9', callback_data: `withdraw_type_${userId}_9` }
        ],
        [
          { text: '0', callback_data: `withdraw_type_${userId}_0` },
          { text: '⌫ Clear', callback_data: `withdraw_clear_${userId}` }
        ],
        [
          { text: '💰 All', callback_data: `withdraw_all_${userId}` },
          { text: '✅ Confirm', callback_data: `withdraw_confirm_${userId}` }
        ]
      ]
    };

    await bot.editMessageText(
      `💸 *WITHDRAW FROM BANK*\n\n` +
      `👤 ${user.username}\n` +
      `🏦 Bank: ${user.bank} coins\n` +
      `💵 Wallet: ${user.balance} coins\n\n` +
      `📊 Typing: ${currentAmount}\n` +
      `💰 Balance After: ${afterBalance} coins\n\n` +
      `_Enter amount to withdraw:_`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('[WITHDRAW CALLBACK] Error:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Error occurred!' });
  }
}
