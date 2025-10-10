
import mongoose from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL || process.env.REPLIT_DB_URL;

const userSchema = new mongoose.Schema({
  userId: String,
  username: String,
  balance: Number,
  totalEarned: Number,
  updatedAt: Date
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function giveBonus() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users`);
    
    let updated = 0;
    for (const user of users) {
      user.balance = (user.balance || 0) + 10000;
      user.totalEarned = (user.totalEarned || 0) + 10000;
      user.updatedAt = new Date();
      await user.save();
      updated++;
      console.log(`✅ Gave 1000 coins to ${user.username} (${user.userId})`);
    }
    
    console.log(`\n🎉 Successfully gave 10000 coins to ${updated} users!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

giveBonus();
