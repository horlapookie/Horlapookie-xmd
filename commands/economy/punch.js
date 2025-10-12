import { getUser, isMainBot } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'punch',
  description: '🥊 Punch your opponent (no weapon needed)',
  category: 'Combat',
  aliases: ['fist', 'hit'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, '❌ Combat commands only work on the main bot!');
    }

    try {
      // Find active battle
      let battle = null;
      let battleKey = null;
      let isPlayer1 = false;

      for (const [key, b] of activeBattles.entries()) {
        if (b.chatId === chatId && (b.player1.id === userId || b.player2.id === userId)) {
          battle = b;
          battleKey = key;
          isPlayer1 = b.player1.id === userId;
          break;
        }
      }

      if (!battle) {
        return await bot.sendMessage(chatId, '❌ You\'re not in an active battle!');
      }

      if (battle.turn !== userId) {
        return await bot.sendMessage(chatId, '❌ Not your turn!');
      }

      const attacker = isPlayer1 ? battle.player1 : battle.player2;
      const defender = isPlayer1 ? battle.player2 : battle.player1;

      if (attacker.stunned) {
        attacker.stunned = false;
        battle.turn = defender.id;
        activeBattles.set(battleKey, battle);
        return await bot.sendMessage(chatId, `😵 ${attacker.username} is stunned! Turn skipped.`);
      }

      // Punch has 75% accuracy
      const hit = Math.random() <= 0.75;

      if (!hit) {
        battle.turn = defender.id;
        activeBattles.set(battleKey, battle);
        return await bot.sendMessage(chatId,
          `❌ *MISS!*\n\n${attacker.username} swung and missed!\n\n${defender.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Punch damage: 5-15 HP
      const damage = Math.floor(Math.random() * 11) + 5;
      defender.health = Math.max(0, defender.health - damage);

      activeBattles.set(battleKey, battle);

      if (defender.health <= 0) {
        activeBattles.delete(battleKey);
        
        const attackerUser = await getUser(attacker.id, attacker.username);
        const defenderUser = await getUser(defender.id, defender.username);
        
        attackerUser.health = attacker.health;
        defenderUser.health = 0;
        
        if (!attackerUser.pvpStats) attackerUser.pvpStats = { wins: 0, losses: 0 };
        if (!defenderUser.pvpStats) defenderUser.pvpStats = { wins: 0, losses: 0 };
        
        attackerUser.pvpStats.wins++;
        defenderUser.pvpStats.losses++;
        
        await attackerUser.save();
        await defenderUser.save();

        return await bot.sendMessage(chatId,
          `🥊💥 *KNOCKOUT PUNCH!*\n\n` +
          `${attacker.username} dealt ${damage} damage!\n\n` +
          `🏆 ${attacker.username} WINS!`,
          { parse_mode: 'Markdown' }
        );
      }

      battle.turn = defender.id;
      activeBattles.set(battleKey, battle);

      await bot.sendMessage(chatId,
        `🥊 *PUNCH LANDED!*\n\n` +
        `${attacker.username} dealt ${damage} damage!\n\n` +
        `❤️ ${attacker.username}: ${attacker.health}/100 HP\n` +
        `❤️ ${defender.username}: ${defender.health}/100 HP\n\n` +
        `${defender.username}'s turn!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[PUNCH] Error:', error);
      await bot.sendMessage(chatId, '❌ Punch error.');
    }
  }
};
