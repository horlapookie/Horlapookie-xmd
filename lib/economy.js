import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let isConnected = false;

// User economy schema with multi-user bot deployment support
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  
  // Wallet
  balance: { type: Number, default: 1000 }, // Start with 1000 coins
  password: { type: String, default: null }, // For website login
  
  // Bank
  bank: { type: Number, default: 0 }, // Bank savings
  bankLimit: { type: Number, default: 10000 }, // Max bank capacity
  bankLevel: { type: Number, default: 1 }, // Bank upgrade level
  
  // Bot deployment
  botToken: { type: String, default: null },
  botUsername: { type: String, default: null },
  botDeployed: { type: Boolean, default: false },
  deployedAt: { type: Date, default: null },
  
  // Stats
  lastDaily: { type: Date, default: null },
  lastRob: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastBeg: { type: Date, default: null },
  lastTax: { type: Date, default: null },
  lastCrime: { type: Date, default: null },
  lastCops: { type: Date, default: null },
  loan: { type: Number, default: 0 },
  loanDue: { type: Date, default: null },
  totalEarned: { type: Number, default: 1000 }, // Initial 1000 counted
  totalSpent: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  
  // Rank system
  rank: { 
    type: String, 
    default: 'Newbie',
    enum: ['Newbie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend']
  },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  
  // Job system
  job: { type: String, default: null },
  jobLevel: { type: Number, default: 0 },
  jobTitle: { type: String, default: null },
  
  // Inventory & Items
  inventory: { type: Array, default: [] }, // [{item, quantity, boughtAt}]
  
  // Business ownership
  businesses: { type: Array, default: [] }, // [{name, type, income, boughtAt}]
  lastBusinessIncome: { type: Date, default: null },
  
  // Investments
  stocks: { type: Array, default: [] }, // [{name, shares, buyPrice}]
  crypto: { type: Array, default: [] }, // [{name, amount, buyPrice}]
  
  // Properties
  properties: { type: Array, default: [] }, // [{type, name, value, bonus, boughtAt}]
  
  // Crime & Jail
  crimeRecord: { type: Number, default: 0 }, // Total crimes committed
  isJailed: { type: Boolean, default: false },
  jailReleaseTime: { type: Date, default: null },
  
  // Bar & Lifestyle
  health: { type: Number, default: 100 }, // Health percentage
  mental: { type: Number, default: 100 }, // Mental health
  satisfaction: { type: Number, default: 0 }, // Satisfaction level
  barEffects: { type: Array, default: [] }, // Active bar effects
  sexStats: { 
    type: Object, 
    default: { total: 0, spent: 0 }
  },
  isSick: { type: Boolean, default: false },
  sickSince: { type: Date, default: null },
  
  // Missions
  dailyMissions: { type: Array, default: [] },
  lastMissionReset: { type: Date, default: null },
  completedStoryMissions: { type: Array, default: [] },
  
  // Black Market
  blackMarketAccess: { type: Boolean, default: false },
  blackMarketLevel: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function connectDB() {
  if (isConnected) {
    return true;
  }

  // Load .env file
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (err) {
    console.log('[ECONOMY] dotenv not loaded, using process.env');
  }

  // Check both .env and Replit Secrets
  const MONGODB_URL = process.env.MONGODB_URL || process.env.REPLIT_DB_URL;
  
  if (!MONGODB_URL) {
    console.error('[ECONOMY] ❌ MongoDB URL not found in .env or Replit Secrets!');
    console.error('[ECONOMY] Please set MONGODB_URL in .env file or Replit Secrets');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URL);
    isConnected = true;
    console.log('[ECONOMY] ✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('[ECONOMY] ❌ MongoDB connection failed:', error.message);
    console.error('[ECONOMY] Full error:', error);
    return false;
  }
}

// Check if current bot is the main bot (has pair ability)
export function isMainBot() {
  try {
    const tokenFile = path.join(process.cwd(), 'token.json');
    if (!fs.existsSync(tokenFile)) return false;
    
    const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    // Check for either 'token' (old WhatsApp) or 'telegram_bot_token' (Telegram)
    return (tokenData.token || tokenData.telegram_bot_token) ? true : false;
  } catch (error) {
    return false;
  }
}

// Calculate rank based on balance (much harder requirements)
function calculateRank(balance) {
  if (balance >= 1000000000) return 'Legend';      // 1 billion
  if (balance >= 100000000) return 'Diamond';      // 100 million
  if (balance >= 10000000) return 'Platinum';      // 10 million
  if (balance >= 1000000) return 'Gold';           // 1 million
  if (balance >= 100000) return 'Silver';          // 100k
  if (balance >= 10000) return 'Bronze';           // 10k
  return 'Newbie';
}



