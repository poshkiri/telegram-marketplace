const Favorite = require('../../database/models/Favorite');
const Product = require('../../database/models/Product');
const User = require('../../database/models/User');

/**
 * Добавить товар в избранное
 */
async function addToFavorites(bot, chatId, productId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) {
      return bot.sendMessage(chatId, '❌ Пользователь не найден.');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return bot.sendMessage(chatId, '❌ Товар не найден.');
    }

    // Проверяем, не добавлен ли уже в избранное
    const existing = await Favorite.findOne({ 
      user_id: user._id, 
      product_id: productId 
    });

    if (existing) {
      const lang = user.language || 'ru';
      const texts = {
        ru: '✅ Товар уже в избранном!',
        en: '✅ Product already in favorites!'
      };
      return bot.sendMessage(chatId, texts[lang] || texts.ru);
    }

    // Добавляем в избранное
    await Favorite.create({
      user_id: user._id,
      product_id: productId
    });

    const lang = user.language || 'ru';
    const texts = {
      ru: '✅ Товар добавлен в избранное!',
      en: '✅ Product added to favorites!'
    };

    await bot.sendMessage(chatId, texts[lang] || texts.ru);
  } catch (error) {
    if (error.code === 11000) {
      // Дубликат
      const lang = user?.language || 'ru';
      const texts = {
        ru: '✅ Товар уже в избранном!',
        en: '✅ Product already in favorites!'
      };
      return bot.sendMessage(chatId, texts[lang] || texts.ru);
    }
    console.error('❌ Ошибка добавления в избранное:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка.');
  }
}

/**
 * Удалить товар из избранного
 */
async function removeFromFavorites(bot, chatId, productId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) return;

    await Favorite.deleteOne({ 
      user_id: user._id, 
      product_id: productId 
    });

    const lang = user.language || 'ru';
    const texts = {
      ru: '✅ Товар удален из избранного!',
      en: '✅ Product removed from favorites!'
    };

    await bot.sendMessage(chatId, texts[lang] || texts.ru);
  } catch (error) {
    console.error('❌ Ошибка удаления из избранного:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка.');
  }
}

/**
 * Показать избранные товары
 */
async function showFavorites(bot, chatId, telegramUser, page = 0) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) {
      return bot.sendMessage(chatId, '❌ Пользователь не найден.');
    }

    const lang = user.language || 'ru';
    const limit = 5;
    const skip = page * limit;

    const favorites = await Favorite.find({ user_id: user._id })
      .populate('product_id')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip);

    const totalFavorites = await Favorite.countDocuments({ user_id: user._id });
    const totalPages = Math.ceil(totalFavorites / limit);

    if (favorites.length === 0) {
      const texts = {
        ru: '📋 У вас пока нет избранных товаров.\n\nДобавьте товары в избранное из каталога!',
        en: '📋 You have no favorite products yet.\n\nAdd products to favorites from the catalog!'
      };
      return bot.sendMessage(chatId, texts[lang] || texts.ru);
    }

    const texts = {
      ru: {
        title: '⭐ Избранные товары',
        page: 'Страница',
        of: 'из',
        rating: '⭐',
        new: '🆕 Новый'
      },
      en: {
        title: '⭐ Favorite products',
        page: 'Page',
        of: 'of',
        rating: '⭐',
        new: '🆕 New'
      }
    };

    const t = texts[lang] || texts.ru;

    let message = `${t.title}\n\n`;
    message += `${t.page} ${page + 1} ${t.of} ${totalPages}\n\n`;

    favorites.forEach((favorite, index) => {
      const product = favorite.product_id;
      if (!product) return;

      const rating = product.rating > 0 ? `${t.rating} ${product.rating.toFixed(1)}` : t.new;
      
      message += `${index + 1}. **${product.title}**\n`;
      message += `   💰 ${product.price} USDT | ${rating}\n\n`;
    });

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          // Кнопки товаров
          ...favorites.map((favorite, index) => [
            {
              text: `${index + 1}. ${favorite.product_id?.title || 'Товар'} - ${favorite.product_id?.price || 0} USDT`,
              callback_data: `view_product_${favorite.product_id?._id}`
            }
          ]),
          // Навигация
          [
            ...(page > 0 ? [{ text: '◀️ Назад', callback_data: `favorites_page_${page - 1}` }] : []),
            ...(page < totalPages - 1 ? [{ text: 'Вперёд ▶️', callback_data: `favorites_page_${page + 1}` }] : [])
          ],
          [
            { text: '🛒 Каталог', callback_data: 'catalog' },
            { text: '🔙 Главное меню', callback_data: 'main_menu' }
          ]
        ]
      },
      parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа избранного:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке избранного.');
  }
}

/**
 * Проверить, в избранном ли товар
 */
async function isFavorite(userId, productId) {
  const favorite = await Favorite.findOne({ 
    user_id: userId, 
    product_id: productId 
  });
  return !!favorite;
}

module.exports = {
  addToFavorites,
  removeFromFavorites,
  showFavorites,
  isFavorite
};

