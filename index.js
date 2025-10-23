import TelegramBot from 'node-telegram-bot-api';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import axios from 'axios';
import archiver from 'archiver';
import { loadSettings, saveSettings, updateSetting, getCurrentSettings } from './lib/persistentData.js';
import { handleLinkDetection } from './commands/antilink.js';
import isAdmin from './lib/isAdmin.js';
import { buttonResponses } from './lib/menuButtons.js';
import { checkCooldown, getCooldownByCategory, formatCooldownMessage } from './lib/cooldowns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from './config.js';
const COMMAND_PREFIX = process.env.BOT_PREFIX || config.prefix;

global.config = {
  botName: process.env.BOT_NAME || 'HORLA POOKIE Bot',
  prefix: COMMAND_PREFIX,
  ownerNumber: process.env.BOT_OWNER || '234',
  ownerName: process.env.BOT_OWNER_NAME || 'Bot Owner'
};
global.COMMAND_PREFIX = COMMAND_PREFIX;

const MODS_FILE = path.join(__dirname, 'data', 'moderators.json');
const BANNED_FILE = path.join(__dirname, 'data', 'banned.json');
const WELCOME_CONFIG_FILE = path.join(__dirname, 'data', 'welcomeConfig.json');
const TOKEN_FILE = path.join(__dirname, 'token.json');

let botActive = true;

const persistentSettings = loadSettings();
let botMode = persistentSettings.botMode || 'public';
global.botMode = botMode;

global.autoViewMessage = persistentSettings.autoViewMessage || false;
global.autoViewStatus = persistentSettings.autoViewStatus || false;
global.autoReactStatus = persistentSettings.autoReactStatus || false;
global.autoReact = persistentSettings.autoReact || false;
global.autoStatusEmoji = persistentSettings.autoStatusEmoji || '❤️';
global.autoTyping = persistentSettings.autoTyping || false;
global.autoRecording = persistentSettings.autoRecording || false;

global.antiLinkWarn = persistentSettings.antiLinkWarn || {};
global.antiLinkKick = persistentSettings.antiLinkKick || {};
global.antiBadWord = persistentSettings.antiBadWord || {};

let processedMessages = new Set();

let moderators = fs.existsSync(MODS_FILE)
  ? JSON.parse(fs.readFileSync(MODS_FILE))
  : [];

function saveModerators() {
  fs.writeFileSync(MODS_FILE, JSON.stringify(moderators, null, 2));
}

function loadBanned() {
  return fs.existsSync(BANNED_FILE)
    ? JSON.parse(fs.readFileSync(BANNED_FILE))
    : {};
}

let welcomeConfig = fs.existsSync(WELCOME_CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(WELCOME_CONFIG_FILE))
  : {};

function saveWelcomeConfig() {
  fs.writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify(welcomeConfig, null, 2));
}

function loadTelegramToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.log(color('[ERROR] token.json file not found!', 'red'));
    console.log(color('[INFO] Please create token.json with your Telegram bot token:', 'yellow'));
    console.log(color('{"telegram_bot_token": "your_token_here"}', 'yellow'));
    process.exit(1);
  }

  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return tokenData.telegram_bot_token;
  } catch (error) {
    console.log(color(`[ERROR] Failed to read token.json: ${error.message}`, 'red'));
    process.exit(1);
  }
}

const color = (text, colorCode) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    reset: '\x1b[0m'
  };
  return colors[colorCode] ? colors[colorCode] + text + colors.reset : text;
};

const commands = new Map();
global.commands = commands;

let chatbotHandler = null;
try {
  const chatbotModule = await import('./commands/chatbot.js');
  chatbotHandler = chatbotModule.handleChatbotResponse;
  console.log(color('[INFO] Chatbot handler loaded successfully', 'green'));
} catch (err) {
  console.log(color('[WARN] Chatbot handler not available', 'yellow'));
}

// Recursive function to get all command files including subdirectories
function getAllCommandFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllCommandFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.cjs')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const commandsDir = path.join(__dirname, 'commands');
const commandFiles = getAllCommandFiles(commandsDir);

