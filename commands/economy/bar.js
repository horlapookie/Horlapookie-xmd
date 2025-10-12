
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const barItems = {
  // Drinks
  'beer': {
    name: '🍺 Beer',
    price: 50,
    type: 'drink',
    effect: 'drunk',
    duration: 5,
    animation: [
      '🍺 *Opens beer bottle...*',
      '🍺 *Takes a sip...*',
      '🍺 *Chugs the beer...*',
      '🍺 *Finishes the bottle!*',
      '😵 You feel tipsy!'
    ]
  },
  'whiskey': {
    name: '🥃 Whiskey',
    price: 150,
    type: 'drink',
    effect: 'drunk',
    duration: 10,
    animation: [
      '🥃 *Pours whiskey into glass...*',
      '🥃 *Swirls the glass...*',
      '🥃 *Takes a sip...*',
      '🥃 *Drinks it down...*',
      '😵‍💫 Strong stuff! You\'re drunk!'
    ]
  },
  'vodka': {
    name: '🍸 Vodka',
    price: 200,
    type: 'drink',
    effect: 'drunk',
    duration: 15,
    animation: [
      '🍸 *Prepares vodka shot...*',
      '🍸 *Raises the glass...*',
      '🍸 *Downs it in one gulp!*',
      '😵‍💫 *Burns going down...*',
      '🤮 You\'re wasted!'
    ]
  },
  'champagne': {
    name: '🍾 Champagne',
    price: 500,
    type: 'drink',
    effect: 'drunk',
    duration: 8,
    animation: [
      '🍾 *Pops the champagne...*',
      '🍾 *Pours into glass...*',
      '🍾 *Sips elegantly...*',
      '🍾 *Enjoys the bubbles...*',
      '😌 You feel classy and drunk!'
    ]
  },
  // Smoking
  'cigarette': {
    name: '🚬 Cigarette',
    price: 30,
    type: 'smoke',
    effect: 'high',
    duration: 3,
    animation: [
      '🚬 *Lights cigarette...*',
      '🚬 *Takes a drag...*',
      '🚬 *Exhales smoke...*',
      '🚬 *Finishes smoking*',
      '😮‍💨 You feel relaxed!'
    ]
  },
  'cigar': {
    name: '🚬 Cigar',
    price: 100,
    type: 'smoke',
    effect: 'high',
    duration: 5,
    animation: [
      '🚬 *Cuts the cigar...*',
      '🚬 *Lights it up...*',
      '🚬 *Puffs slowly...*',
      '🚬 *Enjoys the smoke...*',
      '😌 You feel like a boss!'
    ]
  },
  'weed': {
    name: '🌿 Weed',
    price: 250,
    type: 'smoke',
    effect: 'high',
    duration: 20,
    animation: [
      '🌿 *Rolls the joint...*',
      '🌿 *Lights it up...*',
      '🌿 *Inhales deeply...*',
      '🌿 *Holds it in...*',
      '🌿 *Exhales smoke clouds...*',
      '😵‍💫 You\'re flying high!'
    ]
  },
  // Pills
  'xanax': {
    name: '💊 Xanax',
    price: 80,
    type: 'pill',
    effect: 'calm',
    duration: 10,
    animation: [
      '💊 *Opens pill bottle...*',
      '💊 *Pops the pill...*',
      '💊 *Swallows with water...*',
      '😌 You feel calm and relaxed!'
    ]
  },
  'molly': {
    name: '💊 Molly',
    price: 300,
    type: 'pill',
    effect: 'euphoria',
    duration: 15,
    animation: [
      '💊 *Takes the pill...*',
      '💊 *Waits for effect...*',
      '💊 *Feeling it kick in...*',
      '🤩 Pure euphoria!'
    ]
  },
  'cocaine': {
    name: '❄️ Cocaine',
    price: 100000000, // 100M
    type: 'hard_drug',
    effect: 'energized',
    duration: 12,
    healthDamage: 30,
    addiction: true,
    animation: [
      '❄️ *Cuts the line...*',
      '❄️ *Rolls up bill...*',
      '❄️ *Snorts the line...*',
      '⚡ Energy rush! You\'re wired!',
      '⚠️ WARNING: Highly addictive!'
    ]
  },
  'heroin': {
    name: '💉 Heroin',
    price: 150000000, // 150M
    type: 'hard_drug',
    effect: 'euphoria',
    duration: 20,
    healthDamage: 40,
    addiction: true,
    animation: [
      '💉 *Prepares needle...*',
      '💉 *Finds vein...*',
      '💉 *Injects slowly...*',
      '😵‍💫 *Instant euphoria...*',
      '⚠️ DANGER: Extremely addictive!'
    ]
  },
  'meth': {
    name: '💎 Crystal Meth',
    price: 120000000, // 120M
    type: 'hard_drug',
    effect: 'hyper',
    duration: 24,
    healthDamage: 35,
    addiction: true,
    animation: [
      '💎 *Prepares the glass pipe...*',
      '💎 *Heats the crystal...*',
      '💎 *Inhales deeply...*',
      '⚡ *Extreme energy rush!*',
      '⚠️ CRITICAL: Highly destructive!'
    ]
  },
  'lsd': {
    name: '🌈 LSD',
    price: 80000000, // 80M
    type: 'hard_drug',
    effect: 'hallucination',
    duration: 18,
    healthDamage: 25,
    addiction: false,
    animation: [
      '🌈 *Places tab on tongue...*',
      '🌈 *Waits for effect...*',
      '🌈 *Reality starts bending...*',
      '👁️ *Intense hallucinations!*',
      '⚠️ WARNING: Psychological risk!'
    ]
  }
};

