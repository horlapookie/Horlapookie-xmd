
// Global cooldown system for all commands
const commandCooldowns = new Map();

/**
 * Check and apply cooldown for a command
 * @param {string} userId - User ID
 * @param {string} commandName - Command name
 * @param {number} cooldownSeconds - Cooldown duration in seconds
 * @returns {Object} { canExecute: boolean, timeLeft: number }
 */
export function checkCooldown(userId, commandName, cooldownSeconds) {
  const key = `${userId}_${commandName}`;
  const now = Date.now();
  const cooldownMs = cooldownSeconds * 1000;

  if (commandCooldowns.has(key)) {
    const lastUse = commandCooldowns.get(key);
    const timeLeft = cooldownMs - (now - lastUse);

    if (timeLeft > 0) {
      return {
        canExecute: false,
        timeLeft: Math.ceil(timeLeft / 1000)
      };
    }
  }

  commandCooldowns.set(key, now);
  return { canExecute: true, timeLeft: 0 };
}

/**
 * Get cooldown duration based on command category
 * @param {string} category - Command category
 * @returns {number} Cooldown in seconds
 */
export function getCooldownByCategory(category) {
  const cooldowns = {
    'Economy': 5,     // 5 seconds
    'Cards': 10,      // 10 seconds
    'Default': 3      // 3 seconds for general commands
  };

  return cooldowns[category] || cooldowns.Default;
}

/**
 * Format cooldown message
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted message
 */
export function formatCooldownMessage(commandName, seconds) {
  return `⏰ *Cooldown Active*\n\n` +
    `⏳ Please wait ${seconds} second(s) before using /${commandName} again.`;
}
