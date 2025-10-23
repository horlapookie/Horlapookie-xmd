import { isMainBot } from '../../lib/economy.js';
import { getUserDeck, setSaleData, getSaleData } from '../../lib/cards/mongoDb.js';
import { sendCardMedia } from '../../lib/cards/media.js';

export default {
  name: 'salecard',
  description: '💰 Put a card up for sale',
  category: 'Cards',
  aliases: ['sellcard', 'csale'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const existingSale = await getSaleData(chatId);
      if (existingSale) {
        return await bot.sendMessage(chatId, 
          '❌ There is already an active sale in this chat. Please wait for it to complete.'
        );
      }

      if (args.length < 2) {
        return await bot.sendMessage(chatId, 
          '❌ Please provide card index and price.\n\nUsage: /salecard <index> <price>'
        );
      }

      const index = parseInt(args[0]) - 1;
      const price = parseInt(args[1]);

      if (isNaN(index) || isNaN(price)) {
        return await bot.sendMessage(chatId, 
          '❌ Invalid index or price. Both must be numbers.'
        );
      }

      if (price <= 0) {
        return await bot.sendMessage(chatId, 
          '❌ Price must be greater than 0.'
        );
      }

      const deck = await getUserDeck(userId);

      if (index < 0 || index >= deck.length) {
        return await bot.sendMessage(chatId, 
          `❌ Invalid card index! Your deck has ${deck.length} cards.`
        );
      }

      const card = deck[index];
      const saleData = {
        seller: userId,
        price,
        card,
        index
      };

      await setSaleData(chatId, saleData);

      const caption = `🛒 *CARD FOR SALE* 🛒\n\n` +
                     `💎 *Card:* ${card.name}\n` +
                     `🌟 *Tier:* ${card.tier}\n` +
                     `💰 *Price:* ${price} coins\n` +
                     `👤 *Seller:* @${username}\n\n` +
                     `Use /buycard to purchase!`;

      await sendCardMedia(bot, chatId, card, caption, {
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Buy Card', callback_data: `buycard_${userId}_${price}` }
          ]]
        }
      });
    } catch (err) {
      console.error('[SALECARD] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }
};
