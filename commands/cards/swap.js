import { isMainBot } from '../../lib/economy.js';
import { getUserDeck, setUserDeck, getSaleData } from '../../lib/cards/mongoDb.js';

export default {
  name: 'swap',
  description: '🔄 Swap two cards in your deck',
  category: 'Cards',
  aliases: ['cswap', 'swapcards'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const saleData = await getSaleData(chatId);
      if (saleData && saleData.seller === userId) {
        return await bot.sendMessage(chatId, 
          '❌ You cannot swap cards while selling.'
        );
      }

      const deck = await getUserDeck(userId);

      if (args.length < 2) {
        return await bot.sendMessage(chatId, 
          '❌ Please provide two card indices.\n\nUsage: /swap <index1> <index2>'
        );
      }

      const index1 = parseInt(args[0]) - 1;
      const index2 = parseInt(args[1]) - 1;

      if (isNaN(index1) || index1 < 0 || index1 >= deck.length) {
        return await bot.sendMessage(chatId, 
          '❌ Please provide a valid first card index.'
        );
      }

      if (isNaN(index2) || index2 < 0 || index2 >= deck.length) {
        return await bot.sendMessage(chatId, 
          '❌ Please provide a valid second card index.'
        );
      }

      if (index1 === index2) {
        return await bot.sendMessage(chatId, 
          '❌ The two indices provided cannot be the same.'
        );
      }

      [deck[index1], deck[index2]] = [deck[index2], deck[index1]];
      await setUserDeck(userId, deck);

      const cardName1 = deck[index1].name;
      const cardName2 = deck[index2].name;

      await bot.sendMessage(chatId,
        `✅ Cards at index ${index1 + 1} *(${cardName1})* and ${index2 + 1} *(${cardName2})* have been swapped.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[SWAP] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }
};