// Check and apply daily tax and sickness
async function checkAndApplyTax(user) {
  if (!user.lastTax) {
    // First time, set lastTax to now
    user.lastTax = new Date();
    return user;
  }

  const now = new Date();
  const hoursSinceLastTax = (now - new Date(user.lastTax)) / (1000 * 60 * 60);
  
  if (hoursSinceLastTax >= 24) {
    const taxAmount = calculateBills(user);
    if (taxAmount > 0 && user.balance >= taxAmount) {
      user.balance -= taxAmount;
      user.totalSpent += taxAmount;
      user.lastTax = now;
      console.log(`[ECONOMY] Bills of ${taxAmount} coins (${user.rank} rank) deducted from user ${user.username}`);
    } else if (taxAmount > 0) {
      // Can't afford bills, still update lastTax to avoid spam
      user.lastTax = now;
      console.log(`[ECONOMY] User ${user.username} cannot afford ${taxAmount} coins in bills`);
    }
  }
  
  // Check for sickness based on low health
  if (!user.health) user.health = 100;
  if (!user.isSick) user.isSick = false;
  
  if (user.health < 30 && !user.isSick) {
    user.isSick = true;
    user.sickSince = new Date();
    console.log(`[ECONOMY] User ${user.username} fell sick due to low health (${user.health}%)`);
  } else if (user.health >= 50 && user.isSick) {
    user.isSick = false;
    user.sickSince = null;
    console.log(`[ECONOMY] User ${user.username} recovered from sickness`);
  }

  // Daily medical deduction for sickness
  if (user.isSick) {
    const hoursSinceSick = (now - new Date(user.sickSince)) / (1000 * 60 * 60);
    const daysSick = Math.floor(hoursSinceSick / 24);
    
    if (!user.lastSicknessFee) user.lastSicknessFee = new Date(user.sickSince);
    const hoursSinceLastFee = (now - new Date(user.lastSicknessFee)) / (1000 * 60 * 60);
    
    if (hoursSinceLastFee >= 24) {
      const medicalFee = 1000000; // 1M per day
      if (user.balance >= medicalFee) {
        user.balance -= medicalFee;
        user.totalSpent += medicalFee;
        user.lastSicknessFee = now;
        console.log(`[ECONOMY] Medical fee ${medicalFee} deducted from sick user ${user.username}`);
      }
    }
  }

  // Daily medical deduction for drug addiction
  if (user.onHardDrugs) {
    if (!user.lastDrugMedicalFee) user.lastDrugMedicalFee = new Date();
    const hoursSinceLastDrugFee = (now - new Date(user.lastDrugMedicalFee)) / (1000 * 60 * 60);
    
    if (hoursSinceLastDrugFee >= 24) {
      const drugMedicalFee = 1000000; // 1M per day
      if (user.balance >= drugMedicalFee) {
        user.balance -= drugMedicalFee;
        user.totalSpent += drugMedicalFee;
        user.lastDrugMedicalFee = now;
        console.log(`[ECONOMY] Drug medical fee ${drugMedicalFee} deducted from addict ${user.username}`);
      }
      
      // Recovery chance if health improves
      if (user.health >= 70) {
        user.onHardDrugs = false;
        user.drugAddictionStart = null;
        console.log(`[ECONOMY] User ${user.username} recovered from drug addiction`);
      }
    }
  }

  // Child support payments
  if (user.pregnancies && user.pregnancies.length > 0) {
    user.pregnancies.forEach(async (pregnancy) => {
      if (pregnancy.decision === 'keep') {
        const now = new Date();
        const supportStart = new Date(pregnancy.childSupportStart);
        const supportEnd = new Date(pregnancy.childSupportEnd);
        
        if (now >= supportStart && now <= supportEnd) {
          if (!pregnancy.lastPayment) pregnancy.lastPayment = supportStart;
          const hoursSincePayment = (now - new Date(pregnancy.lastPayment)) / (1000 * 60 * 60);
          
          if (hoursSincePayment >= 24 * 30) { // Monthly payment
            const childSupport = 10000000; // 10M per month
            if (user.balance >= childSupport) {
              user.balance -= childSupport;
              user.totalSpent += childSupport;
              pregnancy.lastPayment = now;
              console.log(`[ECONOMY] Child support ${childSupport} deducted from ${user.username}`);
            }
          }
        }
      }
    });
  }
  
  return user;
}

// Calculate bills based on rank (higher ranks pay more)
function calculateBills(user) {
  const billRates = {
    'Newbie': 0,
    'Bronze': 500,
    'Silver': 1500,
    'Gold': 3000,
    'Platinum': 7500,
    'Diamond': 15000,
    'Legend': 30000
  };
  return billRates[user.rank] || 0;
}

