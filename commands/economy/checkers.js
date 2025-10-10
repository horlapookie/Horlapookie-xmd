import { getUser, updateBalance, isMainBot, getRankEmoji, recordGame } from '../../lib/economy.js';

const BOARD_SIZE = 8;
const PIECE_RED = '🔴';
const PIECE_BLACK = '⚫';
const KING_RED = '👑';
const KING_BLACK = '🎩';
const EMPTY = '⬜';
const DARK = '⬛';

function createInitialBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDark = (row + col) % 2 === 1;
      
      if (!isDark) {
        board[row][col] = EMPTY;
      } else if (row < 3) {
        board[row][col] = PIECE_BLACK;
      } else if (row > 4) {
        board[row][col] = PIECE_RED;
      } else {
        board[row][col] = DARK;
      }
    }
  }
  
  return board;
}

function makeBotMove(board, player) {
  const moves = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      const isPlayerPiece = (player === 'red' && (piece === PIECE_RED || piece === KING_RED)) ||
                            (player === 'black' && (piece === PIECE_BLACK || piece === KING_BLACK));
      
      if (isPlayerPiece) {
        const availableMoves = getAvailableMoves(board, row, col, player);
        for (const move of availableMoves) {
          moves.push({ fromRow: row, fromCol: col, toRow: move.row, toCol: move.col, isCapture: move.isCapture });
        }
      }
    }
  }
  
  if (moves.length === 0) return null;
  
  const captureMoves = moves.filter(m => m.isCapture);
  const selectedMove = captureMoves.length > 0 ? 
    captureMoves[Math.floor(Math.random() * captureMoves.length)] :
    moves[Math.floor(Math.random() * moves.length)];
  
  return selectedMove;
}

function boardToString(board, showCoords = true) {
  let str = '';
  
  if (showCoords) str += '   0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n';
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (showCoords) {
      const nums = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
      str += nums[row] + ' ';
    }
    for (let col = 0; col < BOARD_SIZE; col++) {
      str += board[row][col];
    }
    str += '\n';
  }
  
  return str;
}

function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (toRow < 0 || toRow >= BOARD_SIZE || toCol < 0 || toCol >= BOARD_SIZE) return false;
  if (board[toRow][toCol] !== DARK) return false;
  
  const piece = board[fromRow][fromCol];
  if (!piece || piece === DARK || piece === EMPTY) return false;
  
  const isPlayerPiece = (player === 'red' && (piece === PIECE_RED || piece === KING_RED)) ||
                        (player === 'black' && (piece === PIECE_BLACK || piece === KING_BLACK));
  if (!isPlayerPiece) return false;
  
  const rowDiff = toRow - fromRow;
  const colDiff = Math.abs(toCol - fromCol);
  
  const isKing = piece === KING_RED || piece === KING_BLACK;
  
  if (colDiff === 1 && Math.abs(rowDiff) === 1) {
    if (!isKing && ((player === 'red' && rowDiff > 0) || (player === 'black' && rowDiff < 0))) {
      return false;
    }
    return true;
  }
  
  return false;
}

function canCapture(board, fromRow, fromCol, player) {
  const piece = board[fromRow][fromCol];
  const isKing = piece === KING_RED || piece === KING_BLACK;
  
  const directions = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : 
                     player === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  
  for (const [dr, dc] of directions) {
    const midRow = fromRow + dr;
    const midCol = fromCol + dc;
    const endRow = fromRow + dr * 2;
    const endCol = fromCol + dc * 2;
    
    if (endRow < 0 || endRow >= BOARD_SIZE || endCol < 0 || endCol >= BOARD_SIZE) continue;
    
    const midPiece = board[midRow][midCol];
    const endPiece = board[endRow][endCol];
    
    const isOpponent = (player === 'red' && (midPiece === PIECE_BLACK || midPiece === KING_BLACK)) ||
                       (player === 'black' && (midPiece === PIECE_RED || midPiece === KING_RED));
    
    if (isOpponent && endPiece === DARK) {
      return true;
    }
  }
  
  return false;
}

function executeCapture(board, fromRow, fromCol, toRow, toCol) {
  const midRow = (fromRow + toRow) / 2;
  const midCol = (fromCol + toCol) / 2;
  
  board[midRow][midCol] = DARK;
  
  const piece = board[fromRow][fromCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = DARK;
  
  const player = (piece === PIECE_RED || piece === KING_RED) ? 'red' : 'black';
  
  if ((player === 'red' && toRow === 0) || (player === 'black' && toRow === BOARD_SIZE - 1)) {
    board[toRow][toCol] = player === 'red' ? KING_RED : KING_BLACK;
  }
  
  return canCapture(board, toRow, toCol, player);
}

function getAvailableMoves(board, row, col, player) {
  const moves = [];
  const piece = board[row][col];
  const isKing = piece === KING_RED || piece === KING_BLACK;
  
  const directions = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : 
                     player === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    
    if (isValidMove(board, row, col, newRow, newCol, player)) {
      moves.push({ row: newRow, col: newCol, isCapture: false });
    }
    
    const capRow = row + dr * 2;
    const capCol = col + dc * 2;
    const midRow = row + dr;
    const midCol = col + dc;
    
    if (capRow >= 0 && capRow < BOARD_SIZE && capCol >= 0 && capCol < BOARD_SIZE) {
      const midPiece = board[midRow][midCol];
      const isOpponent = (player === 'red' && (midPiece === PIECE_BLACK || midPiece === KING_BLACK)) ||
                         (player === 'black' && (midPiece === PIECE_RED || midPiece === KING_RED));
      
      if (isOpponent && board[capRow][capCol] === DARK) {
        moves.push({ row: capRow, col: capCol, isCapture: true });
      }
    }
  }
  
  return moves;
}

function checkWinner(board) {
  let redPieces = 0;
  let blackPieces = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece === PIECE_RED || piece === KING_RED) redPieces++;
      if (piece === PIECE_BLACK || piece === KING_BLACK) blackPieces++;
    }
  }
  
  if (redPieces === 0) return 'black';
  if (blackPieces === 0) return 'red';
  return null;
}

export default {
  name: 'checkers',
  description: '🎮 Challenge another user to a checkers game',
  category: 'Economy',
  aliases: ['challenge'],
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
          'Usage: /checkers <bet> (reply to user)'
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
        `♟️ *CHECKERS CHALLENGE* ♟️\n\n` +
        `${username} challenges @${targetUsername}\n` +
        `💰 Bet: ${betAmount} coins each\n` +
        `🎯 8x8 Board, 12 pieces each\n\n` +
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
      global.checkersGames[gameId] = {
        challenger: userId,
        challengerName: username,
        opponent: targetUserId,
        opponentName: targetUsername,
        betAmount,
        messageId: challengeMsg.message_id,
        status: 'pending'
      };

      setTimeout(async () => {
        if (global.checkersGames[gameId]?.status === 'pending') {
          delete global.checkersGames[gameId];
          try {
            await bot.editMessageText(
              `♟️ *CHECKERS CHALLENGE* ♟️\n\n❌ Challenge expired! @${targetUsername} didn't respond.`,
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
  }
};
