
import { getUser, updateBalance, recordGame, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'aviator',
  description: '✈️ Live aviator betting game',
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
          '✈️ *AVIATOR GAME*\n\n💰 Select your bet amount:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '1', callback_data: `aviator_bet_${userId}_1` },
                  { text: '2', callback_data: `aviator_bet_${userId}_2` },
                  { text: '3', callback_data: `aviator_bet_${userId}_3` }
                ],
                [
                  { text: '4', callback_data: `aviator_bet_${userId}_4` },
                  { text: '5', callback_data: `aviator_bet_${userId}_5` },
                  { text: '6', callback_data: `aviator_bet_${userId}_6` }
                ],
                [
                  { text: '7', callback_data: `aviator_bet_${userId}_7` },
                  { text: '8', callback_data: `aviator_bet_${userId}_8` },
                  { text: '9', callback_data: `aviator_bet_${userId}_9` }
                ],
                [
                  { text: '0', callback_data: `aviator_bet_${userId}_0` },
                  { text: '✅ Confirm', callback_data: `aviator_confirm_${userId}` }
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

      // Deduct bet immediately
      await updateBalance(userId, -betAmount, username);

      // Calculate crash point with chances for higher multipliers
      // 60% chance: 1.0x - 2.5x
      // 20% chance: 2.5x - 5.0x
      // 10% chance: 5.0x - 8.0x
      // 7% chance: 8.0x - 12.0x
      // 3% chance: 12.0x - 15.0x (super rare)
      let crashPoint;
      const random = Math.random();
      if (random < 0.6) {
        crashPoint = 1 + Math.random() * 1.5; // 1.0x - 2.5x
      } else if (random < 0.8) {
        crashPoint = 2.5 + Math.random() * 2.5; // 2.5x - 5.0x
      } else if (random < 0.9) {
        crashPoint = 5 + Math.random() * 3; // 5.0x - 8.0x
      } else if (random < 0.97) {
        crashPoint = 8 + Math.random() * 4; // 8.0x - 12.0x
      } else {
        crashPoint = 12 + Math.random() * 3; // 12.0x - 15.0x (super rare)
      }

      // Send initial message
      const aviatorMsg = await bot.sendMessage(chatId,
        `✈️ *AVIATOR GAME* ✈️\n\n` +
        `🎮 Taking off...\n` +
        `💰 Bet: ${betAmount} coins\n` +
        `📊 Multiplier: 1.00x\n\n` +
        `🚀 Watch it fly!`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '💰 Cash Out (1.00x)', callback_data: `cashout_${userId}_${betAmount}_1.00` }
            ]]
          }
        }
      );

      // Live multiplier animation (optimized)
      let multiplier = 1.0;
      const updateInterval = 300; // More reliable interval (300ms)
      let cashedOut = false;
      let cashoutMultiplier = null;
      let lastEditTime = 0;

      // Store active game
      if (!global.aviatorGames) global.aviatorGames = {};
      global.aviatorGames[userId] = {
        active: true,
        betAmount,
        multiplier: 1.0,
        crashed: false,
        chatId: chatId,
        messageId: aviatorMsg.message_id
      };

      // Listen for cashout - use once() to avoid memory leaks
      const cashoutHandler = async (query) => {
        if (query.data.startsWith(`cashout_${userId}_`)) {
          if (!global.aviatorGames[userId]?.active) {
            try {
              await bot.answerCallbackQuery(query.id, { 
                text: '❌ Game already ended!' 
              });
            } catch (e) {}
            return;
          }
          
          const currentMultiplier = global.aviatorGames[userId].multiplier;
          cashedOut = true;
          cashoutMultiplier = currentMultiplier;
          global.aviatorGames[userId].active = false;
          
          try {
            await bot.answerCallbackQuery(query.id, { 
              text: `✅ Cashed out at ${currentMultiplier.toFixed(2)}x!` 
            });
            
            // Immediately hide button after cashout
            await bot.editMessageReplyMarkup(
              { inline_keyboard: [] },
              {
                chat_id: chatId,
                message_id: aviatorMsg.message_id
              }
            );
          } catch (e) {
            console.log('[AVIATOR] Callback answer error:', e.message);
          }
          
          // Remove listener immediately after cashout
          bot.removeListener('callback_query', cashoutHandler);
        }
      };

      bot.on('callback_query', cashoutHandler);

      // Animate the aviator (slower and more stable)
      while (multiplier < crashPoint && multiplier < 15 && !cashedOut) {
        multiplier += 0.05; // Smoother increment
        global.aviatorGames[userId].multiplier = multiplier;
        
        // Only update message every 500ms to avoid rate limits and reduce speed
        const now = Date.now();
        if (now - lastEditTime >= 500) {
          try {
            await bot.editMessageText(
              `✈️ *AVIATOR GAME* ✈️\n\n` +
              `🚀 Flying: ${multiplier.toFixed(2)}x\n` +
              `💰 Bet: ${betAmount} coins\n` +
              `💵 Potential Win: ${Math.floor(betAmount * multiplier)} coins\n\n` +
              `${multiplier < 2 ? '🟢' : multiplier < 4 ? '🟡' : multiplier < 7 ? '🟠' : '🔴'} Keep watching!`,
              {
                chat_id: chatId,
                message_id: aviatorMsg.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[
                    { text: `💰 Cash Out (${multiplier.toFixed(2)}x)`, callback_data: `cashout_${userId}_${betAmount}_${multiplier.toFixed(2)}` }
                  ]]
                }
              }
            );
            lastEditTime = now;
          } catch (e) {
            // Edit too fast or rate limited, skip this update
            console.log('[AVIATOR] Edit skipped:', e.message);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Remove callback listener (if not already removed)
      try {
        bot.removeListener('callback_query', cashoutHandler);
      } catch (e) {
        // Already removed
      }

      // Calculate result
      let result;
      let winAmount = 0;

      if (cashedOut && cashoutMultiplier) {
        // Player cashed out successfully
        winAmount = Math.floor(betAmount * cashoutMultiplier);
        await updateBalance(userId, winAmount, username);
        await recordGame(userId, true, winAmount);

        const updatedUser = await getUser(userId);
        const rankEmoji = getRankEmoji(updatedUser.rank);

        result = `✈️ *AVIATOR - CASHED OUT!* ✈️\n\n` +
          `💰 Cashed out at: ${cashoutMultiplier.toFixed(2)}x\n` +
          `💸 Bet: ${betAmount} coins\n` +
          `✅ Won: ${winAmount} coins\n` +
          `💵 New Balance: ${updatedUser.balance} coins\n` +
          `${rankEmoji} Rank: ${updatedUser.rank}\n\n` +
          `🎉 Great timing!`;
      } else {
        // Crashed before cashout
        const finalMultiplier = multiplier.toFixed(2);
        await recordGame(userId, false, betAmount);

        const updatedUser = await getUser(userId);
        const rankEmoji = getRankEmoji(updatedUser.rank);

        result = `💥 *AVIATOR - CRASHED!* 💥\n\n` +
          `😢 Crashed at: ${finalMultiplier}x\n` +
          `💰 Bet: ${betAmount} coins\n` +
          `❌ Lost: ${betAmount} coins\n` +
          `💵 New Balance: ${updatedUser.balance} coins\n` +
          `${rankEmoji} Rank: ${updatedUser.rank}\n\n` +
          `You didn't cash out in time!`;
      }

      // Clean up
      delete global.aviatorGames[userId];

      await bot.editMessageText(result, {
        chat_id: chatId,
        message_id: aviatorMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Aviator command error:', error);
      await bot.sendMessage(chatId, 
        '❌ Economy system unavailable. Please contact admin to set up MONGODB_URL.'
      );
    }
  }
};
