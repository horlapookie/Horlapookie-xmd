import { getUser, updateBalance, isMainBot } from '../../lib/economy.js';
import { getSpawnedCard, deleteSpawnedCard, addToDeck, addToCollection, getUserDeck } from '../../lib/cards/mongoDb.js';
import { sendCardMedia } from '../../lib/cards/media.js';

const lock = new Set();

export default {
  name: 'collect',
  description: '🎴 Claim a spawned card with captcha',
  category: 'Cards',
  aliases: ['claim', 'grab'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    const cardKey = chatId.toString();
    if (lock.has(cardKey)) {
      return await bot.sendMessage(chatId, 
        '🚫 Another user is currently collecting the card. Please wait and try again.'
      );
    }

    lock.add(cardKey);

    try {
      const card = await getSpawnedCard(chatId);
      if (!card) {
        return await bot.sendMessage(chatId, {
          text: '🙅‍♀️ No active cards to claim!\n\n' +
                '💡 Cards spawn automatically every 5 minutes in groups with card spawner enabled.\n' +
                `📢 Creator can enable with: /cardspawner on`
        });
      }

      const user = await getUser(userId, username);
      const wallet = user.balance || 0;

      if (wallet === 0) {
        return await bot.sendMessage(chatId, 
          '❌ Your wallet is empty. Please earn some coins before claiming.'
        );
      }

      const cardPrice = card.price;
      if (wallet < cardPrice) {
        return await bot.sendMessage(chatId,
          `❌ Insufficient funds! You need *${cardPrice} coins*, but you only have *${wallet} coins*.`,
          { parse_mode: 'Markdown' }
        );
      }

      if (args.length === 0) {
        return await bot.sendMessage(chatId,
          '❌ Please provide the captcha code!\n\nUsage: /collect <captcha>'
        );
      }

      const captchaInput = args[0];
      if (captchaInput.toLowerCase() !== card.captcha.toLowerCase()) {
        return await bot.sendMessage(chatId, 
          '❌ Incorrect captcha! Please try again with the correct captcha.'
        );
      }

      const { tier, name } = card.card;
      const deck = await getUserDeck(userId);

      if (deck.length < 12) {
        await addToDeck(userId, card.card);
        const caption = `🎉 Congratulations @${username}! You have successfully claimed *${name} - ${tier}* for *${cardPrice} coins*!`;
        await sendCardMedia(bot, chatId, card.card, caption);
      } else {
        await addToCollection(userId, card.card);
        const caption = `🎉 @${username}, you have successfully added *${name} - ${tier}* to your collection for *${cardPrice} coins*!`;
        await sendCardMedia(bot, chatId, card.card, caption);
      }

      await updateBalance(userId, -cardPrice);
      await deleteSpawnedCard(chatId);

    } catch (error) {
      console.error('[COLLECT] Error:', error);
      await bot.sendMessage(chatId, 
        '❌ An unexpected error occurred while claiming the card. Please try again later.'
      );
    } finally {
      lock.delete(cardKey);
    }
  }
};
