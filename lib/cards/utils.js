export function generateCaptcha() {
  const length = 6;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let captchaText = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    captchaText += charset[randomIndex];
  }
  return { text: captchaText };
}

export function calculatePrice(tier) {
  const prices = {
    'S': 50000000,  // 50m
    '6': 10000000,  // 10m
    '5': 5000000,   // 5m
    '4': 2000000,   // 2m
    '3': 1000000,   // 1m
    '2': 1000000,   // 1m
    '1': 1000000    // 1m
  };
  return prices[tier] || 1000000;
}

export function getTierEmoji(tier) {
  const tierEmojis = {
    'S': '👑',
    '6': '💎',
    '5': '🔮',
    '4': '🌟',
    '3': '🎐',
    '2': '🪄',
    '1': '💠'
  };
  return tierEmojis[tier] || '💠';
}

export function shouldSkipTier(tier) {
  return tier === 'S' || tier === '6' || tier === '5';
}

export function formatCardInfo(card, index = null) {
  const tierEmoji = getTierEmoji(card.tier);
  let text = '';

  // Escape special Markdown characters to prevent parsing errors
  const escapeName = (str) => str.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

  // Show index from collection if provided, otherwise use card's own index
  if (index !== null) {
    text += `📍 *Card #${index + 1}*\n`;
  } else if (card.index !== undefined) {
    text += `📍 *Database Index: #${card.index}*\n`;
  }

  text += `${tierEmoji} *Name:* ${escapeName(card.name)}\n`;
  text += `🌟 *Tier:* ${card.tier}\n`;

  if (card.source) {
    text += `🔖 *Source:* ${escapeName(card.source)}\n`;
  }

  if (card.id) {
    text += `🆔 *ID:* ${escapeName(card.id)}\n`;
  }

  if (card.totalCards) {
    text += `📊 *Total Cards in DB:* ${card.totalCards}\n`;
  }

  return text;
}

export function isHighTierCard(tier) {
  return tier === '6' || tier === 'S';
}