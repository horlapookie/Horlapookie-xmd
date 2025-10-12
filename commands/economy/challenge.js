import { getUser, isMainBot } from '../../lib/economy.js';

// Active challenges storage - exported for use in other combat commands
export const activeChallenges = new Map();
export const activeBattles = new Map();

export default {
  name: 'challenge',
  description: '⚔️ Challenge another player to PVP combat',
  category: 'Combat',
  aliases: ['duel', 'fight', 'pvpchallenge'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const challengerId = (msg.key.participant || msg.from?.id || chatId).toString();
    const challengerUsername = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, '❌ Combat commands only work on the main bot!');
    }

    // Only works in groups (Telegram groups have negative IDs or include '-')
    const isGroup = chatId < 0 || chatId.toString().includes('-');
    if (!isGroup) {
      return await bot.sendMessage(chatId, '❌ Challenges only work in groups!');
    }

    try {
      const challenger = await getUser(challengerId, challengerUsername, msg.from);

      // Initialize health if not exists
      if (!challenger.health) {
        challenger.health = 100;
        await challenger.save();
      }

      // Check if challenger is healthy enough
      if (challenger.health < 30) {
        return await bot.sendMessage(chatId,
          `❤️ *LOW HEALTH!*\n\n` +
          `Your HP: ${challenger.health}/100\n` +
          `❌ You need at least 30 HP to fight!\n\n` +
          `🏥 Visit /pharmacy to heal`,
          { parse_mode: 'Markdown' }
        );
      }

      // Check if in jail
      if (challenger.isJailed) {
        const releaseTime = new Date(challenger.jailReleaseTime);
        const now = new Date();
        if (now < releaseTime) {
          return await bot.sendMessage(chatId, '🔒 You can\'t challenge anyone from jail!');
        }
      }

      // Get target from mention or reply
      let targetId = null;
      let targetUsername = 'Unknown';

      // Check if replying to a message
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetId = msg.message.extendedTextMessage.contextInfo.participant;
      }
      // Check for @mention in args
      else if (args[0] && args[0].startsWith('@')) {
        targetId = args[0].replace('@', '') + '@s.whatsapp.net';
      }

      if (!targetId || targetId === challengerId) {
        return await bot.sendMessage(chatId,
          `⚔️ *PVP CHALLENGE*\n\n` +
          `❌ Usage:\n` +
          `• ${global.config.prefix}challenge @user\n` +
          `• Reply to someone's message with /challenge\n\n` +
          `💡 You can't challenge yourself!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Get target user
      const target = await getUser(targetId, targetUsername);

      // Initialize target health if not exists
      if (!target.health) {
        target.health = 100;
        await target.save();
      }

      // Check if target is healthy enough
      if (target.health < 30) {
        return await bot.sendMessage(chatId,
          `❤️ *TARGET WEAK!*\n\n` +
          `${target.username || 'Target'}'s HP: ${target.health}/100\n` +
          `❌ They need to heal before fighting!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Check if target is in jail
      if (target.isJailed) {
        return await bot.sendMessage(chatId, '🔒 That player is in jail and can\'t fight!');
      }

      // Check for existing challenge from this challenger to this target in this chat
      const challengeKey = `${challengerId}_${targetId}_${chatId}`;
      const existingChallenge = activeChallenges.get(challengeKey);
      if (existingChallenge) {
        return await bot.sendMessage(chatId, '⏰ You already have an active challenge with this player! Wait for response.');
      }

      // Create challenge
      activeChallenges.set(challengeKey, {
        challengerId,
        challengerUsername: challenger.username || challengerUsername,
        targetId,
        targetUsername: target.username || targetUsername,
        chatId,
        timestamp: Date.now()
      });

      // Auto-expire after 60 seconds
      setTimeout(() => {
        if (activeChallenges.has(challengeKey)) {
          activeChallenges.delete(challengeKey);
          bot.sendMessage(chatId, '⏰ Challenge expired! No response received.');
        }
      }, 60000);

      await bot.sendMessage(chatId,
        `⚔️ *PVP CHALLENGE INITIATED!*\n\n` +
        `🥊 ${challenger.username || challengerUsername} challenges ${target.username || targetUsername}!\n\n` +
        `❤️ ${challenger.username || challengerUsername} HP: ${challenger.health}/100\n` +
        `❤️ ${target.username || targetUsername} HP: ${target.health}/100\n\n` +
        `@${targetId.split('@')[0]} Type one of:\n` +
        `✅ /accept - Accept the challenge\n` +
        `❌ /decline - Decline the challenge\n\n` +
        `⏰ Challenge expires in 60 seconds`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[CHALLENGE] Error:', error);
      await bot.sendMessage(chatId, '❌ Challenge error. Try again.');
    }
  }
};