for (const filePath of commandFiles) {
  const file = path.basename(filePath);
  try {
    let imported;
    imported = await import(`file://${filePath}`);

    const exportedCommands = imported.default;

    const loadSingleCommand = (command, source = '') => {
      let commandName, commandObj;

      if (command.name && typeof command.execute === 'function') {
        commandName = command.name;
        commandObj = command;
      } else if (command.nomCom && typeof command.execute === 'function') {
        commandName = command.nomCom;
        commandObj = {
          name: command.nomCom,
          description: command.description || `${command.nomCom} command`,
          category: command.categorie || 'Other',
          aliases: command.aliases || [],
          execute: async (msg, options) => {
            const { sock, args, settings } = options;
            const dest = msg.key.remoteJid;
            const commandeOptions = {
              arg: args,
              ms: msg,
              msgReponse: msg,
            };
            return await command.execute(dest, sock, commandeOptions);
          }
        };
      } else {
        console.log(color(`[WARN] Invalid command structure in ${source}`, 'yellow'));
        return false;
      }

      commands.set(commandName, commandObj);
      console.log(color(`[INFO] Loaded public command${source}: ${commandName}`, 'green'));

      if (commandObj.aliases && Array.isArray(commandObj.aliases)) {
        for (const alias of commandObj.aliases) {
          commands.set(alias, commandObj);
          console.log(color(`[INFO] Loaded alias: ${alias} -> ${commandName}`, 'green'));
        }
      }

      return true;
    };

    if (exportedCommands && (exportedCommands.name || exportedCommands.nomCom) && typeof exportedCommands.execute === 'function') {
      loadSingleCommand(exportedCommands);
    }
    else if (Array.isArray(exportedCommands)) {
      for (const command of exportedCommands) {
        loadSingleCommand(command, ` from array`);
      }
    }

    for (const [key, value] of Object.entries(imported)) {
      if (key !== 'default' && value) {
        if ((value.name || value.nomCom) && typeof value.execute === 'function') {
          loadSingleCommand(value, ` (named export: ${key})`);
        }
        else if (Array.isArray(value)) {
          for (const command of value) {
            if (command && (command.name || command.nomCom) && typeof command.execute === 'function') {
              loadSingleCommand(command, ` from named array export: ${key}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(color(`[WARN] Failed to load ${file}: ${err.message}`, 'yellow'));
  }
}


// Store all active bots
const activeBots = new Map();

// Function to start a deployed bot
async function startDeployedBot(botToken, botUsername) {
  try {
    if (activeBots.has(botToken)) {
      console.log(color(`[DEPLOYED BOT] @${botUsername} already running`, 'yellow'));
      return;
    }

    const deployedBot = new TelegramBot(botToken, { polling: true });

    // Handle messages for deployed bot
    deployedBot.on('message', async (telegramMsg) => {
      try {
        if (!telegramMsg.text) return;

        const chatId = telegramMsg.chat.id;
        const userId = telegramMsg.from.id.toString();
        const body = telegramMsg.text;
        const isFromMe = userId === global.config.ownerNumber;

        // Create msg object for deployed bot
        const msg = {
          key: {
            remoteJid: chatId.toString(),
            fromMe: isFromMe,
            participant: userId,
            id: telegramMsg.message_id.toString()
          },
          message: {
            conversation: body
          },
          from: telegramMsg.from,
          messageTimestamp: telegramMsg.date,
          reply_to_message: telegramMsg.reply_to_message || null,
          entities: telegramMsg.entities || [],
          text: body
        };

        // Create sock object for deployed bot
        const sock = {
          sendMessage: async (jid, content, options = {}) => {
            try {
              const text = content.text || content.caption || '';
              const sendOptions = {
                reply_to_message_id: options.quoted ? parseInt(options.quoted.key.id) : undefined,
                parse_mode: 'Markdown'
              };

              if (content.image) {
                await deployedBot.sendPhoto(chatId, content.image.url || content.image, {
                  caption: content.caption || '',
                  ...sendOptions
                });
                return;
              }

              if (text) {
                const formattedText = text.replace(/([[\]()~`>#+\-=|{}.!])/g, '\\$1');
                await deployedBot.sendMessage(chatId, formattedText, sendOptions);
              }
            } catch (error) {
              console.log(`[DEPLOYED BOT @${botUsername}] Send error:`, error.message);
            }
          }
        };

        // Handle /start
        if (body === '/start') {
          await deployedBot.sendMessage(chatId,
            `👋 Welcome! This bot was deployed using Horlapookie Bot.\n\n` +
            `🤖 All commands work here except Economy commands.\n` +
            `💰 For Economy features, use the main bot: @Horla1stbot\n\n` +
            `_Powered by Horlapookie_`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Handle commands
        if (body.startsWith(COMMAND_PREFIX)) {
          const args = body.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
          const commandName = args.shift()?.toLowerCase();

          if (!commandName) return;

          const command = commands.get(commandName);
          if (!command) {
            await deployedBot.sendMessage(chatId, `❓ Unknown command: *${commandName}*`);
            return;
          }

          // Check cooldown (skip for owner)
          if (!isFromMe) {
            const cooldownSeconds = getCooldownByCategory(command.category || 'Default');
            const cooldownCheck = checkCooldown(userId, commandName, cooldownSeconds);

            if (!cooldownCheck.canExecute) {
              await deployedBot.sendMessage(chatId, 
                formatCooldownMessage(commandName, cooldownCheck.timeLeft),
                { parse_mode: 'Markdown' }
              );
              return;
            }
          }

          // Block economy commands on deployed bots
          const economyCommands = ['daily', 'balance', 'bal', 'wallet', 'coins', 'slot', 'aviator', 'gamble', 'bet', 'flip', 'leaderboard', 'lb', 'top', 'rich', 'pair', 'unpair', 'revoke', 'removebot', 'mybots', 'mybot', 'setpassword', 'rob', 'bank', 'deposit', 'dep', 'withdraw', 'with'];
          if (economyCommands.includes(commandName)) {
            await deployedBot.sendMessage(chatId,
              `💰 *Economy Command Blocked*\n\n` +
              `❌ Economy commands only work on @Horla1stbot\n\n` +
              `*Available Economy Commands:*\n` +
              `• /daily - Daily coins\n` +
              `• /balance - Check balance\n` +
              `• /slot - Slot machine\n` +
              `• /aviator - Aviator game\n` +
              `• /gamble - Coin flip\n` +
              `• /rob - Rob users\n` +
              `• /bank - Bank account\n` +
              `• /leaderboard - Top users\n\n` +
              `✅ *All other 300+ commands work here!*\n` +
              `Try /menu to see available commands`,
              { parse_mode: 'Markdown' }
            );
            return;
          }

          // Execute command
          try {
            await command.execute(msg, {
              sock,
              bot: deployedBot,
              args,
              isOwner: isFromMe,
              settings: { prefix: COMMAND_PREFIX }
            });
          } catch (cmdErr) {
            console.log(`[DEPLOYED BOT @${botUsername}] Command error:`, cmdErr.message);
            await deployedBot.sendMessage(chatId, `❌ Command error: ${commandName}`);
          }
        }
      } catch (error) {
        console.error(`[DEPLOYED BOT @${botUsername}] Error:`, error.message);
      }
    });

    deployedBot.on('polling_error', (error) => {
      console.log(color(`[DEPLOYED BOT @${botUsername}] Polling error: ${error.message}`, 'yellow'));

      // Auto-restart on critical errors
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 401) {
        console.log(color(`[DEPLOYED BOT @${botUsername}] Invalid token, removing bot`, 'red'));
        activeBots.delete(botToken);
        deployedBot.stopPolling().catch(() => {});
      }
    });

    activeBots.set(botToken, deployedBot);
    console.log(color(`[DEPLOYED BOT] ✅ @${botUsername} started successfully`, 'green'));

  } catch (error) {
    console.error(color(`[DEPLOYED BOT] Failed to start @${botUsername}: ${error.message}`, 'red'));

    // If invalid token, don't retry
    if (error.message.includes('401')) {
      console.log(color(`[DEPLOYED BOT] Token invalid for @${botUsername}, skipping`, 'red'));
      return;
    }

    // Retry after 10 seconds for other errors
    console.log(color(`[DEPLOYED BOT] Retrying @${botUsername} in 10 seconds...`, 'yellow'));
    setTimeout(() => startDeployedBot(botToken, botUsername), 10000);
  }
}

