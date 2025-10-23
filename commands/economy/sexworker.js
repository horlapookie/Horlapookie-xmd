
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const workers = {
  'cheap': {
    name: '💃 Street Worker',
    price: 100,
    satisfaction: 30,
    riskPregnancy: true,
    stdRisk: 60, // 60% STD risk without condom
    animation: [
      '💃 *Approaching worker...*',
      '💰 *Paying upfront...*',
      '🚗 *Finding a spot...*',
      '😏 *Quick session...*',
      '✅ *Service complete!*'
    ]
  },
  'average': {
    name: '👱‍♀️ Escort',
    price: 500,
    satisfaction: 60,
    animation: [
      '👱‍♀️ *Calling escort service...*',
      '🚗 *Escort arrives...*',
      '🏨 *Heading to hotel...*',
      '😘 *Enjoying time together...*',
      '💋 *Passionate moments...*',
      '✅ *Unforgettable experience!*'
    ]
  },
  'luxury': {
    name: '👸 VIP Companion',
    price: 2000,
    satisfaction: 90,
    animation: [
      '👸 *Booking VIP companion...*',
      '🍾 *Champagne on arrival...*',
      '🏰 *Luxury penthouse suite...*',
      '😍 *Premium experience begins...*',
      '💎 *Multiple rounds...*',
      '🔥 *Mind-blowing pleasure...*',
      '✅ *Best night ever!*'
    ]
  },
  'legendary': {
    name: '⭐ Supermodel',
    price: 10000,
    satisfaction: 100,
    animation: [
      '⭐ *Contacting supermodel agency...*',
      '🚁 *Helicopter pickup...*',
      '🏝️ *Private island getaway...*',
      '🍾 *Dom Pérignon & caviar...*',
      '😈 *Wild night begins...*',
      '💥 *Explosive passion...*',
      '🌟 *Multiple orgasms...*',
      '🔥 *Hours of pleasure...*',
      '✅ *Legendary experience!*'
    ]
  }
};

async function animateAction(bot, chatId, animations, delay = 1500) {
  for (const text of animations) {
    await bot.sendMessage(chatId, text);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export default {
  name: 'sexworker',
  description: '💋 Hire a companion for pleasure',
  category: 'Economy',
  aliases: ['escort', 'companion', 'sw'],
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
            `🔒 *IN JAIL!*\n\n` +
            `❌ No companions in prison!\n` +
            `⏰ Release: ${minutesLeft} min`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Show menu
      if (!args[0]) {
        let menu = `💋 *COMPANION SERVICE*\n\n` +
          `${rankEmoji} ${user.username}\n` +
          `💰 Balance: ${user.balance.toLocaleString()} coins\n` +
          `❤️ Health: ${user.health || 100}%\n` +
          `😊 Satisfaction: ${user.satisfaction || 0}%\n\n`;

        Object.entries(workers).forEach(([id, w]) => {
          menu += `${w.name}\n` +
            `💰 ${w.price} coins | ❤️ +${w.satisfaction}% satisfaction\n` +
            `/sexworker ${id}\n\n`;
        });

        menu += `_Higher tiers = better experience!_`;

        return await bot.sendMessage(chatId, menu, { parse_mode: 'Markdown' });
      }

      const workerId = args[0].toLowerCase();
      const useCondom = args[1]?.toLowerCase() === 'condom';
      const worker = workers[workerId];

      if (!worker) {
        return await bot.sendMessage(chatId, '❌ Invalid option! Use /sexworker to see menu.');
      }

      // Check health
      if (user.health < 30) {
        return await bot.sendMessage(chatId,
          `❤️ *HEALTH TOO LOW!*\n\n` +
          `Your health: ${user.health}%\n` +
          `❌ Too weak for this activity!\n` +
          `Visit /pharmacy first.`
        );
      }

      const totalCost = worker.price + (useCondom ? 50 : 0);

      if (user.balance < totalCost) {
        return await bot.sendMessage(chatId, 
          `❌ Can't afford ${worker.name}${useCondom ? ' + condom' : ''}!\n\n` +
          `💰 Price: ${totalCost} coins\n` +
          `💵 Balance: ${user.balance} coins`
        );
      }

      // Deduct cost
      await updateBalance(userId, -totalCost, username);

      // Animate
      await animateAction(bot, chatId, worker.animation, 2000);

      // Handle pregnancy risk
      let pregnancyMsg = '';
      let stdMsg = '';
      
      if (!useCondom && worker.riskPregnancy) {
        const pregnancyChance = Math.random() * 100;
        if (pregnancyChance < 15) { // 15% pregnancy chance
          if (!user.pregnancies) user.pregnancies = [];
          const pregnancy = {
            workerId,
            workerName: worker.name,
            date: new Date(),
            dueDate: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000), // 9 months
            decision: null // 'abort' or 'keep'
          };
          user.pregnancies.push(pregnancy);
          pregnancyMsg = `\n\n⚠️ *PREGNANCY ALERT!*\n` +
            `The worker got pregnant!\n` +
            `💰 Abortion: 50M coins\n` +
            `👶 Child support: 10M/month for 18 years\n` +
            `Use /handlepregnancy to decide!`;
        }
        
        // STD risk
        const stdChance = Math.random() * 100;
        if (stdChance < worker.stdRisk) {
          user.hasSTD = true;
          user.stdCureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          stdMsg = `\n\n🦠 *STD CONTRACTED!*\n` +
            `❌ You got an infection!\n` +
            `💊 Treatment: Visit /pharmacy\n` +
            `💰 Medical costs: 5M coins`;
        }
      }

      // Update stats
      if (!user.health) user.health = 100;
      if (!user.satisfaction) user.satisfaction = 0;
      
      user.satisfaction = Math.min(100, user.satisfaction + worker.satisfaction);
      user.health = Math.max(0, user.health - 5); // Slightly tiring
      user.mental = Math.min(100, (user.mental || 100) + 10); // Mental boost

      if (!user.sexStats) user.sexStats = { total: 0, spent: 0 };
      user.sexStats.total += 1;
      user.sexStats.spent += worker.price;

      await user.save();

      const updatedUser = await getUser(userId);
      await bot.sendMessage(chatId,
        `💋 *SERVICE COMPLETE*\n\n` +
        `${worker.name}\n` +
        `${useCondom ? '✅ Protected (condom used)' : '⚠️ Unprotected!'}\n\n` +
        `💰 Spent: ${totalCost.toLocaleString()} coins\n` +
        `💵 Balance: ${updatedUser.balance.toLocaleString()} coins\n` +
        `😊 Satisfaction: ${updatedUser.satisfaction}%\n` +
        `❤️ Health: ${updatedUser.health}%\n` +
        `🧠 Mental: ${updatedUser.mental}%\n\n` +
        `_Total sessions: ${updatedUser.sexStats.total}_` +
        pregnancyMsg +
        stdMsg,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[SEXWORKER] Error:', error);
      await bot.sendMessage(chatId, '❌ Service unavailable. Try again.');
    }
  }
};