async function animateAction(bot, chatId, animations, delay = 1000) {
  for (const text of animations) {
    await bot.sendMessage(chatId, text);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export default {
  name: 'bar',
  description: '🍺 Visit the bar for drinks, smoke, and more',
  category: 'Economy',
  aliases: ['drink', 'smoke', 'drugs'],
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
      const rankEmoji = getRankEmoji(user.rank);

      // Check if jailed
      if (user.isJailed) {
        const releaseTime = new Date(user.jailReleaseTime);
        const now = new Date();

        if (now < releaseTime) {
          const minutesLeft = Math.ceil((releaseTime - now) / (1000 * 60));
          return await bot.sendMessage(chatId,
            `🔒 *YOU'RE IN JAIL!*\n\n` +
            `❌ No bar access in prison!\n` +
            `⏰ Release in: ${minutesLeft} minutes`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Check health before entering bar
      if (!user.health) user.health = 100;
      if (user.health < 20) {
        return await bot.sendMessage(chatId,
          `🏥 *CRITICAL HEALTH!*\n\n` +
          `❤️ Your health: ${user.health}%\n` +
          `❌ Too weak to visit the bar!\n\n` +
          `Visit /pharmacy to recover first.`,
          { parse_mode: 'Markdown' }
        );
      }

      // Check transportation
      const hasCar = user.properties?.find(p => p.type === 'car');
      const hasHelicopter = user.properties?.find(p => p.type === 'helicopter');
      
      let transportMode = '🚶 Walking';
      let travelTime = 15; // minutes
      
      if (hasHelicopter) {
        transportMode = '🚁 Helicopter (VIP arrival!)';
        travelTime = 2;
      } else if (hasCar) {
        transportMode = '🚗 Driving';
        travelTime = 5;
      }

      // Show transport info in menu
      if (!args[0]) {
        await bot.sendMessage(chatId,
          `🚦 *TRAVELING TO BAR*\n\n` +
          `${transportMode}\n` +
          `⏱️ ETA: ${travelTime} minutes\n\n` +
          `${!hasCar && !hasHelicopter ? '💡 Buy a car or helicopter in /property for faster travel!' : ''}`,
          { parse_mode: 'Markdown' }
        );
        
        // Simulate travel
        await new Promise(resolve => setTimeout(resolve, travelTime * 100));
      }

      // Show bar menu
      if (!args[0]) {
        let barMenu = `🍺 *WELCOME TO THE BAR*\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `💰 Balance: ${user.balance.toLocaleString()} coins\n` +
          `❤️ Health: ${user.health || 100}%\n` +
          `🧠 Mental: ${user.mental || 100}%\n\n`;

        barMenu += `*🍺 DRINKS*\n`;
        Object.entries(barItems).filter(([_, i]) => i.type === 'drink').forEach(([id, item]) => {
          barMenu += `${item.name} - ${item.price} coins\n`;
        });

        barMenu += `\n*🚬 SMOKING*\n`;
        Object.entries(barItems).filter(([_, i]) => i.type === 'smoke').forEach(([id, item]) => {
          barMenu += `${item.name} - ${item.price} coins\n`;
        });

        barMenu += `\n*💊 PILLS & DRUGS*\n`;
        Object.entries(barItems).filter(([_, i]) => ['pill', 'drug'].includes(i.type)).forEach(([id, item]) => {
          barMenu += `${item.name} - ${item.price} coins\n`;
        });

        barMenu += `\n*📋 USAGE*\n` +
          `• /bar <item> - Use item\n` +
          `• /sexworker - Hire companion\n` +
          `• /barstats - Check effects\n\n` +
          `_Examples: /bar beer, /bar weed_`;

        return await bot.sendMessage(chatId, barMenu, { parse_mode: 'Markdown' });
      }

      // Use item
      const itemId = args[0].toLowerCase();
      const item = barItems[itemId];

      if (!item) {
        return await bot.sendMessage(chatId, '❌ Item not found! Use /bar to see menu.');
      }

      if (user.balance < item.price) {
        return await bot.sendMessage(chatId, 
          `❌ Insufficient funds!\n\n` +
          `💰 Price: ${item.price} coins\n` +
          `💵 Your Balance: ${user.balance} coins`
        );
      }

      // Deduct cost
      await updateBalance(userId, -item.price, username);

      // Animate the action
      await animateAction(bot, chatId, item.animation, 1500);

      // Apply effects
      if (!user.barEffects) user.barEffects = [];
      user.barEffects.push({
        item: itemId,
        effect: item.effect,
        endTime: new Date(Date.now() + item.duration * 60 * 1000)
      });

      // Update health/mental based on item
      if (!user.health) user.health = 100;
      if (!user.mental) user.mental = 100;

      if (item.type === 'drink') {
        user.health = Math.max(0, user.health - Math.floor(Math.random() * 10));
      } else if (item.type === 'smoke') {
        user.health = Math.max(0, user.health - Math.floor(Math.random() * 15));
        user.mental = Math.min(100, user.mental + Math.floor(Math.random() * 5));
      } else if (item.type === 'pill' || item.type === 'drug') {
        user.health = Math.max(0, user.health - Math.floor(Math.random() * 20));
        user.mental = Math.min(100, user.mental + Math.floor(Math.random() * 10));
      } else if (item.type === 'hard_drug') {
        // Hard drugs cause severe damage
        user.health = Math.max(0, user.health - (item.healthDamage || 30));
        user.mental = Math.max(0, user.mental - Math.floor(Math.random() * 20));
        
        // Track addiction
        if (item.addiction) {
          if (!user.onHardDrugs) user.onHardDrugs = true;
          if (!user.drugAddictionStart) user.drugAddictionStart = new Date();
          if (!user.lastDrugMedicalFee) user.lastDrugMedicalFee = new Date();
        }
      }

      await user.save();

      const updatedUser = await getUser(userId);
      await bot.sendMessage(chatId,
        `✅ *${item.name} CONSUMED*\n\n` +
        `💰 Spent: ${item.price} coins\n` +
        `💵 Balance: ${updatedUser.balance} coins\n` +
        `❤️ Health: ${updatedUser.health}%\n` +
        `🧠 Mental: ${updatedUser.mental}%\n` +
        `⏰ Effect lasts: ${item.duration} min`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[BAR] Error:', error);
      await bot.sendMessage(chatId, '❌ Bar error. Try again.');
    }
  }
};