// Load and start all deployed bots from database
async function loadDeployedBots() {
  try {
    const { connectDB } = await import('./lib/economy.js');
    const mongoose = await import('mongoose');

    if (!await connectDB()) {
      console.log(color('[DEPLOYED BOTS] MongoDB not connected, skipping deployed bots', 'yellow'));
      return;
    }

    const User = mongoose.default.models.User || mongoose.default.model('User');
    const deployedUsers = await User.find({ botDeployed: true, botToken: { $ne: null } });

    if (deployedUsers.length === 0) {
      console.log(color('[DEPLOYED BOTS] No deployed bots found', 'cyan'));
      return;
    }

    console.log(color(`[DEPLOYED BOTS] Found ${deployedUsers.length} deployed bot(s)`, 'cyan'));

    for (const user of deployedUsers) {
      await startDeployedBot(user.botToken, user.botUsername);
    }

  } catch (error) {
    console.error(color(`[DEPLOYED BOTS] Error loading: ${error.message}`, 'red'));
  }
}

// Monitor database for new deployed bots every 30 seconds
async function monitorDeployedBots() {
  setInterval(async () => {
    try {
      const { connectDB } = await import('./lib/economy.js');
      const mongoose = await import('mongoose');

      if (!await connectDB()) return;

      const User = mongoose.default.models.User || mongoose.default.model('User');
      const deployedUsers = await User.find({ botDeployed: true, botToken: { $ne: null } });

      for (const user of deployedUsers) {
        if (!activeBots.has(user.botToken)) {
          console.log(color(`[MONITOR] New deployed bot detected: @${user.botUsername}`, 'green'));
          await startDeployedBot(user.botToken, user.botUsername);
        }
      }

      // Remove bots that are no longer in database
      for (const [token, bot] of activeBots.entries()) {
        const stillExists = deployedUsers.some(u => u.botToken === token);
        if (!stillExists) {
          console.log(color(`[MONITOR] Bot token ${token} removed from database, stopping...`, 'yellow'));
          try {
            await bot.stopPolling();
            activeBots.delete(token);
          } catch (err) {
            console.log(color(`[MONITOR] Error stopping bot: ${err.message}`, 'yellow'));
          }
        }
      }

    } catch (error) {
      console.error(color(`[MONITOR] Error checking deployed bots: ${error.message}`, 'red'));
    }
  }, 30000); // Check every 30 seconds
}

