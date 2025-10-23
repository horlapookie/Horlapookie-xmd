import { isMainBot } from '../../lib/economy.js';
import { getUserDeck, setUserDeck, getUserCollection, setUserCollection } from '../../lib/cards/mongoDb.js';

export default {
  name: 't2deck',
  description: '🎴 Transfer card from collection to deck',
  category: 'Cards',
  aliases: ['transfer2deck', 'tocollection', 'movetodeck'],
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
          '❌ Please specify a card index.\n\nUsage: /t2deck <card index>'
        );
      }

      const collection = await getUserCollection(userId);
      if (!collection || collection.length === 0) {
        return await bot.sendMessage(chatId, '❌ Your collection is empty!');
      }

      const deck = await getUserDeck(userId);
      if (deck.length >= 12) {
        return await bot.sendMessage(chatId, 
          '❌ Your deck is full! (Max 12 cards)\n\n' +
          'Transfer a card to collection first using /t2coll'
        );
      }

      const index = parseInt(args[0]) - 1;

      if (isNaN(index) || index < 0 || index >= collection.length) {
        return await bot.sendMessage(chatId, 
          `❌ Invalid card index! Your collection has ${collection.length} cards.`
        );
      }

      const card = collection[index];
      const escapedCardName = card.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

      collection.splice(index, 1);
      await setUserCollection(userId, collection);

      deck.push(card);
      await setUserDeck(userId, deck);

      await bot.sendMessage(chatId,
        `✅ *Card Transferred to Deck!*\n\n` +
        `🃏 Card: ${escapedCardName}\n` +
        `🌟 Tier: ${card.tier}\n\n` +
        `🎴 Deck: ${deck.length}/12 cards\n` +
        `📦 Collection: ${collection.length} cards`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[T2DECK] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }
};
