import { getUser, isMainBot, getRankEmoji, escapeMarkdown } from '../../lib/economy.js';

export default {
  name: 'useitem',
  description: '💊 Use an item from your inventory',
  category: 'Economy',
  aliases: ['use', 'consume'],
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

      if (!args[0]) {
        return await bot.sendMessage(chatId,
          `💊 *USE ITEM*\n\n` +
          `Usage: /useitem <item_id>\n\n` +
          `📦 Available consumable items:\n` +
          `• medkit - Restore 50 HP\n` +
          `• bandage - Restore 20 HP\n\n` +
          `View your items: /inventory`,
          { parse_mode: 'Markdown' }
        );
      }

      const itemId = args[0].toLowerCase();

      // Find item in inventory
      const itemIndex = user.inventory?.findIndex(i => i.item === itemId);
      
      if (itemIndex === -1 || !user.inventory || !user.inventory[itemIndex]) {
        return await bot.sendMessage(chatId, `❌ You don't own this item! Check /inventory`);
      }

      const item = user.inventory[itemIndex];
      let resultMessage = '';

      // Handle different item types
      switch (itemId) {
        case 'medkit':
          if (user.health >= 100) {
            return await bot.sendMessage(chatId, '❌ Your health is already full!');
          }
          const oldHealth1 = user.health || 100;
          user.health = Math.min(100, (user.health || 100) + 50);
          resultMessage = `✅ *MEDKIT USED!*\n\n` +
            `🏥 Health restored: ${oldHealth1} → ${user.health} HP\n` +
            `❤️ Restored: +50 HP`;
          
          // Remove item from inventory
          user.inventory.splice(itemIndex, 1);
          break;

        case 'bandage':
          if (user.health >= 100) {
            return await bot.sendMessage(chatId, '❌ Your health is already full!');
          }
          const oldHealth2 = user.health || 100;
          user.health = Math.min(100, (user.health || 100) + 20);
          resultMessage = `✅ *BANDAGE USED!*\n\n` +
            `🩹 Health restored: ${oldHealth2} → ${user.health} HP\n` +
            `❤️ Restored: +20 HP`;
          
          // Remove item from inventory
          user.inventory.splice(itemIndex, 1);
          break;

        case 'shield':
          return await bot.sendMessage(chatId, 
            `🛡️ Shield is automatically used when someone tries to rob you!\n\n` +
            `It provides one-time protection and will be consumed when blocking an attack.`
          );

        case 'lock':
          return await bot.sendMessage(chatId, 
            `🔒 Bank Lock is a passive item!\n\n` +
            `It provides extra protection for your bank savings automatically.`
          );

        case 'detector':
          return await bot.sendMessage(chatId, 
            `📡 Cop Detector is a passive item!\n\n` +
            `It automatically reduces cop fees by 50% when active.`
          );

        case 'fake_id':
          return await bot.sendMessage(chatId, 
            `🪪 Fake ID is a passive item!\n\n` +
            `It automatically reduces your jail time by 50% if you get caught.`
          );

        default:
          // Check if it's a weapon or passive item
          if (['pistol', 'rifle', 'sniper', 'knife', 'katana', 'machete', 'baseball_bat', 'bottle', 'taser', 'grenade', 'armor', 'helmet'].includes(itemId)) {
            return await bot.sendMessage(chatId, 
              `⚔️ Weapons and armor are used during PVP combat!\n\n` +
              `Use them with:\n` +
              `• /pvpattack ${itemId}\n` +
              `• /challenge @user to start a battle`
            );
          }

          return await bot.sendMessage(chatId, `❌ This item cannot be consumed directly.`);
      }

      await user.save();
      await bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[USE ITEM] Error:', error);
      await bot.sendMessage(chatId, '❌ Error using item. Try again.');
    }
  }
};
