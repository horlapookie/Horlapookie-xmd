
import { getUser, updateBalance, isMainBot } from '../../lib/economy.js';

export default {
  name: 'reportattack',
  description: '👮 Report your attacker to the police',
  category: 'Economy',
  aliases: ['reportcrime', 'callcops'],
  async execute(msg, { bot }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      if (!global.attackReports || !global.attackReports[userId]) {
        return await bot.sendMessage(chatId,
          '❌ No recent attacks to report!\n\nYou can only report attacks within 10 minutes.'
        );
      }

      const report = global.attackReports[userId];
      const timeSince = Date.now() - report.timestamp;
      
      if (timeSince > 600000) { // 10 minutes
        delete global.attackReports[userId];
        return await bot.sendMessage(chatId,
          '❌ Report expired! You must report within 10 minutes of the attack.'
        );
      }

      const victim = await getUser(userId, username, msg.from);
      const attacker = await getUser(report.attacker, report.attackerName);

      // Check if attacker paid cops recently (6 hour protection)
      let paidCopsRecently = false;
      if (attacker.lastCops) {
        const hoursSinceLastCops = (Date.now() - new Date(attacker.lastCops).getTime()) / (1000 * 60 * 60);
        paidCopsRecently = hoursSinceLastCops < 6;
      }

      if (paidCopsRecently) {
        delete global.attackReports[userId];
        
        return await bot.sendMessage(chatId,
          `🚔 *REPORT DISMISSED!*\n\n` +
          `${report.attackerName} paid the cops recently.\n` +
          `👮 Police are looking the other way!\n\n` +
          `💡 They're protected for ${(6 - (Date.now() - new Date(attacker.lastCops).getTime()) / (1000 * 60 * 60)).toFixed(1)} more hours.`,
          { parse_mode: 'Markdown' }
        );
      }

      // Police fine the attacker
      const fine = report.damage * 2; // Double the damage as fine
      await updateBalance(report.attacker, -fine, report.attackerName);

      // Jail the attacker
      attacker.isJailed = true;
      attacker.jailReleaseTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour jail
      await attacker.save();

      delete global.attackReports[userId];

      await bot.sendMessage(chatId,
        `👮 *POLICE REPORT FILED!*\n\n` +
        `🚔 ${report.attackerName} has been arrested!\n` +
        `💸 Fine: ${fine.toLocaleString()} coins\n` +
        `🔒 Jail time: 1 hour\n\n` +
        `Justice served!`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('[REPORT] Error:', error);
      await bot.sendMessage(chatId, '❌ Report failed. Try again.');
    }
  }
};
