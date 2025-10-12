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

export async function fetchRandomCard() {
  if (cardsData.length === 0) {
    console.error('[CARD SYSTEM] No cards available in JSON database');
    return {
      name: `Mystery Card #${Math.floor(Math.random() * 9999)}`,
      tier: '1',
      source: 'Default Collection',
      id: `default_${Date.now()}`,
      image: null
    };
  }

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