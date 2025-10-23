
import { getAllCardsFromCatalog } from '../../lib/cards/mongoDb.js';
import { getTierEmoji } from '../../lib/cards/utils.js';
import { isMainBot } from '../../lib/economy.js';

export default {
  name: 'searchcard',
  description: '🔍 Search for cards by name or tier',
  category: 'Cards',
  aliases: ['scard', 'findc'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Card commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      let tierFilter = null;
      let nameFilter = null;
      let searchName = '';

      // Parse arguments
      for (const arg of args) {
        if (arg.startsWith('--tier=')) {
          tierFilter = arg.split('=')[1].toUpperCase();
        } else if (arg.startsWith('--name=')) {
          nameFilter = arg.split('=')[1];
        } else if (!arg.startsWith('--')) {
          // Treat as name search
          searchName += (searchName ? ' ' : '') + arg;
        }
      }

      // Use searchName if no explicit --name filter
      if (!nameFilter && searchName) {
        nameFilter = searchName;
      }

      if (!tierFilter && !nameFilter) {
        return await bot.sendMessage(chatId,
          '❌ Please provide search criteria!\n\n' +
          'Usage:\n' +
          '• /searchcard Sukuna\n' +
          '• /searchcard Goj (finds Gojo)\n' +
          '• /searchcard --tier=S\n' +
          '• /searchcard Nar --tier=6\n\n' +
          '💡 Searches work with partial names!'
        );
      }

      // Build filter with fuzzy search
      const filter = {};
      if (tierFilter) {
        filter.tier = tierFilter;
      }
      if (nameFilter) {
        // Fuzzy search: split search term into parts and match any
        const searchTerms = nameFilter.trim().split(/\s+/);
        
        // Create regex patterns for partial matching
        const regexPatterns = searchTerms.map(term => {
          // Escape special regex characters
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(escapedTerm, 'i');
        });
        
        // Match if ANY search term appears in the name
        filter.$or = regexPatterns.map(pattern => ({
          name: { $regex: pattern }
        }));
      }

      console.log('[SEARCHCARD] Filter:', JSON.stringify(filter, null, 2));

      // Search cards
      const cards = await getAllCardsFromCatalog(filter);

      console.log('[SEARCHCARD] Found cards:', cards?.length || 0);

      if (!cards || cards.length === 0) {
        return await bot.sendMessage(chatId,
          '❌ No cards found matching your criteria.\n\n' +
          'Search Tips:\n' +
          '• Try fewer letters (e.g., "Goj" for Gojo)\n' +
          '• Check tier (1-6, S)\n' +
          '• Try different spellings\n\n' +
          `Searched for: ${nameFilter || 'N/A'}\n` +
          `Tier: ${tierFilter || 'Any'}`
        );
      }

      // Sort by relevance (exact matches first, then partial)
      if (nameFilter) {
        const lowerSearch = nameFilter.toLowerCase();
        cards.sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          
          // Exact match priority
          const aExact = aName === lowerSearch ? 0 : 1;
          const bExact = bName === lowerSearch ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          
          // Starts with priority
          const aStarts = aName.startsWith(lowerSearch) ? 0 : 1;
          const bStarts = bName.startsWith(lowerSearch) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          
          // Alphabetical
          return aName.localeCompare(bName);
        });
      }

      // Limit to top 10 results
      const displayCards = cards.slice(0, 10);
      const totalCards = cards.length;

      let response = `🔍 CARD SEARCH RESULTS\n\n`;
      
      if (nameFilter) {
        response += `📝 Search: ${nameFilter}\n`;
      }
      if (tierFilter) {
        response += `🎯 Tier: ${tierFilter}\n`;
      }
      response += `📊 Found: ${totalCards} card(s)\n`;
      response += `📋 Showing: Top ${displayCards.length}\n\n`;
      response += `━━━━━━━━━━━━━━━━━━\n\n`;

      displayCards.forEach((card, index) => {
        const tierEmoji = getTierEmoji(card.tier);
        const cardName = (card.name || 'Unknown').substring(0, 50);
        const cardSource = (card.source || 'Unknown').substring(0, 30);
        const cardId = (card.id || 'N/A').substring(0, 20);
        
        response += `${index + 1}. ${tierEmoji} ${cardName}\n`;
        response += `   ├ Tier: ${card.tier}\n`;
        response += `   ├ Source: ${cardSource}\n`;
        response += `   └ ID: ${cardId}\n\n`;
      });

      if (totalCards > 10) {
        response += `\nShowing first 10 of ${totalCards} results\n`;
      }

      response += `\n💡 Use /spawncard --name=${nameFilter || 'CardName'} to spawn!`;

      await bot.sendMessage(chatId, response);

    } catch (error) {
      console.error('[SEARCHCARD] Error:', error);
      console.error('[SEARCHCARD] Stack:', error.stack);
      await bot.sendMessage(chatId, 
        `❌ Search failed!\n\n` +
        `Error: ${error.message}\n\n` +
        `Please try again or contact support.`
      );
    }
  }
};