// Get or create user with initial 1000 coins (works in DM and groups)
export async function getUser(userId, username = null, userInfo = {}) {
  if (!await connectDB()) {
    throw new Error('MongoDB connection failed');
  }
  
  let user = await User.findOne({ userId });
  
  if (!user) {
    user = new User({ 
      userId, 
      username: username || userInfo.username || userId,
      firstName: userInfo.first_name || null,
      lastName: userInfo.last_name || null,
      balance: 1000, // Initial gift
      totalEarned: 1000,
      lastTax: new Date() // Initialize tax timer
    });
    await user.save();
    console.log(`[ECONOMY] New user ${username} (${userId}) registered with 1000 coins`);
  } else {
    // Check and apply daily tax for existing users
    user = await checkAndApplyTax(user);
    await user.save();
  }
  
  return user;
}

export async function updateBalance(userId, amount, username = null) {
  await connectDB();
  const user = await getUser(userId, username);
  user.balance += amount;
  user.updatedAt = new Date();
  
  if (amount > 0) {
    user.totalEarned += amount;
    user.xp += Math.floor(amount / 100); // Much harder to gain XP (10x harder)
  } else {
    user.totalSpent += Math.abs(amount);
  }
  
  // Update rank
  user.rank = calculateRank(user.balance);
  user.level = Math.floor(user.xp / 5000) + 1; // Much harder to level up (10x harder)
  
  await user.save();
  return user;
}

export async function canClaimDaily(userId) {
  await connectDB();
  const user = await getUser(userId);
  
  if (!user.lastDaily) {
    return true;
  }
  
  const now = new Date();
  const lastDaily = new Date(user.lastDaily);
  const hoursSinceLastDaily = (now - lastDaily) / (1000 * 60 * 60);
  
  return hoursSinceLastDaily >= 24;
}

export async function claimDaily(userId, username = null) {
  await connectDB();
  const user = await getUser(userId, username);
  
  user.balance += 1000;
  user.totalEarned += 1000;
  user.xp += 10; // Reduced from 50 due to new XP system
  user.lastDaily = new Date();
  user.updatedAt = new Date();
  user.rank = calculateRank(user.balance);
  user.level = Math.floor(user.xp / 5000) + 1;
  
  await user.save();
  
  return user;
}

export async function getLeaderboard(limit = 10) {
  await connectDB();
  const users = await User.find()
    .sort({ balance: -1 })
    .limit(limit);
  
  return users;
}

export async function recordGame(userId, won, amount) {
  await connectDB();
  const user = await getUser(userId);
  
  user.gamesPlayed += 1;
  user.updatedAt = new Date();
  
  if (won) {
    user.gamesWon += 1;
    user.xp += 1;
  } else {
    user.xp += 0; // No XP for losing
  }
  
  user.level = Math.floor(user.xp / 5000) + 1;
  
  await user.save();
  return user;
}

// Set user password for website integration
export async function setPassword(userId, password) {
  await connectDB();
  const user = await getUser(userId);
  user.password = password; // In production, hash this!
  user.updatedAt = new Date();
  await user.save();
  return true;
}

// Deploy bot for user (store token)
export async function deployBot(userId, botToken, botUsername) {
  await connectDB();
  const user = await getUser(userId);
  
  if (user.balance < 1000) {
    return { success: false, message: 'Insufficient balance. Need 1000 coins.' };
  }
  
  // Deduct 1000 coins
  user.balance -= 1000;
  user.totalSpent += 1000;
  user.botToken = botToken;
  user.botUsername = botUsername;
  user.botDeployed = true;
  user.deployedAt = new Date();
  user.updatedAt = new Date();
  user.rank = calculateRank(user.balance);
  
  await user.save();
  
  return { success: true, user };
}

// Get user's deployed bot info
export async function getBotInfo(userId) {
  await connectDB();
  const user = await getUser(userId);
  
  if (!user.botDeployed) {
    return null;
  }
  
  return {
    botUsername: user.botUsername,
    deployedAt: user.deployedAt,
    token: user.botToken // Be careful with this in production
  };
}

// Check if user has deployed a bot
export async function hasDeployedBot(userId) {
  await connectDB();
  const user = await getUser(userId);
  return user.botDeployed;
}

// Get user rank badge emoji
export function getRankEmoji(rank) {
  const rankEmojis = {
    'Newbie': '🆕',
    'Bronze': '🥉',
    'Silver': '🥈',
    'Gold': '🥇',
    'Platinum': '💎',
    'Diamond': '💠',
    'Legend': '👑'
  };
  return rankEmojis[rank] || '🆕';
}

// Escape special Markdown characters to prevent parsing errors
export function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
