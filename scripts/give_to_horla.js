import mongoose from 'mongoose';
import { connectDB } from '../lib/economy.js';

async function giveToUser(targetUserId = null) {
  try {
    // Load .env file
    const dotenv = await import('dotenv');
    dotenv.config();

    await connectDB();

    const User = mongoose.models.User;

    if (!targetUserId) {
      console.log('❌ No target user ID provided!');
      console.log('Usage: node scripts/give_to_horla.js <userId>');
      process.exit(1);
    }

    // Find the target user
    const targetUser = await User.findOne({ userId: targetUserId });

    if (!targetUser) {
      console.log(`❌ User with ID ${targetUserId} not found!`);
      process.exit(1);
    }

    // Add 2 billion coins
    targetUser.balance += 2000000000;
    targetUser.totalEarned += 2000000000;
    targetUser.rank = 'Legend';
    targetUser.updatedAt = new Date();

    await targetUser.save();

    console.log(`\n✅ Successfully gave 2,000,000,000 coins to ${targetUser.username}!`);
    console.log(`💰 New balance: ${targetUser.balance.toLocaleString()} coins`);
    console.log(`👑 Rank: ${targetUser.rank}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get userId from command line arguments
const targetUserId = process.argv[2];
giveToUser(targetUserId);