
import { getUser, updateBalance, isMainBot, getRankEmoji } from '../../lib/economy.js';

const cryptoData = [
  { name: 'Bitcoin', symbol: 'BTC', basePrice: 45000 },
  { name: 'Ethereum', symbol: 'ETH', basePrice: 2500 },
  { name: 'Dogecoin', symbol: 'DOGE', basePrice: 100 }
];

const stockData = [
  { name: 'TechCorp', symbol: 'TECH', basePrice: 500 },
  { name: 'GameStop', symbol: 'GME', basePrice: 200 },
  { name: 'Tesla', symbol: 'TSLA', basePrice: 800 }
];

// Generate fluctuating price
function getCurrentPrice(basePrice) {
  const fluctuation = (Math.random() - 0.5) * 0.3; // ±30% fluctuation
  return Math.floor(basePrice * (1 + fluctuation));
}

export default {
  name: 'invest',
  description: '📈 Invest in stocks or crypto',
  category: 'Economy',
  aliases: ['stock', 'crypto', 'investment'],
  async execute(msg, { bot, args }) {
    const chatId = msg.key.remoteJid;
    const userId = (msg.key.participant || msg.from?.id || chatId).toString();
    const username = msg.from?.username || msg.from?.first_name || 'User';

    if (!isMainBot()) {
      return await bot.sendMessage(chatId, 
        '❌ Economy commands only work on the main bot. Visit @Horla1stbot!'
      );
    }

    try {
      const user = await getUser(userId, username, msg.from);
      
      // Show market if no args
      if (!args[0]) {
        let marketMenu = `📈 *INVESTMENT MARKET*\n\n💰 Your Balance: ${user.balance} coins\n\n`;
        
        marketMenu += `*📊 STOCKS*\n`;
        stockData.forEach(stock => {
          const price = getCurrentPrice(stock.basePrice);
          const change = ((price - stock.basePrice) / stock.basePrice * 100).toFixed(2);
          const arrow = change >= 0 ? '📈' : '📉';
          marketMenu += `${stock.symbol}: ${price} coins ${arrow} ${change}%\n`;
        });
        
        marketMenu += `\n*💎 CRYPTO*\n`;
        cryptoData.forEach(crypto => {
          const price = getCurrentPrice(crypto.basePrice);
          const change = ((price - crypto.basePrice) / crypto.basePrice * 100).toFixed(2);
          const arrow = change >= 0 ? '📈' : '📉';
          marketMenu += `${crypto.symbol}: ${price} coins ${arrow} ${change}%\n`;
        });
        
        marketMenu += `\n*Commands:*\n` +
          `/invest buy <symbol> <amount>\n` +
          `/invest sell <symbol> <amount>\n` +
          `/invest portfolio - View your investments\n\n` +
          `🔄 Prices update every time you check!`;

        return await bot.sendMessage(chatId, marketMenu, { parse_mode: 'Markdown' });
      }

      const action = args[0].toLowerCase();
      
      if (action === 'portfolio') {
        let portfolio = `💼 *YOUR LIVE PORTFOLIO*\n\n${getRankEmoji(user.rank)} ${user.username}\n\n`;
        
        let totalProfitLoss = 0;
        let totalValue = 0;
        
        if (user.stocks?.length > 0) {
          portfolio += `*📊 STOCKS (LIVE)*\n`;
          user.stocks.forEach(s => {
            const currentPrice = getCurrentPrice(stockData.find(stock => stock.symbol === s.symbol)?.basePrice || s.buyPrice);
            const profitLoss = (currentPrice - s.buyPrice) * s.shares;
            const percentChange = ((currentPrice - s.buyPrice) / s.buyPrice * 100).toFixed(2);
            const currentValue = currentPrice * s.shares;
            
            totalProfitLoss += profitLoss;
            totalValue += currentValue;
            
            portfolio += `${s.symbol}: ${s.shares} shares\n` +
              `  📊 Buy: ${s.buyPrice} | Live: ${currentPrice}\n` +
              `  ${profitLoss >= 0 ? '📈' : '📉'} P/L: ${profitLoss.toLocaleString()} (${percentChange}%)\n` +
              `  💰 Value: ${currentValue.toLocaleString()} coins\n\n`;
          });
        }
        
        if (user.crypto?.length > 0) {
          portfolio += `*💎 CRYPTO (LIVE)*\n`;
          user.crypto.forEach(c => {
            const currentPrice = getCurrentPrice(cryptoData.find(crypto => crypto.symbol === c.symbol)?.basePrice || c.buyPrice);
            const profitLoss = (currentPrice - c.buyPrice) * c.amount;
            const percentChange = ((currentPrice - c.buyPrice) / c.buyPrice * 100).toFixed(2);
            const currentValue = currentPrice * c.amount;
            
            totalProfitLoss += profitLoss;
            totalValue += currentValue;
            
            portfolio += `${c.symbol}: ${c.amount} units\n` +
              `  📊 Buy: ${c.buyPrice} | Live: ${currentPrice}\n` +
              `  ${profitLoss >= 0 ? '📈' : '📉'} P/L: ${profitLoss.toLocaleString()} (${percentChange}%)\n` +
              `  💰 Value: ${currentValue.toLocaleString()} coins\n\n`;
          });
        }
        
        if (!user.stocks?.length && !user.crypto?.length) {
          portfolio += `No investments yet!\n\nUse /invest to see the live market.`;
        } else {
          portfolio += `\n*📊 TOTAL PORTFOLIO*\n` +
            `💼 Total Value: ${totalValue.toLocaleString()} coins\n` +
            `${totalProfitLoss >= 0 ? '📈' : '📉'} Net P/L: ${totalProfitLoss.toLocaleString()} coins\n\n` +
            `🔄 Prices update in real-time!`;
        }

        return await bot.sendMessage(chatId, portfolio, { parse_mode: 'Markdown' });
      }

      if (action === 'buy' || action === 'sell') {
        if (!args[1] || !args[2]) {
          return await bot.sendMessage(chatId, 
            `❌ Usage: /invest ${action} <symbol> <amount>\n\nExample: /invest ${action} BTC 10`
          );
        }

        const symbol = args[1].toUpperCase();
        const amount = parseInt(args[2]);

        if (amount <= 0) {
          return await bot.sendMessage(chatId, '❌ Invalid amount!');
        }

        const stock = stockData.find(s => s.symbol === symbol);
        const crypto = cryptoData.find(c => c.symbol === symbol);
        const asset = stock || crypto;

        if (!asset) {
          return await bot.sendMessage(chatId, '❌ Invalid symbol! Use /invest to see available options.');
        }

        const currentPrice = getCurrentPrice(asset.basePrice);
        const totalCost = currentPrice * amount;
        const isStock = !!stock;

        if (action === 'buy') {
          if (user.balance < totalCost) {
            return await bot.sendMessage(chatId, 
              `❌ Insufficient funds!\n\n` +
              `💰 Need: ${totalCost} coins\n` +
              `💵 Have: ${user.balance} coins`
            );
          }

          await updateBalance(userId, -totalCost, username);

          if (!user.stocks) user.stocks = [];
          if (!user.crypto) user.crypto = [];

          if (isStock) {
            const existing = user.stocks.find(s => s.symbol === symbol);
            if (existing) {
              existing.shares += amount;
              existing.buyPrice = Math.floor((existing.buyPrice * existing.shares + currentPrice * amount) / (existing.shares + amount));
            } else {
              user.stocks.push({ symbol, name: asset.name, shares: amount, buyPrice: currentPrice });
            }
          } else {
            const existing = user.crypto.find(c => c.symbol === symbol);
            if (existing) {
              existing.amount += amount;
              existing.buyPrice = Math.floor((existing.buyPrice * existing.amount + currentPrice * amount) / (existing.amount + amount));
            } else {
              user.crypto.push({ symbol, name: asset.name, amount, buyPrice: currentPrice });
            }
          }

          await user.save();

          return await bot.sendMessage(chatId,
            `✅ *PURCHASE SUCCESSFUL!*\n\n` +
            `📊 Bought: ${amount} ${symbol}\n` +
            `💰 Price: ${currentPrice} coins each\n` +
            `💵 Total: ${totalCost} coins\n` +
            `💼 New Balance: ${user.balance} coins`,
            { parse_mode: 'Markdown' }
          );

        } else { // sell
          const holdings = isStock ? 
            user.stocks?.find(s => s.symbol === symbol) : 
            user.crypto?.find(c => c.symbol === symbol);

          if (!holdings || (isStock ? holdings.shares : holdings.amount) < amount) {
            return await bot.sendMessage(chatId, 
              `❌ You don't have ${amount} ${symbol} to sell!`
            );
          }

          const totalEarnings = currentPrice * amount;
          await updateBalance(userId, totalEarnings, username);

          if (isStock) {
            holdings.shares -= amount;
            if (holdings.shares === 0) {
              user.stocks = user.stocks.filter(s => s.symbol !== symbol);
            }
          } else {
            holdings.amount -= amount;
            if (holdings.amount === 0) {
              user.crypto = user.crypto.filter(c => c.symbol !== symbol);
            }
          }

          await user.save();

          return await bot.sendMessage(chatId,
            `✅ *SALE SUCCESSFUL!*\n\n` +
            `📉 Sold: ${amount} ${symbol}\n` +
            `💰 Price: ${currentPrice} coins each\n` +
            `💵 Earned: ${totalEarnings} coins\n` +
            `💼 New Balance: ${user.balance} coins`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      return await bot.sendMessage(chatId, '❌ Invalid action! Use: buy, sell, or portfolio');

    } catch (error) {
      console.error('[INVEST] Error:', error);
      await bot.sendMessage(chatId, '❌ Investment error. Try again.');
    }
  }
};
