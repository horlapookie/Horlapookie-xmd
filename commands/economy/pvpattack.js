import { getUser, isMainBot } from '../../lib/economy.js';
import { activeBattles } from './challenge.js';

// Import shop items for weapon stats
const weaponStats = {
  'pistol': { damage: { min: 30, max: 40 }, accuracy: 70, name: '🔫 Pistol' },
  'rifle': { damage: { min: 40, max: 60 }, accuracy: 80, name: '🔫 Rifle' },
  'sniper': { damage: { min: 70, max: 90 }, accuracy: 95, name: '🎯 Sniper' },
  'shotgun': { damage: { min: 50, max: 70 }, accuracy: 60, name: '💥 Shotgun' },
  'knife': { damage: { min: 20, max: 35 }, accuracy: 85, name: '🔪 Knife' },
  'machete': { damage: { min: 30, max: 45 }, accuracy: 75, name: '🗡️ Machete' },
  'bat': { damage: { min: 15, max: 25 }, accuracy: 80, name: '⚾ Bat' },
  'bottle': { damage: { min: 10, max: 20 }, accuracy: 65, name: '🍾 Bottle' },
  'taser': { damage: { min: 5, max: 10 }, accuracy: 90, name: '⚡ Taser', special: 'stun' },
  'grenade': { damage: { min: 60, max: 80 }, accuracy: 100, name: '💣 Grenade', special: 'explosive' }
};

export default {
  name: 'pvpattack',
  description: '⚔️ Attack your opponent in PVP battle',
  category: 'Combat',
  aliases: ['pattack', 'battleattack'],
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
        return await bot.sendMessage(chatId, '❌ You\'re not in an active battle! Use /challenge first.');
      }

      // Check if it's player's turn
      if (battle.turn !== userId) {
        const currentPlayer = battle.turn === battle.player1.id ? battle.player1.username : battle.player2.username;
        return await bot.sendMessage(chatId, `❌ It's ${currentPlayer}'s turn!`);
      }

      const attacker = isPlayer1 ? battle.player1 : battle.player2;
      const defender = isPlayer1 ? battle.player2 : battle.player1;

      // Check if stunned
      if (attacker.stunned) {
        attacker.stunned = false;
        battle.turn = defender.id;
        activeBattles.set(battleKey, battle);
        return await bot.sendMessage(chatId,
          `😵 *STUNNED!*\n\n` +
          `${attacker.username} is stunned and can't attack!\n` +
          `Turn skipped!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Get weapon from args
      const weapon = args[0]?.toLowerCase();
      if (!weapon || !weaponStats[weapon]) {
        return await bot.sendMessage(chatId,
          `❌ *INVALID WEAPON!*\n\n` +
          `Available weapons:\n` +
          `${Object.keys(weaponStats).map(w => `• ${weaponStats[w].name} (${w})`).join('\n')}\n\n` +
          `Usage: /pvpattack <weapon>`,
          { parse_mode: 'Markdown' }
        );
      }

      // Check if user has the weapon
      const user = await getUser(userId, username);
      const hasWeapon = user.inventory?.find(i => i.item === weapon && i.quantity > 0);
      
      if (!hasWeapon) {
        return await bot.sendMessage(chatId,
          `❌ You don't have a ${weaponStats[weapon].name}!\n\n` +
          `Buy it from /shop`
        );
      }

      // Calculate hit chance
      const weaponData = weaponStats[weapon];
      const hitRoll = Math.random() * 100;
      const hit = hitRoll <= weaponData.accuracy;

      if (!hit && weaponData.special !== 'explosive') {
        // Miss
        battle.turn = defender.id;
        activeBattles.set(battleKey, battle);
        
        return await bot.sendMessage(chatId,
          `❌ *MISS!*\n\n` +
          `${attacker.username} missed with ${weaponData.name}!\n` +
          `🎯 Accuracy: ${weaponData.accuracy}% | Roll: ${hitRoll.toFixed(1)}%\n\n` +
          `${defender.username}'s turn!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Calculate damage
      const baseDamage = Math.floor(Math.random() * (weaponData.damage.max - weaponData.damage.min + 1)) + weaponData.damage.min;
      let finalDamage = baseDamage;

      // Apply armor if defender has it
      if (defender.armor > 0) {
        finalDamage = Math.floor(finalDamage * 0.7); // 30% reduction
        defender.armor--;
        await bot.sendMessage(chatId, `🦺 ${defender.username}'s armor absorbed 30% damage!`);
      }

      // Apply damage
      defender.health = Math.max(0, defender.health - finalDamage);

      // Apply special effects
      if (weaponData.special === 'stun') {
        defender.stunned = true;
        await bot.sendMessage(chatId, `⚡ ${defender.username} is stunned!`);
      }

      // Update battle
      activeBattles.set(battleKey, battle);

      // Check if battle is over
      if (defender.health <= 0) {
        // Battle ended
        activeBattles.delete(battleKey);

        // Update user health in database
        const attackerUser = await getUser(attacker.id, attacker.username);
        const defenderUser = await getUser(defender.id, defender.username);
        
        attackerUser.health = attacker.health;
        defenderUser.health = 0;
        
        if (!attackerUser.pvpStats) attackerUser.pvpStats = { wins: 0, losses: 0, draws: 0 };
        if (!defenderUser.pvpStats) defenderUser.pvpStats = { wins: 0, losses: 0, draws: 0 };
        
        attackerUser.pvpStats.wins++;
        defenderUser.pvpStats.losses++;
        
        await attackerUser.save();
        await defenderUser.save();

        return await bot.sendMessage(chatId,
          `💀 *KNOCKOUT!*\n\n` +
          `${weaponData.name} ${attacker.username} dealt ${finalDamage} damage!\n\n` +
          `🏆 ${attacker.username} WINS!\n` +
          `❤️ ${attacker.username}: ${attacker.health}/100 HP\n` +
          `💀 ${defender.username}: 0/100 HP (Defeated)\n\n` +
          `📊 ${attacker.username}: ${attackerUser.pvpStats.wins} wins\n` +
          `📊 ${defender.username}: ${defenderUser.pvpStats.losses} losses`,
          { parse_mode: 'Markdown' }
        );
      }

      // Switch turn
      battle.turn = defender.id;
      activeBattles.set(battleKey, battle);

      await bot.sendMessage(chatId,
        `⚔️ *HIT!*\n\n` +
        `${weaponData.name} ${attacker.username} dealt ${finalDamage} damage!\n\n` +
        `❤️ ${attacker.username}: ${attacker.health}/100 HP\n` +
        `❤️ ${defender.username}: ${defender.health}/100 HP\n\n` +
        `🎯 ${defender.username}'s turn!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[PVP ATTACK] Error:', error);
      await bot.sendMessage(chatId, '❌ Attack error. Try again.');
    }
  }
};
