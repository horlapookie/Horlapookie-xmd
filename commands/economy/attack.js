
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

export default {
  name: 'attack',
  description: '⚔️ Attack another user with your weapon',
  category: 'Economy',
  aliases: ['wound', 'stab', 'shoot'],
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
          '❌ Please reply to or mention the user you want to attack!\n\n' +
          'Usage: /attack <weapon> (reply to user)'
        );
      }

      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, '❌ You cannot attack yourself!');
      }

      const weaponType = args[0]?.toLowerCase() || 'gun';
      const validWeapons = ['gun', 'knife', 'bottle'];
      
      if (!validWeapons.includes(weaponType)) {
        return await bot.sendMessage(chatId, 
          '❌ Invalid weapon! Choose: gun, knife, or bottle\n\n' +
          'Usage: /attack <weapon> (reply to user)'
        );
      }

      const attacker = await getUser(userId, username, msg.from);
      const victim = await getUser(targetUserId, targetUsername, targetUserInfo);

      // Check if either player is in an active battle
      const { activeBattles } = await import('./challenge.js');
      for (const [key, battle] of activeBattles.entries()) {
        if (battle.player1.id === userId || battle.player2.id === userId ||
            battle.player1.id === targetUserId || battle.player2.id === targetUserId) {
          return await bot.sendMessage(chatId, 
            '❌ Cannot use /attack during a PVP battle! Use battle commands instead.'
          );
        }
      }
      
      // Check if attacker has the weapon
      const hasWeapon = attacker.inventory?.find(i => i.item === weaponType && i.quantity > 0);
      if (!hasWeapon) {
        return await bot.sendMessage(chatId, 
          `❌ You don't have a ${weaponType}!\n\nBuy it from /shop`
        );
      }

      // Remove weapon from inventory (single use)
      const weaponItem = attacker.inventory.find(i => i.item === weaponType);
      weaponItem.quantity -= 1;
      if (weaponItem.quantity === 0) {
        attacker.inventory = attacker.inventory.filter(i => i.item !== weaponType);
      }

      // Attack mechanics
      const attackSuccess = Math.random() > 0.3; // 70% success rate
      
      if (!attackSuccess) {
        await attacker.save();
        return await bot.sendMessage(chatId,
          `❌ *ATTACK FAILED!*\n\n` +
          `🎯 You missed ${targetUsername}!\n` +
          `💸 Lost weapon: ${weaponType}\n\n` +
          `Better aim next time!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Successful attack
      let damageAmount = 0;
      let healthDamage = 0;
      let specialEffect = '';
      let heartDamage = false;

      switch (weaponType) {
        case 'gun':
          damageAmount = Math.floor(Math.random() * 50000) + 10000; // 10k-60k
          healthDamage = Math.floor(Math.random() * 30) + 20; // 20-50 HP
          specialEffect = '🔫 Shot';
          break;
        case 'knife':
          damageAmount = Math.floor(Math.random() * 30000) + 5000; // 5k-35k
          healthDamage = Math.floor(Math.random() * 25) + 15; // 15-40 HP
          // 10% chance of heart stab
          heartDamage = Math.random() < 0.1;
          if (heartDamage) {
            damageAmount = 200000000; // 200M for heart surgery
            healthDamage = 80; // Critical health damage
            specialEffect = '💔 Stabbed in the heart';
          } else {
            specialEffect = '🔪 Stabbed';
          }
          break;
        case 'bottle':
          damageAmount = Math.floor(Math.random() * 20000) + 3000; // 3k-23k
          healthDamage = Math.floor(Math.random() * 20) + 10; // 10-30 HP
          specialEffect = '🍾 Smashed with bottle';
          break;
      }

      // Apply damage
      await updateBalance(targetUserId, -damageAmount, targetUsername);
      
      // Initialize and apply health damage
      if (!victim.health) victim.health = 100;
      victim.health = Math.max(0, victim.health - healthDamage);
      
      await attacker.save();
      await victim.save();

      // Check if victim can report to cops
      const canReport = Math.random() < 0.5; // 50% chance victim can report

      let resultMsg = `⚔️ *ATTACK SUCCESSFUL!*\n\n` +
        `${specialEffect} ${targetUsername}!\n` +
        `💸 ${targetUsername} lost ${damageAmount.toLocaleString()} coins\n` +
        `❤️ Health damage: -${healthDamage} HP (${victim.health}/100)\n`;
      
      if (heartDamage) {
        resultMsg += `\n💔 CRITICAL HIT! Heart damage!\n` +
          `🏥 Needs 200M coins for heart surgery!\n`;
      }
      
      if (victim.health <= 0) {
        resultMsg += `\n💀 ${targetUsername} is severely injured!\n` +
          `🏥 Visit /pharmacy immediately!\n`;
      }
      
      if (canReport) {
        resultMsg += `\n👮 Victim can report to cops with /reportattack`;
      }

      await bot.sendMessage(chatId, resultMsg, { parse_mode: 'Markdown' });

      // Store attack info for potential police report
      if (!global.attackReports) global.attackReports = {};
      global.attackReports[targetUserId] = {
        attacker: userId,
        attackerName: username,
        weapon: weaponType,
        damage: damageAmount,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('[ATTACK] Error:', error);
      await bot.sendMessage(chatId, '❌ Attack failed. Try again.');
    }
  }
};
