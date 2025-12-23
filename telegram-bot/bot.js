require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Импорты команд
const { showCatalog, showProduct, searchProducts } = require('./commands/catalog');
const { 
  startSelling,
  becomeSeller,
  showSellerMenu, 
  startAddingProduct, 
  handleProductStep,
  saveProduct,
  showMyProducts 
} = require('./commands/sell');
const {
  initiatePurchase,
  processNetworkSelection,
  manualCheckPayment,
  cancelOrder
} = require('./commands/buy');
const {
  showReviewForm,
  handleRatingSelection,
  saveReview,
  showProductReviews
} = require('./commands/reviews');
const {
  addToFavorites,
  removeFromFavorites,
  showFavorites,
  isFavorite
} = require('./commands/favorites');
const {
  applyPromoCode,
  showPromoCodeForm
} = require('./commands/promo');
const { handleError } = require('./utils/errorHandler');
const User = require('../database/models/User');
const Order = require('../database/models/Order');

// Токен вашего бота
const token = process.env.TELEGRAM_BOT_TOKEN;

// Проверка наличия токена
if (!token) {
  console.error('❌ ОШИБКА: TELEGRAM_BOT_TOKEN не найден!');
  console.error('📝 Убедитесь, что вы добавили токен в переменные окружения на Railway');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Подключение к MongoDB
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ ОШИБКА: MONGODB_URI не найден!');
  console.error('📝 Убедитесь, что вы добавили MONGODB_URI в переменные окружения на Railway');
  console.error('💡 Используйте MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB подключена');
    console.log('🤖 Бот запущен и готов к работе!');
  })
  .catch(err => {
    console.error('❌ Ошибка MongoDB:', err);
    console.error('📝 Проверьте строку подключения MONGODB_URI');
    // Не останавливаем процесс, чтобы можно было увидеть ошибку в логах
  });

// Инициализация состояний пользователей
if (!global.userStates) global.userStates = {};

// Установка команд бота для разных языков (подсказки при вводе /)
async function setupBotCommands() {
  // Команды на русском
  await bot.setMyCommands([
    { command: 'start', description: '🚀 Начать работу с ботом' },
    { command: 'catalog', description: '🛒 Просмотреть каталог товаров' },
    { command: 'sell', description: '💼 Начать продавать товары' },
    { command: 'orders', description: '📦 Мои покупки' },
    { command: 'help', description: 'ℹ️ Помощь и инструкции' }
  ], { language_code: 'ru' });

  // Команды на английском
  await bot.setMyCommands([
    { command: 'start', description: '🚀 Start working with the bot' },
    { command: 'catalog', description: '🛒 Browse product catalog' },
    { command: 'sell', description: '💼 Start selling products' },
    { command: 'orders', description: '📦 My orders' },
    { command: 'help', description: 'ℹ️ Help and instructions' }
  ], { language_code: 'en' });

  // Команды по умолчанию (для языков без специфичных команд)
  await bot.setMyCommands([
    { command: 'start', description: '🚀 Start working with the bot' },
    { command: 'catalog', description: '🛒 Browse product catalog' },
    { command: 'sell', description: '💼 Start selling products' },
    { command: 'orders', description: '📦 My orders' },
    { command: 'help', description: 'ℹ️ Help and instructions' }
  ]);
}

// Устанавливаем команды при запуске
setupBotCommands().catch(err => console.error('❌ Ошибка установки команд:', err));

