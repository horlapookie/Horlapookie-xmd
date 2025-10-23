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

      if (betAmount > 1000000000) {
        return await bot.sendMessage(chatId, '❌ Maximum bet is 1 billion coins!');
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

      // Animate spinning reels with fruit symbols
      const allSymbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣', '⭐', '🎰', '💎'];
      
      // Spin animation - show random symbols moving
      for (let spin = 0; spin < 8; spin++) {
        const reel1 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel2 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel3 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel4 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel5 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel6 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel7 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel8 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        const reel9 = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        
        await new Promise(resolve => setTimeout(resolve, 200));
        await bot.editMessageText(
          '🎰 *SLOT MACHINE* 🎰\n\n' +
          `╔═══════════╗\n` +
          `║ ${reel1}  ${reel2}  ${reel3} ║\n` +
          `║ ${reel4}  ${reel5}  ${reel6} ║\n` +
          `║ ${reel7}  ${reel8}  ${reel9} ║\n` +
          `╚═══════════╝\n\n` +
          `🎲 Spinning...\n` +
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
        if (random < 0.25) return '🍒'; // 25%
        if (random < 0.45) return '🍋'; // 20%
        if (random < 0.62) return '🍊'; // 17%
        if (random < 0.77) return '🍇'; // 15%
        if (random < 0.88) return '🔔'; // 11%
        if (random < 0.94) return '7️⃣'; // 6%
        if (random < 0.97) return '⭐'; // 3%
        if (random < 0.99) return '🎰'; // 2%
        return '💎'; // 1%
      };
      
      // Generate 9 reels (3x3 grid)
      const reels = [];
      for (let i = 0; i < 9; i++) {
        reels.push(getWeightedSymbol());
      }

      let winAmount = 0;
      let message = '';
      let emoji = '';
      let winType = '';

      // Check for wins - rows, columns, diagonals
      const checkLine = (indices) => {
        const symbols = indices.map(i => reels[i]);
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
          return symbols[0];
        }
        return null;
      };

      // All possible winning lines in 3x3 grid
      const winningLines = [
        [0, 1, 2], // Top row
        [3, 4, 5], // Middle row
        [6, 7, 8], // Bottom row
        [0, 3, 6], // Left column
        [1, 4, 7], // Middle column
        [2, 5, 8], // Right column
        [0, 4, 8], // Diagonal \
        [2, 4, 6]  // Diagonal /
      ];

      let winningSymbol = null;
      let winningLineIndex = -1;

      for (let i = 0; i < winningLines.length; i++) {
        const symbol = checkLine(winningLines[i]);
        if (symbol) {
          winningSymbol = symbol;
          winningLineIndex = i;
          break;
        }
      }

      if (winningSymbol) {
        if (winningSymbol === '💎') {
          winAmount = betAmount * 50;
          message = '*💎 MEGA JACKPOT!!! 💎*';
          emoji = '🌟🌟🌟';
        } else if (winningSymbol === '🎰') {
          winAmount = betAmount * 25;
          message = '*SUPER JACKPOT!!*';
          emoji = '🎰🎰🎰';
        } else if (winningSymbol === '⭐') {
          winAmount = betAmount * 15;
          message = '*STAR WIN!*';
          emoji = '⭐⭐⭐';
        } else if (winningSymbol === '7️⃣') {
          winAmount = betAmount * 10;
          message = '*LUCKY SEVENS!*';
          emoji = '🎉🎉🎉';
        } else if (winningSymbol === '🔔') {
          winAmount = betAmount * 7;
          message = '*BELL BONUS!*';
          emoji = '🔔🔔🔔';
        } else {
          winAmount = betAmount * 5;
          message = '*THREE IN A ROW!*';
          emoji = '🎊🎊🎊';
        }

        const lineNames = ['Top Row', 'Middle Row', 'Bottom Row', 'Left Col', 'Middle Col', 'Right Col', 'Diagonal \\', 'Diagonal /'];
        winType = `\n🎯 ${lineNames[winningLineIndex]} WIN!`;
      } else {
        winAmount = -betAmount;
        message = '*No matches, try again!*';
        emoji = '😢';
      }

      await updateBalance(userId, winAmount, username);
      await recordGame(userId, winAmount > 0, Math.abs(winAmount));

      const updatedUser = await getUser(userId);
      const rankEmoji = getRankEmoji(updatedUser.rank);
      
      const result = `🎰 *SLOT MACHINE* 🎰\n\n` +
        `╔═══════════╗\n` +
        `║ ${reels[0]}  ${reels[1]}  ${reels[2]} ║\n` +
        `║ ${reels[3]}  ${reels[4]}  ${reels[5]} ║\n` +
        `║ ${reels[6]}  ${reels[7]}  ${reels[8]} ║\n` +
        `╚═══════════╝\n\n` +
        `${emoji} ${message} ${emoji}${winType}\n\n` +
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
