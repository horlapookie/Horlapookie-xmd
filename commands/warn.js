import fs from 'fs';
import path from 'path';

const WARNS_FILE = path.join(process.cwd(), 'data', 'warns.json');

function loadWarns() {
  if (!fs.existsSync(WARNS_FILE)) return {};
  return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
}

function saveWarns(warns) {
  fs.writeFileSync(WARNS_FILE, JSON.stringify(warns, null, 2));
}

export default {
  name: 'warn',
  description: 'Warn a user (admin only)',
  async execute(msg, { sock, bot }) {
    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us') || (bot && !isNaN(parseInt(remoteJid)));

    // Telegram bot handling
    if (bot) {
      const chatId = parseInt(remoteJid);
      const chat = await bot.getChat(chatId);
      
      if (chat.type !== 'group' && chat.type !== 'supergroup') {
        return await bot.sendMessage(chatId, '⚠️ This command can only be used in groups.');
      }
      
      // Check admin status
      const admins = await bot.getChatAdministrators(chatId);
      const normalizedSenderId = parseInt(sender.split('@')[0]);
      const isAdmin = admins.some(admin => admin.user.id === normalizedSenderId);
      
      if (!isAdmin) {
        return await bot.sendMessage(chatId, '❌ Only group admins can warn users.');
      }
      
      // Get target user from reply or mention
      let userToWarn = null;
      
      // Check for reply
      let replyMsg = msg.message?.reply_to_message || msg.key?.quotedMessage;
      if (replyMsg) {
        userToWarn = replyMsg.from?.id || replyMsg.user?.id;
      }
      
      // Check for mention/tag in text
      if (!userToWarn && msg.message?.text) {
        const text = msg.message.text;
        const mentionMatch = text.match(/@(\w+)/);
        if (mentionMatch) {
          const username = mentionMatch[1];
          // Try to find user by username in chat members
          const chatMembers = await bot.getChatAdministrators(chatId);
          const allMembers = chatMembers.concat(await bot.getChatMember(chatId, msg.key.participant).catch(() => []));
          const mentioned = allMembers.find(m => m.user?.username === username);
          if (mentioned) {
            userToWarn = mentioned.user.id;
          }
        }
      }
      
      if (!userToWarn) {
        return await bot.sendMessage(chatId, '⚠️ Please reply to or tag the user you want to warn.');
      }
      
      const warns = loadWarns();
      if (!warns[remoteJid]) warns[remoteJid] = {};
      if (!warns[remoteJid][userToWarn]) warns[remoteJid][userToWarn] = 0;
      warns[remoteJid][userToWarn] += 1;
      saveWarns(warns);
      
      const targetUser = replyMsg.from || { first_name: 'User' };
      await bot.sendMessage(chatId, `⚠️ ${targetUser.first_name} has been warned. Total warnings: ${warns[remoteJid][userToWarn]}`);
      return;
    }

    // Only allow in groups for WhatsApp
    if (!isGroup) {
      await sock.sendMessage(remoteJid, { text: '⚠️ This command can only be used in groups.' }, { quoted: msg });
      return;
    }

    // Check if sender is admin or allowed number (you can adapt your allowed numbers array)
    const allowedNumbers = ['2349122222622']; // your allowed numbers here
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const admins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
    if (!admins.includes(sender) && !allowedNumbers.includes(sender.split('@')[0])) {
      await sock.sendMessage(remoteJid, { text: '❌ Only group admins or bot owner can warn users.' }, { quoted: msg });
      return;
    }

    // Identify user to warn from mention or reply
    let userToWarn;
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      userToWarn = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      userToWarn = msg.message.extendedTextMessage.contextInfo.participant;
    } else {
      await sock.sendMessage(remoteJid, { text: '⚠️ Please tag or reply to the user you want to warn.' }, { quoted: msg });
      return;
    }

    const warns = loadWarns();

    if (!warns[remoteJid]) warns[remoteJid] = {};
    if (!warns[remoteJid][userToWarn]) warns[remoteJid][userToWarn] = 0;

    warns[remoteJid][userToWarn] += 1;

    saveWarns(warns);

    await sock.sendMessage(remoteJid, {
      text: `⚠️ <@${userToWarn.split('@')[0]}> has been warned. Total warnings: ${warns[remoteJid][userToWarn]}`,
      mentions: [userToWarn]
    }, { quoted: msg });
  }
};