// Функция для получения текстов на разных языках
function getTexts(lang = 'ru') {
  const texts = {
    ru: {
      welcome: (username) => `🛍️ Привет, ${username}!\n\nДобро пожаловать в **Telegram Marketplace**!\n\nЗдесь вы можете:\n• 🛒 Покупать цифровые товары\n• 💼 Продавать свои продукты\n• 💰 Получать оплату в USDT\n\nВыберите действие:`,
      catalog: '🛒 Каталог',
      sell: '💼 Продавать',
      myOrders: '📦 Мои покупки',
      balance: '💰 Мой баланс',
      favorites: '⭐ Избранное',
      help: 'ℹ️ Помощь',
      selectLanguage: '🌍 Выберите язык / Choose language:',
      languageSelected: '✅ Язык выбран!',
      changeLanguage: '🌍 Язык',
      mainMenu: '🔙 Главное меню'
    },
    en: {
      welcome: (username) => `🛍️ Hello, ${username}!\n\nWelcome to **Telegram Marketplace**!\n\nHere you can:\n• 🛒 Buy digital goods\n• 💼 Sell your products\n• 💰 Receive payment in USDT\n\nChoose an action:`,
      catalog: '🛒 Catalog',
      sell: '💼 Sell',
      myOrders: '📦 My Orders',
      balance: '💰 My Balance',
      favorites: '⭐ Favorites',
      help: 'ℹ️ Help',
      selectLanguage: '🌍 Choose language / Выберите язык:',
      languageSelected: '✅ Language selected!',
      changeLanguage: '🌍 Language',
      mainMenu: '🔙 Main Menu'
    }
  };
  return texts[lang] || texts.ru;
}

// Функция для показа кнопок выбора языка
async function showLanguageSelection(bot, chatId, userLang = null) {
  const texts = getTexts(userLang || 'ru');
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇷🇺 Русский', callback_data: 'select_language_ru' },
          { text: '🇬🇧 English', callback_data: 'select_language_en' }
        ]
      ]
    }
  };
  
  await bot.sendMessage(chatId, texts.selectLanguage, keyboard);
}

// Функция для показа главного меню
function getMainMenuKeyboard(lang = 'ru') {
  const texts = getTexts(lang);
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: texts.catalog, callback_data: 'catalog' },
          { text: texts.sell, callback_data: 'start_selling' }
        ],
        [
          { text: texts.myOrders, callback_data: 'my_orders' },
          { text: texts.favorites, callback_data: 'favorites' }
        ],
        [
          { text: texts.balance, callback_data: 'balance' }
        ],
        [
          { text: texts.help, callback_data: 'help' },
          { text: texts.changeLanguage, callback_data: 'change_language' }
        ]
      ]
    },
    parse_mode: 'Markdown'
  };
}

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUser = msg.from;
  
  // Создаем или обновляем пользователя
  const user = await User.findOrCreate(telegramUser);
  
  // Если язык не выбран, показываем выбор языка
  if (!user.language) {
    await showLanguageSelection(bot, chatId);
    return;
  }
  
  const username = telegramUser.username || telegramUser.first_name;
  const texts = getTexts(user.language);
  
  const welcomeMessage = texts.welcome(username);
  const keyboard = getMainMenuKeyboard(user.language);
  
  bot.sendMessage(chatId, welcomeMessage, keyboard);
});

