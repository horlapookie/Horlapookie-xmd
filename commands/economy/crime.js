import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const crimeTypes = {
  'pickpocket': {
    name: '👛 Pickpocket',
    successRate: 0.65,
    minReward: 500,
    maxReward: 2000,
    minLoss: 200,
    maxLoss: 800,
    xpReward: 10,
    cooldown: 0.5, // 30 minutes
    scene: 'You spot a wealthy tourist checking their phone. You bump into them and swipe their wallet in the confusion.'
  },
  'heist': {
    name: '💰 Bank Heist',
    successRate: 0.45,
    minReward: 5000,
    maxReward: 15000,
    minLoss: 3000,
    maxLoss: 8000,
    xpReward: 50,
    cooldown: 2, // 2 hours
    requiredItem: 'lockpick',
    scene: 'You case the bank for hours. Using your lockpick, you bypass the security and head straight for the vault...'
  },
  'smuggle': {
    name: '📦 Smuggling',
    successRate: 0.55,
    minReward: 3000,
    maxReward: 10000,
    minLoss: 1500,
    maxLoss: 5000,
    xpReward: 30,
    cooldown: 1, // 1 hour
    scene: 'You meet your contact at the docks. The cargo is loaded. Now you just need to get past customs...'
  },
  'hack': {
    name: '💻 Corporate Hack',
    successRate: 0.40,
    minReward: 10000,
    maxReward: 25000,
    minLoss: 5000,
    maxLoss: 15000,
    xpReward: 100,
    cooldown: 3, // 3 hours
    requiredItem: 'hack_tool',
    scene: 'You connect to the corporate network. Firewalls activate. Your hacking tool breaks through layer by layer...'
  },
  'carjack': {
    name: '🚗 Luxury Carjacking',
    successRate: 0.50,
    minReward: 20000,
    maxReward: 50000,
    minLoss: 10000,
    maxLoss: 25000,
    xpReward: 150,
    cooldown: 2.5, // 2.5 hours
    requiredItem: 'carjammer',
    scene: 'A luxury car pulls up. You activate the signal jammer, disabling the alarm. The door unlocks...'
  },
  'arttheft': {
    name: '🖼️ Art Gallery Theft',
    successRate: 0.35,
    minReward: 50000,
    maxReward: 100000,
    minLoss: 30000,
    maxLoss: 60000,
    xpReward: 250,
    cooldown: 4, // 4 hours
    requiredItem: 'glasscutter',
    scene: 'The gallery is quiet at night. You cut through the glass case silently. The priceless painting is within reach...'
  },
  'cybercrime': {
    name: '🌐 International Cybercrime',
    successRate: 0.30,
    minReward: 100000,
    maxReward: 250000,
    minLoss: 50000,
    maxLoss: 150000,
    xpReward: 500,
    cooldown: 6, // 6 hours
    requiredItem: 'advancedhackkit',
    scene: 'You launch the attack on international servers. Bypassing encryption, moving millions in cryptocurrency...'
  },
  'diamondheist': {
    name: '💎 Diamond Vault Heist',
    successRate: 0.25,
    minReward: 250000,
    maxReward: 500000,
    minLoss: 150000,
    maxLoss: 300000,
    xpReward: 800,
    cooldown: 8, // 8 hours
    requiredItems: ['thermal_drill', 'vault_blueprint', 'disguise_kit'],
    scene: 'Disguised as workers, you enter the vault. The thermal drill heats up. One mistake and the alarm triggers...'
  }
};

