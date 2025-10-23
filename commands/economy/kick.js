import { getUser, isMainBot, escapeMarkdown } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'kick',
  description: '🦵 Kick your opponent during PVP battle',
  category: 'Economy',
  aliases: ['sidekick'],
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
      // Find active battle
      let battleKey = null;
      let battle = null;

      for (const [key, battleData] of activeBattles.entries()) {
        if (battleData.player1 === userId || battleData.player2 === userId) {
          battleKey = key;
          battle = battleData;
          break;
        }
      }

      if (!battle) {
        return await bot.sendMessage(chatId, 
          `❌ You're not in an active battle!\n\n` +
          `Use /challenge @user to start a fight.`
        );
      }

      const isPlayer1 = battle.player1 === userId;
      const currentTurnPlayer = battle.currentTurn === 'player1' ? battle.player1 : battle.player2;

      if (currentTurnPlayer !== userId) {
        return await bot.sendMessage(chatId, `❌ It's not your turn!`);
      }

      const attacker = await getUser(userId, username, msg.from);
      const defenderId = isPlayer1 ? battle.player2 : battle.player1;
      const defender = await getUser(defenderId);

      // Kick damage: 15-25 HP, 85% accuracy
      const baseDamage = Math.floor(Math.random() * 11) + 15; // 15-25
      const accuracy = 85;
      const hitChance = Math.random() * 100;

      let resultMsg = '';

      if (hitChance <= accuracy) {
        // Hit successful
        const damage = baseDamage;
        
        if (isPlayer1) {
          battle.player2Health = Math.max(0, battle.player2Health - damage);
        } else {
          battle.player1Health = Math.max(0, battle.player1Health - damage);
        }

        defender.health = isPlayer1 ? battle.player2Health : battle.player1Health;
        await defender.save();

        resultMsg = `🦵 *KICK LANDED!*\n\n` +
          `👊 ${escapeMarkdown(attacker.username)} kicks ${escapeMarkdown(defender.username)}!\n` +
          `💥 Damage: ${damage} HP\n\n` +
          `❤️ ${escapeMarkdown(attacker.username)}: ${isPlayer1 ? battle.player1Health : battle.player2Health} HP\n` +
          `❤️ ${escapeMarkdown(defender.username)}: ${isPlayer1 ? battle.player2Health : battle.player1Health} HP`;

        // Check if battle is over
        if ((isPlayer1 && battle.player2Health <= 0) || (!isPlayer1 && battle.player1Health <= 0)) {
          resultMsg += `\n\n🏆 *${escapeMarkdown(attacker.username)} WINS!*`;
          
          // Update stats
          if (!attacker.pvpStats) attacker.pvpStats = { wins: 0, losses: 0 };
          if (!defender.pvpStats) defender.pvpStats = { wins: 0, losses: 0 };
          
          attacker.pvpStats.wins = (attacker.pvpStats.wins || 0) + 1;
          defender.pvpStats.losses = (defender.pvpStats.losses || 0) + 1;
          
          await attacker.save();
          await defender.save();
          
          activeBattles.delete(battleKey);
        } else {
          // Switch turn
          battle.currentTurn = battle.currentTurn === 'player1' ? 'player2' : 'player1';
          resultMsg += `\n\n⏭️ ${escapeMarkdown(defender.username)}'s turn!`;
        }
      } else {
        // Miss
        resultMsg = `❌ *KICK MISSED!*\n\n` +
          `🦵 ${escapeMarkdown(attacker.username)}'s kick whiffs past ${escapeMarkdown(defender.username)}!\n\n` +
          `❤️ ${escapeMarkdown(attacker.username)}: ${isPlayer1 ? battle.player1Health : battle.player2Health} HP\n` +
          `❤️ ${escapeMarkdown(defender.username)}: ${isPlayer1 ? battle.player2Health : battle.player1Health} HP`;

        // Switch turn even on miss
        battle.currentTurn = battle.currentTurn === 'player1' ? 'player2' : 'player1';
        resultMsg += `\n\n⏭️ ${escapeMarkdown(defender.username)}'s turn!`;
      }

      await bot.sendMessage(chatId, resultMsg, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[KICK] Error:', error);
      await bot.sendMessage(chatId, '❌ Error executing kick. Try again.');
    }
  }
};