// Обработка нажатий на кнопки
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const telegramUser = query.from;
  
  try {
    // Переключение языка
    if (data === 'change_language') {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      await showLanguageSelection(bot, chatId, user?.language || 'ru');
    }
    
    // Выбор языка
    else if (data.startsWith('select_language_')) {
      const lang = data.split('_')[2]; // ru, en
      const user = await User.findOne({ telegram_id: telegramUser.id });
      
      if (user) {
        user.language = lang;
        await user.save();
        
        const texts = getTexts(lang);
        const username = telegramUser.username || telegramUser.first_name;
        
        // Обновляем сообщение о выборе языка
        try {
          await bot.editMessageText(texts.languageSelected, {
            chat_id: chatId,
            message_id: query.message.message_id
          });
        } catch (error) {
          // Если не удалось обновить сообщение, просто отправляем новое
          await bot.sendMessage(chatId, texts.languageSelected);
        }
        
        // Показываем приветственное сообщение с обновленным меню
        const welcomeMessage = texts.welcome(username);
        const keyboard = getMainMenuKeyboard(lang);
        
        await bot.sendMessage(chatId, welcomeMessage, keyboard);
      }
    }
    
    // Каталог
    else if (data === 'catalog' || data.startsWith('catalog_page_')) {
      const page = data.startsWith('catalog_page_') 
        ? parseInt(data.split('_')[2]) 
        : 0;
      await showCatalog(bot, chatId, page, telegramUser);
    }
    
    // Просмотр товара
    else if (data.startsWith('view_product_')) {
      const productId = data.split('_')[2];
      await showProduct(bot, chatId, productId, telegramUser);
    }
    
    // Продажа
    else if (data === 'start_selling') {
      await startSelling(bot, chatId, telegramUser);
    }
    
    // Стать продавцом (отдельный обработчик)
    else if (data === 'become_seller') {
      await becomeSeller(bot, chatId, telegramUser);
    }
    
    else if (data === 'seller_menu') {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      await showSellerMenu(bot, chatId, user);
    }
    
    else if (data === 'add_product') {
      await startAddingProduct(bot, chatId, telegramUser);
    }
    
    else if (data === 'my_products') {
      await showMyProducts(bot, chatId, telegramUser);
    }
    
    // Категории товаров
    else if (data.startsWith('category_')) {
      const category = data.split('_')[1];
      if (global.userStates && global.userStates[chatId]) {
        const user = await User.findOne({ telegram_id: telegramUser.id });
        const lang = user?.language || 'ru';
        const texts = {
          ru: {
            selected: '✅ Категория выбрана!',
            step: '**Шаг 5 из 5: Файл или ссылка**',
            instructions: 'Отправьте:\n• Ссылку на файл (Google Drive, Dropbox и т.д.)\n• Или текст/код, который нужно отправить покупателю\n• Или "skip" чтобы пропустить',
            example: 'Пример: https://drive.google.com/file/...'
          },
          en: {
            selected: '✅ Category selected!',
            step: '**Step 5 of 5: File or link**',
            instructions: 'Send:\n• Link to file (Google Drive, Dropbox, etc.)\n• Or text/code to send to buyer\n• Or "skip" to skip',
            example: 'Example: https://drive.google.com/file/...'
          }
        };
        const t = texts[lang] || texts.ru;
        global.userStates[chatId].data.category = category;
        global.userStates[chatId].step = 'file';
        bot.sendMessage(chatId, `${t.selected}\n\n${t.step}\n\n${t.instructions}\n\n${t.example}`, { parse_mode: 'Markdown' });
      }
    }
    
    // Подтверждение товара
    else if (data === 'confirm_product') {
      await saveProduct(bot, chatId, telegramUser);
    }
    
    else if (data === 'cancel_product') {
      if (global.userStates && global.userStates[chatId]) {
        delete global.userStates[chatId];
      }
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: '❌ Добавление товара отменено.',
        en: '❌ Product addition cancelled.'
      };
      bot.sendMessage(chatId, texts[lang] || texts.ru);
    }
    
    // Главное меню
    else if (data === 'main_menu') {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const texts = getTexts(user?.language || 'ru');
      const keyboard = getMainMenuKeyboard(user?.language || 'ru');
      
      bot.sendMessage(chatId, texts.mainMenu, keyboard);
    }
    
    // Мои заказы
    else if (data === 'my_orders') {
      await showMyOrders(bot, chatId, telegramUser);
    }
    
    else if (data === 'balance') {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: `💰 Ваш баланс: ${user.balance || 0} USDT`,
        en: `💰 Your balance: ${user.balance || 0} USDT`
      };
      bot.sendMessage(chatId, texts[lang] || texts.ru);
    }
    
    else if (data === 'help') {
      showHelp(bot, chatId, telegramUser);
    }
    
    else if (data === 'search_products') {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: '🔍 Введите поисковый запрос:',
        en: '🔍 Enter search query:'
      };
      bot.sendMessage(chatId, texts[lang] || texts.ru);
      if (!global.userStates) global.userStates = {};
      global.userStates[chatId] = { action: 'searching' };
    }
    
    // Покупка товара
    else if (data.startsWith('buy_product_')) {
      const productId = data.split('_')[2];
      await initiatePurchase(bot, chatId, productId, telegramUser);
    }
    
    // Выбор сети для оплаты
    else if (data.startsWith('select_network_')) {
      const parts = data.split('_');
      const network = parts[2]; // TRC20, ERC20, BEP20
      const productId = parts[3];
      await processNetworkSelection(bot, chatId, network, productId, telegramUser);
    }
    
    // Проверка платежа
    else if (data.startsWith('check_payment_')) {
      const orderId = data.split('_')[2];
      await manualCheckPayment(bot, chatId, orderId, telegramUser);
    }
    
    // Отмена заказа
    else if (data.startsWith('cancel_order_')) {
      const orderId = data.split('_')[2];
      await cancelOrder(bot, chatId, orderId, telegramUser);
    }
    
    // Отзывы
    else if (data.startsWith('review_order_')) {
      const orderId = data.split('_')[2];
      await showReviewForm(bot, chatId, orderId, telegramUser);
    }
    else if (data.startsWith('rate_')) {
      const parts = data.split('_');
      const rating = parts[1];
      const orderId = parts[2];
      await handleRatingSelection(bot, chatId, rating, orderId, telegramUser);
    }
    else if (data.startsWith('submit_review_')) {
      const orderId = data.split('_')[2];
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const state = global.userStates?.[chatId];
      if (state && state.action === 'reviewing') {
        await saveReview(bot, chatId, orderId, state.rating, null, telegramUser);
      }
    }
    else if (data.startsWith('cancel_review_')) {
      if (global.userStates && global.userStates[chatId]) {
        delete global.userStates[chatId];
      }
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: '❌ Отзыв отменен.',
        en: '❌ Review cancelled.'
      };
      await bot.sendMessage(chatId, texts[lang] || texts.ru);
    }
    else if (data.startsWith('view_reviews_')) {
      const productId = data.split('_')[2];
      const user = await User.findOne({ telegram_id: telegramUser.id });
      await showProductReviews(bot, chatId, productId, user?.language || 'ru');
    }
    
    // Избранное
    else if (data === 'favorites') {
      await showFavorites(bot, chatId, telegramUser, 0);
    }
    else if (data.startsWith('favorites_page_')) {
      const page = parseInt(data.split('_')[2]);
      await showFavorites(bot, chatId, telegramUser, page);
    }
    else if (data.startsWith('add_favorite_')) {
      const productId = data.split('_')[2];
      await addToFavorites(bot, chatId, productId, telegramUser);
    }
    else if (data.startsWith('remove_favorite_')) {
      const productId = data.split('_')[2];
      await removeFromFavorites(bot, chatId, productId, telegramUser);
    }
    
    // Промо-коды
    else if (data.startsWith('apply_promo_')) {
      const orderId = data.split('_')[2];
      // Показываем форму ввода промо-кода
      const order = await Order.findById(orderId);
      if (order) {
        await showPromoCodeForm(bot, chatId, order.price, telegramUser);
      }
    }
    else if (data === 'cancel_promo') {
      if (global.userStates && global.userStates[chatId]) {
        delete global.userStates[chatId];
      }
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: '❌ Применение промо-кода отменено.',
        en: '❌ Promo code application cancelled.'
      };
      await bot.sendMessage(chatId, texts[lang] || texts.ru);
    }
    
    bot.answerCallbackQuery(query.id);
  } catch (error) {
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    await handleError(bot, chatId, error, lang);
    const errorTexts = {
      ru: '❌ Ошибка. Попробуйте позже.',
      en: '❌ Error. Please try later.'
    };
    bot.answerCallbackQuery(query.id, { text: errorTexts[lang] || errorTexts.ru });
  }
});

