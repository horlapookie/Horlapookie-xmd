
export default {
  name: 'loanform',
  description: '📝 Handle loan application forms',
  category: 'Economy',
  async execute(msg, { bot }) {
    // This is handled via callback queries in index.js
    return;
  }
};

export async function handleLoanFormCallback(query, bot) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('loan_apply_')) {
    const userId = data.split('_')[2];
    
    if (query.from.id.toString() !== userId) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ This is not your loan application!',
        show_alert: true
      });
    }

    if (!global.loanForms) global.loanForms = {};
    
    global.loanForms[userId] = {
      step: 'name',
      messageId: query.message.message_id,
      chatId: chatId
    };

    try {
      await bot.editMessageText(
        `📝 *LOAN APPLICATION FORM*\n\n` +
        `Step 1/3: What is your full name?\n\n` +
        `_Please type your answer in the chat_`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      console.log('[LOAN FORM] Edit error:', error.message);
    }

    await bot.answerCallbackQuery(query.id);
  }
  else if (data.startsWith('loan_confirm_')) {
    const userId = data.split('_')[2];
    
    if (query.from.id.toString() !== userId) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ This is not your application!',
        show_alert: true
      });
    }

    const { getUser, getRankEmoji } = await import('../../lib/economy.js');
    const form = global.loanForms?.[userId];
    
    if (!form) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ Form expired!',
        show_alert: true
      });
    }

    const user = await getUser(userId, query.from.username || query.from.first_name);
    
    // Check if user has active loan
    if (user.loan > 0) {
      delete global.loanForms[userId];
      await bot.editMessageText(
        `❌ *LOAN DENIED*\n\n` +
        `You already have an active loan!\n` +
        `Please repay your existing loan first using /repay`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ Active loan exists!'
      });
    }

    const amount = form.amount;
    const interest = Math.floor(amount * 0.1);
    const totalDue = amount + interest;
    
    // Set loan due date (48 hours)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 48);

    // Give loan immediately
    user.balance += amount;
    user.loan = totalDue;
    user.loanDue = dueDate;
    user.loanApplication = {
      name: form.name,
      reason: form.reason,
      amount: form.amount,
      submittedAt: new Date(),
      approved: true,
      approvedAt: new Date()
    };
    user.updatedAt = new Date();
    await user.save();

    delete global.loanForms[userId];

    const rankEmoji = getRankEmoji(user.rank);

    await bot.editMessageText(
      `✅ *LOAN APPROVED & DISBURSED!*\n\n` +
      `${rankEmoji} ${user.username}\n\n` +
      `👤 Name: ${form.name}\n` +
      `💰 Loan Amount: ${amount} coins\n` +
      `📈 Interest (10%): ${interest} coins\n` +
      `💳 Total to Repay: ${totalDue} coins\n` +
      `⏰ Due: 48 hours\n` +
      `💵 New Balance: ${user.balance} coins\n\n` +
      `📝 Reason: ${form.reason}\n\n` +
      `_Use /repay to pay back your loan_`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: '✅ Loan disbursed successfully!'
    });
  }
  else if (data.startsWith('loan_cancel_')) {
    const userId = data.split('_')[2];
    
    if (query.from.id.toString() !== userId) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ This is not your application!',
        show_alert: true
      });
    }

    delete global.loanForms?.[userId];

    await bot.editMessageText(
      `❌ *Loan application cancelled*\n\n` +
      `You can start a new application anytime using /loan`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id);
  }
}

export async function handleLoanFormMessage(msg, bot, body, userId) {
  if (!global.loanForms?.[userId]) return false;

  const chatId = msg.key.remoteJid;
  const form = global.loanForms[userId];

  if (form.step === 'name') {
    form.name = body.trim();
    form.step = 'amount';

    try {
      await bot.editMessageText(
        `📝 *LOAN APPLICATION FORM*\n\n` +
        `Step 2/3: How much do you want to borrow?\n` +
        `(Minimum: 100, Maximum: 5000 coins)\n\n` +
        `_Please type the amount_`,
        {
          chat_id: form.chatId || chatId,
          message_id: form.messageId,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      console.log('[LOAN FORM] Edit error:', error.message);
    }
    return true;
  }
  else if (form.step === 'amount') {
    const amount = parseInt(body);
    
    if (!amount || amount < 100 || amount > 5000) {
      await bot.sendMessage(form.chatId || chatId, '❌ Invalid amount! Must be between 100-5000 coins.');
      return true;
    }

    form.amount = amount;
    form.step = 'reason';

    try {
      await bot.editMessageText(
        `📝 *LOAN APPLICATION FORM*\n\n` +
        `Step 3/3: What is the reason for this loan?\n\n` +
        `_Please explain briefly_`,
        {
          chat_id: form.chatId || chatId,
          message_id: form.messageId,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      console.log('[LOAN FORM] Edit error:', error.message);
    }
    return true;
  }
  else if (form.step === 'reason') {
    form.reason = body.trim();

    try {
      await bot.editMessageText(
        `📝 *LOAN APPLICATION SUMMARY*\n\n` +
        `👤 Name: ${form.name}\n` +
        `💰 Amount: ${form.amount} coins\n` +
        `📝 Reason: ${form.reason}\n\n` +
        `📊 Interest: 10%\n` +
        `💳 Total to repay: ${Math.floor(form.amount * 1.1)} coins\n` +
        `⏰ Deadline: 48 hours\n\n` +
        `Confirm your application?`,
        {
          chat_id: form.chatId || chatId,
          message_id: form.messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirm', callback_data: `loan_confirm_${userId}` },
              { text: '❌ Cancel', callback_data: `loan_cancel_${userId}` }
            ]]
          }
        }
      );
    } catch (error) {
      console.log('[LOAN FORM] Edit error:', error.message);
    }
    return true;
  }

  return false;
}
