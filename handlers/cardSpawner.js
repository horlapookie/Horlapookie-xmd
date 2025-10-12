import cron from 'node-cron';
import { setSpawnedCard } from '../lib/cards/mongoDb.js';
import { generateCaptcha, calculatePrice, shouldSkipTier } from '../lib/cards/utils.js';
import { fetchRandomCard, getBuffer, isGif } from '../lib/cards/media.js';

const cardGroupIds = new Set();

function escapeMarkdown(text) {
  if (!text) return text;
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export function addCardGroup(groupId) {
  cardGroupIds.add(groupId.toString());
  console.log(`[CARD SPAWNER] Added group: ${groupId}`);
}

export function removeCardGroup(groupId) {
  cardGroupIds.delete(groupId.toString());
  console.log(`[CARD SPAWNER] Removed group: ${groupId}`);
}

export function getCardGroups() {
  return Array.from(cardGroupIds);
}

export async function spawnCardInGroup(bot, groupId, retryCount = 0) {
  const MAX_RETRIES = 5;
  
  try {
    console.log(`[CARD SPAWNER] Attempting to spawn card in group: ${groupId} (Retry: ${retryCount}/${MAX_RETRIES})`);
    
    const card = await fetchRandomCard();
    if (!card || !card.image) {
      console.error('[CARD SPAWNER] Invalid card data received');
      if (retryCount < MAX_RETRIES) {
        return await spawnCardInGroup(bot, groupId, retryCount + 1);
      }
      await bot.sendMessage(groupId, '⚠️ Failed to fetch card data after multiple attempts.');
      return false;
    }

    const { name, tier, source, id, image } = card;

    // Skip high tier cards
    if (shouldSkipTier(tier)) {
      console.log(`[CARD SPAWNER] Skipping tier ${tier}: ${name}, fetching another...`);
      return await spawnCardInGroup(bot, groupId, retryCount);
    }

    const price = calculatePrice(tier);
    const captcha = generateCaptcha();

    console.log(`[CARD SPAWNER] Spawning card: ${name} | Tier: ${tier} | Group: ${groupId}`);

    await setSpawnedCard(groupId, {
      price,
      captcha: captcha.text,
      card: { name, tier, id, source, image }
    });

    const escapedName = escapeMarkdown(name);
    const escapedSource = escapeMarkdown(source);
    const escapedId = escapeMarkdown(id);
    const escapedCaptcha = escapeMarkdown(captcha.text);

    const caption = `🎉 *A New Card Has Spawned!* 🎉\n\n` +
                   `🃏 *Card Details*\n` +
                   `💠 *Name:* ${escapedName}\n` +
                   `👑 *Tier:* ${tier}\n` +
                   `📍 *Index:* ${card.index !== undefined ? `#${card.index}` : 'N/A'}\n` +
                   `💰 *Price:* ${price} coins\n` +
                   `📝 *Source:* ${escapedSource}\n` +
                   `🆔 *ID:* ${escapedId}\n` +
                   `🎁 *Captcha:* ${escapedCaptcha}\n\n` +
                   `*Use /collect <captcha> to claim!*`;

    try {
      // Always download image as buffer first to avoid Telegram CDN access issues
      const buffer = await getBuffer(image);
      
      if (isGif(image)) {
        await bot.sendVideo(groupId, buffer, {
          caption,
          parse_mode: 'Markdown'
        });
      } else {
        await bot.sendPhoto(groupId, buffer, {
          caption,
          parse_mode: 'Markdown'
        });
      }
      
      console.log(`[CARD SPAWNER] ✅ Successfully spawned card: ${name}`);
      return true;
    } catch (imageError) {
      console.error(`[CARD SPAWNER] Failed to load/send image for card: ${name}`, imageError.message);
      
      // If image fails, retry with a different card
      if (retryCount < MAX_RETRIES) {
        console.log(`[CARD SPAWNER] Retrying with different card...`);
        return await spawnCardInGroup(bot, groupId, retryCount + 1);
      }
      
      throw imageError;
    }
  } catch (error) {
    console.error(`[CARD SPAWNER] Error spawning card for group ${groupId}:`, error.message);
    
    // If we haven't exceeded retries and it's an image issue, try again
    if (retryCount < MAX_RETRIES && error.message.includes('failed to get HTTP URL content')) {
      console.log(`[CARD SPAWNER] Retrying spawn due to image error...`);
      return await spawnCardInGroup(bot, groupId, retryCount + 1);
    }
    
    // Send error notification to group only on final failure
    if (retryCount >= MAX_RETRIES) {
      try {
        await bot.sendMessage(groupId, 
          '⚠️ Card spawn failed after multiple attempts. Please try /spawncard manually.'
        );
      } catch (sendError) {
        console.error('[CARD SPAWNER] Failed to send error message:', sendError.message);
      }
    }
    
    return false;
  }
}

export function initializeCardSpawner(bot) {
  console.log('[CARD SPAWNER] Initializing card spawner...');

  // Spawn cards every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CARD SPAWNER] Card spawner triggered.');
    
    const groups = getCardGroups();
    if (groups.length === 0) {
      console.log('[CARD SPAWNER] No groups registered for card spawning.');
      return;
    }

    for (const groupId of groups) {
      await spawnCardInGroup(bot, groupId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  console.log('[CARD SPAWNER] Card spawner scheduled successfully (every 5 minutes).');
}

export default {
  initialize: initializeCardSpawner,
  addGroup: addCardGroup,
  removeGroup: removeCardGroup,
  getGroups: getCardGroups,
  spawnCard: spawnCardInGroup
};