// Обработка текстовых сообщений (для добавления товара)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const telegramUser = msg.from;
  
  // Пропускаем команды (они обрабатываются отдельно)
  if (text && text.startsWith('/')) {
    return;
  }
  
  // Пропускаем служебные сообщения (фото, стикеры и т.д. без текста)
  if (!text) {
    return;
  }
  
  // Создаем или получаем пользователя
  const user = await User.findOrCreate(telegramUser);
  
  // Если язык не выбран - показываем кнопки выбора языка
  if (!user.language) {
    await showLanguageSelection(bot, chatId);
    return;
  }
  
  // Если язык выбран, но пользователь просто написал текст (не в процессе добавления товара/поиска)
  // Показываем приветствие или главное меню
  if (!global.userStates || !global.userStates[chatId]) {
    const texts = getTexts(user.language);
    const username = telegramUser.username || telegramUser.first_name;
    
    const welcomeMessage = texts.welcome(username);
    const keyboard = getMainMenuKeyboard(user.language);
    
    await bot.sendMessage(chatId, welcomeMessage, keyboard);
    return;
  }
  
  // Проверяем состояние пользователя (для добавления товара, поиска и т.д.)
  const state = global.userStates[chatId];
  
  if (state.action === 'adding_product') {
    await handleProductStep(bot, chatId, text, telegramUser);
    return;
  }
  
  if (state.action === 'searching') {
    await searchProducts(bot, chatId, text, telegramUser);
    delete global.userStates[chatId];
    return;
  }

  if (state.action === 'reviewing') {
    // Пользователь вводит комментарий к отзыву
    const orderId = state.orderId;
    const rating = state.rating;
    await saveReview(bot, chatId, orderId, rating, text, telegramUser);
    delete global.userStates[chatId];
    return;
  }

  if (state.action === 'entering_promo') {
    // Пользователь вводит промо-код
    const result = await applyPromoCode(bot, chatId, text, state.orderAmount, telegramUser);
    if (result.success) {
      const user = await User.findOne({ telegram_id: telegramUser.id });
      const lang = user?.language || 'ru';
      const texts = {
        ru: `✅ Промо-код применен!\n\nСкидка: ${result.discount} USDT\nИтого: ${result.finalAmount} USDT`,
        en: `✅ Promo code applied!\n\nDiscount: ${result.discount} USDT\nTotal: ${result.finalAmount} USDT`
      };
      await bot.sendMessage(chatId, texts[lang] || texts.ru);
    } else {
      await bot.sendMessage(chatId, result.message);
    }
    delete global.userStates[chatId];
    return;
  }
});

