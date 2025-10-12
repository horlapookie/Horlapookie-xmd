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
    'S': 10000,
    '6': 8000,
    '5': 5000,
    '4': 3000,
    '3': 2000,
    '2': 1000,
    '1': 500
  };
  return prices[tier] || 500;
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