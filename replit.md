# Overview

HORLA POOKIE is a Telegram bot converted from WhatsApp, built with Node.js that provides 300+ commands across multiple categories including AI interactions, media processing, group management, utilities, and entertainment features. The bot is designed to be highly extensible with a modular command structure and supports various integrations with external services.

**Note**: This bot was recently converted from WhatsApp to Telegram. Some commands that rely on WhatsApp-specific features (stickers, media manipulation) may need additional adaptation to work fully with Telegram.

# User Preferences

Preferred communication style: Simple, everyday language.
Token stored in: token.json (not in environment variables as user requested)
API keys stored in: settings.js (hardcoded as user requested)

# Recent Changes (October 2025)

## Comprehensive Economy System Overhaul (October 10, 2025)

### Bug Fixes
- **Aviator Game**: Fixed stuck multiplier at 1.40x, optimized interval timing, fixed DM cashout
- **Loan System**: Fixed auto-disbursement - loans now automatically credit to user after approval

### Rank-Based Taxation System
- **Tax Implementation**: Automatic tax deductions based on user wealth and rank
- **Rank Thresholds**: Newbie (1000), Bronze (2000), Silver (3000), Gold (5000), Platinum (8000), Diamond (12000), Legend (15000)
- **Tax Rates**: Scale from 5 coins (Newbie) to 50 coins (Legend) per transaction

### New Economy Features (18 Systems Total)

#### Protection & Security
- **Shop System** (`/shop`): Purchase protective items, lockpicks, disguises, alibis
- **Cops Payment** (`/paycops`): Bribe cops to avoid jail (cost scales with wealth)
- **Bank Upgrades** (`/bankupgrade`): Increase deposit limits (Bronze: 5K, Silver: 10K, Gold: 25K, etc.)

#### Income Sources
- **Investment System** (`/invest`): Buy/sell stocks and crypto with fluctuating prices (±30%)
- **Business Ownership** (`/business`): Own businesses for passive income (collect every 6 hours)
- **Job System** (`/job`): Career progression with 10 levels and salary increases
- **Property System** (`/property`): Buy houses, cars, pets with various bonuses

#### Crime & Risk
- **Crime System** (`/crime`): Pickpocket, heist, smuggle with success/fail mechanics
- **Jail System** (`/jail`, `/bail`): Get jailed for crimes, pay bail or serve time
- **Black Market** (`/blackmarket`): Unlock special items through crimes (10+ crimes required)

#### Missions & Quests
- **Daily Missions** (`/missions`): Complete tasks for rewards (auto-reset daily)
- **Story Missions**: Heists, vault raids, and complex operations

### Database Schema Updates
- Added 15+ new fields to user schema: inventory, businesses, properties, investments, jail status, job details, crime stats
- All data persists in MongoDB with proper indexing

### Menu Integration
- Updated economy menu with 36+ commands across multiple categories
- Added inline keyboards for interactive features (bank upgrades, deposits, withdrawals)
- Integrated callback handlers in index.js for all new systems

### Technical Stats
- **Total Commands**: 401 (36 economy-specific)
- **Economy Systems**: 18 major systems
- **Database**: MongoDB with comprehensive user tracking
- **Features**: Fully integrated rank-based scaling for all economy features

## Complete Migration from WhatsApp to Telegram (October 6, 2025)

### Branding Updates
- Changed all references from "horlapookie-bot" to "horlapookie-xmd"
- Updated repository URLs to "horlapookie/Horlapookie-xmd"
- Changed creator number to 2347049044897 across all files
- Updated bot name to "HORLA POOKIE XMD"

### Architecture Changes
- **Removed Self Commands Architecture**: Moved all commands from commands/self/ to commands/ since Telegram bots cannot message themselves
- **Owner Checks**: Updated all self commands to use `isOwner` checks instead of `isFromMe` checks
- **Commands Loaded**: 333 total commands successfully loading (including new economy commands)

