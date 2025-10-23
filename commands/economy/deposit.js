
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

// Store typing states
if (!global.depositTyping) global.depositTyping = {};

export default {
  name: 'deposit',
  description: '💰 Deposit coins into your bank',
  category: 'Economy',
  aliases: ['dep'],
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
        global.depositTyping[userId] = '';
        
        const keyboard = {
          inline_keyboard: [
            [
              { text: '1', callback_data: `deposit_type_${userId}_1` },
              { text: '2', callback_data: `deposit_type_${userId}_2` },
              { text: '3', callback_data: `deposit_type_${userId}_3` }
            ],
            [
              { text: '4', callback_data: `deposit_type_${userId}_4` },
              { text: '5', callback_data: `deposit_type_${userId}_5` },
              { text: '6', callback_data: `deposit_type_${userId}_6` }
            ],
            [
              { text: '7', callback_data: `deposit_type_${userId}_7` },
              { text: '8', callback_data: `deposit_type_${userId}_8` },
              { text: '9', callback_data: `deposit_type_${userId}_9` }
            ],
            [
              { text: '0', callback_data: `deposit_type_${userId}_0` },
              { text: '⌫ Clear', callback_data: `deposit_clear_${userId}` }
            ],
            [
              { text: '💰 All', callback_data: `deposit_all_${userId}` },
              { text: '✅ Confirm', callback_data: `deposit_confirm_${userId}` }
            ]
          ]
        };

        return await bot.sendMessage(chatId,
          `💰 *DEPOSIT TO BANK*\n\n` +
          `👤 ${user.username}\n` +
          `💵 Wallet: ${user.balance} coins\n` +
          `🏦 Bank: ${user.bank}/${user.bankLimit} coins\n\n` +
          `📊 Typing: 0\n` +
          `💰 Balance After: ${user.balance} coins\n\n` +
          `_Enter amount to deposit:_`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      }

      // Process deposit
      const amount = parseInt(args[0]);

      if (isNaN(amount) || amount <= 0) {
        return await bot.sendMessage(chatId, '❌ Invalid amount! Use a positive number.');
      }

      if (amount > user.balance) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient wallet balance!\n\n💰 You have: ${user.balance} coins`
        );
      }

      const available = user.bankLimit - user.bank;
      if (amount > available) {
        return await bot.sendMessage(chatId,
          `❌ Bank limit exceeded!\n\n📊 Available space: ${available} coins`
        );
      }

      // Process deposit
      user.balance -= amount;
      user.bank += amount;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.sendMessage(chatId,
        `✅ *DEPOSIT SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💰 Deposited: ${amount} coins\n` +
        `💵 Wallet: ${user.balance} coins\n` +
        `🏦 Bank: ${user.bank}/${user.bankLimit} coins\n` +
        `📊 Total: ${user.balance + user.bank} coins`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[DEPOSIT] Error:', error);
      await bot.sendMessage(chatId, '❌ Deposit failed. Try again.');
    }
  }
};

// Handle deposit typing callbacks
export async function handleDepositCallback(query, bot) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();

  try {
    const { getUser, getRankEmoji } = await import('../../lib/economy.js');
    const user = await getUser(userId);
    
    if (!user.bank) user.bank = 0;
    if (!user.bankLimit) user.bankLimit = 10000;

    if (!global.depositTyping) global.depositTyping = {};
    if (!global.depositTyping[userId]) global.depositTyping[userId] = '';

    if (data.includes('_type_')) {
      const digit = data.split('_').pop();
      global.depositTyping[userId] += digit;
    } else if (data.includes('_clear_')) {
      global.depositTyping[userId] = '';
    } else if (data.includes('_all_')) {
      global.depositTyping[userId] = user.balance.toString();
    } else if (data.includes('_confirm_')) {
      const amount = parseInt(global.depositTyping[userId] || '0');
      delete global.depositTyping[userId];
      
      if (amount <= 0) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Invalid amount!' });
        return;
      }
      
      if (amount > user.balance) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Not enough wallet balance!' });
        return;
      }

      const available = user.bankLimit - user.bank;
      if (amount > available) {
        await bot.answerCallbackQuery(query.id, { text: `❌ Only ${available} space left!` });
        return;
      }

      user.balance -= amount;
      user.bank += amount;
      user.updatedAt = new Date();
      await user.save();

      const rankEmoji = getRankEmoji(user.rank);

      await bot.deleteMessage(chatId, query.message.message_id);
      await bot.sendMessage(chatId,
        `✅ *DEPOSIT SUCCESSFUL!*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `💰 Deposited: ${amount} coins\n` +
        `💵 Wallet: ${user.balance} coins\n` +
        `🏦 Bank: ${user.bank}/${user.bankLimit} coins`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const currentAmount = parseInt(global.depositTyping[userId] || '0');
    const afterBalance = user.balance - currentAmount;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '1', callback_data: `deposit_type_${userId}_1` },
          { text: '2', callback_data: `deposit_type_${userId}_2` },
          { text: '3', callback_data: `deposit_type_${userId}_3` }
        ],
        [
          { text: '4', callback_data: `deposit_type_${userId}_4` },
          { text: '5', callback_data: `deposit_type_${userId}_5` },
          { text: '6', callback_data: `deposit_type_${userId}_6` }
        ],
        [
          { text: '7', callback_data: `deposit_type_${userId}_7` },
          { text: '8', callback_data: `deposit_type_${userId}_8` },
          { text: '9', callback_data: `deposit_type_${userId}_9` }
        ],
        [
          { text: '0', callback_data: `deposit_type_${userId}_0` },
          { text: '⌫ Clear', callback_data: `deposit_clear_${userId}` }
        ],
        [
          { text: '💰 All', callback_data: `deposit_all_${userId}` },
          { text: '✅ Confirm', callback_data: `deposit_confirm_${userId}` }
        ]
      ]
    };

    await bot.editMessageText(
      `💰 *DEPOSIT TO BANK*\n\n` +
      `👤 ${user.username}\n` +
      `💵 Wallet: ${user.balance} coins\n` +
      `🏦 Bank: ${user.bank}/${user.bankLimit} coins\n\n` +
      `📊 Typing: ${currentAmount}\n` +
      `💰 Balance After: ${afterBalance} coins\n\n` +
      `_Enter amount to deposit:_`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('[DEPOSIT CALLBACK] Error:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Error occurred!' });
  }
}
