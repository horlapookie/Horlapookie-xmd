
import fs from "fs";
import os from "os";
import config from "../config.js";
import { channelInfo } from "../lib/channelConfig.js";
import { mediaUrls } from "../lib/mediaUrls.js";
import { menuButtonsConfig, menuButtons } from "../lib/menuButtons.js";

// Helper function to split long messages
async function sendLongMessage(bot, chatId, text, options = {}) {
  const MAX_LENGTH = 4000; // Telegram limit is 4096, using 4000 for safety
  
  if (text.length <= MAX_LENGTH) {
    return await bot.sendMessage(chatId, text, options);
  }
  
  // Split by sections or paragraphs
  const sections = text.split('\n\n');
  let currentMessage = '';
  
  for (const section of sections) {
    if ((currentMessage + '\n\n' + section).length > MAX_LENGTH) {
      if (currentMessage) {
        await bot.sendMessage(chatId, currentMessage, options);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
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
description: 'Display bot menu with all commands',
aliases: ['help', 'commands'],
async execute(msg, { sock, bot, args, settings }) {
const from = msg.key.remoteJid;
const chatId = msg.key.remoteJid;
const prefix = config.prefix;
const botName = config.botName;
const ownerName = config.ownerName;

// Detect platform
const platform = os.platform();
const platformName = {
  'linux': 'Linux',
  'darwin': 'macOS',
  'win32': 'Windows',
  'android': 'Android'
}[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);

// Get total command count dynamically
const totalCommands = (global.commands?.size || 316) + (global.selfCommands?.size || 21);

// Get current time and date
const now = new Date();
const timeOptions = {
  timeZone: 'Africa/Lagos',
  hour12: true,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
};
const dateOptions = {
  timeZone: 'Africa/Lagos',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric'
};

const currentTime = now.toLocaleTimeString('en-US', timeOptions);
const currentDate = now.toLocaleDateString('en-US', dateOptions);

// Bot uptime calculation
const uptime = process.uptime();
const hours = Math.floor(uptime / 3600);
const minutes = Math.floor((uptime % 3600) / 60);
const seconds = Math.floor(uptime % 60);
const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

// Memory usage
const memUsage = process.memoryUsage();
const usedMemory = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
const totalMemory = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
const memoryPercent = Math.round((usedMemory / totalMemory) * 100);

// Main menu header
const menuHeader = `╔╭━━〔 *HORLA POOKIE BOT* 〕━━╮

│ ✦ Mᴏᴅᴇ : ${global.botMode || 'public'}
│ ✦ Pʀᴇғɪx : [ ${prefix} ]
│ ✦ Usᴇʀ : @${msg.key.remoteJid.split('@')[0]}
│ ✦ Pʟᴜɢɪɴs : ${totalCommands}
│ ✦ Vᴇʀsɪᴏɴ : 2.0
│ ✦ Uᴘᴛɪᴍᴇ : ${uptimeString}
│ ✦ Tɪᴍᴇ Nᴏᴡ : ${currentTime}
│ ✦ Dᴀᴛᴇ Tᴏᴅᴀʏ : ${currentDate}
│ ✦ Pʟᴀᴛғᴏʀᴍ : ${platformName}
│ ✦ Tɪᴍᴇ Zᴏɴᴇ : Africa/Lagos
│ ✦ Sᴇʀᴠᴇʀ Rᴀᴍ : ${memoryPercent}% Used
╰─────────────────╯

📜 *Command Categories Available:*

🛠️ Basic Tools
👥 Group Management
💱 Forex Tools
🤖 AI Commands
🎨 AI Image Generator
🎙️ Voice & Audio
🎮 Games & Fun
🎨 Creativity & Art
👤 Personal Stuff
✨ Image Effects
🏷️ Sticker Creator
🎵 Music & Media
📥 Downloaders
🔞 NSFW
🐛 Bug Commands
🔐 Encryption
🐙 GitHub Tools
🎨 Logo Creators
🔍 Search & Info
💡 Utility Tools
🔗 URL Tools
🙏 Religious
🔄 Bot Modes
ℹ️ Bot Info
🔧 Other Commands
🔄 Automation
📁 File Management
⚙️ Self Settings
🤖 Self Mode
📸 Screenshots
🖼️ Image Search
⚽ Football Live
💻 Code Runner

Type ${prefix}menu <category> to see commands in that category
Example: ${prefix}menu ai

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴏʀʟᴀ-ᴘᴏᴏᴋɪᴇ-ʙᴏᴛ©`;

// Category-specific menus
const categories = {
  basic: `╭━━━✦❮ 🛠️ BASIC TOOLS ❯✦━⊷
┃✪ ${prefix}echo - Echo text
┃✪ ${prefix}log - View logs
┃✪ ${prefix}ping - Check latency
┃✪ ${prefix}profile - View profile
┃✪ ${prefix}setusername - Set username
┃✪ ${prefix}time - Current time
┃✪ ${prefix}uptime - Bot uptime
┃✪ ${prefix}userinfo - User information
┃✪ ${prefix}botinfo - Bot information
┃✪ ${prefix}id - Get chat/user ID
╰━━━━━━━━━━━━━━━━━⊷`,

  group: `╭━━━✦❮ 👥 GROUP MANAGEMENT ❯✦━⊷
┃✪ ${prefix}announce - Make announcement
┃✪ ${prefix}info - Group information
┃✪ ${prefix}broadcast - Broadcast message
┃✪ ${prefix}chatbot - Toggle chatbot
┃✪ ${prefix}delete - Delete message
┃✪ ${prefix}demote - Demote admin
┃✪ ${prefix}gdesc - Set group description
┃✪ ${prefix}gname - Set group name
┃✪ ${prefix}groupinfo - Detailed group info
┃✪ ${prefix}kick - Kick member
┃✪ ${prefix}lock - Lock group
┃✪ ${prefix}promote - Promote to admin
┃✪ ${prefix}remove - Remove member
┃✪ ${prefix}tagall - Tag all members
┃✪ ${prefix}unlock - Unlock group
┃✪ ${prefix}warn - Warn member
┃✪ ${prefix}welcome - Welcome config
┃✪ ${prefix}goodbye - Goodbye config
┃✪ ${prefix}antilink - Antilink protection
┃✪ ${prefix}antidelete - Anti-delete messages
┃✪ ${prefix}disappear - Disappearing messages
╰━━━━━━━━━━━━━━━━━⊷`,

  forex: `╭━━━✦❮ 💱 FOREX TOOLS ❯✦━⊷
┃✪ ${prefix}currencylist - Available currencies
┃✪ ${prefix}forex - Forex rates
┃✪ ${prefix}fxexchange - Currency exchange
┃✪ ${prefix}fxpairs - Currency pairs
┃✪ ${prefix}fxstatus - Forex market status
┃✪ ${prefix}stocktickers - Stock tickers
╰━━━━━━━━━━━━━━━━━⊷`,

  ai: `╭━━━✦❮ 🤖 AI COMMANDS ❯✦━⊷
┃✪ ${prefix}ai2 - AI assistant
┃✪ ${prefix}ask - Ask questions
┃✪ ${prefix}copilot - GitHub Copilot AI
┃✪ ${prefix}gpt4 - GPT-4 AI
┃✪ ${prefix}gta - GTA assistant
┃✪ ${prefix}translate - Translate text
┃✪ ${prefix}google - Google search
┃✪ ${prefix}bing - Bing search
┃✪ ${prefix}chatbot - Toggle AI chatbot
╰━━━━━━━━━━━━━━━━━⊷`,

  'ai image': `╭━━━✦❮ 🎨 AI IMAGE GENERATOR ❯✦━⊷
┃✪ ${prefix}images - Generate AI images
┃✪ ${prefix}imgs - Image search
┃✪ ${prefix}carbon - Code to image
┃✪ ${prefix}colorize - Colorize images
┃✪ ${prefix}remini - Enhance image quality
╰━━━━━━━━━━━━━━━━━⊷`,

  voice: `╭━━━✦❮ 🎙️ VOICE & AUDIO ❯✦━⊷
┃✪ ${prefix}bass - Bass boost audio
┃✪ ${prefix}deep - Deep voice effect
┃✪ ${prefix}nightcore - Nightcore effect
┃✪ ${prefix}reverse - Reverse audio
┃✪ ${prefix}stt - Speech to text
┃✪ ${prefix}tts - Text to speech
┃✪ ${prefix}trap - Trap music effect
╰━━━━━━━━━━━━━━━━━⊷`,

  games: `╭━━━✦❮ 🎮 GAMES & FUN ❯✦━⊷
┃✪ ${prefix}answer - Answer trivia
┃✪ ${prefix}character - Character game
┃✪ ${prefix}hangman - Hangman game
┃✪ ${prefix}joke - Random jokes
┃✪ ${prefix}myscore - Your game score
┃✪ ${prefix}riddle - Riddle puzzles
┃✪ ${prefix}ship - Ship calculator
┃✪ ${prefix}roll - Roll dice
┃✪ ${prefix}trivia - Trivia questions
╰━━━━━━━━━━━━━━━━━⊷`,

  creativity: `╭━━━✦❮ 🎨 CREATIVITY & ART ❯✦━⊷
┃✪ ${prefix}carbon - Code screenshots
┃✪ ${prefix}write2 - Handwriting text
┃✪ ${prefix}neon - Neon text effect
┃✪ ${prefix}quote - Generate quotes
╰━━━━━━━━━━━━━━━━━⊷`,

  personal: `╭━━━✦❮ 👤 PERSONAL STUFF ❯✦━⊷
┃✪ ${prefix}profile - Your profile
┃✪ ${prefix}userinfo - User details
┃✪ ${prefix}getpp - Get profile picture
┃✪ ${prefix}fullpp - Full quality PP
┃✪ ${prefix}setusername - Set username
╰━━━━━━━━━━━━━━━━━⊷`,

  effects: `╭━━━✦❮ ✨ IMAGE EFFECTS ❯✦━⊷
┃✪ ${prefix}brightness - Adjust brightness
┃✪ ${prefix}contrast - Adjust contrast
┃✪ ${prefix}greyscale - Greyscale filter
┃✪ ${prefix}sepia - Sepia effect
┃✪ ${prefix}invert - Invert colors
┃✪ ${prefix}flip - Flip image
┃✪ ${prefix}rotate - Rotate image
┃✪ ${prefix}dehaze - Remove haze
┃✪ ${prefix}blur - Blur effect
┃✪ ${prefix}removebg - Remove background
┃✪ ${prefix}resize - Resize image
╰━━━━━━━━━━━━━━━━━⊷`,

  sticker: `╭━━━✦❮ 🏷️ STICKER CREATOR ❯✦━⊷
┃✪ ${prefix}attp - Animated text
┃✪ ${prefix}emomix - Emoji mixer
┃✪ ${prefix}photo2 - Photo to sticker
┃✪ ${prefix}gif - GIF to sticker
┃✪ ${prefix}simage - Sticker from image
┃✪ ${prefix}sticker - Create sticker
┃✪ ${prefix}take2 - Take/edit sticker
┃✪ ${prefix}url2 - URL to sticker
┃✪ ${prefix}mp4 - Sticker to video
╰━━━━━━━━━━━━━━━━━⊷`,

  media: `╭━━━✦❮ 🎵 MUSIC & MEDIA ❯✦━⊷
┃✪ ${prefix}lyrics - Song lyrics
┃✪ ${prefix}play - Play/download music
┃✪ ${prefix}audio - Audio download
┃✪ ${prefix}song - Download song
┃✪ ${prefix}tiktok - TikTok downloader
┃✪ ${prefix}video - Video download
┃✪ ${prefix}yt - YouTube downloader
╰━━━━━━━━━━━━━━━━━⊷`,

  downloaders: `╭━━━✦❮ 📥 DOWNLOADERS ❯✦━⊷
┃✪ ${prefix}play - Music downloader
┃✪ ${prefix}video - Video downloader
┃✪ ${prefix}tiktok - TikTok videos
┃✪ ${prefix}yt - YouTube content
┃✪ ${prefix}song - Song downloader
┃✪ ${prefix}audio - Audio files
╰━━━━━━━━━━━━━━━━━⊷`,

  anti: `╭━━━✦❮ 🛡️ ANTI-COMMANDS ❯✦━⊷
┃✪ ${prefix}antilink - Anti-link protection
┃✪ ${prefix}antidelete - Anti-delete messages
╰━━━━━━━━━━━━━━━━━⊷`,

  nsfw: `╭━━━✦❮ 🔞 NSFW COMMANDS ❯✦━⊷
┃✪ ${prefix}blowjob - NSFW content
┃✪ ${prefix}hentai - Hentai images
┃✪ ${prefix}hentaivid - Hentai videos
┃✪ ${prefix}hneko - Neko hentai
┃✪ ${prefix}hwaifu - Waifu hentai
┃✪ ${prefix}xvideo - Adult videos
┃✪ ${prefix}xx1 - NSFW content
┃✪ ${prefix}xx2 - NSFW content
┃✪ ${prefix}xxv1 - NSFW videos
┃✪ ${prefix}xxv2 - NSFW videos
╰━━━━━━━━━━━━━━━━━⊷`,

  bug: `╭━━━✦❮ 🐛 BUG COMMANDS ❯✦━⊷
┃✪ ${prefix}crash - Crash command
┃✪ ${prefix}boom - Boom effect
┃✪ ${prefix}fire - Fire effect
╰━━━━━━━━━━━━━━━━━⊷`,

  encryption: `╭━━━✦❮ 🔐 ENCRYPTION TOOLS ❯✦━⊷
┃✪ ${prefix}base64 - Base64 encode/decode
┃✪ ${prefix}ebinary - Encode to binary
┃✪ ${prefix}debinary - Decode from binary
┃✪ ${prefix}encrypt - Encrypt text
┃✪ ${prefix}decrypt - Decrypt text
┃✪ ${prefix}hash - Generate hash
┃✪ ${prefix}obfuscate - Obfuscate code
╰━━━━━━━━━━━━━━━━━⊷`,

  github: `╭━━━✦❮ 🐙 GITHUB TOOLS ❯✦━⊷
┃✪ ${prefix}gitcommits - Repository commits
┃✪ ${prefix}gitforks - Repository forks
┃✪ ${prefix}github - GitHub user info
┃✪ ${prefix}gitissues - Repository issues
┃✪ ${prefix}gitpulls - Pull requests
┃✪ ${prefix}gitreleases - Latest releases
┃✪ ${prefix}gitrepo - Repository info
┃✪ ${prefix}gitsearch - Search repositories
┃✪ ${prefix}gitstats - Repository stats
┃✪ ${prefix}gittrending - Trending repos
╰━━━━━━━━━━━━━━━━━⊷`,

  logo: `╭━━━✦❮ 🎨 LOGO CREATORS ❯✦━⊷
┃✪ ${prefix}hacker - Hacker style logo
┃✪ ${prefix}dragonball - Dragon Ball logo
┃✪ ${prefix}naruto - Naruto style logo
┃✪ ${prefix}neonlight - Neon light text
┃✪ ${prefix}greenneon - Green neon
┃✪ ${prefix}glitch - Glitch effect
┃✪ ${prefix}devil - Devil style
┃✪ ${prefix}thunder - Thunder effect
┃✪ ${prefix}harrypotter - Harry Potter
┃✪ ${prefix}transformer - Transformer
┃✪ ${prefix}gold - Gold text
┃✪ ${prefix}arena - Arena style
╰━━━━━━━━━━━━━━━━━⊷`,

  search: `╭━━━✦❮ 🔍 SEARCH & INFO ❯✦━⊷
┃✪ ${prefix}google - Google search
┃✪ ${prefix}bing - Bing search
┃✪ ${prefix}dictionary - Word definitions
┃✪ ${prefix}wikimedia - Wikipedia search
┃✪ ${prefix}web - Web inspector
╰━━━━━━━━━━━━━━━━━⊷`,

  utility: `╭━━━✦❮ 💡 UTILITY TOOLS ❯✦━⊷
┃✪ ${prefix}blocklist - Manage blocklist
┃✪ ${prefix}menu - Show this menu
┃✪ ${prefix}save - Save messages
┃✪ ${prefix}vv - View once media
┃✪ ${prefix}owner - Owner contact
┃✪ ${prefix}qrcode - Generate QR code
┃✪ ${prefix}screenshot - Take screenshot
┃✪ ${prefix}catbox - Upload to Catbox
╰━━━━━━━━━━━━━━━━━⊷`,

  url: `╭━━━✦❮ 🔗 URL TOOLS ❯✦━⊷
┃✪ ${prefix}shorten - Shorten URLs
┃✪ ${prefix}expand - Expand short URLs
┃✪ ${prefix}urlcheck - Check URL safety
┃✪ ${prefix}urlpreview - Preview URL
┃✪ ${prefix}screenshot - Website screenshot
╰━━━━━━━━━━━━━━━━━⊷`,

  religious: `╭━━━✦❮ 🙏 RELIGIOUS TEXTS ❯✦━⊷
┃✪ ${prefix}quran - Quran verses
┃✪ ${prefix}surah - Surah information
┃✪ ${prefix}bible - Bible verses
┃✪ ${prefix}biblelist - Bible books
╰━━━━━━━━━━━━━━━━━⊷`,

  modes: `╭━━━✦❮ 🔄 BOT MODES ❯✦━⊷
┃✪ ${prefix}mode - Change bot mode
┃✪ ${prefix}autoreact - Auto reactions
┃✪ ${prefix}autotyping - Auto typing
┃✪ ${prefix}autorecording - Auto recording
┃✪ ${prefix}autoviewstatus - Auto view status
╰━━━━━━━━━━━━━━━━━⊷`,

  botinfo: `╭━━━✦❮ ℹ️ BOT INFORMATION ❯✦━⊷
┃✪ ${prefix}botinfo - Bot details
┃✪ ${prefix}xmd - Bot status
┃✪ ${prefix}info - General info
┃✪ ${prefix}repos - Repository links
┃✪ ${prefix}owner - Contact owner
╰━━━━━━━━━━━━━━━━━⊷`,

  other: `╭━━━✦❮ 🔧 OTHER COMMANDS ❯✦━⊷
┃✪ ${prefix}messi - Messi info
┃✪ ${prefix}scrap - Web scraping
┃✪ ${prefix}datafile - Data files
┃✪ ${prefix}files - File management
┃✪ ${prefix}jpg - Convert to JPG
┃✪ ${prefix}png - Convert to PNG
╰━━━━━━━━━━━━━━━━━⊷`,

  automation: `╭━━━✦❮ 🔄 AUTOMATION ❯✦━⊷
┃✪ ${prefix}autoreact - Auto reactions
┃✪ ${prefix}autotyping - Auto typing
┃✪ ${prefix}autorecording - Auto recording
┃✪ ${prefix}autoviewstatus - Auto view status
┃✪ ${prefix}antidelete - Anti-delete
┃✪ ${prefix}antilink - Anti-link
╰━━━━━━━━━━━━━━━━━⊷`,

  files: `╭━━━✦❮ 📁 FILE MANAGEMENT ❯✦━⊷
┃✪ ${prefix}files - List files
┃✪ ${prefix}datafile - Data files
┃✪ ${prefix}catbox - Upload files
┃✪ ${prefix}jpg - Convert to JPG
┃✪ ${prefix}png - Convert to PNG
╰━━━━━━━━━━━━━━━━━⊷`,

  self: `╭━━━✦❮ ⚙️ SELF SETTINGS ❯✦━⊷
┃✪ ${prefix}settings - Bot settings
┃✪ ${prefix}block - Block user
┃✪ ${prefix}unblock - Unblock user
┃✪ ${prefix}emojitoggle - Toggle emojis
╰━━━━━━━━━━━━━━━━━⊷`,

  selfmode: `╭━━━✦❮ 🤖 SELF MODE ❯✦━⊷
┃✪ ${prefix}hack - Hack simulation
┃✪ ${prefix}fullpp - Full quality PP
┃✪ ${prefix}vv2 - View once v2
╰━━━━━━━━━━━━━━━━━⊷`,

  screenshots: `╭━━━✦❮ 📸 SCREENSHOTS ❯✦━⊷
┃✪ ${prefix}screenshot - Take screenshot
┃✪ ${prefix}screenscrop - Crop screenshot
┃✪ ${prefix}screenswidth - Width adjust
┃✪ ${prefix}scrop2 - Crop v2
╰━━━━━━━━━━━━━━━━━⊷`,

  imagesearch: `╭━━━✦❮ 🖼️ IMAGE SEARCH ❯✦━⊷
┃✪ ${prefix}images - AI image generation
┃✪ ${prefix}imgs - Image search
╰━━━━━━━━━━━━━━━━━⊷`,

  football: `╭━━━✦❮ ⚽ FOOTBALL LIVE ❯✦━⊷
┃✪ ${prefix}cl_matchday - Champions League
┃✪ ${prefix}cl_news - CL News
┃✪ ${prefix}cl_table - CL Table
┃✪ ${prefix}cl_top_scorer - CL Scorers
┃✪ ${prefix}liga_portugal_matchday - Liga PT
┃✪ ${prefix}liga_portugal_news - Liga News
┃✪ ${prefix}liga_portugal_table - Liga Table
┃✪ ${prefix}wc_matchday - World Cup
┃✪ ${prefix}wc_news - WC News
┃✪ ${prefix}wc_table - WC Table
╰━━━━━━━━━━━━━━━━━⊷`,

  coderunner: `╭━━━✦❮ 💻 CODE RUNNER ❯✦━⊷
┃✪ ${prefix}run-py - Run Python code
┃✪ ${prefix}run-js - Run JavaScript
┃✪ ${prefix}run-c - Run C code
┃✪ ${prefix}run-c++ - Run C++ code
┃✪ ${prefix}run-java - Run Java code
╰━━━━━━━━━━━━━━━━━⊷`,

  economy: `╭━━━✦❮ 💰 ECONOMY ❯✦━⊷
┃✪ ${prefix}daily - Daily coins (1000 coins)
┃✪ ${prefix}balance - Check your balance
┃✪ ${prefix}work - 💼 Work for coins (1hr cooldown)
┃✪ ${prefix}beg - 🙏 Beg for coins (30min cooldown)
┃✪ ${prefix}give - 🎁 Give coins to users
┃✪ ${prefix}rob - 💰 Rob other users
┃✪ ${prefix}loan - 💳 Borrow coins (10% interest)
┃✪ ${prefix}repay - 💸 Repay your loan
┃✪ ${prefix}bank - 🏦 Bank management
┃✪ ${prefix}deposit - 💰 Deposit to bank
┃✪ ${prefix}withdraw - 💸 Withdraw from bank
┃✪ ${prefix}bankupgrade - 📈 Upgrade bank limit
┃✪ ${prefix}slot - 🎰 Slot machine game
┃✪ ${prefix}dice - 🎲 Dice betting game
┃✪ ${prefix}checkers - ♟️ Challenge to checkers
┃✪ ${prefix}aviator - ✈️ Live aviator game
┃✪ ${prefix}gamble - 🎲 Gamble your coins
┃✪ ${prefix}shop - 🏪 Buy items & protection
┃✪ ${prefix}inventory - 🎒 View your inventory
┃✪ ${prefix}job - 💼 Career system
┃✪ ${prefix}crime - 🚨 Commit crimes
┃✪ ${prefix}bail - 🔓 Bail out friends
┃✪ ${prefix}paycops - 👮 Pay cops
┃✪ ${prefix}invest - 📈 Stocks & crypto
┃✪ ${prefix}business - 🏢 Buy businesses
┃✪ ${prefix}property - 🏠 Buy properties
┃✪ ${prefix}missions - 🎯 Complete missions
┃✪ ${prefix}blackmarket - 🕶️ Black market
┃✪ ${prefix}leaderboard - 🏆 Top richest users
┃✪ ${prefix}pair - 🤖 Deploy your bot (1000 coins)
┃✪ ${prefix}mybots - 🤖 Your deployed bots
┃✪ ${prefix}unpair - 🔓 Remove your bot
┃✪ ${prefix}setpassword - 🔐 Set website password
┃✪ ${prefix}setusername - ✏️ Set display username
┃✪ ${prefix}credentials - 🔑 View login credentials
╰━━━━━━━━━━━━━━━━━⊷`
};

// Normalize category input
const normalizeCategory = (cat) => {
  return cat?.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/_/g, '');
};

// Check if specific category requested
const category = args[0]?.toLowerCase();
const normalizedInput = normalizeCategory(category);

// Try to find matching category
let matchedCategory = null;
for (const [key, value] of Object.entries(categories)) {
  if (normalizeCategory(key) === normalizedInput || key === category) {
    matchedCategory = value;
    break;
  }
}

// Additional category mappings
const categoryMappings = {
  'aiimage': 'ai image',
  'coderunner': 'coderunner',
  'imagesearch': 'imagesearch',
  'selfmode': 'selfmode'
};

if (!matchedCategory && categoryMappings[normalizedInput]) {
  matchedCategory = categories[categoryMappings[normalizedInput]];
}

if (matchedCategory) {
  try {
    await sendLongMessage(bot, chatId, matchedCategory);
  } catch (error) {
    console.log('[MENU] Error sending category:', error.message);
    await bot.sendMessage(chatId, { text: matchedCategory });
  }
  return;
}

// Send main menu with inline keyboard - SEND ONLY ONCE with photo and buttons
try {
  const menuImageUrl = mediaUrls.menuImage || 'https://files.catbox.moe/i4bbnf.png';
  
  const menuOptions = {
    caption: menuHeader,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛠️ Basic', callback_data: 'menu_basic' },
          { text: '👥 Group', callback_data: 'menu_group' }
        ],
        [
          { text: '💱 Forex', callback_data: 'menu_forex' },
          { text: '🤖 AI', callback_data: 'menu_ai' }
        ],
        [
          { text: '🎨 AI Image', callback_data: 'menu_aiimage' },
          { text: '🎙️ Voice', callback_data: 'menu_voice' }
        ],
        [
          { text: '🎮 Games', callback_data: 'menu_games' },
          { text: '🎨 Creativity', callback_data: 'menu_creativity' }
        ],
        [
          { text: '👤 Personal', callback_data: 'menu_personal' },
          { text: '✨ Effects', callback_data: 'menu_effects' }
        ],
        [
          { text: '🏷️ Sticker', callback_data: 'menu_sticker' },
          { text: '🎵 Media', callback_data: 'menu_media' }
        ],
        [
          { text: '📥 Download', callback_data: 'menu_downloaders' },
          { text: '🔞 NSFW', callback_data: 'menu_nsfw' }
        ],
        [
          { text: '🐛 Bug', callback_data: 'menu_bug' },
          { text: '🔐 Encryption', callback_data: 'menu_encryption' }
        ],
        [
          { text: '🐙 GitHub', callback_data: 'menu_github' },
          { text: '🎨 Logo', callback_data: 'menu_logo' }
        ],
        [
          { text: '🔍 Search', callback_data: 'menu_search' },
          { text: '💡 Utility', callback_data: 'menu_utility' }
        ],
        [
          { text: '🔗 URL Tools', callback_data: 'menu_url' },
          { text: '🙏 Religious', callback_data: 'menu_religious' }
        ],
        [
          { text: '🔄 Bot Modes', callback_data: 'menu_modes' },
          { text: 'ℹ️ Bot Info', callback_data: 'menu_botinfo' }
        ],
        [
          { text: '🔧 Other', callback_data: 'menu_other' },
          { text: '🔄 Automation', callback_data: 'menu_automation' }
        ],
        [
          { text: '🛡️ Anti', callback_data: 'menu_anti' },
          { text: '📁 Files', callback_data: 'menu_files' }
        ],
        [
          { text: '⚽ Football', callback_data: 'menu_football' },
          { text: '💻 Code Runner', callback_data: 'menu_coderunner' }
        ],
        [
          { text: '💰 Economy', callback_data: 'menu_economy' }
        ],
        [
          { text: '👨‍💻 Creator', url: 'https://t.me/horlapookie' },
          { text: '📱 Repository', url: 'https://github.com/horlapookie/Horlapookie-xmd' }
        ],
        [
          { text: '📢 Join Our Channel', url: 'https://t.me/+WHL-cThMVYtjOTI8' }
        ]
      ]
    }
  };
  
  await bot.sendPhoto(chatId, menuImageUrl, menuOptions);
} catch (error) {
  console.log('[MENU] Error sending menu:', error.message);
  // Fallback to simpler text
  await bot.sendMessage(chatId, `*HORLA POOKIE BOT*\n\nMode: ${global.botMode}\nPrefix: ${prefix}\nCommands: ${totalCommands}\n\nType ${prefix}menu <category> to see commands\n\nCategories available:\nbasic, group, forex, ai, aiimage, voice, games, creativity, personal, effects, sticker, media, downloaders, nsfw, bug, encryption, github, logo, search, utility, url, religious, modes, botinfo, other, automation, files, self, selfmode, screenshots, imagesearch, football, coderunner`, { parse_mode: 'Markdown' });
}
}
};
