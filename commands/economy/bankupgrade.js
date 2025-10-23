
import { getUser, isMainBot, getRankEmoji } from '../../lib/economy.js';

const bankLevels = [
  { level: 1, limit: 10000, upgradeCost: 0 },
  { level: 2, limit: 25000, upgradeCost: 5000 },
  { level: 3, limit: 50000, upgradeCost: 10000 },
  { level: 4, limit: 100000, upgradeCost: 25000 },
  { level: 5, limit: 250000, upgradeCost: 50000 },
  { level: 6, limit: 500000, upgradeCost: 100000 },
  { level: 7, limit: 1000000, upgradeCost: 200000 }
];

export default {
  name: 'bankupgrade',
  description: '🏦 Upgrade your bank capacity',
  category: 'Economy',
  aliases: ['upgradebank', 'bankup'],
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
      const currentLevel = user.bankLevel || 1;
      const currentLevelData = bankLevels.find(l => l.level === currentLevel);
      const nextLevelData = bankLevels.find(l => l.level === currentLevel + 1);

      if (!nextLevelData) {
        return await bot.sendMessage(chatId,
          `🏆 *MAX LEVEL REACHED!*\n\n` +
          `Your bank is at maximum capacity!\n\n` +
          `💰 Current Limit: ${currentLevelData.limit.toLocaleString()} coins`,
          { parse_mode: 'Markdown' }
        );
      }

      const rankEmoji = getRankEmoji(user.rank);

      await bot.sendMessage(chatId,
        `🏦 *BANK UPGRADE*\n\n` +
        `${rankEmoji} ${user.username}\n\n` +
        `📊 Current Level: ${currentLevel}\n` +
        `💰 Current Limit: ${currentLevelData.limit.toLocaleString()} coins\n\n` +
        `📈 Next Level: ${nextLevelData.level}\n` +
        `💎 New Limit: ${nextLevelData.limit.toLocaleString()} coins\n` +
        `💵 Upgrade Cost: ${nextLevelData.upgradeCost.toLocaleString()} coins\n\n` +
        `💼 Your Balance: ${user.balance.toLocaleString()} coins\n\n` +
        `Upgrade now?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Upgrade', callback_data: `bankupgrade_confirm_${userId}` },
              { text: '❌ Cancel', callback_data: `bankupgrade_cancel_${userId}` }
            ]]
          }
        }
      );

    } catch (error) {
      console.error('[BANK UPGRADE] Error:', error);
      await bot.sendMessage(chatId, '❌ Bank upgrade error. Try again.');
    }
  }
};

export async function handleBankUpgradeCallback(query, bot) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('bankupgrade_confirm_')) {
    const userId = data.split('_')[2];

    if (query.from.id.toString() !== userId) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ This is not your upgrade!',
        show_alert: true
      });
    }

    const { getUser, updateBalance, getRankEmoji } = await import('../../lib/economy.js');
    const user = await getUser(userId, query.from.username || query.from.first_name);
    
    const currentLevel = user.bankLevel || 1;
    const nextLevelData = bankLevels.find(l => l.level === currentLevel + 1);

    if (!nextLevelData) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ Already at max level!',
        show_alert: true
      });
    }

    if (user.balance < nextLevelData.upgradeCost) {
      return await bot.answerCallbackQuery(query.id, {
        text: `❌ Need ${nextLevelData.upgradeCost} coins!`,
        show_alert: true
      });
    }

    // Upgrade bank
    await updateBalance(userId, -nextLevelData.upgradeCost, user.username);
    user.bankLevel = nextLevelData.level;
    user.bankLimit = nextLevelData.limit;
    await user.save();

    const rankEmoji = getRankEmoji(user.rank);

    await bot.editMessageText(
      `✅ *BANK UPGRADED!*\n\n` +
      `${rankEmoji} ${user.username}\n\n` +
      `📈 New Level: ${nextLevelData.level}\n` +
      `💎 New Limit: ${nextLevelData.limit.toLocaleString()} coins\n` +
      `💰 Cost: ${nextLevelData.upgradeCost.toLocaleString()} coins\n` +
      `💵 New Balance: ${user.balance.toLocaleString()} coins\n\n` +
      `🎉 Your bank can now hold more money!`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: '✅ Bank upgraded successfully!'
    });
  }
  else if (data.startsWith('bankupgrade_cancel_')) {
    await bot.editMessageText(
      `❌ Bank upgrade cancelled`,
      {
        chat_id: chatId,
        message_id: query.message.message_id
      }
    );
    await bot.answerCallbackQuery(query.id);
  }
}
