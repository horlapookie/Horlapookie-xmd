import { getUser, updateBalance, isMainBot } from '../../lib/economy.js';
import { getUserDeck, getUserCollection, setUserDeck, setUserCollection, addToDeck, addToCollection, getSaleData, deleteSaleData } from '../../lib/cards/mongoDb.js';

const locks = new Set();

export default {
  name: 'buycard',
  description: '🛒 Purchase a card from an active sale',
  category: 'Cards',
  aliases: ['bcard', 'purchasecard'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    const saleKey = chatId.toString();

    if (locks.has(saleKey)) {
      return await bot.sendMessage(chatId, 
        '⚠️ Another transaction is in progress. Please wait a moment and try again.'
      );
    }

    locks.add(saleKey);

    try {
      const saleData = await getSaleData(chatId);
      if (!saleData) {
        return await bot.sendMessage(chatId, 
          '❌ This sale has either expired or does not exist.'
        );
      }

      const { seller, price, card, index } = saleData;

      if (seller === userId) {
        return await bot.sendMessage(chatId, 
          '❌ You cannot buy your own card!'
        );
      }

      const sellerDeck = await getUserDeck(seller);
      const buyerDeck = await getUserDeck(userId);

      if (index >= sellerDeck.length) {
        return await bot.sendMessage(chatId, 
          "❌ The seller's deck does not contain this card."
        );
      }

      const buyer = await getUser(userId, username);
      const sellerUser = await getUser(seller, 'Seller');

      if (buyer.balance < price) {
        return await bot.sendMessage(chatId, 
          '⛔ You do not have enough coins to complete this purchase.'
        );
      }

      await updateBalance(userId, -price);
      await updateBalance(seller, price);

      sellerDeck.splice(index, 1);
      await setUserDeck(seller, sellerDeck);

      if (buyerDeck.length >= 12) {
        await addToCollection(userId, card);
      } else {
        await addToDeck(userId, card);
      }

      await deleteSaleData(chatId);

      const completionText = `✅ *Transaction Successful!*\n\n` +
                            `@${username} has paid ${price} coins to purchase *${card.name} - ${card.tier}*!`;

      await bot.sendMessage(chatId, completionText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('[BUYCARD] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ An error occurred during the purchase. Please try again.'
      );
    } finally {
      locks.delete(saleKey);
    }
  }
};

export async function handleBuyCardCallback(query, bot) {
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const username = query.from.username || query.from.first_name || 'User';

  try {
    await bot.answerCallbackQuery(query.id);

    const saleData = await getSaleData(chatId);
    if (!saleData) {
      return await bot.editMessageCaption(
        '❌ This sale has expired or does not exist.',
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      );
    }

    const { seller, price, card, index } = saleData;

    if (seller === userId) {
      return await bot.answerCallbackQuery(query.id, {
        text: '❌ You cannot buy your own card!',
        show_alert: true
      });
    }

    if (locks.has(chatId.toString())) {
      return await bot.answerCallbackQuery(query.id, {
        text: '⚠️ Transaction in progress!',
        show_alert: true
      });
    }

    locks.add(chatId.toString());

    const buyer = await getUser(userId, username);

    if (buyer.balance < price) {
      locks.delete(chatId.toString());
      return await bot.answerCallbackQuery(query.id, {
        text: `⛔ You need ${price} coins but have ${buyer.balance} coins.`,
        show_alert: true
      });
    }

    const sellerDeck = await getUserDeck(seller);
    const buyerDeck = await getUserDeck(userId);

    if (index >= sellerDeck.length) {
      locks.delete(chatId.toString());
      return await bot.answerCallbackQuery(query.id, {
        text: "❌ Card no longer available!",
        show_alert: true
      });
    }

    await updateBalance(userId, -price);
    await updateBalance(seller, price);

    sellerDeck.splice(index, 1);
    await setUserDeck(seller, sellerDeck);

    if (buyerDeck.length >= 12) {
      await addToCollection(userId, card);
    } else {
      await addToDeck(userId, card);
    }

    await deleteSaleData(chatId);

    await bot.editMessageCaption(
      `✅ *SOLD!*\n\n@${username} purchased *${card.name} - ${card.tier}* for ${price} coins!`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }
      }
    );

    locks.delete(chatId.toString());

  } catch (error) {
    console.error('[BUYCARD CALLBACK] Error:', error);
    locks.delete(chatId.toString());
    await bot.answerCallbackQuery(query.id, {
      text: `Error: ${error.message}`,
      show_alert: true
    });
  }
}
