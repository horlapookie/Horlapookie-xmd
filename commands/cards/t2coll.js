import { isMainBot } from '../../lib/economy.js';
import { getUserDeck, setUserDeck, getUserCollection, setUserCollection } from '../../lib/cards/mongoDb.js';

export default {
  name: 't2coll',
  description: '📦 Transfer card from deck to collection',
  category: 'Cards',
  aliases: ['transfer2collection', 'todeck', 'movetocoll'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      if (args.length === 0) {
        return await bot.sendMessage(chatId, 
          '❌ Please specify a card index.\n\nUsage: /t2coll <card index>'
        );
      }

      const deck = await getUserDeck(userId);
      if (!deck || deck.length === 0) {
        return await bot.sendMessage(chatId, '❌ Your deck is empty!');
      }

      const index = parseInt(args[0]) - 1;

      if (isNaN(index) || index < 0 || index >= deck.length) {
        return await bot.sendMessage(chatId, 
          `❌ Invalid card index! Your deck has ${deck.length} cards.`
        );
      }

      const card = deck[index];
      const escapedCardName = card.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

      deck.splice(index, 1);
      await setUserDeck(userId, deck);

      const collection = await getUserCollection(userId);
      collection.push(card);
      await setUserCollection(userId, collection);

      await bot.sendMessage(chatId,
        `✅ *Card Transferred to Collection!*\n\n` +
        `🃏 Card: ${escapedCardName}\n` +
        `🌟 Tier: ${card.tier}\n\n` +
        `📦 Deck: ${deck.length} cards\n` +
        `🗂️ Collection: ${collection.length} cards`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[T2COLL] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }
};
