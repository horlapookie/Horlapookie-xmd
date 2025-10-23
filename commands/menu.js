import fs from "fs";
import os from "os";
import config from "../config.js";
import { channelInfo } from "../lib/channelConfig.js";
import { mediaUrls } from "../lib/mediaUrls.js";
import { menuButtonsConfig, menuButtons } from "../lib/menuButtons.js";

async function sendLongMessage(bot, chatId, text, options = {}) {
  const MAX_LENGTH = 4000;

  if (text.length <= MAX_LENGTH) {
    return await bot.sendMessage(chatId, text, options);
  }

  const sections = text.split('\n\n');
  let currentMessage = '';

  for (const section of sections) {
    if ((currentMessage + '\n\n' + section).length > MAX_LENGTH) {
      if (currentMessage) {
        await bot.sendMessage(chatId, currentMessage, options);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      currentMessage = section;
    } else {
      currentMessage += (currentMessage ? '\n\n' : '') + section;
    }
  }

  if (currentMessage) {
    await bot.sendMessage(chatId, currentMessage, options);
  }
}

export default {
  name: 'menu',
  description: 'Display bot menu with Economy & Card commands',
  aliases: ['help', 'commands'],
  async execute(msg, { sock, bot, args, settings }) {
    const chatId = msg.key.remoteJid;
    const prefix = config.prefix;
    const botName = config.botName;

    const platform = os.platform();
    const platformName = {
      'linux': 'Linux',
      'darwin': 'macOS', 
      'win32': 'Windows',
      'android': 'Android'
    }[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);

    const totalCommands = (global.commands?.size || 300);
    const now = new Date();
    const timeOptions = { timeZone: 'Africa/Lagos', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' };
    const dateOptions = { timeZone: 'Africa/Lagos', day: 'numeric', month: 'numeric', year: 'numeric' };
    const currentTime = now.toLocaleTimeString('en-US', timeOptions);
    const currentDate = now.toLocaleDateString('en-US', dateOptions);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

    const memUsage = process.memoryUsage();
    const usedMemory = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const totalMemory = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
    const memoryPercent = Math.round((usedMemory / totalMemory) * 100);

    const menuHeader = `╔╭━━〔 *${botName.toUpperCase()}* 〕━━╮

│ ✦ Mᴏᴅᴇ : ${global.botMode || 'public'}
│ ✦ Pʀᴇғɪx : [ ${prefix} ]
│ ✦ Usᴇʀ : @${msg.key.remoteJid.split('@')[0]}
│ ✦ Cᴏᴍᴍᴀɴᴅs : ${totalCommands}
│ ✦ Uᴘᴛɪᴍᴇ : ${uptimeString}
│ ✦ Tɪᴍᴇ : ${currentTime}
│ ✦ Dᴀᴛᴇ : ${currentDate}
│ ✦ Pʟᴀᴛғᴏʀᴍ : ${platformName}
│ ✦ Rᴀᴍ : ${memoryPercent}%
╰─────────────────╯

🎮 *PVP GAMING BOT*
━━━━━━━━━━━━━━━━━━━━━

📋 *Main Categories:*
💰 Economy System
🃏 Card Collection
⚔️ PVP Combat

Type ${prefix}menu <category> to view commands

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴏʀʟᴀ-ᴘᴏᴏᴋɪᴇ©`;

    const categories = {
      economy: `╭━━━✦❮ 💰 ECONOMY SYSTEM ❯✦━⊷

┃📋 *View commands by subcategory:*
┃ • ${prefix}menu bank - Banking & Finance
┃ • ${prefix}menu work - Jobs & Income
┃ • ${prefix}menu crime - Crime & Illegal
┃ • ${prefix}menu shop - Shopping & Items
┃ • ${prefix}menu invest - Investments
┃ • ${prefix}menu games - Games & Gambling
┃ • ${prefix}menu missions - Missions & Operations
┃ • ${prefix}menu bar - Bar & Lifestyle
┃ • ${prefix}menu combat - PVP Combat
┃ • ${prefix}menu account - Account Management
┃ • ${prefix}menu leaderboard - Rankings
╰━━━━━━━━━━━━━━━━━⊷`,

      bank: `╭━━━✦❮ 🏦 BANK & FINANCE ❯✦━⊷
┃✪ ${prefix}daily - Claim daily coins (1000)
┃✪ ${prefix}balance - Check balance & stats
┃✪ ${prefix}bank - Bank management menu
┃✪ ${prefix}deposit <amount> - Deposit to bank
┃✪ ${prefix}withdraw <amount> - Withdraw from bank
┃✪ ${prefix}bankupgrade - Upgrade bank limit
┃✪ ${prefix}give @user <amount> - Send coins
┃✪ ${prefix}loan - Request a loan (10% interest)
┃✪ ${prefix}repay - Repay your loan
┃✪ ${prefix}bills - Pay monthly bills
╰━━━━━━━━━━━━━━━━━⊷`,

      work: `╭━━━✦❮ 💼 JOBS & INCOME ❯✦━⊷
┃✪ ${prefix}work - Work for coins (1hr cooldown)
┃✪ ${prefix}beg - Beg for coins (30min cooldown)
┃✪ ${prefix}job - View/apply for jobs
┃✪ ${prefix}business - Buy/manage businesses
┃✪ ${prefix}property - Buy houses, cars, pets
┃✪ ${prefix}bonus - Collect bonuses
╰━━━━━━━━━━━━━━━━━⊷`,

      crime: `╭━━━✦❮ 🚨 CRIME & ILLEGAL ❯✦━⊷
┃✪ ${prefix}crime - Commit crimes for money
┃✪ ${prefix}rob @user - Rob other users
┃✪ ${prefix}attack @user - Attack with weapons
┃✪ ${prefix}reportattack - Report to police
┃✪ ${prefix}paycops - Pay cops to avoid jail
┃✪ ${prefix}jail - Check jail status
┃✪ ${prefix}bail @user - Bail someone out
╰━━━━━━━━━━━━━━━━━⊷`,

      shop: `╭━━━✦❮ 🏪 SHOPPING & ITEMS ❯✦━⊷
┃✪ ${prefix}shop - Browse shop items
┃✪ ${prefix}inventory - View your items
┃✪ ${prefix}items - List all available items
┃✪ ${prefix}useitem <item> - Use consumable items
┃✪ ${prefix}blackmarket - Secret black market
┃✪ ${prefix}pharmacy - Buy medicine & health
╰━━━━━━━━━━━━━━━━━⊷`,

      invest: `╭━━━✦❮ 📈 INVESTMENTS ❯✦━⊷
┃✪ ${prefix}invest - Stocks & crypto trading
┃✪ ${prefix}invest buy <type> <amount>
┃✪ ${prefix}invest sell <type> <amount>
┃✪ ${prefix}invest portfolio - View investments
╰━━━━━━━━━━━━━━━━━⊷`,

      games: `╭━━━✦❮ 🎰 GAMES & GAMBLING ❯✦━⊷
┃✪ ${prefix}slot <amount> - Slot machine
┃✪ ${prefix}dice <amount> - Dice betting
┃✪ ${prefix}gamble <amount> - 50/50 gamble
┃✪ ${prefix}aviator - Live aviator game
┃✪ ${prefix}checkers @user - Challenge to checkers
╰━━━━━━━━━━━━━━━━━⊷`,

      missions: `╭━━━✦❮ 🎯 MISSIONS & OPERATIONS ❯✦━⊷
┃✪ ${prefix}missions - View daily missions
┃✪ ${prefix}operation - Story missions
┃✪ ${prefix}operation heist - Casino heist
┃✪ ${prefix}operation vault - Central bank vault
╰━━━━━━━━━━━━━━━━━⊷`,

      bar: `╭━━━✦❮ 🍺 BAR & LIFESTYLE ❯✦━⊷
┃✪ ${prefix}bar - Visit the bar
┃✪ ${prefix}bar <item> - Order drinks/items
┃✪ ${prefix}barstats - Check bar effects
┃✪ ${prefix}sexworker - Hire companions
┃✪ ${prefix}handlepregnancy - Pregnancy choices
┃✪ ${prefix}pharmacy - Health items
╰━━━━━━━━━━━━━━━━━⊷`,

      combat: `╭━━━✦❮ ⚔️ PVP COMBAT SYSTEM ❯✦━⊷
┃✪ ${prefix}challenge @user - Challenge player
┃✪ ${prefix}accept - Accept challenge
┃✪ ${prefix}decline - Decline challenge
┃
┃⚔️ *BASIC MOVES:*
┃✪ ${prefix}attack gun @user - Shoot with gun (30-50 dmg)
┃✪ ${prefix}attack knife @user - Stab (20-35 dmg)
┃✪ ${prefix}attack bottle @user - Hit (10-20 dmg)
┃✪ ${prefix}punch @user - Punch (5-15 dmg)
┃✪ ${prefix}kick @user - Kick (15-25 dmg, 85% accuracy)
┃
┃🥊 *SPECIAL MOVES:*
┃✪ ${prefix}uppercut @user - Uppercut (30-45 dmg)
┃  ↳ 70% accuracy, 20% critical hit chance
┃  ↳ Must be learned first!
┃
┃🛡️ *DEFENSIVE:*
┃✪ ${prefix}dodge - Dodge attack
┃✪ ${prefix}weave - Weave dodge
┃✪ ${prefix}block - Block attack
┃✪ ${prefix}useitem medkit - Restore 50 HP
┃✪ ${prefix}useitem bandage - Restore 20 HP
┃
┃❤️ *TIPS:*
┃• Buy weapons & items in /shop
┃• Check HP with /balance
┃• Use /inventory to see your items
╰━━━━━━━━━━━━━━━━━⊷`,

      account: `╭━━━✦❮ 👤 ACCOUNT MANAGEMENT ❯✦━⊷
┃✪ ${prefix}credentials - View login info
┃✪ ${prefix}setpassword - Set website password
┃✪ ${prefix}setusername - Set display name
┃✪ ${prefix}pair - Deploy your bot
┃✪ ${prefix}mybots - View your bots
┃✪ ${prefix}unpair - Remove your bot
╰━━━━━━━━━━━━━━━━━⊷`,

      leaderboard: `╭━━━✦❮ 🏆 RANKINGS ❯✦━⊷
┃✪ ${prefix}leaderboard - Top richest users
┃✪ ${prefix}leaderboard wealth - By balance
┃✪ ${prefix}leaderboard crimes - By crimes
┃✪ ${prefix}leaderboard wins - By PVP wins
╰━━━━━━━━━━━━━━━━━⊷`,

      cards: `╭━━━✦❮ 🃏 CARD COLLECTION SYSTEM ❯✦━⊷
┃✪ ${prefix}spawncard - Spawn random card (5min cooldown)
┃✪ ${prefix}spawncard --tier=S - Spawn specific tier
┃✪ ${prefix}spawncard --name=Sukuna - Spawn by name
┃✪ ${prefix}searchcard <name> - Search cards by name
┃✪ ${prefix}searchcard --tier=6 - Search by tier
┃✪ ${prefix}collect <captcha> - Claim spawned card
┃✪ ${prefix}deck [index] - View your deck (12 cards max)
┃✪ ${prefix}collection [index] - View all cards
┃✪ ${prefix}cards [--events|--name|--tier] - Display cards
┃✪ ${prefix}gcard <index> @user - Give deck card to user
┃✪ ${prefix}buycard - Purchase from active sale
┃✪ ${prefix}salecard <index> <price> - Sell your card
┃✪ ${prefix}swap <index1> <index2> - Swap deck positions
┃✪ ${prefix}t2deck <index> - Transfer card to deck
┃✪ ${prefix}t2coll <index> - Transfer card to collection
┃✪ ${prefix}cardstatus - Check card system status
┃
┃💡 *How It Works:*
┃• Spawn cards with /spawncard (5min cooldown)
┃• Filter by tier or name when spawning
┃• Search cards with /searchcard
┃• Collect with correct captcha
┃• First 12 cards = deck, rest = collection
┃• Move cards between deck/collection with t2deck/t2coll
┃• Give cards to friends with /gcard
┃• Buy/sell cards with other users
┃• All stored in MongoDB database
╰━━━━━━━━━━━━━━━━━⊷`
    };

    const normalizeCategory = (cat) => {
      return cat?.toLowerCase().replace(/\s+/g, '').replace(/-/g, '').replace(/_/g, '');
    };

    const category = args[0]?.toLowerCase();
    const normalizedInput = normalizeCategory(category);

    let matchedCategory = null;
    for (const [key, value] of Object.entries(categories)) {
      if (normalizeCategory(key) === normalizedInput || key === category) {
        matchedCategory = value;
        break;
      }
    }

    const categoryMappings = {
      'pvp': 'combat',
      'fight': 'combat',
      'battle': 'combat',
      'banking': 'bank',
      'finance': 'bank',
      'jobs': 'work',
      'income': 'work',
      'gambling': 'games',
      'card': 'cards',
      'collection': 'cards'
    };

    if (!matchedCategory && categoryMappings[normalizedInput]) {
      matchedCategory = categories[categoryMappings[normalizedInput]];
    }

    if (matchedCategory) {
      try {
        await sendLongMessage(bot, chatId, matchedCategory, { parse_mode: 'Markdown' });
      } catch (error) {
        console.log('[MENU] Error sending category:', error.message);
        await bot.sendMessage(chatId, matchedCategory);
      }
      return;
    }

    try {
      const menuImageUrl = mediaUrls.menuImage || 'https://files.catbox.moe/i4bbnf.png';

      const menuOptions = {
        caption: menuHeader,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💰 Economy', callback_data: 'menu_economy' },
              { text: '🃏 Cards', callback_data: 'menu_cards' }
            ],
            [
              { text: '🏦 Bank', callback_data: 'menu_bank' },
              { text: '💼 Work', callback_data: 'menu_work' }
            ],
            [
              { text: '🚨 Crime', callback_data: 'menu_crime' },
              { text: '🏪 Shop', callback_data: 'menu_shop' }
            ],
            [
              { text: '📈 Invest', callback_data: 'menu_invest' },
              { text: '🎰 Games', callback_data: 'menu_games' }
            ],
            [
              { text: '⚔️ Combat', callback_data: 'menu_combat' },
              { text: '🍺 Bar', callback_data: 'menu_bar' }
            ],
            [
              { text: '👤 Account', callback_data: 'menu_account' },
              { text: '🏆 Leaderboard', callback_data: 'menu_leaderboard' }
            ],
            [
              { text: '👤 Creator', url: 'https://wa.me/2347049044897' },
              { text: '📂 Repository', url: 'https://github.com/horlapookie/Horlapookie-xmd' }
            ]
          ]
        }
      };

      await bot.sendPhoto(chatId, menuImageUrl, menuOptions);

    } catch (error) {
      console.log('[MENU] Error sending main menu:', error.message);
      await bot.sendMessage(chatId, menuHeader, { parse_mode: 'Markdown' });
    }
  }
};