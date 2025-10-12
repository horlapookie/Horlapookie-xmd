
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const dailyMissionTypes = [
  { id: 'gamble', description: 'Win 2 gambles', reward: 1000, target: 2 },
  { id: 'deposit', description: 'Deposit 500 to bank', reward: 500, target: 500 },
  { id: 'work', description: 'Work 3 times', reward: 1500, target: 3 },
  { id: 'rob', description: 'Successfully rob 1 person', reward: 2000, target: 1 }
];

const storyMissions = {
  'casino_heist': {
    name: '🎰 Casino Heist',
    description: 'Plan and execute a daring casino robbery',
    reward: 25000,
    xpReward: 200,
    requiredLevel: 5,
    requiredRank: null,
    requiredItem: 'lockpick',
    difficulty: 'Hard'
  },
  'vault_hack': {
    name: '💎 Vault Hack',
    description: 'Hack into a high-security vault',
    reward: 50000,
    xpReward: 500,
    requiredLevel: 10,
    requiredRank: null,
    requiredItem: 'hack_tool',
    difficulty: 'Extreme'
  },
  'diamond_smuggle': {
    name: '💍 Diamond Smuggling',
    description: 'Smuggle rare diamonds across borders',
    reward: 35000,
    xpReward: 300,
    requiredLevel: 7,
    requiredRank: null,
    requiredItem: null,
    difficulty: 'Hard'
  },
  'legendary_crypto_heist': {
    name: '🌐 Legendary Crypto Exchange Hack',
    description: 'Hack the world\'s largest crypto exchange',
    reward: 5000000,
    xpReward: 3000,
    requiredLevel: 20,
    requiredRank: 'Legend',
    requiredItem: 'advanced_hack_kit',
    difficulty: 'Legendary'
  },
  'legendary_mint_robbery': {
    name: '🏛️ Legendary Government Mint Robbery',
    description: 'Rob the government money printing facility',
    reward: 10000000,
    xpReward: 5000,
    requiredLevel: 25,
    requiredRank: 'Legend',
    requiredItems: ['thermal_drill', 'emp_device', 'escape_chopper'],
    difficulty: 'Legendary'
  },
  'legendary_museum_heist': {
    name: '🗿 Legendary Historical Museum Heist',
    description: 'Steal priceless artifacts worth billions',
    reward: 25000000,
    xpReward: 10000,
    requiredLevel: 30,
    requiredRank: 'Legend',
    requiredItems: ['glass_cutter', 'disguise_kit', 'satellite_jammer'],
    difficulty: 'Legendary'
  }
};

