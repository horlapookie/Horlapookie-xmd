import { getUser, updateBalance, isMainBot, getRankEmoji, recordGame } from '../../lib/economy.js';

// Checkers with 9 pieces per side displayed properly
function createGameButtons(gameId, currentPlayer, redPieces, whitePieces, selectedPiece = null) {
  const buttons = [];
  
  // Show BOTH players' pieces but only current player can select theirs
  // Red pieces (top 3 rows)
  const redButtons = [];
  for (let i = 0; i < 9; i++) {
    const piece = redPieces[i];
    if (!piece.captured) {
      const isSelectable = currentPlayer === 'red';
      redButtons.push({
        text: `🔴 ${i + 1}`,
        callback_data: isSelectable ? `checkers_select_${gameId}_red_${i}` : `checkers_notyourturn_${i}`
      });
    } else {
      redButtons.push({
        text: '💀',
        callback_data: `checkers_dead_${i}`
      });
    }
  }
  
  // Add red pieces in 3 rows
  buttons.push(redButtons.slice(0, 3));
  buttons.push(redButtons.slice(3, 6));
  buttons.push(redButtons.slice(6, 9));
  
  // Add separator
  buttons.push([{ text: '━━━━━━━━━━━', callback_data: 'separator' }]);
  
  // White pieces (bottom 3 rows)
  const whiteButtons = [];
  for (let i = 0; i < 9; i++) {
    const piece = whitePieces[i];
    if (!piece.captured) {
      const isSelectable = currentPlayer === 'white';
      whiteButtons.push({
        text: `⚪ ${i + 1}`,
        callback_data: isSelectable ? `checkers_select_${gameId}_white_${i}` : `checkers_notyourturn_${i}`
      });
    } else {
      whiteButtons.push({
        text: '💀',
        callback_data: `checkers_dead_${i}`
      });
    }
  }
  
  // Add white pieces in 3 rows
  buttons.push(whiteButtons.slice(0, 3));
  buttons.push(whiteButtons.slice(3, 6));
  buttons.push(whiteButtons.slice(6, 9));
  
  // Add action buttons
  if (selectedPiece !== null) {
    buttons.push([
      { text: '⚔️ Attack', callback_data: `checkers_attack_${gameId}_${selectedPiece.color}_${selectedPiece.index}` },
      { text: '🛡️ Defend', callback_data: `checkers_defend_${gameId}_${selectedPiece.color}_${selectedPiece.index}` },
      { text: '↩️ Cancel', callback_data: `checkers_cancel_${gameId}` }
    ]);
  }
  
  buttons.push([
    { text: '❌ Forfeit', callback_data: `checkers_forfeit_${gameId}` }
  ]);
  
  return buttons;
}

function getGameStatus(redPieces, whitePieces) {
  const redAlive = redPieces.filter(p => !p.captured).length;
  const whiteAlive = whitePieces.filter(p => !p.captured).length;
  
  return {
    redAlive,
    whiteAlive,
    winner: redAlive === 0 ? 'white' : whiteAlive === 0 ? 'red' : null
  };
}

