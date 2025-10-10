import { getUser, updateBalance, recordGame, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'slot',
  description: '🎰 Play the slot machine game',
  category: 'Economy',
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
          '🎰 *SLOT MACHINE*\n\n💰 Select your bet amount:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '1', callback_data: `slot_bet_${userId}_1` },
                  { text: '2', callback_data: `slot_bet_${userId}_2` },
                  { text: '3', callback_data: `slot_bet_${userId}_3` }
                ],
                [
                  { text: '4', callback_data: `slot_bet_${userId}_4` },
                  { text: '5', callback_data: `slot_bet_${userId}_5` },
                  { text: '6', callback_data: `slot_bet_${userId}_6` }
                ],
                [
                  { text: '7', callback_data: `slot_bet_${userId}_7` },
                  { text: '8', callback_data: `slot_bet_${userId}_8` },
                  { text: '9', callback_data: `slot_bet_${userId}_9` }
                ],
                [
                  { text: '0', callback_data: `slot_bet_${userId}_0` },
                  { text: '✅ Confirm', callback_data: `slot_confirm_${userId}` }
                ]
              ]
            }
          }
        );
      }

      const betAmount = parseInt(args[0]) || 5;
      
      if (betAmount < 1) {
        return await bot.sendMessage(chatId, '❌ Minimum bet is 1 coin!');
      }

      const user = await getUser(userId, username, msg.from);
      
      if (user.balance < betAmount) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient balance!\n\nYou have: ${user.balance} coins\nBet amount: ${betAmount} coins`
        );
      }

      // Show spinning animation with live updates
      const spinMsg = await bot.sendMessage(chatId, 
        '🎰 *SLOT MACHINE* 🎰\n\n' +
        '🎲 Starting...\n\n' +
        `💰 Bet: ${betAmount} coins`,
        { parse_mode: 'Markdown' }
      );

      // Animate spinning reels
      const spinFrames = ['⚡', '🎯', '🔥', '💫', '✨'];
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        await bot.editMessageText(
          '🎰 *SLOT MACHINE* 🎰\n\n' +
          `${spinFrames[i % spinFrames.length]} Spinning... Reel ${i + 1}/3\n\n` +
          `💰 Bet: ${betAmount} coins`,
          {
            chat_id: chatId,
            message_id: spinMsg.message_id,
            parse_mode: 'Markdown'
          }
        ).catch(() => {});
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      // Slot symbols with weighted randomness (lower chance for high value symbols)
      const getWeightedSymbol = () => {
        const random = Math.random();
        if (random < 0.3) return '🍒'; // 30%
        if (random < 0.55) return '🍋'; // 25%
        if (random < 0.75) return '🍊'; // 20%
        if (random < 0.88) return '🍇'; // 13%
        if (random < 0.95) return '7️⃣'; // 7%
        if (random < 0.98) return '⭐'; // 3%
        if (random < 0.995) return '🎰'; // 1.5%
        return '💎'; // 0.5%
      };
      
      const reel1 = getWeightedSymbol();
      const reel2 = getWeightedSymbol();
      const reel3 = getWeightedSymbol();

      let winAmount = 0;
      let message = '';
      let emoji = '';

      // Check for wins
      if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === '💎') {
          winAmount = betAmount * 10;
          message = '*MEGA JACKPOT!!!*';
          emoji = '💎💎💎';
        } else if (reel1 === '7️⃣') {
          winAmount = betAmount * 7;
          message = '*SUPER JACKPOT!!*';
          emoji = '🎉🎉🎉';
        } else if (reel1 === '⭐') {
          winAmount = betAmount * 5;
          message = '*BIG WIN!*';
          emoji = '⭐⭐⭐';
        } else {
          winAmount = betAmount * 3;
          message = '*Three of a kind!*';
          emoji = '🎊';
        }
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        winAmount = betAmount * 2;
        message = '*Two matching!*';
        emoji = '✨';
      } else {
        winAmount = -betAmount;
        message = '*Better luck next time!*';
        emoji = '😢';
      }

      await updateBalance(userId, winAmount, username);
      await recordGame(userId, winAmount > 0, Math.abs(winAmount));

      const updatedUser = await getUser(userId);
      const rankEmoji = getRankEmoji(updatedUser.rank);
      
      const result = `🎰 *SLOT MACHINE* 🎰\n\n` +
        `╔═══════════╗\n` +
        `║  ${reel1}  ${reel2}  ${reel3}  ║\n` +
        `╚═══════════╝\n\n` +
        `${emoji} ${message} ${emoji}\n\n` +
        `💰 Bet: ${betAmount} coins\n` +
        `${winAmount > 0 ? '✅ Won' : '❌ Lost'}: ${Math.abs(winAmount)} coins\n` +
        `💵 New Balance: ${updatedUser.balance} coins\n` +
        `${rankEmoji} Rank: ${updatedUser.rank}`;

      await bot.editMessageText(result, {
        chat_id: chatId,
        message_id: spinMsg.message_id,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Slot command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