// Команда /catalog
bot.onText(/\/catalog/, async (msg) => {
  const chatId = msg.chat.id;
  await showCatalog(bot, chatId, 0, msg.from);
});

// Команда /sell
bot.onText(/\/sell/, async (msg) => {
  const chatId = msg.chat.id;
  await startSelling(bot, chatId, msg.from);
});

// Команда /orders
bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id;
  await showMyOrders(bot, chatId, msg.from);
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  showHelp(bot, chatId, msg.from);
});

// Функция показа заказов пользователя
async function showMyOrders(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) {
      const lang = 'ru';
      const texts = {
        ru: '❌ Пользователь не найден. Используйте /start',
        en: '❌ User not found. Use /start'
      };
      return bot.sendMessage(chatId, texts[lang] || texts.ru);
    }

    const lang = user.language || 'ru';

    // Получаем заказы пользователя
    const orders = await Order.find({ buyer_id: user._id })
      .populate('product_id', 'title price')
      .populate('seller_id', 'username first_name')
      .sort({ created_at: -1 })
      .limit(10);

    if (orders.length === 0) {
      const emptyTexts = {
        ru: '📦 У вас пока нет заказов.\n\nНачните покупки в каталоге!',
        en: '📦 You have no orders yet.\n\nStart shopping in the catalog!'
      };
      return bot.sendMessage(chatId, emptyTexts[lang] || emptyTexts.ru);
    }

    const statusTexts = {
      ru: {
        pending: '⏳ Ожидает оплаты',
        paid: '✅ Оплачен',
        delivered: '📦 Доставлен',
        completed: '✅ Завершен',
        cancelled: '❌ Отменен',
        disputed: '⚠️ Спор',
        refunded: '↩️ Возвращен',
        title: '📦 **Мои заказы**',
        product: 'Товар'
      },
      en: {
        pending: '⏳ Pending payment',
        paid: '✅ Paid',
        delivered: '📦 Delivered',
        completed: '✅ Completed',
        cancelled: '❌ Cancelled',
        disputed: '⚠️ Disputed',
        refunded: '↩️ Refunded',
        title: '📦 **My Orders**',
        product: 'Product'
      }
    };

    const t = statusTexts[lang] || statusTexts.ru;

    let message = `${t.title}\n\n`;

    orders.forEach((order, index) => {
      const product = order.product_id;
      const status = t[order.status] || order.status;
      
      message += `${index + 1}. **${product?.title || t.product}**\n`;
      message += `   💰 ${order.price} USDT\n`;
      message += `   📊 ${status}\n`;
      message += `   🆔 ${order.order_id}\n\n`;
    });

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: lang === 'ru' ? '🛒 Каталог' : 
                    lang === 'en' ? '🛒 Catalog' : 
                    '🛒 Каталог', 
              callback_data: 'catalog' 
            }
          ],
          [
            { 
              text: lang === 'ru' ? '🔙 Главное меню' : 
                    lang === 'en' ? '🔙 Main Menu' : 
                    '🔙 Головне меню', 
              callback_data: 'main_menu' 
            }
          ]
        ]
      },
      parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа заказов:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Произошла ошибка при загрузке заказов.',
      en: '❌ An error occurred while loading orders.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Функция помощи
