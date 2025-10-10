import { getUser, updateBalance, recordGame, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'gamble',
  description: '🎲 Gamble your coins (50/50 chance)',
  category: 'Economy',
  aliases: ['bet', 'flip'],
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
      // If no bet amount, show number keyboard
      if (!args[0]) {
        return await bot.sendMessage(chatId,
          '🎲 *COIN FLIP*\n\n💰 Select your bet amount:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '1', callback_data: `gamble_bet_${userId}_1` },
                  { text: '2', callback_data: `gamble_bet_${userId}_2` },
                  { text: '3', callback_data: `gamble_bet_${userId}_3` }
                ],
                [
                  { text: '4', callback_data: `gamble_bet_${userId}_4` },
                  { text: '5', callback_data: `gamble_bet_${userId}_5` },
                  { text: '6', callback_data: `gamble_bet_${userId}_6` }
                ],
                [
                  { text: '7', callback_data: `gamble_bet_${userId}_7` },
                  { text: '8', callback_data: `gamble_bet_${userId}_8` },
                  { text: '9', callback_data: `gamble_bet_${userId}_9` }
                ],
                [
                  { text: '0', callback_data: `gamble_bet_${userId}_0` },
                  { text: '✅ Confirm', callback_data: `gamble_confirm_${userId}` }
                ]
              ]
            }
          }
        );
      }

      const betAmount = parseInt(args[0]) || 10;
      
      if (betAmount < 1) {
        return await bot.sendMessage(chatId, '❌ Minimum bet is 1 coin!');
      }

      const user = await getUser(userId, username, msg.from);
      
      if (user.balance < betAmount) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient balance!\n\nYou have: ${user.balance} coins\nBet amount: ${betAmount} coins`
        );
      }

      // Coin flip animation
      const flipMsg = await bot.sendMessage(chatId,
        '🎲 *COIN FLIP* 🎲\n\n' +
        `🪙 Flipping...\n` +
        `💰 Bet: ${betAmount} coins`,
        { parse_mode: 'Markdown' }
      );

      // Animate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 50/50 chance
      const won = Math.random() >= 0.5;
      const winAmount = won ? betAmount : -betAmount;

      await updateBalance(userId, winAmount, username);
      await recordGame(userId, won, Math.abs(winAmount));

      const updatedUser = await getUser(userId);
      const rankEmoji = getRankEmoji(updatedUser.rank);

      const result = won
        ? `🎲 *COIN FLIP - YOU WON!* 🎊\n\n` +
          `🟢 Result: HEADS\n` +
          `✅ Won: ${betAmount} coins\n` +
          `💰 Bet: ${betAmount} coins\n` +
          `💵 New Balance: ${updatedUser.balance} coins\n` +
          `${rankEmoji} Rank: ${updatedUser.rank}`
        : `🎲 *COIN FLIP - YOU LOST!* 😢\n\n` +
          `🔴 Result: TAILS\n` +
          `❌ Lost: ${betAmount} coins\n` +
          `💰 Bet: ${betAmount} coins\n` +
          `💵 New Balance: ${updatedUser.balance} coins\n` +
          `${rankEmoji} Rank: ${updatedUser.rank}`;

      await bot.editMessageText(result, {
        chat_id: chatId,
        message_id: flipMsg.message_id,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Gamble command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