export default {
  name: 'checkers',
  description: '🎮 Challenge another user to a checkers game',
  category: 'Economy',
  aliases: ['checkerschallenge', 'playcheckers'],
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
      let targetUserId = null;
      let targetUsername = 'User';
      let targetUserInfo = null;
      
      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
        targetUserInfo = msg.reply_to_message.from;
      } else if (msg.entities && msg.entities.length > 0) {
        const mention = msg.entities.find(e => e.type === 'text_mention');
        if (mention?.user) {
          targetUserId = mention.user.id.toString();
          targetUsername = mention.user.username || mention.user.first_name || 'User';
          targetUserInfo = mention.user;
        }
      }
      
      if (!targetUserId) {
        return await bot.sendMessage(chatId, 
          '❌ Please reply to or tag the user you want to challenge!\n\n' +
          'Usage: /checkers <bet> (reply to user)\n' +
          'Aliases: /checkerschallenge, /playcheckers'
        );
      }

      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, '😂 You can\'t play against yourself!');
      }

      const betAmount = parseInt(args[0]) || 100;
      
      if (betAmount < 50) {
        return await bot.sendMessage(chatId, '❌ Minimum bet is 50 coins!');
      }

      const challenger = await getUser(userId, username, msg.from);
      const opponent = await getUser(targetUserId, targetUsername, targetUserInfo);
      
      if (challenger.balance < betAmount) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient balance!\n\nYou have: ${challenger.balance} coins\nBet amount: ${betAmount} coins`
        );
      }

      if (opponent.balance < betAmount) {
        return await bot.sendMessage(chatId, 
          `❌ @${targetUsername} doesn't have enough coins!\n\nThey need: ${betAmount} coins`
        );
      }

      const gameId = `${userId}_${targetUserId}_${Date.now()}`;
      
      const challengeMsg = await bot.sendMessage(chatId,
        `♟️ *CHECKERS BATTLE* ♟️\n\n` +
        `🔴 ${username} challenges ⚪ @${targetUsername}\n` +
        `💰 Bet: ${betAmount} coins each\n` +
        `🎯 9 pieces each - Attack & defend to win!\n\n` +
        `@${targetUsername}, do you accept?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Accept', callback_data: `checkers_accept_${gameId}_${betAmount}` },
              { text: '❌ Decline', callback_data: `checkers_decline_${gameId}` }
            ]]
          }
        }
      );

      if (!global.checkersGames) global.checkersGames = {};
      
      // Initialize game with 9 pieces per side
      const redPieces = Array(9).fill().map((_, i) => ({ 
        id: i, 
        captured: false,
        health: 100 
      }));
      
      const whitePieces = Array(9).fill().map((_, i) => ({ 
        id: i, 
        captured: false,
        health: 100 
      }));
      
      global.checkersGames[gameId] = {
        challenger: userId,
        challengerName: username,
        opponent: targetUserId,
        opponentName: targetUsername,
        betAmount,
        messageId: challengeMsg.message_id,
        chatId,
        status: 'pending',
        currentPlayer: 'red',
        redPieces,
        whitePieces,
        selectedPiece: null,
        turnCount: 0
      };

      setTimeout(async () => {
        if (global.checkersGames[gameId]?.status === 'pending') {
          delete global.checkersGames[gameId];
          try {
            await bot.editMessageText(
              `♟️ *CHECKERS BATTLE* ♟️\n\n❌ Challenge expired! @${targetUsername} didn't respond.`,
              {
                chat_id: chatId,
                message_id: challengeMsg.message_id,
                parse_mode: 'Markdown'
              }
            );
          } catch (e) {}
        }
      }, 60000);

    } catch (error) {
      console.error('[CHECKERS] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to create challenge. Try again.');
    }
  },

  // Export handler functions for callbacks
  async handleAccept(bot, query, gameId, betAmount) {
    const game = global.checkersGames?.[gameId];
    if (!game) return;

    const userId = query.from.id.toString();
    if (userId !== game.opponent) {
      return await bot.answerCallbackQuery(query.id, { text: 'This challenge is not for you!' });
    }

    await updateBalance(game.challenger, -betAmount);
    await updateBalance(game.opponent, -betAmount);

    game.status = 'active';
    
    await bot.editMessageText(
      `♟️ *CHECKERS BATTLE* ♟️\n\n` +
      `🔴 ${game.challengerName} 🆚 ⚪ ${game.opponentName}\n` +
      `💰 Pot: ${betAmount * 2} coins\n\n` +
      `🔴 Red's Turn - Select a piece to attack!\n\n` +
      `🔴: 9 pieces | ⚪: 9 pieces`,
      {
        chat_id: game.chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: createGameButtons(gameId, 'red', game.redPieces, game.whitePieces)
        }
      }
    );

    await bot.answerCallbackQuery(query.id, { text: 'Game started!' });
  },

  async handleSelect(bot, query, gameId, color, pieceIndex) {
    const game = global.checkersGames?.[gameId];
    if (!game || game.status !== 'active') return;

    const userId = query.from.id.toString();
    const isRedTurn = game.currentPlayer === 'red';
    const correctPlayer = isRedTurn ? game.challenger : game.opponent;

    if (userId !== correctPlayer) {
      return await bot.answerCallbackQuery(query.id, { text: 'Not your turn!' });
    }

    game.selectedPiece = { color, index: parseInt(pieceIndex) };

    const status = getGameStatus(game.redPieces, game.whitePieces);
    
    await bot.editMessageText(
      `♟️ *CHECKERS BATTLE* ♟️\n\n` +
      `🔴 ${game.challengerName} 🆚 ⚪ ${game.opponentName}\n` +
      `💰 Pot: ${game.betAmount * 2} coins\n\n` +
      `${isRedTurn ? '🔴' : '⚪'} Selected piece #${parseInt(pieceIndex) + 1}\n` +
      `Choose your action:\n\n` +
      `🔴: ${status.redAlive} pieces | ⚪: ${status.whiteAlive} pieces`,
      {
        chat_id: game.chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: createGameButtons(gameId, game.currentPlayer, game.redPieces, game.whitePieces, game.selectedPiece)
        }
      }
    );

    await bot.answerCallbackQuery(query.id, { text: `Piece #${parseInt(pieceIndex) + 1} selected` });
  },

  async handleAction(bot, query, gameId, action) {
    const game = global.checkersGames?.[gameId];
    if (!game || !game.selectedPiece) return;

    const userId = query.from.id.toString();
    const isRedTurn = game.currentPlayer === 'red';
    const correctPlayer = isRedTurn ? game.challenger : game.opponent;

    if (userId !== correctPlayer) {
      return await bot.answerCallbackQuery(query.id, { text: 'Not your turn!' });
    }

    const attackerPieces = isRedTurn ? game.redPieces : game.whitePieces;
    const defenderPieces = isRedTurn ? game.whitePieces : game.redPieces;
    
    const aliveDef = defenderPieces.filter(p => !p.captured);
    if (aliveDef.length === 0) return;

    const targetPiece = aliveDef[Math.floor(Math.random() * aliveDef.length)];
    
    let damage = action === 'attack' ? Math.floor(Math.random() * 30) + 20 : Math.floor(Math.random() * 15) + 10;
    targetPiece.health -= damage;

    let result = '';
    if (targetPiece.health <= 0) {
      targetPiece.captured = true;
      result = `💥 Enemy piece destroyed!`;
    } else {
      result = `⚔️ Hit for ${damage} damage! (HP: ${targetPiece.health})`;
    }

    const status = getGameStatus(game.redPieces, game.whitePieces);

    if (status.winner) {
      const winner = status.winner === 'red' ? game.challenger : game.opponent;
      const winnerName = status.winner === 'red' ? game.challengerName : game.opponentName;
      const prize = game.betAmount * 2;

      await updateBalance(winner, prize);
      await recordGame(winner, true, prize);
      await recordGame(status.winner === 'red' ? game.opponent : game.challenger, false, game.betAmount);

      await bot.editMessageText(
        `♟️ *CHECKERS BATTLE - GAME OVER!* ♟️\n\n` +
        `🏆 ${winnerName} wins!\n` +
        `💰 Prize: ${prize} coins\n\n` +
        `Final: 🔴 ${status.redAlive} vs ⚪ ${status.whiteAlive}`,
        {
          chat_id: game.chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );

      delete global.checkersGames[gameId];
      return await bot.answerCallbackQuery(query.id, { text: `${winnerName} wins!` });
    }

    game.currentPlayer = isRedTurn ? 'white' : 'red';
    game.selectedPiece = null;
    game.turnCount++;

    await bot.editMessageText(
      `♟️ *CHECKERS BATTLE* ♟️\n\n` +
      `🔴 ${game.challengerName} 🆚 ⚪ ${game.opponentName}\n` +
      `💰 Pot: ${game.betAmount * 2} coins\n\n` +
      `${result}\n` +
      `${game.currentPlayer === 'red' ? '🔴' : '⚪'}'s Turn - Select a piece!\n\n` +
      `🔴: ${status.redAlive} pieces | ⚪: ${status.whiteAlive} pieces`,
      {
        chat_id: game.chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: createGameButtons(gameId, game.currentPlayer, game.redPieces, game.whitePieces)
        }
      }
    );

    await bot.answerCallbackQuery(query.id, { text: result });
  }
};