async function startBot() {
  try {
    const BOT_TOKEN = loadTelegramToken();

    const bot = new TelegramBot(BOT_TOKEN, { polling: true });

    // Handle /start command
    bot.onText(/\/start/, async (telegramMsg) => {
      const chatId = telegramMsg.chat.id;
      const firstName = telegramMsg.from.first_name || 'User';
      const userId = telegramMsg.from.id.toString();

      // Check if user is in the required group
      const GROUP_CHAT_ID = '-1002325587080'; // Your group ID
      let isMember = false;

      try {
        const member = await bot.getChatMember(GROUP_CHAT_ID, userId);
        isMember = ['member', 'administrator', 'creator'].includes(member.status);
      } catch (error) {
        console.log('[START] Could not check group membership:', error.message);
      }

      if (!isMember) {
        const joinMessage = `👋 Welcome *${firstName}*!\n\n⚠️ *Please join our group first to use this bot*\n\n📢 Join here: https://t.me/+WHL-cThMVYtjOTI8\n\nAfter joining, click /start again to continue.`;

        const joinOptions = {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📢 Join Our Group', url: 'https://t.me/+WHL-cThMVYtjOTI8' }
              ],
              [
                { text: '🔄 I Joined, Continue', callback_data: 'check_membership' }
              ]
            ]
          }
        };

        return await bot.sendMessage(chatId, joinMessage, joinOptions);
      }

      const startMessage = `👋 Welcome *${firstName}*!\n\n✨ I'm *${global.config.botName}*\n\n🤖 Your advanced Telegram bot with 300+ commands!\n\n💰 Economy System with 20+ commands\n🎮 Games, AI, Tools & More\n\n📜 Use /menu to see all available commands\n📊 Use /help for quick help\n⚙️ Prefix: ${COMMAND_PREFIX}\n\n💡 Example: ${COMMAND_PREFIX}ping\n\n_Powered by Horlapookie_`;

      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📜 Menu', callback_data: 'menu' },
              { text: '💰 Economy', callback_data: 'menu_economy' }
            ],
            [
              { text: '📊 Bot Info', callback_data: 'botinfo' },
              { text: '🎮 Play Games', callback_data: 'menu_games' }
            ],
            [
              { text: '👨‍💻 Creator', url: 'https://t.me/horlapookie' },
              { text: '📢 Our Group', url: 'https://t.me/+WHL-cThMVYtjOTI8' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, startMessage, options);
    });

    // Handle callback queries for inline buttons
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      // Answer callback query with error handling for expired queries
      try {
        await bot.answerCallbackQuery(query.id);
      } catch (error) {
        if (error.message.includes('query is too old')) {
          console.log(color('[WARN] Callback query expired, ignoring', 'yellow'));
          return;
        }
        console.log(color(`[WARN] Callback query error: ${error.message}`, 'yellow'));
      }

      // Handle loan form callbacks
      if (data.match(/^loan_(apply|confirm|cancel)_/)) {
        const { handleLoanFormCallback } = await import('./commands/economy/loanform.js');
        await handleLoanFormCallback(query, bot);
        return;
      }

      // Handle membership check
      if (data === 'check_membership') {
        const userId = query.from.id.toString();
        const firstName = query.from.first_name || 'User';
        const GROUP_CHAT_ID = '-1002325587080';

        try {
          const member = await bot.getChatMember(GROUP_CHAT_ID, userId);
          const isMember = ['member', 'administrator', 'creator'].includes(member.status);

          if (isMember) {
            const startMessage = `👋 Welcome *${firstName}*!\n\n✨ I'm *${global.config.botName}*\n\n🤖 Your advanced Telegram bot with 300+ commands!\n\n💰 Economy System with 20+ commands\n🎮 Games, AI, Tools & More\n\n📜 Use /menu to see all available commands\n📊 Use /help for quick help\n⚙️ Prefix: ${COMMAND_PREFIX}\n\n💡 Example: ${COMMAND_PREFIX}ping\n\n_Powered by Horlapookie_`;

            const options = {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📜 Menu', callback_data: 'menu' },
                    { text: '💰 Economy', callback_data: 'menu_economy' }
                  ],
                  [
                    { text: '📊 Bot Info', callback_data: 'botinfo' },
                    { text: '🎮 Play Games', callback_data: 'menu_games' }
                  ],
                  [
                    { text: '👨‍💻 Creator', url: 'https://t.me/horlapookie' },
                    { text: '📢 Our Group', url: 'https://t.me/+WHL-cThMVYtjOTI8' }
                  ]
                ]
              }
            };

            await bot.editMessageText(startMessage, {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown',
              reply_markup: options.reply_markup
            });
          } else {
            await bot.answerCallbackQuery(query.id, {
              text: '❌ You are not a member yet! Please join the group first.',
              show_alert: true
            });
          }
        } catch (error) {
          await bot.answerCallbackQuery(query.id, {
            text: '❌ Could not verify membership. Please try again.',
            show_alert: true
          });
        }
        return;
      }

      // Handle unpair callbacks
      if (data.startsWith('unpair_')) {
        const { handleUnpairCallback } = await import('./commands/economy/unpair.js');
        await handleUnpairCallback(query, bot);
        return;
      }

      // Handle deposit callbacks
      if (data.match(/^deposit_/)) {
        const { handleDepositCallback } = await import('./commands/economy/deposit.js');
        await handleDepositCallback(query, bot);
        return;
      }

      // Handle withdraw callbacks
      if (data.match(/^withdraw_/)) {
        const { handleWithdrawCallback } = await import('./commands/economy/withdraw.js');
        await handleWithdrawCallback(query, bot);
        return;
      }

      // Handle bank upgrade callbacks
      if (data.match(/^bankupgrade_/)) {
        const { handleBankUpgradeCallback } = await import('./commands/economy/bankupgrade.js');
        await handleBankUpgradeCallback(query, bot);
        return;
      }

      // Handle buycard callbacks
      if (data.match(/^buycard_/)) {
        const { handleBuyCardCallback } = await import('./commands/cards/buycard.js');
        await handleBuyCardCallback(query, bot);
        return;
      }

      // Handle bet keyboard callbacks
      if (data.match(/^(slot|aviator|gamble)_bet_/)) {
        const [game, , userId, digit] = data.split('_');

        if (!global.betAmounts) global.betAmounts = {};
        if (!global.betAmounts[userId]) global.betAmounts[userId] = '';

        global.betAmounts[userId] += digit;

        await bot.answerCallbackQuery(query.id, {
          text: `Amount: ${global.betAmounts[userId]}`
        });
        return;
      }

      // Handle bet confirm callbacks
      if (data.match(/^(slot|aviator|gamble)_confirm_/)) {
        const [game, , userId] = data.split('_');
        const betAmount = global.betAmounts?.[userId] || '10';
        delete global.betAmounts?.[userId];

        // Create fake message to trigger command
        const fakeMsg = {
          key: {
            remoteJid: chatId.toString(),
            fromMe: false,
            id: Date.now().toString(),
            participant: userId
          },
          message: { conversation: `/${game} ${betAmount}` },
          from: query.from,
          messageTimestamp: Math.floor(Date.now() / 1000)
        };

        const command = commands.get(game);
        if (command) {
          const sock = {
            sendMessage: async (jid, content, options = {}) => {
              const text = content.text || content.caption || '';
              await bot.sendMessage(chatId, text.replace(/([[\]()~`>#+\-=|{}.!])/g, '\\$1'), {
                parse_mode: 'Markdown',
                reply_markup: options.reply_markup || {}
              });
            }
          };

          await bot.deleteMessage(chatId, query.message.message_id);
          await command.execute(fakeMsg, { sock, bot, args: [betAmount], isOwner: false, settings: { prefix: COMMAND_PREFIX } });
        }
        return;
      }

      // Handle dice game callbacks
      if (data.match(/^dice_pick_/)) {
        const [, , userId, betAmount, pickedNumber] = data.split('_');

        if (!global.diceGames?.[userId]?.active) {
          return await bot.answerCallbackQuery(query.id, { text: '❌ Game expired!' });
        }

        delete global.diceGames[userId];

        const actualNumber = Math.floor(Math.random() * 6) + 1;
        const won = parseInt(pickedNumber) === actualNumber;
        const winAmount = won ? parseInt(betAmount) * 5 : 0;

        const { updateBalance, recordGame, getUser, getRankEmoji } = await import('./lib/economy.js');

        if (won) {
          await updateBalance(userId, winAmount, query.from.username || query.from.first_name);
          await recordGame(userId, true, winAmount);
        } else {
          await recordGame(userId, false, parseInt(betAmount));
        }

        const user = await getUser(userId);
        const rankEmoji = getRankEmoji(user.rank);

        const result = won ? 
          `🎲 *DICE WIN!* 🎲\n\n` +
          `🎯 You picked: ${pickedNumber}\n` +
          `🎲 Dice rolled: ${actualNumber}\n\n` +
          `✅ You won ${winAmount} coins!\n` +
          `💰 New balance: ${user.balance} coins\n` +
          `${rankEmoji} Rank: ${user.rank}` :
          `🎲 *DICE LOSE!* 🎲\n\n` +
          `🎯 You picked: ${pickedNumber}\n` +
          `🎲 Dice rolled: ${actualNumber}\n\n` +
          `❌ You lost ${betAmount} coins\n` +
          `💰 New balance: ${user.balance} coins\n` +
          `${rankEmoji} Rank: ${user.rank}`;

        await bot.editMessageText(result, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(query.id, { 
          text: won ? `🎉 You won!` : `😢 Better luck next time!` 
        });
        return;
      }

      // Handle checkers game callbacks
      if (data.match(/^checkers_(accept|decline)_/)) {
        const [, action, ...gameParts] = data.split('_');
        const betAmount = action === 'accept' ? gameParts.pop() : null;
        const gameId = gameParts.join('_');

        if (!global.checkersGames?.[gameId]) {
          return await bot.answerCallbackQuery(query.id, { text: '❌ Game expired!' });
        }

        const game = global.checkersGames[gameId];
        const responderId = query.from.id.toString();

        if (responderId !== game.opponent) {
          return await bot.answerCallbackQuery(query.id, { 
            text: '❌ This challenge is not for you!',
            show_alert: true 
          });
        }

        if (action === 'decline') {
          delete global.checkersGames[gameId];
          await bot.editMessageText(
            `🎮 *CHECKERS CHALLENGE* 🎮\n\n❌ @${game.opponentName} declined the challenge!`,
            {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown'
            }
          );
          await bot.answerCallbackQuery(query.id, { text: 'Challenge declined' });
          return;
        }

        const { updateBalance, recordGame, getUser, getRankEmoji } = await import('./lib/economy.js');

        await updateBalance(game.challenger, -parseInt(betAmount), game.challengerName);
        await updateBalance(game.opponent, -parseInt(betAmount), game.opponentName);

        game.status = 'playing';
        game.currentTurn = Math.random() > 0.5 ? game.challenger : game.opponent;
        game.board = '🔴🔴🔴\n⚪⚪⚪\n🔴🔴🔴';

        const turnName = game.currentTurn === game.challenger ? game.challengerName : game.opponentName;

        await bot.editMessageText(
          `🎮 *CHECKERS GAME* 🎮\n\n` +
          `${game.challengerName} 🆚 ${game.opponentName}\n` +
          `💰 Pot: ${parseInt(betAmount) * 2} coins\n\n` +
          `${game.board}\n\n` +
          `🎯 ${turnName}'s turn!\n` +
          `Play your move:`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '⬅️', callback_data: `checkers_move_${gameId}_left` },
                  { text: '⬆️', callback_data: `checkers_move_${gameId}_up` },
                  { text: '➡️', callback_data: `checkers_move_${gameId}_right` }
                ],
                [
                  { text: '🏁 Finish', callback_data: `checkers_finish_${gameId}` }
                ]
              ]
            }
          }
        );

        await bot.answerCallbackQuery(query.id, { text: 'Game started!' });
        return;
      }

      // Handle checkers move callbacks
      if (data.match(/^checkers_(move|finish)_/)) {
        const [, action, gameId, direction] = data.split('_');

        if (!global.checkersGames?.[gameId] || global.checkersGames[gameId].status !== 'playing') {
          return await bot.answerCallbackQuery(query.id, { text: '❌ Game not active!' });
        }

        const game = global.checkersGames[gameId];
        const playerId = query.from.id.toString();

        if (playerId !== game.currentTurn) {
          return await bot.answerCallbackQuery(query.id, { 
            text: '❌ Not your turn!',
            show_alert: true 
          });
        }

        if (action === 'finish') {
          const winner = Math.random() > 0.5 ? game.challenger : game.opponent;
          const winnerName = winner === game.challenger ? game.challengerName : game.opponentName;
          const loserName = winner === game.challenger ? game.opponentName : game.challengerName;
          const pot = parseInt(game.betAmount) * 2;

          const { updateBalance, recordGame, getUser, getRankEmoji } = await import('./lib/economy.js');

          await updateBalance(winner, pot, winnerName);
          await recordGame(winner, true, pot);
          await recordGame(winner === game.challenger ? game.opponent : game.challenger, false, game.betAmount);

          const winnerUser = await getUser(winner);
          const rankEmoji = getRankEmoji(winnerUser.rank);

          delete global.checkersGames[gameId];

          await bot.editMessageText(
            `🎮 *CHECKERS COMPLETE!* 🎮\n\n` +
            `${game.challengerName} 🆚 ${game.opponentName}\n\n` +
            `🏆 Winner: ${winnerName}\n` +
            `💰 Prize: ${pot} coins\n` +
            `${rankEmoji} Rank: ${winnerUser.rank}\n\n` +
            `Better luck next time, ${loserName}!`,
            {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown'
            }
          );

          await bot.answerCallbackQuery(query.id, { text: `🎉 ${winnerName} wins!` });
          return;
        }

        game.currentTurn = game.currentTurn === game.challenger ? game.opponent : game.challenger;
        const turnName = game.currentTurn === game.challenger ? game.challengerName : game.opponentName;

        await bot.editMessageText(
          `🎮 *CHECKERS GAME* 🎮\n\n` +
          `${game.challengerName} 🆚 ${game.opponentName}\n` +
          `💰 Pot: ${parseInt(game.betAmount) * 2} coins\n\n` +
          `${game.board}\n\n` +
          `🎯 ${turnName}'s turn!\n` +
          `Play your move:`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '⬅️', callback_data: `checkers_move_${gameId}_left` },
                  { text: '⬆️', callback_data: `checkers_move_${gameId}_up` },
                  { text: '➡️', callback_data: `checkers_move_${gameId}_right` }
                ],
                [
                  { text: '🏁 Finish', callback_data: `checkers_finish_${gameId}` }
                ]
              ]
            }
          }
        );

        await bot.answerCallbackQuery(query.id, { text: `Moved ${direction}!` });
        return;
      }

      // Create sock object for callback queries
      const callbackSock = {
        sendMessage: async (jid, content, options = {}) => {
          try {
            const text = content.text || content.caption || '';
            const sendOptions = {
              parse_mode: 'Markdown'
            };

            if (text) {
              const formattedText = text.replace(/([[\]()~`>#+\-=|{}.!])/g, '\\$1');
              await bot.sendMessage(chatId, formattedText, sendOptions);
            }
          } catch (error) {
            console.log(color(`[ERROR] Callback send failed: ${error.message}`, 'red'));
            try {
              await bot.sendMessage(chatId, text || content.text || 'Error sending message');
            } catch (fallbackError) {
              console.log(color(`[ERROR] Fallback send failed: ${fallbackError.message}`, 'red'));
            }
          }
        },
        sendPresenceUpdate: async (type, jid) => {
          if (type === 'composing') {
            await bot.sendChatAction(chatId, 'typing');
          }
        }
      };

      if (data === 'menu') {
        const fakeMsg = {
          key: { remoteJid: chatId.toString(), fromMe: false, id: Date.now().toString() },
          message: { conversation: `${COMMAND_PREFIX}menu` }
        };
        const menuCommand = commands.get('menu');
        if (menuCommand) {
          await menuCommand.execute(fakeMsg, { sock: callbackSock, bot, args: [], isOwner: false, settings: { prefix: COMMAND_PREFIX } });
        }
      } else if (data === 'botinfo') {
        const fakeMsg = {
          key: { remoteJid: chatId.toString(), fromMe: false, id: Date.now().toString() },
          message: { conversation: `${COMMAND_PREFIX}botinfo` }
        };
        const botinfoCommand = commands.get('botinfo');
        if (botinfoCommand) {
          await botinfoCommand.execute(fakeMsg, { sock: callbackSock, bot, args: [], isOwner: false, settings: { prefix: COMMAND_PREFIX } });
        }
      } else if (data.startsWith('menu_')) {
        // Handle category menu buttons
        let category = data.replace('menu_', '');

        // Map button data to category names
        const categoryMap = {
          'aiimage': 'ai image',
          'coderunner': 'coderunner',
          'imagesearch': 'imagesearch',
          'selfmode': 'selfmode'
        };

        category = categoryMap[category] || category;

        const fakeMsg = {
          key: { remoteJid: chatId.toString(), fromMe: false, id: Date.now().toString() },
          message: { conversation: `${COMMAND_PREFIX}menu ${category}` }
        };
        const menuCommand = commands.get('menu');
        if (menuCommand) {
          await menuCommand.execute(fakeMsg, { sock: callbackSock, bot, args: [category], isOwner: false, settings: { prefix: COMMAND_PREFIX } });
        }
      }
    });

    bot.on('message', async (telegramMsg) => {
      try {
        if (!telegramMsg.text) return;

        // Ignore /start command as it's handled separately
        if (telegramMsg.text === '/start') return;

        const chatId = telegramMsg.chat.id;
        const userId = telegramMsg.from.id.toString();
        const body = telegramMsg.text;
        const isFromMe = userId === global.config.ownerNumber;
        const isGroup = telegramMsg.chat.type === 'group' || telegramMsg.chat.type === 'supergroup';

        const msg = {
          key: {
            remoteJid: chatId.toString(),
            fromMe: isFromMe,
            participant: userId,
            id: telegramMsg.message_id.toString(),
            quotedMessage: telegramMsg.reply_to_message || null
          },
          message: {
            conversation: body,
            reply_to_message: telegramMsg.reply_to_message || null,
            extendedTextMessage: telegramMsg.reply_to_message ? {
              contextInfo: {
                quotedMessage: telegramMsg.reply_to_message,
                participant: telegramMsg.reply_to_message.from?.id?.toString()
              }
            } : null
          },
          messageTimestamp: telegramMsg.date,
          from: telegramMsg.from,
          reply_to_message: telegramMsg.reply_to_message || null,
          entities: telegramMsg.entities || [],
          text: body
        };

        const sock = {
          sendMessage: async (jid, content, options = {}) => {
            try {
              const text = content.text || content.caption || '';
              const sendOptions = {
                reply_to_message_id: options.quoted ? parseInt(options.quoted.key.id) : undefined,
                parse_mode: 'Markdown'
              };

              // Handle media messages
              if (content.image) {
                try {
                  const imageSource = content.image.url || content.image;
                  // Try to download and send as buffer for better compatibility
                  if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
                    const axios = (await import('axios')).default;
                    const response = await axios.get(imageSource, { responseType: 'arraybuffer', timeout: 30000 });
                    await bot.sendPhoto(chatId, Buffer.from(response.data), {
                      caption: content.caption || '',
                      ...sendOptions
                    });
                  } else {
                    await bot.sendPhoto(chatId, imageSource, {
                      caption: content.caption || '',
                      ...sendOptions
                    });
                  }
                } catch (imgError) {
                  console.log(color(`[WARN] Image send failed, trying text: ${imgError.message}`, 'yellow'));
                  await bot.sendMessage(chatId, `${content.caption || text}\n\nImage: ${content.image.url || content.image}`);
                }
                return;
              }

              if (content.video) {
                try {
                  const videoSource = content.video.url || content.video;
                  await bot.sendVideo(chatId, videoSource, {
                    caption: content.caption || '',
                    ...sendOptions
                  });
                } catch (vidError) {
                  console.log(color(`[WARN] Video send failed, trying text: ${vidError.message}`, 'yellow'));
                  await bot.sendMessage(chatId, `${content.caption || text}\n\nVideo: ${content.video.url || content.video}`);
                }
                return;
              }

              if (content.audio) {
                const audioSource = content.audio.url || content.audio;
                await bot.sendAudio(chatId, audioSource, {
                  caption: content.caption || '',
                  ...sendOptions
                });
                return;
              }

              if (content.document) {
                const docSource = content.document.url || content.document;
                const fileName = content.fileName || 'document';
                await bot.sendDocument(chatId, docSource, {
                  caption: content.caption || '',
                  ...sendOptions
                }, {
                  filename: fileName
                });
                return;
              }

              // Handle text messages with Markdown formatting
              if (text) {
                // Check if text contains URLs
                const hasUrl = /https?:\/\/[^\s]+/.test(text);

                if (hasUrl) {
                  // For messages with URLs, use minimal escaping
                  await bot.sendMessage(chatId, text, {
                    ...sendOptions,
                    disable_web_page_preview: false
                  });
                } else {
                  // For regular text, apply Markdown escaping
                  const formattedText = text.replace(/([[\]()~`>#+\-=|{}.!])/g, '\\$1');
                  await bot.sendMessage(chatId, formattedText, {
                    ...sendOptions,
                    parse_mode: 'MarkdownV2'
                  });
                }
              }
            } catch (error) {
              console.log(color(`[ERROR] Failed to send message: ${error.message}`, 'red'));
              // Fallback without markdown if it fails
              try {
                const fallbackText = text || content.text || content.caption || 'Error sending message';
                await bot.sendMessage(chatId, fallbackText, {
                  reply_to_message_id: options.quoted ? parseInt(options.quoted.key.id) : undefined
                });
              } catch (fallbackError) {
                console.log(color(`[ERROR] Fallback send failed: ${fallbackError.message}`, 'red'));
              }
            }
          },
          sendPresenceUpdate: async (type, jid) => {
            if (type === 'composing') {
              await bot.sendChatAction(chatId, 'typing');
            }
          },
          downloadMediaMessage: async (msg) => {
            return null;
          },
          groupMetadata: async (jid) => {
            try {
              const chat = await bot.getChat(jid);
              return {
                subject: chat.title,
                participants: []
              };
            } catch {
              return { subject: '', participants: [] };
            }
          }
        };

        const banned = loadBanned();
        if (banned[userId]) {
          return;
        }

        // Check if user is filling out loan form
        const { handleLoanFormMessage } = await import('./commands/economy/loanform.js');
        const isLoanForm = await handleLoanFormMessage(msg, bot, body, userId);
        if (isLoanForm) return;

        if (body.startsWith(COMMAND_PREFIX)) {
          const args = body.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
          const commandName = args.shift()?.toLowerCase();

          if (!commandName) {
            await bot.sendMessage(chatId, `❓ Empty command. Try \`${COMMAND_PREFIX}help\` for available commands.`);
            return;
          }

          if (commandName === 'off' && isFromMe) {
            botActive = false;
            await bot.sendMessage(chatId, '❌ Bot deactivated.');
            return;
          }

          if (commandName === 'on' && isFromMe) {
            botActive = true;
            await bot.sendMessage(chatId, '✅ Bot activated.');
            return;
          }

          if (commandName === 'public' && isFromMe) {
            botMode = 'public';
            global.botMode = 'public';
            updateSetting('botMode', 'public');
            await bot.sendMessage(chatId, '🌐 Bot switched to PUBLIC mode. Everyone can use public commands.');
            return;
          }

          if (commandName === 'self' && isFromMe) {
            botMode = 'self';
            global.botMode = 'self';
            updateSetting('botMode', 'self');
            await bot.sendMessage(chatId, '🤖 Bot switched to SELF mode. Only bot can use commands.');
            return;
          }

          if (!botActive) {
            if (isFromMe) {
              await bot.sendMessage(chatId, '❌ Bot is currently offline.');
            }
            return;
          }

          if (botMode === 'self' && !isFromMe) {
            return;
          }

          const command = commands.get(commandName);
          if (!command) {
            await bot.sendMessage(chatId, `❓ Unknown command: *${commandName}*\nTry \`${COMMAND_PREFIX}menu\` for available commands.`);
            return;
          }

          // Check cooldown (skip for owner)
          if (!isFromMe) {
            const cooldownSeconds = getCooldownByCategory(command.category || 'Default');
            const cooldownCheck = checkCooldown(userId, commandName, cooldownSeconds);

            if (!cooldownCheck.canExecute) {
              await bot.sendMessage(chatId, 
                formatCooldownMessage(commandName, cooldownCheck.timeLeft),
                { parse_mode: 'Markdown' }
              );
              return;
            }
          }

          try {
            // Handle /pair with token (main bot only)
            if (commandName === 'pair' && args.length > 0 && args[0].includes(':')) {
              const { handlePairToken } = await import('./commands/economy/pair.js');
              await handlePairToken(msg, bot, args[0]);
            }
            // Handle /unpair confirm (main bot only)
            else if (commandName === 'unpair' && args.length > 0 && args[0].toLowerCase() === 'confirm') {
              const { handleUnpairConfirm } = await import('./commands/economy/unpair.js');
              await handleUnpairConfirm(msg, bot);
            }
            else {
              // Execute command normally
              await command.execute(msg, {
                sock,
                bot,
                args,
                isOwner: isFromMe,
                settings: { prefix: COMMAND_PREFIX },
              });
            }
          } catch (cmdErr) {
            console.log(color(`[ERROR] Command failed (${commandName}): ${cmdErr.message}`, 'red'));
            await bot.sendMessage(chatId, `❌ Command error: ${commandName}\nTry again later.`);
          }

        } else {
          // Check antilink for group messages
          if (isGroup && !isFromMe) {
            const { handleLinkDetection } = await import('./commands/antilink.js');
            try {
              await handleLinkDetection(sock, chatId.toString(), msg, body, userId, bot);
            } catch (antilinkErr) {
              console.log(color(`[WARN] Antilink error: ${antilinkErr.message}`, 'yellow'));
            }
          }

          // Handle chatbot responses
          if (chatbotHandler && !isFromMe) {
            try {
              await chatbotHandler(sock, msg, body, userId, bot);
            } catch (chatbotErr) {
              console.log(color(`[WARN] Chatbot error: ${chatbotErr.message}`, 'yellow'));
            }
          }
        }
      } catch (error) {
        console.error('[BOT] Error processing message:', error);
        try {
          await bot.sendMessage(telegramMsg.chat.id, '❌ An error occurred while processing your command. Please try again later.');
        } catch (sendError) {
          console.error('[BOT] Error sending error message:', sendError);
        }
      }
    });

    bot.on('polling_error', (error) => {
      console.log(color(`[ERROR] Polling error: ${error.message}`, 'red'));
      console.error('[ERROR] Full polling error:', error);
    });

    // Log all unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('[ERROR] Uncaught Exception:', error);
    });

    process.on('SIGINT', async () => {
      console.log(color('\n[INFO] Shutting down gracefully...', 'yellow'));
      try {
        await bot.stopPolling();
      } catch (err) {
        console.log(color(`[WARN] Shutdown error: ${err.message}`, 'yellow'));
      }
      process.exit(0);
    });

    const botInfo = await bot.getMe();
    console.log(color('╔════════════════════════════════════════╗', 'green'));
    console.log(color('║  ✅ BOT CONNECTED SUCCESSFULLY!      ║', 'green'));
    console.log(color('╚════════════════════════════════════════╝', 'green'));
    console.log(color(`📱 Bot Username: @${botInfo.username}`, 'cyan'));
    console.log(color(`🤖 Bot Name: ${botInfo.first_name}`, 'cyan'));
    console.log(color(`🔧 Prefix: ${COMMAND_PREFIX}`, 'cyan'));
    console.log(color(`📊 Mode: ${botMode}`, 'cyan'));
    console.log(color(`✨ Commands Loaded: ${commands.size}`, 'cyan'));
    console.log(color('═══════════════════════════════════════════', 'green'));
    console.log(color('🎉 Bot is ready to receive commands!', 'green'));

    // Card spawner disabled - users can now spawn cards manually with /spawncard (5 min cooldown)
    // Auto-spawning has been disabled per user request
    console.log(color('[CARD SPAWNER] ✅ Manual card spawning enabled (/spawncard command)', 'green'));

    // Load and start deployed bots
    setTimeout(() => {
      loadDeployedBots();
      // Start monitoring for new deployments every 30 seconds
      monitorDeployedBots();
      console.log(color('[MONITOR] 🔄 Database monitoring started for deployed bots', 'cyan'));
    }, 3000); // Wait 3 seconds after main bot starts

  } catch (err) {
    console.log(color(`[ERROR] Bot startup failed: ${err.message}`, 'red'));
    console.log(color('[INFO] Retrying in 15 seconds...', 'yellow'));
    setTimeout(startBot, 15000);
  }
}

