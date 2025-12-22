const Product = require('../../database/models/Product');
const User = require('../../database/models/User');

// Показать каталог товаров
async function showCatalog(bot, chatId, page = 0) {
  try {
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

    if (products.length === 0) {
      const emptyMessage = `
📋 **Каталог товаров**

Пока товаров нет 😔

Станьте первым продавцом! Используйте /sell для добавления товара.

Категории:
• 💻 IT-продукты (код, скрипты, шаблоны)
• 📚 Курсы и обучение
• 🎨 Дизайн и графика
• 🎮 Игровые товары
• 🛠 Услуги
      `;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💼 Добавить товар', callback_data: 'add_product' }],
            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      };

      return bot.sendMessage(chatId, emptyMessage, keyboard);
    }

    // Формируем сообщение с товарами
    let message = `📋 **Каталог товаров**\n\n`;
    message += `Найдено товаров: ${totalProducts}\n`;
    message += `Страница ${page + 1} из ${totalPages}\n\n`;

    // Список товаров
    products.forEach((product, index) => {
      const sellerName = product.seller_id?.username || 
                        product.seller_id?.first_name || 
                        'Продавец';
      const rating = product.rating > 0 ? `⭐ ${product.rating.toFixed(1)}` : '🆕 Новый';
      
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
            ...(page > 0 ? [{ text: '◀️ Назад', callback_data: `catalog_page_${page - 1}` }] : []),
            ...(page < totalPages - 1 ? [{ text: 'Вперёд ▶️', callback_data: `catalog_page_${page + 1}` }] : [])
          ],
          [
            { text: '🔍 Поиск', callback_data: 'search_products' },
            { text: '💼 Продавать', callback_data: 'start_selling' }
          ],
          [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа каталога:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки каталога. Попробуйте позже.');
  }
}

// Показать товар подробно
async function showProduct(bot, chatId, productId, telegramUser = null) {
  try {
    const product = await Product.findById(productId)
      .populate('seller_id', 'username first_name rating sales_count');

    if (!product || product.status !== 'active') {
      return bot.sendMessage(chatId, '❌ Товар не найден или недоступен.');
    }

    const seller = product.seller_id;
    const sellerName = seller?.username || seller?.first_name || 'Продавец';
    const sellerRating = seller?.rating > 0 ? `⭐ ${seller.rating.toFixed(1)}` : '🆕 Новый продавец';
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

    // Получаем язык пользователя
    let lang = 'ru';
    if (telegramUser) {
      const User = require('../../database/models/User');
      const user = await User.findOne({ telegram_id: telegramUser.id });
      lang = user?.language || 'ru';
    }

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
    bot.sendMessage(chatId, '❌ Ошибка загрузки товара.');
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
async function searchProducts(bot, chatId, query) {
  try {
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

    if (products.length === 0) {
      return bot.sendMessage(chatId, `❌ По запросу "${query}" ничего не найдено.`);
    }

    let message = `🔍 **Результаты поиска: "${query}"**\n\n`;
    message += `Найдено: ${products.length} товаров\n\n`;

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
          [{ text: '🔙 Назад к каталогу', callback_data: 'catalog' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
    bot.sendMessage(chatId, '❌ Ошибка поиска товаров.');
  }
}

module.exports = {
  showCatalog,
  showProduct,
  searchProducts
};

