import { getUser, isMainBot } from '../../lib/economy.js';
import { getUserDeck, getUserCollection } from '../../lib/cards/mongoDb.js';
import { getTierEmoji } from '../../lib/cards/utils.js';
import { getBuffer, isGif } from '../../lib/cards/media.js';

export default {
  name: 'cards',
  description: '🃏 Display all your cards (deck + collection)',
  category: 'Cards',
  aliases: ['myc', 'mycards'],
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
      const deck = await getUserDeck(userId);

      if (collection.length === 0 && deck.length === 0) {
        return await bot.sendMessage(chatId, 
          "❌ Oops! You don't have any cards in your collection or deck."
        );
      }

      const user = await getUser(userId, username);
      let caption = `🃏 *Name:* ${user.username}\n\n`;

      const allCards = [...deck, ...collection];
      const arg = args[0] || '';

      if (arg === '--events') {
        const eventCards = allCards.filter(card => card.id && card.id.startsWith('event'));
        if (eventCards.length === 0) {
          return await bot.sendMessage(chatId, '🚫 No event cards found.');
        }

        eventCards.forEach((card, index) => {
          caption += `*${index + 1}. ${card.name} (ID: ${card.id})*\n`;
        });

        // Download and send card image as buffer
        if (eventCards[0].image) {
          try {
            const buffer = await getBuffer(eventCards[0].image);
            if (isGif(eventCards[0].image)) {
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
            console.error('[CARDS] Failed to load event card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption + '\n\n📝 _Text-only card_', {
            parse_mode: 'Markdown'
          });
        }
      } else if (arg === '--name') {
        const groupedCards = {};
        allCards.forEach(card => {
          const name = card.name;
          const firstLetter = name[0].toLowerCase();
          if (!groupedCards[firstLetter]) groupedCards[firstLetter] = [];
          groupedCards[firstLetter].push(card);
        });

        Object.keys(groupedCards).sort().forEach(letter => {
          caption += `*Cards starting with ${letter.toUpperCase()}*:\n`;
          groupedCards[letter].sort((a, b) => a.name.localeCompare(b.name)).forEach((card, index) => {
            caption += `${index + 1}. ${card.name} (Tier: ${card.tier})\n`;
          });
          caption += '\n';
        });
        
        // Send first card's image with the list
        const firstCard = allCards[0];
        if (firstCard && firstCard.image) {
          try {
            const buffer = await getBuffer(firstCard.image);
            if (isGif(firstCard.image)) {
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
            console.error('[CARDS] Failed to load card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption, {
            parse_mode: 'Markdown'
          });
        }
      } else if (arg === '--tier') {
        const tiers = {};
        allCards.forEach(card => {
          const tier = card.tier;
          if (!tiers[tier]) tiers[tier] = [];
          tiers[tier].push(card);
        });

        ['S', '6', '5', '4', '3', '2', '1'].forEach(tier => {
          if (tiers[tier]) {
            caption += `${getTierEmoji(tier)} *Tier: ${tier}*\n\n`;
            tiers[tier].forEach((card, index) => {
              caption += `${index + 1} ➣ ${card.name}\n`;
            });
            caption += '\n';
          }
        });

        // Send first card's image with the list
        const firstCard = allCards[0];
        if (firstCard && firstCard.image) {
          try {
            const buffer = await getBuffer(firstCard.image);
            if (isGif(firstCard.image)) {
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
            console.error('[CARDS] Failed to load card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption, {
            parse_mode: 'Markdown'
          });
        }
      } else {
        allCards.forEach((card, index) => {
          const name = card.name;
          const tier = card.tier;
          caption += `*${index + 1}. ${name} (Tier: ${tier})*\n`;
        });
      }

      const firstCard = allCards[0];
      if (firstCard) {
        if (firstCard.image) {
          try {
            const buffer = await getBuffer(firstCard.image);
            if (isGif(firstCard.image)) {
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
            console.error('[CARDS] Failed to load card image:', imageError.message);
            await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await bot.sendMessage(chatId, caption, {
            parse_mode: 'Markdown'
          });
        }
      } else {
        await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      console.error('[CARDS] Error:', err);
      await bot.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }
};