import './lib/web.js';

const asciiArt = `
╔═══════════════════════════════════════════════════╗
║  ██╗  ██╗ ██████╗ ██████╗ ██╗     █████╗        ║
║  ██║  ██║██╔═══██╗██╔══██╗██║    ██╔══██╗       ║
║  ███████║██║   ██║██████╔╝██║    ███████║       ║
║  ██╔══██║██║   ██║██╔══██╗██║    ██╔══██║       ║
║  ██║  ██║╚██████╔╝██║  ██║███████╗██║  ██║       ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝       ║
║  ██████╗  ██████╗  ██████╗ ██╗  ██╗██╗███╗       ║
║  ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝██║██╔╝       ║
║  ██████╔╝██║   ██║██║   ██║█████╔╝ ██║██║        ║
║  ██╔═══╝ ██║   ██║██║   ██║██╔═██╗ ██║██║        ║
║  ██║     ╚██████╔╝╚██████╔╝██║  ██╗██║███║       ║
║  ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══╝       ║
║         🌟 Telegram Bot Version 🌟               ║
╚═══════════════════════════════════════════════════╝
`;

console.log(color(asciiArt, 'cyan'));
console.log(color('🤖 Horlapookie Telegram Bot Starting...', 'blue'));
console.log('═'.repeat(50));
startBot().catch(err => {
  console.log(color(`[FATAL] Critical startup error: ${err.message}`, 'red'));
  process.exit(1);
});