### Group Commands Migration
- **tagall.js**: Converted to Telegram API using `bot.getChatAdministrators()` and `bot.getChat()`
- **announce.js**: Updated to use Telegram group API, updated owner number
- **broadcast.js**: Converted to use `data/bot_groups.json` for group tracking (Telegram doesn't support `groupFetchAllParticipating()`)

### Menu System Overhaul
- **Fixed Duplicate Sending**: Menu now sends only ONCE with photo and buttons combined
- **Image URL**: Updated to use `mediaUrls.menuImage` from lib/mediaUrls.js
- **Button Links**: Updated creator link to wa.me/2347049044897 and repo to horlapookie/Horlapookie-xmd
- **Economy Category**: Added new Economy category button with 6 commands
- **Inline Keyboard**: 15+ category buttons with URL buttons for creator and repository

### MongoDB Economy System
- **Database**: Integrated mongoose for MongoDB persistence (requires MONGODB_URL env variable)
- **Economy Module**: Created lib/economy.js with full user economy management
- **Commands Created**:
  - `/daily` - Claim 10 coins every 24 hours
  - `/balance` - View economy stats (balance, earnings, games won/lost)
  - `/slot` - Slot machine with 10x jackpot for diamonds
  - `/aviator` - Aviator betting game with crash mechanics
  - `/gamble` - 50/50 coin flip betting
  - `/leaderboard` - Top 10 richest users
- **User Tracking**: userId, username, balance, lastDaily, totalEarned, totalSpent, gamesPlayed, gamesWon

### Technical Improvements
- Created `data/bot_groups.json` for broadcast command group tracking
- All dependency files exist (lib/persistentData.js, lib/horla.js, config.js, lib/messageConfig.js)
- Bot successfully running with web interface on port 5000

## Known Limitations
- Economy system requires MONGODB_URL environment variable to function
- Some WhatsApp-specific commands may still need adaptation (stickers, media)
- Broadcast command requires manual group tracking in data/bot_groups.json

# System Architecture

## Core Technologies
- **Runtime**: Node.js with ES6 modules (type: "module")
- **Bot Framework**: node-telegram-bot-api for Telegram bot functionality
- **Logging**: Pino for structured logging
- **Media Processing**: FFmpeg, Jimp for image/audio/video manipulation
- **AI Services**: OpenAI (GPT-4), Google Generative AI (Gemini), custom AI endpoints

## Application Structure

### Entry Point (`index.js`)
- Initializes the Telegram bot using token from `token.json`
- Loads persistent settings for bot behavior (public/private mode, auto-reactions, anti-spam features)
- Sets up global configuration including bot name, prefix, owner details
- Manages moderators, banned users, and welcome configurations through JSON files

### Configuration Management
- **Token storage**: Telegram bot token stored in `token.json`
- **API keys**: Hardcoded in `settings.js` as per user preference
- **Persistent settings**: Custom implementation in `lib/persistentData.js` for runtime-modifiable settings
- **Data storage**: JSON files in `data/` directory for moderators, banned users, trivia, scores, etc.

### Command Architecture
- **Modular design**: Each command is a separate file in `commands/` directory
- **Dynamic loading**: Commands are loaded at runtime from the commands directory
- **Execution pattern**: Each command exports an object/function with `name`, `description`, `aliases`, and `execute` method
- **Context passing**: Commands receive Telegram message object, bot instance, args, and utility functions

## Feature Categories

### AI & Chatbot Features
- **Multiple AI providers**: OpenAI GPT-4, Gemini AI, custom Copilot API
- **Contextual memory**: In-memory chat history tracking
- **User preferences**: Stores user information for personalized responses
- **Typing indicators**: Simulates human-like interaction with typing status

### Utility Commands
- **Encoding/Decoding**: Base64, binary, hex, AES encryption
- **URL tools**: Link shortening, URL expansion
- **Text processing**: Dictionary lookups, translations, language detection
- **Developer tools**: GitHub integration (user info, commits, issues, PRs, releases)
- **Finance**: Forex rates, currency conversion, market status
- **Code execution**: Run Python, JavaScript, C++, Java code

### Entertainment & Information
- **Religious texts**: Quran and Bible verse retrieval with proper formatting
- **Trivia games**: Question/answer system with scoring and time limits
- **Sports**: Football/soccer data via Football-Data.org API (Champions League stats, standings, scorers)
- **GIF search**: Giphy API integration for animated content
- **Logo generation**: Text-to-logo using Mumaker/Ephoto360

## Data Persistence

### File-Based Storage
- **JSON data stores**: Moderators, banned users, trivia questions, scores, settings
- **Bot token**: Stored in `token.json` in project root
- **Directory structure**: `data/` for persistent storage

### In-Memory Caching
- **Chat memory**: Maps for storing recent conversations and user context
- **Memoization**: Uses memoizee for caching expensive operations
- **Session data**: Runtime storage for active game states, ongoing processes

## Security & Access Control
- **Owner verification**: Owner number checks for privileged commands
- **Bot modes**: Public mode (everyone can use) or Self mode (owner only)
- **Banned user filtering**: Prevents banned users from using bot features
- **Moderator system**: JSON-based moderator list for elevated permissions

# External Dependencies

## Third-Party APIs
- **OpenAI API**: GPT-4 chat completions for AI responses
- **Google Generative AI**: Gemini model for alternative AI interactions
- **Giphy API**: GIF search and retrieval (optional)
- **Football-Data.org**: Soccer/football statistics and live data
- **Catbox.moe**: File hosting service for media uploads
- **Bible-API.com**: Biblical verse retrieval
- **Custom AI endpoints**: ChatGPTForPro, Levanter APIs for specific features

## Media Processing Libraries
- **FFmpeg**: Audio/video transcoding and effects
- **Jimp**: Image manipulation and effects
- **ytdl-core & @distube/ytdl-core**: YouTube video/audio downloads
- **yt-search**: YouTube search functionality

## Utility Libraries
- **axios**: HTTP client for API requests
- **cheerio**: HTML parsing for web scraping
- **jsdom**: DOM manipulation for web content
- **node-fetch**: Fetch API implementation
- **moment-timezone**: Date/time formatting with timezone support
- **translatte**: Text translation services
- **compile-run**: Code execution in sandboxed environment
- **javascript-obfuscator**: Code obfuscation utilities

## Communication
- **node-telegram-bot-api**: Core Telegram bot functionality
- **Express**: Web server for bot status endpoints