export default {
  name: 'crime',
  description: '🚨 Commit crimes (high risk, high reward)',
  category: 'Economy',
  aliases: ['criminal', 'illegal'],
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
            `🔒 *YOU'RE IN JAIL!*\n\n` +
            `⏰ Release in: ${minutesLeft} minutes\n\n` +
            `💡 Ask a friend to /bail you out!`,
            { parse_mode: 'Markdown' }
          );
        } else {
          // Auto release
          user.isJailed = false;
          user.jailReleaseTime = null;
          await user.save();
        }
      }

      // Show crime menu
      if (!args[0]) {
        let crimeMenu = `🚨 CRIME ACTIVITIES\n\n` +
          `${getRankEmoji(user.rank)} ${user.username}\n\n`;

        Object.entries(crimeTypes).forEach(([id, crime]) => {
          crimeMenu += `${crime.name}\n` +
          `✅ Success: ${Math.floor(crime.successRate * 100)}%\n` +
          `💰 Reward: ${crime.minReward}-${crime.maxReward} coins\n` +
          `⏰ Cooldown: ${crime.cooldown}h\n` +
          `${crime.requiredItem ? `🔑 Needs: ${crime.requiredItem}\n` : ''}` +
          `🎯 Type: /crime ${id}\n\n`;
        });

        crimeMenu += `⚠️ Warning: Getting caught sends you to jail!`;

        return await bot.sendMessage(chatId, crimeMenu);
      }

      const crimeType = args[0].toLowerCase();
      const crime = crimeTypes[crimeType];

      if (!crime) {
        return await bot.sendMessage(chatId, '❌ Invalid crime! Use /crime to see options.');
      }

      // Check if user has required item(s)
      if (crime.requiredItem) {
        const hasItem = user.inventory?.find(i => i.item === crime.requiredItem && i.quantity > 0);
        if (!hasItem) {
          return await bot.sendMessage(chatId,
            `❌ You need ${crime.requiredItem} to attempt this crime!\n\n` +
            `Buy it from /shop`
          );
        }
      }

      // Check for multiple required items
      if (crime.requiredItems) {
        const missingItems = [];
        for (const item of crime.requiredItems) {
          const hasItem = user.inventory?.find(i => i.item === item && i.quantity > 0);
          if (!hasItem) {
            missingItems.push(item);
          }
        }
        if (missingItems.length > 0) {
          return await bot.sendMessage(chatId,
            `❌ You need the following items:\n\n` +
            missingItems.map(i => `- ${i}`).join('\n') +
            `\n\nBuy them from /shop`
          );
        }
      }

      // Check cooldown
      if (user.lastCrime) {
        const hoursSinceLastCrime = (Date.now() - new Date(user.lastCrime).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCrime < crime.cooldown) {
          const timeLeft = crime.cooldown - hoursSinceLastCrime;
          const display = timeLeft >= 1 ? 
            `${timeLeft.toFixed(1)} hours` : 
            `${Math.ceil(timeLeft * 60)} minutes`;
          return await bot.sendMessage(chatId, 
            `⏰ You need to wait ${display} before attempting another crime!`
          );
        }
      }

      // Show crime scene
      await bot.sendMessage(chatId,
        `🎬 *CRIME IN PROGRESS...*\n\n` +
        `${crime.scene}\n\n` +
        `⏳ Executing ${crime.name}...`,
        { parse_mode: 'Markdown' }
      );

      // Brief delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Calculate success rate (lockpick adds 20% for heists)
      let successRate = crime.successRate;
      if (crimeType === 'heist') {
        const hasLockpick = user.inventory?.find(i => i.item === 'lockpick');
        if (hasLockpick) {
          successRate += 0.20;
        }
      }

      const success = Math.random() < successRate;

      user.lastCrime = new Date();

      if (success) {
        const reward = Math.floor(Math.random() * (crime.maxReward - crime.minReward + 1)) + crime.minReward;
        await updateBalance(userId, reward, username);
        user.crimeRecord = (user.crimeRecord || 0) + 1;
        user.xp += crime.xpReward;

        // Unlock black market after 10 successful crimes
        if (user.crimeRecord >= 10 && !user.blackMarketAccess) {
          user.blackMarketAccess = true;
          user.blackMarketLevel = 1;
        }

        await user.save();

        let successMsg = `✅ *CRIME SUCCESSFUL!*\n\n` +
          `${crime.name}\n` +
          `💰 Earned: ${reward} coins\n` +
          `⭐ XP: +${crime.xpReward}\n` +
          `💵 New Balance: ${user.balance} coins\n` +
          `🚨 Crimes: ${user.crimeRecord}`;

        if (user.crimeRecord === 10) {
          successMsg += `\n\n🎉 *BLACK MARKET UNLOCKED!*\nUse /blackmarket to access special items!`;
        }

        return await bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });

      } else {
        const loss = Math.floor(Math.random() * (crime.maxLoss - crime.minLoss + 1)) + crime.minLoss;
        
        // Check if user paid cops recently (last 6 hours = safer)
        const paidCopsRecently = user.lastCops && 
          (Date.now() - new Date(user.lastCops).getTime()) / (1000 * 60 * 60) < 6;
        
        // Base 40% catch rate, but 70% if haven't paid cops!
        const catchRate = paidCopsRecently ? 0.30 : 0.70;
        const caught = Math.random() < catchRate;

        if (caught) {
          // Send to jail
          const hasFakeId = user.inventory?.find(i => i.item === 'fake_id');
          const jailTime = hasFakeId ? 30 : 60; // 30 or 60 minutes

          user.isJailed = true;
          user.jailReleaseTime = new Date(Date.now() + jailTime * 60 * 1000);

          // Remove fake ID if used
          if (hasFakeId) {
            hasFakeId.quantity -= 1;
            if (hasFakeId.quantity === 0) {
              user.inventory = user.inventory.filter(i => i.item !== 'fake_id');
            }
          }

          await user.save();

          return await bot.sendMessage(chatId,
            `🚔 *CAUGHT BY POLICE!*\n\n` +
            `${crime.name} failed!\n` +
            `👮 ${paidCopsRecently ? 'You got unlucky!' : 'You should have paid the cops!'}\n` +
            `🔒 Jailed for: ${jailTime} minutes\n` +
            `${hasFakeId ? '🪪 Fake ID reduced sentence!' : ''}\n\n` +
            `💡 Tip: ${paidCopsRecently ? 'Friends can /bail you out!' : 'Use /paycops to reduce getting caught!'}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await updateBalance(userId, -loss, username);
          await user.save();

          return await bot.sendMessage(chatId,
            `❌ *CRIME FAILED!*\n\n` +
            `${crime.name} unsuccessful!\n` +
            `💸 Lost: ${loss} coins\n` +
            `💵 New Balance: ${user.balance} coins\n\n` +
            `_You escaped before the cops arrived!_`,
            { parse_mode: 'Markdown' }
          );
        }
      }

    } catch (error) {
      console.error('[CRIME] Error:', error);
      await bot.sendMessage(chatId, '❌ Crime system error. Try again.');
    }
  }
};