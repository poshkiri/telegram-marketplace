const User = require('../../database/models/User');
const Product = require('../../database/models/Product');

/**
 * Отправка уведомлений о новых товарах подписанным пользователям
 */
async function notifyNewProduct(bot, productId) {
  try {
    const product = await Product.findById(productId)
      .populate('seller_id', 'username first_name');

    if (!product || product.status !== 'active') {
      return;
    }

    // Получаем всех активных пользователей (можно добавить фильтр по подпискам)
    const users = await User.find({ 
      is_blocked: false,
      last_active: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Активны за последние 30 дней
    }).limit(100); // Ограничиваем количество уведомлений

    const categoryEmojis = {
      'it': '💻',
      'courses': '📚',
      'design': '🎨',
      'gaming': '🎮',
      'services': '🛠',
      'other': '📦'
    };

    const emoji = categoryEmojis[product.category] || '📦';

    for (const user of users) {
      try {
        // Пропускаем продавца товара
        if (user._id.toString() === product.seller_id._id.toString()) {
          continue;
        }

        const lang = user.language || 'ru';

        const texts = {
          ru: {
            title: '🆕 Новый товар!',
            product: '📦 Товар:',
            price: '💰 Цена:',
            seller: '👤 Продавец:',
            view: '👁 Посмотреть'
          },
          en: {
            title: '🆕 New product!',
            product: '📦 Product:',
            price: '💰 Price:',
            seller: '👤 Seller:',
            view: '👁 View'
          },
          uk: {
            title: '🆕 Новий товар!',
            product: '📦 Товар:',
            price: '💰 Ціна:',
            seller: '👤 Продавець:',
            view: '👁 Переглянути'
          }
        };

        const t = texts[lang] || texts.ru;

        const message = `${t.title}\n\n${emoji} ${t.product} **${product.title}**\n${t.price} ${product.price} USDT\n${t.seller} ${product.seller_id.username || product.seller_id.first_name || 'Продавец'}\n\n${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}`;

        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: t.view, callback_data: `view_product_${product._id}` }
              ]
            ]
          },
          parse_mode: 'Markdown'
        };

        await bot.sendMessage(user.telegram_id, message, keyboard);
        
        // Небольшая задержка, чтобы не превысить лимиты Telegram API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Игнорируем ошибки отправки отдельным пользователям
        console.error(`❌ Ошибка отправки уведомления пользователю ${user.telegram_id}:`, error.message);
      }
    }

    console.log(`✅ Уведомления о новом товаре отправлены ${users.length} пользователям`);
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о новом товаре:', error);
  }
}

/**
 * Уведомление о продаже товара продавцу
 */
async function notifySale(bot, order) {
  try {
    const product = await Product.findById(order.product_id);
    const seller = await User.findById(order.seller_id);

    if (!seller || !seller.telegram_id) {
      return;
    }

    const lang = seller.language || 'ru';

    const texts = {
      ru: `💰 **Новая продажа!**\n\n📦 Товар: ${product.title}\n💵 Сумма: ${order.price} USDT\n💼 Комиссия: ${order.commission} USDT\n💰 К получению: ${(order.price - order.commission).toFixed(2)} USDT`,
      en: `💰 **New sale!**\n\n📦 Product: ${product.title}\n💵 Amount: ${order.price} USDT\n💼 Commission: ${order.commission} USDT\n💰 To receive: ${(order.price - order.commission).toFixed(2)} USDT`,
      uk: `💰 **Новий продаж!**\n\n📦 Товар: ${product.title}\n💵 Сума: ${order.price} USDT\n💼 Комісія: ${order.commission} USDT\n💰 До отримання: ${(order.price - order.commission).toFixed(2)} USDT`
    };

    await bot.sendMessage(seller.telegram_id, texts[lang] || texts.ru, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о продаже:', error);
  }
}

module.exports = {
  notifyNewProduct,
  notifySale
};

