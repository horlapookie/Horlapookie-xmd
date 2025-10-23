import mongoose from 'mongoose';
import { clearCardCatalog, getCardCatalogCount } from '../lib/cards/mongoDb.js';

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

async function clearCatalog() {
  try {
    if (!MONGODB_URI) {
      console.error('[CLEAR] ❌ MONGODB_URL not set in Replit Secrets');
      process.exit(1);
    }
    
    console.log('[CLEAR] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const count = await getCardCatalogCount();
    console.log(`[CLEAR] Found ${count} cards in catalog`);
    
    if (count === 0) {
      console.log('[CLEAR] Catalog is already empty');
      await mongoose.disconnect();
      return;
    }

    console.log('[CLEAR] Clearing card catalog...');
    const result = await clearCardCatalog();
    console.log(`[CLEAR] ✅ Deleted ${result.deletedCount} cards`);

    await mongoose.disconnect();
    console.log('[CLEAR] Done!');
  } catch (error) {
    console.error('[CLEAR] Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearCatalog();
