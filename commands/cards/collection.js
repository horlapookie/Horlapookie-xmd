
import { isMainBot } from '../../lib/economy.js';
import { getUserCollection } from '../../lib/cards/mongoDb.js';
import { formatCardInfo, getTierEmoji } from '../../lib/cards/utils.js';
import { sendCardMedia } from '../../lib/cards/media.js';

export default {
  name: 'collection',
  description: '🃏 View your collected cards',
  category: 'Cards',
  aliases: ['coll', 'collec'],
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
      const collection = await getUserCollection(userId);
      if (collection.length === 0) {
        return await bot.sendMessage(chatId, 
          "❌ You currently don't have any cards in your collection."
        );
      }

      if (args.length === 0) {
        // Show collection list with first card's image
        let cardList = '';
        collection.forEach((card, index) => {
          const tierEmoji = getTierEmoji(card.tier);
          const escapedName = card.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
          cardList += `${index + 1}) ${tierEmoji} ${escapedName} *(Tier: ${card.tier})*\n`;
        });

        const caption = `*🃏 ${username}'s Card Collection*\n\n*Total: ${collection.length}*\n\n${cardList}\n_Use /collection <number> to view a specific card_`;
        
        // Send first card's image with the collection list
        await sendCardMedia(bot, chatId, collection[0], caption);
      } else {
        // Show specific card with its image
        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= collection.length) {
          return await bot.sendMessage(chatId, 
            `❌ Invalid card index! Your collection has ${collection.length} cards.`
          );
        }

        const card = collection[index];
        const caption = formatCardInfo(card, index);
        
        await sendCardMedia(bot, chatId, card, caption);
      }
    } catch (err) {
      console.error('[COLLECTION] Error:', err);
      await bot.sendMessage(chatId, '⚠️ An error occurred while fetching your card collection.');
    }
  }
};
