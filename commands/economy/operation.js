import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const operations = {
  'central_bank': {
    name: '🏦 Central Bank Vault Operation',
    description: 'Break into the Central Bank vault',
    requiredRank: 'Legendary',
    successRate: 0.20,
    minReward: 1000000,
    maxReward: 5000000,
    minLoss: 500000,
    maxLoss: 2000000,
    jailTime: 180, // 3 hours if caught
    xpReward: 2000,
    cooldown: 72, // 3 days
    requiredItems: ['thermaldrill', 'vaultblueprint', 'disguisekit', 'empdevice']
  },
  'gold_reserve': {
    name: '🪙 National Gold Reserve Heist',
    description: 'Steal from the national gold reserve',
    requiredRank: 'Legendary',
    successRate: 0.15,
    minReward: 5000000,
    maxReward: 10000000,
    minLoss: 2000000,
    maxLoss: 5000000,
    jailTime: 240, // 4 hours if caught
    xpReward: 5000,
    cooldown: 168, // 7 days
    requiredItems: ['thermaldrill', 'vaultblueprint', 'disguisekit', 'empdevice', 'satellitejammer', 'escapechopper']
  },
  'international_heist': {
    name: '🌍 International Diamond Exchange',
    description: 'The ultimate heist - billions at stake',
    requiredRank: 'Legendary',
    successRate: 0.10,
    minReward: 10000000,
    maxReward: 50000000,
    minLoss: 5000000,
    maxLoss: 20000000,
    jailTime: 360, // 6 hours if caught
    xpReward: 10000,
    cooldown: 336, // 14 days
    requiredItems: ['thermaldrill', 'vaultblueprint', 'disguisekit', 'empdevice', 'satellitejammer', 'escapechopper']
  }
};

