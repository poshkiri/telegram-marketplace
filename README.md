# 🛍️ Telegram Marketplace

> Full-featured marketplace for buying and selling digital goods in Telegram with USDT payment

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-brightgreen.svg)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 About the Project

**Telegram Marketplace** is a marketplace in Telegram where users can buy and sell digital goods with automatic USDT payment.

### Key Features:

- 🤖 Fully in Telegram - no website needed
- 💰 Payment in USDT (TRC20, ERC20, BEP20)
- 🔒 Escrow system for secure transactions
- 📦 Automatic product delivery
- ⭐ Rating and review system
- 🌍 Multi-language support (ru/en)
- 💼 Automatic commission calculation

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/poshkiri/telegram-marketplace.git
cd telegram-marketplace

# Install dependencies
npm install
```

### 2. Configuration

Create a `.env` file based on `env.example`:

```bash
cp env.example .env
```

Edit `.env` and specify:

```env
# Required settings
TELEGRAM_BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketplace
WALLET_TRC20=your_tron_wallet_address
```

**How to get:**
- **Telegram Bot Token**: Create a bot via [@BotFather](https://t.me/BotFather)
- **MongoDB URI**: Create a free database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **USDT Wallet**: Create a TRC20 wallet (Tron)

### 3. Run

```bash
# Start the bot
npm start

# For development (with auto-reload)
npm run dev
```

---

## 📱 Usage

### Bot Commands:

- `/start` - Start working, main menu
- `/catalog` - View product catalog
- `/sell` - Start selling products
- `/orders` - My purchases
- `/help` - Help

### For Buyers:

1. Select a product in the catalog
2. Click "🛒 Buy"
3. Choose payment network (TRC20/ERC20/BEP20)
4. Send USDT to the specified address
5. The product will be delivered automatically

### For Sellers:

1. Use the `/sell` command
2. Become a seller (one-time)
3. Add a product through the bot
4. Receive payment automatically to your wallet

---

## 🛠️ Technologies

### Backend:
- **Node.js** - JavaScript runtime
- **Express.js** - REST API server
- **Mongoose** - ODM for MongoDB
- **TypeScript** - Typed JavaScript

### Database:
- **MongoDB** - NoSQL database
- **MongoDB Atlas** - Cloud database

### Blockchain & Payments:
- **TronWeb** - Tron blockchain integration
- **USDT** - Cryptocurrency payments (TRC20, ERC20, BEP20)
- **QR Code** - QR code generation for payments

### Telegram:
- **node-telegram-bot-api** - Telegram Bot API
- **Inline Keyboards** - Interactive menus
- **Callback Queries** - Button click handling

### Additional:
- **dotenv** - Environment variables management
- **bcrypt** - Password hashing
- **JWT** - Authentication
- **Railway** - Deployment and hosting

---

## 📁 Project Structure

```
telegram-marketplace/
├── telegram-bot/          # Telegram bot
│   ├── bot.js            # Main file
│   ├── commands/         # Bot commands
│   └── services/         # Services
├── backend/              # Backend API
├── database/models/      # Data models
└── .env                  # Configuration (create from env.example)
```

---

## 🔒 Security

- ✅ All private keys in `.env` (not committed to Git)
- ✅ Validation of all input data
- ✅ Escrow system for transaction protection
- ✅ Automatic payment verification via blockchain
- ✅ User data escaping (Markdown)
- ✅ Error and exception handling

---

## 💼 For Resume / Skills Demonstrated

This project demonstrates the following skills:

### Backend Development:
- ✅ RESTful API development
- ✅ Database work (MongoDB)
- ✅ Application architecture (MVC pattern)
- ✅ Asynchronous programming (async/await)
- ✅ Error handling and data validation

### Integration & APIs:
- ✅ Telegram Bot API integration
- ✅ Blockchain work (Tron)
- ✅ Cryptocurrency payment integration
- ✅ Webhook handling

### DevOps & Deployment:
- ✅ Railway deployment
- ✅ CI/CD via GitHub
- ✅ Environment variables management
- ✅ Monitoring and logging

### Code Quality:
- ✅ Modular architecture
- ✅ Localization (i18n)
- ✅ Error handling
- ✅ Code documentation

---

## 📝 License

MIT License - see LICENSE file

---

## 👤 Author

**Maxim Petrukha**

- GitHub: [@poshkiri](https://github.com/poshkiri)
- Repository: [telegram-marketplace](https://github.com/poshkiri/telegram-marketplace)

---

## ⚠️ Important

1. Never publish the `.env` file
2. Use separate wallets for each network
3. Regularly backup your database
4. Test on a test network before production

---

**⭐ If the project was useful, give it a star!**
