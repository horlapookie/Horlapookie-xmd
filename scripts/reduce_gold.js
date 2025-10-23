import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || process.env.REPLIT_DB_URL;

const userSchema = new mongoose.Schema({
  userId: String,
  username: String,
  balance: Number,
  bank: Number,
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function reduceAllGold() {
  try {
    if (!MONGODB_URL) {
      console.error('❌ MONGODB_URL not set! Please set it in .env file');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users`);
    
    let updated = 0;
    let totalReduced = 0;

    for (const user of users) {
      const oldBalance = user.balance || 0;
      const oldBank = user.bank || 0;
      const oldTotal = oldBalance + oldBank;

      // Reduce to 75% (3/4)
      const newBalance = Math.floor(oldBalance * 0.75);
      const newBank = Math.floor(oldBank * 0.75);
      const newTotal = newBalance + newBank;
      const reduced = oldTotal - newTotal;

      if (reduced > 0) {
        user.balance = newBalance;
        user.bank = newBank;
        user.updatedAt = new Date();
        await user.save();
        
        totalReduced += reduced;
        updated++;
        
        console.log(`✅ @${user.username || user.userId}: ${oldTotal} → ${newTotal} coins (reduced ${reduced})`);
      }
    }

    console.log('\n🎉 Gold reduction complete!');
    console.log(`📉 Users updated: ${updated}/${users.length}`);
    console.log(`💰 Total coins removed: ${totalReduced.toLocaleString()}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reduceAllGold();
