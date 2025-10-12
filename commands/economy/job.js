
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const jobTypes = {
  'janitor': {
    name: '🧹 Janitor',
    basePay: 200,
    levels: [
      { level: 0, title: 'Apprentice Janitor', pay: 200 },
      { level: 5, title: 'Experienced Janitor', pay: 400 },
      { level: 10, title: 'Head Janitor', pay: 600 }
    ]
  },
  'cashier': {
    name: '💵 Cashier',
    basePay: 300,
    levels: [
      { level: 0, title: 'Trainee Cashier', pay: 300 },
      { level: 5, title: 'Senior Cashier', pay: 600 },
      { level: 10, title: 'Cashier Manager', pay: 900 }
    ]
  },
  'chef': {
    name: '👨‍🍳 Chef',
    basePay: 500,
    levels: [
      { level: 0, title: 'Line Cook', pay: 500 },
      { level: 5, title: 'Sous Chef', pay: 1000 },
      { level: 10, title: 'Executive Chef', pay: 1500 }
    ]
  },
  'engineer': {
    name: '⚙️ Engineer',
    basePay: 800,
    levels: [
      { level: 0, title: 'Junior Engineer', pay: 800 },
      { level: 5, title: 'Senior Engineer', pay: 1600 },
      { level: 10, title: 'Lead Engineer', pay: 2400 }
    ]
  },
  'doctor': {
    name: '👨‍⚕️ Doctor',
    basePay: 1200,
    levels: [
      { level: 0, title: 'Resident Doctor', pay: 1200 },
      { level: 5, title: 'Specialist', pay: 2400 },
      { level: 10, title: 'Chief Medical Officer', pay: 3600 }
    ]
  }
};

function getJobLevel(jobType, currentLevel) {
  const job = jobTypes[jobType];
  if (!job) return null;
  
  for (let i = job.levels.length - 1; i >= 0; i--) {
    if (currentLevel >= job.levels[i].level) {
      return job.levels[i];
    }
  }
  return job.levels[0];
}

export default {
  name: 'job',
  description: '💼 Get or change your job',
  category: 'Economy',
  aliases: ['work', 'career'],
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
      
      // Show job menu
      if (!args[0]) {
        let jobMenu = `💼 *JOB CENTER*\n\n` +
          `${getRankEmoji(user.rank)} ${user.username}\n\n`;
        
        if (user.job) {
          const jobLevel = getJobLevel(user.job, user.jobLevel || 0);
          jobMenu += `*Current Job:* ${jobTypes[user.job].name}\n` +
            `📊 Level: ${user.jobLevel || 0}\n` +
            `🏅 Title: ${jobLevel.title}\n` +
            `💰 Pay: ${jobLevel.pay} coins/hour\n\n`;
        } else {
          jobMenu += `No job yet!\n\n`;
        }
        
        jobMenu += `*Available Jobs:*\n\n`;
        Object.entries(jobTypes).forEach(([id, job]) => {
          jobMenu += `${job.name}\n` +
            `💰 Starting Pay: ${job.basePay} coins/hour\n` +
            `🎯 /job apply ${id}\n\n`;
        });

        return await bot.sendMessage(chatId, jobMenu, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();

      if (action === 'apply') {
        const jobId = args[1]?.toLowerCase();
        const job = jobTypes[jobId];

        if (!job) {
          return await bot.sendMessage(chatId, '❌ Invalid job! Use /job to see options.');
        }

        if (user.job === jobId) {
          return await bot.sendMessage(chatId, `❌ You already work as a ${job.name}!`);
        }

        user.job = jobId;
        user.jobLevel = 0;
        const jobLevel = getJobLevel(jobId, 0);
        user.jobTitle = jobLevel.title;
        await user.save();

        return await bot.sendMessage(chatId,
          `✅ *JOB ACCEPTED!*\n\n` +
          `${job.name}\n` +
          `🏅 Title: ${jobLevel.title}\n` +
          `💰 Pay: ${jobLevel.pay} coins/hour\n\n` +
          `🎉 Start working with /work command!`,
          { parse_mode: 'Markdown' }
        );
      }

      if (action === 'quit') {
        if (!user.job) {
          return await bot.sendMessage(chatId, '❌ You don\'t have a job!');
        }

        const oldJob = jobTypes[user.job].name;
        user.job = null;
        user.jobLevel = 0;
        user.jobTitle = null;
        await user.save();

        return await bot.sendMessage(chatId, `✅ You quit your job as ${oldJob}!`);
      }

    } catch (error) {
      console.error('[JOB] Error:', error);
      await bot.sendMessage(chatId, '❌ Job system error. Try again.');
    }
  }
};
