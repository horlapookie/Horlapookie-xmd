import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load cards from JSON file
let cardsData = [];
try {
  const cardsPath = path.join(__dirname, '../../attached_assets/card_1760282500375.json');
  const rawData = fs.readFileSync(cardsPath, 'utf8');
  cardsData = JSON.parse(rawData);
  console.log(`[CARD SYSTEM] Loaded ${cardsData.length} cards from JSON database`);
} catch (error) {
  console.error('[CARD SYSTEM] Failed to load cards JSON:', error.message);
}

export async function getBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('[CARD MEDIA] Error fetching buffer:', error.message);
    throw error;
  }
}

export function isGif(url) {
  return url && url.toLowerCase().endsWith('.gif');
}

export async function sendCardMedia(bot, chatId, card, caption, options = {}) {
  try {
    const imageUrl = card.image;

    if (!imageUrl) {
      return await bot.sendMessage(chatId, caption + '\n\n📝 _Text-only card_', {
        parse_mode: 'Markdown',
        ...options
      });
    }

    // Try to send with image
    try {
      if (isGif(imageUrl)) {
        const buffer = await getBuffer(imageUrl);
        return await bot.sendVideo(chatId, buffer, {
          caption,
          parse_mode: 'Markdown',
          ...options
        });
      } else {
        return await bot.sendPhoto(chatId, imageUrl, {
          caption,
          parse_mode: 'Markdown',
          ...options
        });
      }
    } catch (imageError) {
      console.error('[CARD MEDIA] Failed to load image, sending text only:', imageError.message);
      return await bot.sendMessage(chatId, caption + '\n\n⚠️ _Image temporarily unavailable_', {
        parse_mode: 'Markdown',
        ...options
      });
    }
  } catch (error) {
    console.error('[CARD MEDIA] Error sending media:', error.message);
    return await bot.sendMessage(chatId, caption + '\n\n⚠️ _Error loading card_', {
      parse_mode: 'Markdown',
      ...options
    });
  }
}

export async function fetchRandomCard(tierFilter = null, nameFilter = null) {
  try {
    let card;

    if (tierFilter || nameFilter) {
      // Search with filters - try MongoDB first, then fall back to JSON
      try {
        const { getAllCardsFromCatalog } = await import('./mongoDb.js');
        const filter = {};

        if (tierFilter) {
          filter.tier = tierFilter;
        }

        if (nameFilter) {
          filter.name = { $regex: nameFilter, $options: 'i' };
        }

        const cards = await getAllCardsFromCatalog(filter);

        if (cards && cards.length > 0) {
          // Pick random card from filtered results
          card = cards[Math.floor(Math.random() * cards.length)];

          return {
            name: card.name,
            tier: card.tier,
            source: card.source || 'Anime Collection',
            id: card.id,
            image: card.url
          };
        }
      } catch (dbError) {
        console.warn('[CARD FETCH] MongoDB not available, falling back to JSON');
      }

      // Fallback to JSON data with filters
      let filteredCards = cardsData.filter(card => card.tier && card.tier.trim() !== '');
      
      if (tierFilter) {
        filteredCards = filteredCards.filter(card => card.tier === tierFilter);
      }
      
      if (nameFilter) {
        filteredCards = filteredCards.filter(card => 
          card.title && card.title.toLowerCase().includes(nameFilter.toLowerCase())
        );
      }

      if (filteredCards.length === 0) {
        console.error('[CARD FETCH] No cards found matching filters in JSON data');
        return null;
      }

      const randomIndex = Math.floor(Math.random() * filteredCards.length);
      const randomCard = filteredCards[randomIndex];

      return {
        name: randomCard.title || 'Unknown Card',
        tier: randomCard.tier || '1',
        source: randomCard.source || 'Anime Collection',
        id: randomCard.id || `card_${randomIndex}`,
        image: randomCard.url || null
      };
    } else {
      // Random card without filters
      // Filter out cards without tier or with empty tier
      const validCards = cardsData.filter(card => card.tier && card.tier.trim() !== '');

      if (validCards.length === 0) {
        console.error('[CARD SYSTEM] No valid cards with tiers found');
        return {
          name: `Mystery Card #${Math.floor(Math.random() * 9999)}`,
          tier: '1',
          source: 'Default Collection',
          id: `default_${Date.now()}`,
          image: null
        };
      }

      // Get random card from JSON data
      const randomIndex = Math.floor(Math.random() * validCards.length);
      const randomCard = validCards[randomIndex];

      const card = {
        name: randomCard.title || 'Unknown Card',
        tier: randomCard.tier || '1',
        source: randomCard.source || 'Anime Collection',
        id: randomCard.id || `card_${randomIndex}`,
        image: randomCard.url || null,
        index: randomIndex,
        totalCards: validCards.length
      };

      console.log(`[CARD SYSTEM] ✅ Selected card: ${card.name} | Tier: ${card.tier} | Index: ${card.index} | Source: ${card.source}`);

      return card;
    }
  } catch (error) {
    console.error('[CARD FETCH] Error:', error);
    return null;
  }
}