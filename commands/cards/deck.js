
import { isMainBot } from '../../lib/economy.js';
import { getUserDeck } from '../../lib/cards/mongoDb.js';
import { formatCardInfo, getTierEmoji } from '../../lib/cards/utils.js';
import { getBuffer, isGif } from '../../lib/cards/media.js';

export default {
  name: 'deck',
  description: '🎴 View your card deck',
  category: 'Cards',
  aliases: ['mydeck'],
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
      const deck = await getUserDeck(userId);
      if (!deck || deck.length === 0) {
        return await bot.sendMessage(chatId, '❌ *No Deck Found*', { parse_mode: 'Markdown' });
      }

      if (args.length > 0) {
        // Show specific card with its image
        const index = parseInt(args[0]) - 1;

        if (isNaN(index) || index < 0 || index >= deck.length) {
          return await bot.sendMessage(chatId, 
            `❌ Invalid card index! Your deck has ${deck.length} cards.`
          );
        }

        const card = deck[index];
        // Escape special Markdown characters
        const escapedName = card.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedSource = (card.source || 'Unknown').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const escapedId = (card.id || 'N/A').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        
        const caption = `🃏 *Total Cards in Deck:* ${deck.length}\n\n` +
                       `🏮 *Username:* ${username}\n` +
                       `#${index + 1}\n` +
                       `🌟 *Name:* ${escapedName}\n` +
                       `🌟 *Tier:* ${card.tier}\n` +
                       `🔖 *Source:* ${escapedSource}\n` +
                       `🆔 *ID:* ${escapedId}`;

        // Download and send card image as buffer
        if (card.image) {
          try {
            const buffer = await getBuffer(card.image);
            if (isGif(card.image)) {
              await bot.sendVideo(chatId, buffer, {
                caption,
                parse_mode: 'Markdown'
              });
            } else {
              await bot.sendPhoto(chatId, buffer, {
                caption,
                parse_mode: 'Markdown'
              });
            }
          } catch (imageError) {
            console.error('[DECK] Failed to load card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption + '\n\n📝 _Text-only card_', {
            parse_mode: 'Markdown'
          });
        }
      } else {
        // Show full deck list with first card's image
        let cardText = '';
        deck.forEach((card, i) => {
          const tierEmoji = getTierEmoji(card.tier);
          const escapedName = card.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
          cardText += `#${i + 1})\n${tierEmoji} *Name:* ${escapedName}\n🌟 *Tier:* ${card.tier}\n\n`;
        });

        const caption = `♠️ *${username}'s Deck* ♠️\n\n🃏 *Total Cards: ${deck.length}*\n\n${cardText}\n_Use /deck <number> to view a specific card_`;

        // Send first card's image with the deck list
        if (deck[0] && deck[0].image) {
          try {
            const buffer = await getBuffer(deck[0].image);
            if (isGif(deck[0].image)) {
              await bot.sendVideo(chatId, buffer, {
                caption,
                parse_mode: 'Markdown'
              });
            } else {
              await bot.sendPhoto(chatId, buffer, {
                caption,
                parse_mode: 'Markdown'
              });
            }
          } catch (imageError) {
            console.error('[DECK] Failed to load first card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption, {
            parse_mode: 'Markdown'
          });
        }
      }
    } catch (err) {
      console.error('[DECK] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error occurred: ${err.message}`);
    }
  }
};
