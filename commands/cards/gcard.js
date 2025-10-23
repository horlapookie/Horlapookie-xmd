
import { isMainBot } from '../../lib/economy.js';
import { getUserDeck, setUserDeck } from '../../lib/cards/mongoDb.js';
import { sendCardMedia } from '../../lib/cards/media.js';

export default {
  name: 'gcard',
  description: '🎁 Give a card from your deck to another user',
  category: 'Cards',
  aliases: ['givecard', 'sendcard', 'transfercard'],
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
      // Get target user from reply or mention
      let targetUserId = null;
      let targetUsername = 'User';
      
      // Priority 1: Check for reply
      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
      } 
      // Priority 2: Check for text mention (when user has privacy settings)
      else if (msg.entities && msg.entities.length > 0) {
        const mention = msg.entities.find(e => e.type === 'text_mention');
        if (mention?.user) {
          targetUserId = mention.user.id.toString();
          targetUsername = mention.user.username || mention.user.first_name || 'User';
        }
      }
      
      if (!targetUserId) {
        return await bot.sendMessage(chatId, 
          '❌ Please reply to or tag the user you want to give a card to!\n\n' +
          'Usage:\n' +
          '• Reply to their message: /gcard <card index>\n' +
          '• Or tag them: /gcard <card index> @username'
        );
      }
      
      if (targetUserId === userId) {
        return await bot.sendMessage(chatId, '😂 You can\'t give a card to yourself!');
      }

      if (args.length === 0) {
        return await bot.sendMessage(chatId, 
          '❌ Please specify a card index from your deck.\n\n' +
          'Usage: /gcard <card index>\n\n' +
          'Use /deck to see your cards and their indices.'
        );
      }

      const index = parseInt(args[0]) - 1;

      // Get giver's deck
      const giverDeck = await getUserDeck(userId);
      
      if (!giverDeck || giverDeck.length === 0) {
        return await bot.sendMessage(chatId, '❌ Your deck is empty!');
      }

      if (isNaN(index) || index < 0 || index >= giverDeck.length) {
        return await bot.sendMessage(chatId, 
          `❌ Invalid card index! Your deck has ${giverDeck.length} cards.\n\n` +
          'Use /deck to see your cards.'
        );
      }

      // Get the card to transfer
      const card = giverDeck[index];

      // Remove card from giver's deck
      giverDeck.splice(index, 1);
      await setUserDeck(userId, giverDeck);

      // Get receiver's deck
      const receiverDeck = await getUserDeck(targetUserId);

      // Add to receiver's deck or collection
      if (receiverDeck.length < 12) {
        receiverDeck.push(card);
        await setUserDeck(targetUserId, receiverDeck);
        
        const escapedName = (card.name || 'Unknown').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedUsername = username.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedTargetUsername = targetUsername.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const caption = `🎁 *CARD GIFT\\!*\n\n` +
                       `@${escapedUsername} gave *${escapedName} \\- ${card.tier}* to @${escapedTargetUsername}\n\n` +
                       `✨ The card has been added to @${escapedTargetUsername}'s deck\\!\n\n` +
                       `_What a generous gift\\!_`;
        
        await sendCardMedia(bot, chatId, card, caption);
      } else {
        // Add to collection if deck is full
        const { addToCollection } = await import('../../lib/cards/mongoDb.js');
        await addToCollection(targetUserId, card);
        
        const escapedName = (card.name || 'Unknown').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedUsername = username.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedTargetUsername = targetUsername.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const caption = `🎁 *CARD GIFT\\!*\n\n` +
                       `@${escapedUsername} gave *${escapedName} \\- ${card.tier}* to @${escapedTargetUsername}\n\n` +
                       `📦 The card has been added to @${escapedTargetUsername}'s collection \\(deck was full\\)\\!\n\n` +
                       `_What a generous gift\\!_`;
        
        await sendCardMedia(bot, chatId, card, caption);
      }

    } catch (error) {
      console.error('[GCARD] Error:', error);
      await bot.sendMessage(chatId, '❌ Failed to transfer card. Try again.');
    }
  }
};
