import { getUser, isMainBot, escapeMarkdown } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

export default {
  name: 'uppercut',
  description: '👊 Devastating uppercut attack',
  category: 'Economy',
  aliases: ['upper'],
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
      const attacker = await getUser(userId, username, msg.from);

      // Check if user has learned this move
      if (!attacker.learnedMoves || !attacker.learnedMoves.includes('uppercut')) {
        return await bot.sendMessage(chatId,
          `🔒 *MOVE LOCKED!*\n\n` +
          `You haven't learned Uppercut yet!\n\n` +
          `💰 Cost: 5,000 coins\n` +
          `💥 Damage: 30-45 HP\n` +
          `🎯 Accuracy: 70%\n` +
          `⚡ Critical Hit Chance: 20%\n\n` +
          `Use /learnmove uppercut to unlock!`,
          { parse_mode: 'Markdown' }
        );
      }

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

      const defenderId = isPlayer1 ? battle.player2 : battle.player1;
      const defender = await getUser(defenderId);

      // Uppercut: 30-45 HP damage, 70% accuracy, 20% critical hit chance
      const baseDamage = Math.floor(Math.random() * 16) + 30; // 30-45
      const accuracy = 70;
      const critChance = 20;
      const hitChance = Math.random() * 100;

      let resultMsg = '';

      if (hitChance <= accuracy) {
        const isCrit = Math.random() * 100 <= critChance;
        const damage = isCrit ? Math.floor(baseDamage * 1.5) : baseDamage;
        
        if (isPlayer1) {
          battle.player2Health = Math.max(0, battle.player2Health - damage);
        } else {
          battle.player1Health = Math.max(0, battle.player1Health - damage);
        }

        defender.health = isPlayer1 ? battle.player2Health : battle.player1Health;
        await defender.save();

        resultMsg = `${isCrit ? '💫 *CRITICAL UPPERCUT!*' : '👊 *UPPERCUT LANDED!*'}\n\n` +
          `💥 ${escapeMarkdown(attacker.username)} launches a devastating uppercut${isCrit ? ' (CRITICAL!)' : ''}!\n` +
          `⚡ Damage: ${damage} HP${isCrit ? ' (x1.5)' : ''}\n\n` +
          `❤️ ${escapeMarkdown(attacker.username)}: ${isPlayer1 ? battle.player1Health : battle.player2Health} HP\n` +
          `❤️ ${escapeMarkdown(defender.username)}: ${isPlayer1 ? battle.player2Health : battle.player1Health} HP`;

        if ((isPlayer1 && battle.player2Health <= 0) || (!isPlayer1 && battle.player1Health <= 0)) {
          resultMsg += `\n\n🏆 *KNOCKOUT! ${escapeMarkdown(attacker.username)} WINS!*`;
          
          if (!attacker.pvpStats) attacker.pvpStats = { wins: 0, losses: 0 };
          if (!defender.pvpStats) defender.pvpStats = { wins: 0, losses: 0 };
          
          attacker.pvpStats.wins = (attacker.pvpStats.wins || 0) + 1;
          defender.pvpStats.losses = (defender.pvpStats.losses || 0) + 1;
          
          await attacker.save();
          await defender.save();
          
          activeBattles.delete(battleKey);
        } else {
          battle.currentTurn = battle.currentTurn === 'player1' ? 'player2' : 'player1';
          resultMsg += `\n\n⏭️ ${escapeMarkdown(defender.username)}'s turn!`;
        }
      } else {
        resultMsg = `❌ *UPPERCUT MISSED!*\n\n` +
          `👊 ${escapeMarkdown(attacker.username)}'s uppercut swings wide!\n\n` +
          `❤️ ${escapeMarkdown(attacker.username)}: ${isPlayer1 ? battle.player1Health : battle.player2Health} HP\n` +
          `❤️ ${escapeMarkdown(defender.username)}: ${isPlayer1 ? battle.player2Health : battle.player1Health} HP`;

        battle.currentTurn = battle.currentTurn === 'player1' ? 'player2' : 'player1';
        resultMsg += `\n\n⏭️ ${escapeMarkdown(defender.username)}'s turn!`;
      }

      await bot.sendMessage(chatId, resultMsg, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[UPPERCUT] Error:', error);
      await bot.sendMessage(chatId, '❌ Error executing uppercut. Try again.');
    }
  }
};
