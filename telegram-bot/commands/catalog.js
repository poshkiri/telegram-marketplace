const Product = require('../../database/models/Product');
const User = require('../../database/models/User');

// Показать каталог товаров
async function showCatalog(bot, chatId, page = 0, telegramUser = null) {
  try {
    // Получаем язык пользователя
    let lang = 'ru';
    if (telegramUser) {
      const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
      lang = user?.language || 'ru';
    }
    
    const limit = 5; // Товаров на страницу
    const skip = page * limit;

    // Получаем активные товары
    const products = await Product.find({ status: 'active' })
      .populate('seller_id', 'username first_name rating')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip);

    const totalProducts = await Product.countDocuments({ status: 'active' });
    const totalPages = Math.ceil(totalProducts / limit);

    const texts = {
      ru: {
        title: '📋 **Каталог товаров**',
        empty: 'Пока товаров нет 😔',
        becomeSeller: 'Станьте первым продавцом! Используйте /sell для добавления товара.',
        categories: 'Категории:',
        category1: '• 💻 IT-продукты (код, скрипты, шаблоны)',
        category2: '• 📚 Курсы и обучение',
        category3: '• 🎨 Дизайн и графика',
        category4: '• 🎮 Игровые товары',
        category5: '• 🛠 Услуги',
        addProduct: '💼 Добавить товар',
        mainMenu: '🔙 Главное меню',
        found: 'Найдено товаров:',
        page: 'Страница',
        of: 'из',
        seller: 'Продавец',
        new: '🆕 Новый',
        search: '🔍 Поиск',
        sell: '💼 Продавать',
        back: '◀️ Назад',
        forward: 'Вперёд ▶️',
        error: '❌ Ошибка загрузки каталога. Попробуйте позже.'
      },
      en: {
        title: '📋 **Product Catalog**',
        empty: 'No products yet 😔',
        becomeSeller: 'Become the first seller! Use /sell to add a product.',
        categories: 'Categories:',
        category1: '• 💻 IT products (code, scripts, templates)',
        category2: '• 📚 Courses and training',
        category3: '• 🎨 Design and graphics',
        category4: '• 🎮 Gaming products',
        category5: '• 🛠 Services',
        addProduct: '💼 Add product',
        mainMenu: '🔙 Main Menu',
        found: 'Products found:',
        page: 'Page',
        of: 'of',
        seller: 'Seller',
        new: '🆕 New',
        search: '🔍 Search',
        sell: '💼 Sell',
        back: '◀️ Back',
        forward: 'Forward ▶️',
        error: '❌ Error loading catalog. Please try later.'
      }
    };

    const t = texts[lang] || texts.ru;

    if (products.length === 0) {
      const emptyMessage = `
${t.title}

${t.empty}

${t.becomeSeller}

${t.categories}
${t.category1}
${t.category2}
${t.category3}
${t.category4}
${t.category5}
      `;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: t.addProduct, callback_data: 'add_product' }],
            [{ text: t.mainMenu, callback_data: 'main_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      };

      return bot.sendMessage(chatId, emptyMessage, keyboard);
    }

    // Формируем сообщение с товарами
    let message = `${t.title}\n\n`;
    message += `${t.found} ${totalProducts}\n`;
    message += `${t.page} ${page + 1} ${t.of} ${totalPages}\n\n`;

    // Список товаров
    products.forEach((product, index) => {
      const sellerName = product.seller_id?.username || 
                        product.seller_id?.first_name || 
                        t.seller;
      const rating = product.rating > 0 ? `⭐ ${product.rating.toFixed(1)}` : t.new;
      
      message += `${index + 1}. **${product.title}**\n`;
      message += `   💰 ${product.price} USDT | ${rating}\n`;
      message += `   👤 ${sellerName}\n\n`;
    });

    // Клавиатура с товарами и навигацией
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          // Кнопки товаров
          ...products.map((product, index) => [
            {
              text: `${index + 1}. ${product.title} - ${product.price} USDT`,
              callback_data: `view_product_${product._id}`
            }
          ]),
          // Навигация
          [
            ...(page > 0 ? [{ text: t.back, callback_data: `catalog_page_${page - 1}` }] : []),
            ...(page < totalPages - 1 ? [{ text: t.forward, callback_data: `catalog_page_${page + 1}` }] : [])
          ],
          [
            { text: t.search, callback_data: 'search_products' },
            { text: t.sell, callback_data: 'start_selling' }
          ],
          [{ text: t.mainMenu, callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа каталога:', error);
    const user = await User.findOne({ telegram_id: telegramUser?.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка загрузки каталога. Попробуйте позже.',
      en: '❌ Error loading catalog. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Показать товар подробно
async function showProduct(bot, chatId, productId, telegramUser = null) {
  try {
    const product = await Product.findById(productId)
      .populate('seller_id', 'username first_name rating sales_count');

    // Получаем язык пользователя
    let lang = 'ru';
    if (telegramUser) {
      const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
      lang = user?.language || 'ru';
    }

    const errorTexts = {
      ru: '❌ Товар не найден или недоступен.',
      en: '❌ Product not found or unavailable.'
    };

    if (!product || product.status !== 'active') {
      return bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
    }

    const seller = product.seller_id;
    const sellerTexts = {
      ru: { seller: 'Продавец', newSeller: '🆕 Новый продавец' },
      en: { seller: 'Seller', newSeller: '🆕 New seller' }
    };
    const st = sellerTexts[lang] || sellerTexts.ru;
    const sellerName = seller?.username || seller?.first_name || st.seller;
    const sellerRating = seller?.rating > 0 ? `⭐ ${seller.rating.toFixed(1)}` : st.newSeller;
    const salesCount = seller?.sales_count || 0;

    // Увеличиваем просмотры
    await product.incrementViews();

    // Проверяем, в избранном ли товар
    let isFav = false;
    if (telegramUser) {
      const User = require('../../database/models/User');
      const Favorite = require('../../database/models/Favorite');
      const user = await User.findOne({ telegram_id: telegramUser.id });
      if (user) {
        const favorite = await Favorite.findOne({ user_id: user._id, product_id: productId });
        isFav = !!favorite;
      }
    }

    // Язык уже получен выше (строка 170), используем его

    const texts = {
      ru: {
        description: '📝 Описание:',
        price: '💰 Цена:',
        category: '📂 Категория:',
        seller: '👤 Продавец:',
        views: '👁 Просмотров:',
        sold: '🛒 Продано:',
        reviews: '⭐ Отзывов:',
        buy: '🛒 Купить за',
        addFavorite: '⭐ В избранное',
        removeFavorite: '💔 Удалить из избранного',
        viewReviews: '📝 Отзывы',
        share: '📤 Поделиться',
        back: '🔙 Назад к каталогу'
      },
      en: {
        description: '📝 Description:',
        price: '💰 Price:',
        category: '📂 Category:',
        seller: '👤 Seller:',
        views: '👁 Views:',
        sold: '🛒 Sold:',
        reviews: '⭐ Reviews:',
        buy: '🛒 Buy for',
        addFavorite: '⭐ Add to favorites',
        removeFavorite: '💔 Remove from favorites',
        viewReviews: '📝 Reviews',
        share: '📤 Share',
        back: '🔙 Back to catalog'
      }
    };

    const t = texts[lang] || texts.ru;

    let message = `📦 **${product.title}**\n\n`;
    message += `${t.description}\n${product.description}\n\n`;
    message += `${t.price} **${product.price} USDT**\n`;
    message += `${t.category} ${getCategoryEmoji(product.category)} ${product.category}\n\n`;
    message += `${t.seller} ${sellerName}\n`;
    message += `${sellerRating} | ${t.sold}: ${salesCount}\n\n`;
    message += `${t.views}: ${product.views_count}\n`;
    message += `${t.reviews}: ${product.reviews_count || 0}\n`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: `${t.buy} ${product.price} USDT`, callback_data: `buy_product_${product._id}` }],
          [
            { text: isFav ? t.removeFavorite : t.addFavorite, callback_data: isFav ? `remove_favorite_${product._id}` : `add_favorite_${product._id}` },
            { text: t.viewReviews, callback_data: `view_reviews_${product._id}` }
          ],
          [
            { text: t.share, callback_data: `share_product_${product._id}` }
          ],
          [{ text: t.back, callback_data: 'catalog' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа товара:', error);
    const user = await User.findOne({ telegram_id: telegramUser?.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка загрузки товара.',
      en: '❌ Error loading product.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Получить эмодзи категории
function getCategoryEmoji(category) {
  const emojis = {
    'it': '💻',
    'courses': '📚',
    'design': '🎨',
    'gaming': '🎮',
    'services': '🛠',
    'other': '📦'
  };
  return emojis[category] || '📦';
}

// Поиск товаров
async function searchProducts(bot, chatId, query, telegramUser = null) {
  try {
    // Получаем язык пользователя
    let lang = 'ru';
    if (telegramUser) {
      const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
      lang = user?.language || 'ru';
    }

    const products = await Product.find({
      status: 'active',
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .populate('seller_id', 'username first_name')
      .limit(10)
      .sort({ created_at: -1 });

    const texts = {
      ru: {
        notFound: '❌ По запросу',
        nothingFound: 'ничего не найдено.',
        results: '🔍 **Результаты поиска:**',
        found: 'Найдено:',
        products: 'товаров',
        back: '🔙 Назад к каталогу',
        error: '❌ Ошибка поиска товаров.'
      },
      en: {
        notFound: '❌ Nothing found for query',
        nothingFound: '.',
        results: '🔍 **Search results:**',
        found: 'Found:',
        products: 'products',
        back: '🔙 Back to catalog',
        error: '❌ Error searching products.'
      }
    };

    const t = texts[lang] || texts.ru;

    if (products.length === 0) {
      return bot.sendMessage(chatId, `${t.notFound} "${query}" ${t.nothingFound}`);
    }

    let message = `${t.results} "${query}"**\n\n`;
    message += `${t.found} ${products.length} ${t.products}\n\n`;

    products.forEach((product, index) => {
      message += `${index + 1}. **${product.title}**\n`;
      message += `   💰 ${product.price} USDT\n\n`;
    });

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          ...products.map(product => [
            {
              text: `${product.title} - ${product.price} USDT`,
              callback_data: `view_product_${product._id}`
            }
          ]),
          [{ text: t.back, callback_data: 'catalog' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
    const user = await User.findOne({ telegram_id: telegramUser?.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка поиска товаров.',
      en: '❌ Error searching products.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

module.exports = {
  showCatalog,
  showProduct,
  searchProducts
};