export default {
  name: 'operation',
  description: '🎯 Execute high-stakes operations (Legendary only)',
  category: 'Economy',
  aliases: ['op', 'bigheist'],
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
      const user = await getUser(userId, username, msg.from);

      // Check if jailed
      if (user.isJailed) {
        const releaseTime = new Date(user.jailReleaseTime);
        const now = new Date();

        if (now < releaseTime) {
          const minutesLeft = Math.ceil((releaseTime - now) / (1000 * 60));
          return await bot.sendMessage(chatId,
            `🔒 YOU'RE IN JAIL!\n\n` +
            `⏰ Release in: ${minutesLeft} minutes`
          );
        }
      }

      // Show operations menu
      if (!args[0]) {
        const rankEmoji = getRankEmoji(user.rank);
        let opsMenu = `🎯 HIGH-STAKES OPERATIONS\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `Rank: ${user.rank}\n\n`;

        if (user.rank !== 'Legendary') {
          opsMenu += `🔒 LOCKED - Legendary rank required!\n\n` +
            `These operations are only available to Legendary criminals.\n` +
            `Complete more crimes to rank up!`;

          return await bot.sendMessage(chatId, opsMenu);
        }

        Object.entries(operations).forEach(([id, op]) => {
          opsMenu += `${op.name}\n` +
            `${op.description}\n` +
            `✅ Success: ${Math.floor(op.successRate * 100)}%\n` +
            `💰 Reward: ${(op.minReward / 1000000).toFixed(1)}M-${(op.maxReward / 1000000).toFixed(1)}M coins\n` +
            `⏰ Cooldown: ${op.cooldown}h\n` +
            `⭐ XP: ${op.xpReward}\n` +
            `🔧 Required tools:\n`;

          op.requiredItems.forEach(item => {
            const hasItem = user.inventory?.find(i => i.item === item);
            opsMenu += `  ${hasItem ? '✅' : '❌'} ${item}\n`;
          });

          opsMenu += `\n🎯 Execute: /operation ${id}\n\n`;
        });

        opsMenu += `⚠️ Warning: Getting caught means LONG jail time!\n` +
          `💡 All tools are SINGLE-USE and will be consumed!`;

        return await bot.sendMessage(chatId, opsMenu);
      }

      const opId = args[0].toLowerCase();
      const operation = operations[opId];

      if (!operation) {
        return await bot.sendMessage(chatId, '❌ Invalid operation! Use /operation to see options.');
      }

      // Check rank
      if (user.rank !== operation.requiredRank) {
        return await bot.sendMessage(chatId, 
          `❌ ${operation.requiredRank} rank required!\nYour rank: ${user.rank}`
        );
      }

      // Check all required items
      const missingItems = [];
      for (const item of operation.requiredItems) {
        const hasItem = user.inventory?.find(i => i.item === item && i.quantity > 0);
        if (!hasItem) {
          missingItems.push(item);
        }
      }

      if (missingItems.length > 0) {
        return await bot.sendMessage(chatId,
          `❌ Missing required items:\n\n` +
          missingItems.map(i => `- ${i}`).join('\n') +
          `\n\nBuy them from /shop`
        );
      }

      // Check cooldown
      const cooldownKey = `lastOperation_${opId}`;
      if (user[cooldownKey]) {
        const hoursSinceLast = (Date.now() - new Date(user[cooldownKey]).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < operation.cooldown) {
          const hoursLeft = (operation.cooldown - hoursSinceLast).toFixed(1);
          return await bot.sendMessage(chatId, 
            `⏰ Operation cooldown: ${hoursLeft} hours remaining!`
          );
        }
      }

      // Execute operation
      const success = Math.random() < operation.successRate;
      user[cooldownKey] = new Date();

      // Remove all single-use items
      operation.requiredItems.forEach(itemId => {
        const item = user.inventory.find(i => i.item === itemId);
        if (item) {
          item.quantity -= 1;
          if (item.quantity === 0) {
            user.inventory = user.inventory.filter(i => i.item !== itemId);
          }
        }
      });

      if (success) {
        const reward = Math.floor(Math.random() * (operation.maxReward - operation.minReward + 1)) + operation.minReward;
        await updateBalance(userId, reward, username);
        user.crimeRecord = (user.crimeRecord || 0) + 1;
        user.xp += operation.xpReward;
        await user.save();

        return await bot.sendMessage(chatId,
          `✅ OPERATION SUCCESS!\n\n` +
          `${operation.name}\n` +
          `💰 Secured: ${(reward / 1000000).toFixed(2)}M coins\n` +
          `⭐ XP: +${operation.xpReward}\n` +
          `💵 New Balance: ${(user.balance / 1000000).toFixed(2)}M coins\n\n` +
          `🎉 Legendary heist complete!`
        );

      } else {
        const loss = Math.floor(Math.random() * (operation.maxLoss - operation.minReward + 1)) + operation.minLoss;
        const caught = Math.random() < 0.6; // 60% chance to get caught

        if (caught) {
          user.isJailed = true;
          user.jailReleaseTime = new Date(Date.now() + operation.jailTime * 60 * 1000);
          await user.save();

          return await bot.sendMessage(chatId,
            `🚔 OPERATION FAILED - CAUGHT!\n\n` +
            `${operation.name} unsuccessful!\n` +
            `🔒 Jailed for: ${operation.jailTime} minutes\n` +
            `💸 Lost all tools (single-use)\n\n` +
            `This is what happens when you aim too high!`
          );
        } else {
          await updateBalance(userId, -loss, username);
          await user.save();

          return await bot.sendMessage(chatId,
            `❌ OPERATION FAILED!\n\n` +
            `${operation.name} unsuccessful!\n` +
            `💸 Lost: ${(loss / 1000000).toFixed(2)}M coins\n` +
            `🔧 Lost all tools (single-use)\n` +
            `💵 New Balance: ${(user.balance / 1000000).toFixed(2)}M coins`
          );
        }
      }

    } catch (error) {
      console.error('[OPERATION] Error:', error);
      await bot.sendMessage(chatId, '❌ Operation system error. Try again.');
    }
  }
};