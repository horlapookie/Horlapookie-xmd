import { getUser, updateBalance, recordGame, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'dice',
  description: '🎲 Live dice betting game - Guess the number!',
  category: 'Economy',
  aliases: ['dicegame', 'dicebet'],
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
      const betAmount = parseInt(args[0]) || 0;
      
      if (betAmount < 10) {
        return await bot.sendMessage(chatId, 
          '🎲 *DICE GAME*\n\n' +
          '❌ Minimum bet is 10 coins!\n\n' +
          'Usage: /dice <bet_amount>\n' +
          'Example: /dice 100'
        );
      }

      const user = await getUser(userId, username, msg.from);
      
      if (user.balance < betAmount) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient balance!\n\nYou have: ${user.balance} coins\nBet amount: ${betAmount} coins`
        );
      }

      await updateBalance(userId, -betAmount, username);

      const diceMsg = await bot.sendMessage(chatId,
        `🎲 *DICE GAME* 🎲\n\n` +
        `💰 Bet: ${betAmount} coins\n` +
        `🎯 Pick your lucky number (1-6):`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `dice_pick_${userId}_${betAmount}_1` },
                { text: '2️⃣', callback_data: `dice_pick_${userId}_${betAmount}_2` },
                { text: '3️⃣', callback_data: `dice_pick_${userId}_${betAmount}_3` }
              ],
              [
                { text: '4️⃣', callback_data: `dice_pick_${userId}_${betAmount}_4` },
                { text: '5️⃣', callback_data: `dice_pick_${userId}_${betAmount}_5` },
                { text: '6️⃣', callback_data: `dice_pick_${userId}_${betAmount}_6` }
              ]
            ]
          }
        }
      );

      if (!global.diceGames) global.diceGames = {};
      global.diceGames[userId] = {
        active: true,
        betAmount,
        messageId: diceMsg.message_id
      };

      setTimeout(async () => {
        if (global.diceGames[userId]?.active) {
          delete global.diceGames[userId];
          try {
            await bot.editMessageText(
              `🎲 *DICE GAME* 🎲\n\n❌ Time expired! You didn't pick a number.\n💸 Lost: ${betAmount} coins`,
              {
                chat_id: chatId,
                message_id: diceMsg.message_id,
                parse_mode: 'Markdown'
              }
            );
          } catch (e) {}
        }
      }, 30000);

    } catch (error) {
      console.error('[DICE] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