export default {
  name: 'missions',
  description: '🎯 Complete missions for rewards',
  category: 'Economy',
  aliases: ['mission', 'quest'],
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
      
      // Reset daily missions if needed
      const now = new Date();
      const lastReset = user.lastMissionReset ? new Date(user.lastMissionReset) : new Date(0);
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        user.dailyMissions = [];
        user.lastMissionReset = now;
        
        // Generate 2 random daily missions
        const shuffled = [...dailyMissionTypes].sort(() => 0.5 - Math.random());
        user.dailyMissions = shuffled.slice(0, 2).map(m => ({
          ...m,
          progress: 0,
          completed: false
        }));
        
        await user.save();
      }

      // Show missions menu
      if (!args[0]) {
        const rankEmoji = getRankEmoji(user.rank);
        let missionsMenu = `🎯 MISSIONS\n\n${rankEmoji} ${user.username}\n\n`;
        
        // Daily missions
        missionsMenu += `📅 DAILY MISSIONS\n`;
        if (user.dailyMissions && user.dailyMissions.length > 0) {
          user.dailyMissions.forEach((m, i) => {
            const status = m.completed ? '✅' : '⏳';
            missionsMenu += `${status} ${m.description}\n` +
              `   Progress: ${m.progress}/${m.target}\n` +
              `   Reward: ${m.reward} coins\n`;
          });
        } else {
          missionsMenu += `No daily missions available\n`;
        }
        
        // Story missions
        missionsMenu += `\n📖 STORY MISSIONS\n`;
        Object.entries(storyMissions).forEach(([id, mission]) => {
          const completed = user.completedStoryMissions?.includes(id);
          const rankMatch = !mission.requiredRank || user.rank === mission.requiredRank;
          const levelMatch = (user.level || 1) >= mission.requiredLevel;
          const status = completed ? '✅' : 
            (rankMatch && levelMatch) ? '🎯' : '🔒';
          
          const rewardText = mission.reward >= 1000000 ? 
            `${(mission.reward / 1000000).toFixed(1)}M coins` : 
            `${mission.reward} coins`;
          
          missionsMenu += `${status} ${mission.name}\n` +
            `   ${mission.description}\n` +
            `   Difficulty: ${mission.difficulty}\n` +
            `   Level: ${mission.requiredLevel}${mission.requiredRank ? ` | ${mission.requiredRank}` : ''}\n` +
            `   Reward: ${rewardText}\n` +
            `   ${completed ? 'Completed!' : `Type: /missions start ${id}`}\n`;
        });
        
        return await bot.sendMessage(chatId, missionsMenu);
      }

      const action = args[0].toLowerCase();

      if (action === 'start') {
        const missionId = args[1]?.toLowerCase();
        const mission = storyMissions[missionId];

        if (!mission) {
          return await bot.sendMessage(chatId, '❌ Invalid mission! Use /missions to see options.');
        }

        if (user.completedStoryMissions?.includes(missionId)) {
          return await bot.sendMessage(chatId, '❌ You already completed this mission!');
        }

        if (mission.requiredRank) {
          // Normalize rank names for comparison
          const userRankNorm = user.rank.toLowerCase();
          const requiredRankNorm = mission.requiredRank.toLowerCase();
          
          if (userRankNorm !== requiredRankNorm) {
            return await bot.sendMessage(chatId, 
              `❌ ${mission.requiredRank} rank required!\nYour rank: ${user.rank}`
            );
          }
        }

        if ((user.level || 1) < mission.requiredLevel) {
          return await bot.sendMessage(chatId, 
            `❌ Level ${mission.requiredLevel} required!\nYour level: ${user.level || 1}`
          );
        }

        if (mission.requiredItem) {
          const hasItem = user.inventory?.find(i => i.item === mission.requiredItem && i.quantity > 0);
          if (!hasItem) {
            return await bot.sendMessage(chatId,
              `❌ You need ${mission.requiredItem} for this mission!\nBuy it from /shop`
            );
          }
        }

        if (mission.requiredItems) {
          const missingItems = [];
          for (const item of mission.requiredItems) {
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

        // Mission success based on difficulty
        const successRates = { 'Hard': 0.6, 'Extreme': 0.4 };
        const success = Math.random() < successRates[mission.difficulty];

        if (success) {
          await updateBalance(userId, mission.reward, username);
          user.xp += mission.xpReward;

          if (!user.completedStoryMissions) user.completedStoryMissions = [];
          user.completedStoryMissions.push(missionId);

          // Remove required item
          if (mission.requiredItem) {
            const item = user.inventory.find(i => i.item === mission.requiredItem);
            if (item) {
              item.quantity -= 1;
              if (item.quantity === 0) {
                user.inventory = user.inventory.filter(i => i.item !== mission.requiredItem);
              }
            }
          }

          await user.save();

          return await bot.sendMessage(chatId,
            `✅ MISSION COMPLETE!\n\n` +
            `${mission.name}\n` +
            `💰 Reward: ${mission.reward} coins\n` +
            `⭐ XP: +${mission.xpReward}\n` +
            `💵 New Balance: ${user.balance} coins\n\n` +
            `🎉 Great work!`
          );
        } else {
          return await bot.sendMessage(chatId,
            `❌ MISSION FAILED!\n\n` +
            `${mission.name} was too difficult!\n` +
            `Try again later or level up more.`
          );
        }
      }

    } catch (error) {
      console.error('[MISSIONS] Error:', error);
      await bot.sendMessage(chatId, '❌ Missions error. Try again.');
    }
  }
};

// Helper function to update mission progress (call from other commands)
export async function updateMissionProgress(userId, missionType, amount = 1) {
  try {
    const { getUser } = await import('../../lib/economy.js');
    const user = await getUser(userId);
    
    if (!user.dailyMissions || user.dailyMissions.length === 0) return;

    let updated = false;
    user.dailyMissions.forEach(mission => {
      if (mission.id === missionType && !mission.completed) {
        mission.progress = Math.min(mission.progress + amount, mission.target);
        if (mission.progress >= mission.target) {
          mission.completed = true;
          user.balance += mission.reward;
          updated = true;
        }
      }
    });

    if (updated) {
      await user.save();
    }
  } catch (error) {
    console.error('[MISSIONS] Progress update error:', error);
  }
}