async function showHelp(bot, chatId, telegramUser = null) {
  let lang = 'ru';
  if (telegramUser) {
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    lang = user?.language || 'ru';
  }
  
  const helpTexts = {
    ru: {
      title: 'ℹ️ **Помощь**',
      commands: '**Команды:**',
      start: '/start - Главное меню',
      catalog: '/catalog - Каталог товаров',
      sell: '/sell - Начать продавать',
      orders: '/orders - Мои заказы',
      howToBuy: '**Как купить:**',
      buyStep1: '1. Выберите товар в каталоге',
      buyStep2: '2. Нажмите "Купить"',
      buyStep3: '3. Отправьте USDT на указанный адрес',
      buyStep4: '4. Получите товар автоматически',
      howToSell: '**Как продавать:**',
      sellStep1: '1. Используйте /sell',
      sellStep2: '2. Добавьте свой товар',
      sellStep3: '3. Укажите цену в USDT',
      sellStep4: '4. Получайте деньги с каждой продажи',
      commission: '**Комиссия:** 5% с продажи',
      support: '**Поддержка:** @your_support'
    },
    en: {
      title: 'ℹ️ **Help**',
      commands: '**Commands:**',
      start: '/start - Main menu',
      catalog: '/catalog - Product catalog',
      sell: '/sell - Start selling',
      orders: '/orders - My orders',
      howToBuy: '**How to buy:**',
      buyStep1: '1. Select a product in the catalog',
      buyStep2: '2. Click "Buy"',
      buyStep3: '3. Send USDT to the specified address',
      buyStep4: '4. Receive the product automatically',
      howToSell: '**How to sell:**',
      sellStep1: '1. Use /sell',
      sellStep2: '2. Add your product',
      sellStep3: '3. Set price in USDT',
      sellStep4: '4. Receive money from each sale',
      commission: '**Commission:** 5% per sale',
      support: '**Support:** @your_support'
    }
  };
  
  const t = helpTexts[lang] || helpTexts.ru;
  const helpMessage = `
${t.title}

${t.commands}
${t.start}
${t.catalog}
${t.sell}
${t.orders}

${t.howToBuy}
${t.buyStep1}
${t.buyStep2}
${t.buyStep3}
${t.buyStep4}

${t.howToSell}
${t.sellStep1}
${t.sellStep2}
${t.sellStep3}
${t.sellStep4}

${t.commission}

${t.support}
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.code, error.message);
});

console.log('🤖 Бот запущен!');
console.log('Напишите боту /start в Telegram');
