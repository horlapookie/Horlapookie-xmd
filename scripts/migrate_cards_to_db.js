import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { addCardToCatalog, getCardCatalogCount, clearCardCatalog } from '../lib/cards/mongoDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

async function migrateCards() {
  try {
    console.log('[MIGRATION] Starting card migration...');
    
    if (!MONGODB_URI) {
      console.error('[MIGRATION] ❌ MongoDB URL not found in environment variables!');
      console.error('[MIGRATION] Please set MONGODB_URL in Replit Secrets');
      console.error('[MIGRATION] Get MongoDB connection string from: https://www.mongodb.com/cloud/atlas');
      process.exit(1);
    }
    
    if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
      console.error('[MIGRATION] ❌ Invalid MongoDB URL format!');
      console.error('[MIGRATION] URL must start with mongodb:// or mongodb+srv://');
      console.error('[MIGRATION] Current value:', MONGODB_URI.substring(0, 20) + '...');
      process.exit(1);
    }
    
    console.log('[MIGRATION] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[MIGRATION] Connected to MongoDB');

    const existingCount = await getCardCatalogCount();
    console.log(`[MIGRATION] Found ${existingCount} existing cards in database`);

    if (existingCount > 0) {
      console.log('[MIGRATION] Database already has cards. Skipping migration.');
      console.log('[MIGRATION] To force re-import, first run: node scripts/clear_card_catalog.js');
      await mongoose.disconnect();
      return;
    }

    const cardsPath = path.join(__dirname, '../attached_assets/card_1760282500375.json');
    
    if (!fs.existsSync(cardsPath)) {
      console.error('[MIGRATION] Card JSON file not found:', cardsPath);
      await mongoose.disconnect();
      return;
    }

    console.log('[MIGRATION] Reading cards from JSON...');
    const rawData = fs.readFileSync(cardsPath, 'utf8');
    const cardsData = JSON.parse(rawData);
    
    console.log(`[MIGRATION] Found ${cardsData.length} cards to import`);
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < cardsData.length; i++) {
      const card = cardsData[i];
      
      if (!card.tier || !card.title || !card.url) {
        console.warn(`[MIGRATION] Skipping invalid card at index ${i}:`, card);
        errorCount++;
        continue;
      }

      try {
        const cardData = {
          tier: card.tier,
          name: card.title,
          url: card.url,
          source: card.source || 'Anime Collection',
          id: `card_${i}_${card.tier}_${card.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}`
        };

        await addCardToCatalog(cardData);
        successCount++;

        if (successCount % 1000 === 0) {
          console.log(`[MIGRATION] Progress: ${successCount}/${cardsData.length} cards imported`);
        }
      } catch (err) {
        console.error(`[MIGRATION] Error importing card at index ${i}:`, err.message);
        errorCount++;
      }
    }

    console.log('[MIGRATION] ✅ Migration completed!');
    console.log(`[MIGRATION] Successfully imported: ${successCount} cards`);
    console.log(`[MIGRATION] Errors: ${errorCount} cards`);

    const finalCount = await getCardCatalogCount();
    console.log(`[MIGRATION] Total cards in database: ${finalCount}`);

    await mongoose.disconnect();
    console.log('[MIGRATION] Disconnected from MongoDB');
  } catch (error) {
    console.error('[MIGRATION] Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateCards();
