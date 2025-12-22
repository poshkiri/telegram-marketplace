const Review = require('../../database/models/Review');
const Order = require('../../database/models/Order');
const Product = require('../../database/models/Product');
const User = require('../../database/models/User');

/**
 * Показать форму для оставления отзыва
 */
async function showReviewForm(bot, chatId, orderId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) {
      return bot.sendMessage(chatId, '❌ Пользователь не найден.');
    }

    const order = await Order.findById(orderId)
      .populate('product_id', 'title')
      .populate('seller_id', 'username first_name');

    if (!order) {
      return bot.sendMessage(chatId, '❌ Заказ не найден.');
    }

    // Проверяем, что заказ принадлежит пользователю
    if (order.buyer_id.toString() !== user._id.toString()) {
      return bot.sendMessage(chatId, '❌ Это не ваш заказ.');
    }

    // Проверяем, что заказ доставлен
    if (order.status !== 'delivered' && order.status !== 'completed') {
      return bot.sendMessage(chatId, '❌ Отзыв можно оставить только после получения товара.');
    }

    // Проверяем, не оставлен ли уже отзыв
    const existingReview = await Review.findOne({ order_id: orderId });
    if (existingReview) {
      return bot.sendMessage(chatId, '✅ Вы уже оставили отзыв на этот заказ.');
    }

    const lang = user.language || 'ru';

    const texts = {
      ru: {
        title: '⭐ Оставить отзыв',
        product: '📦 Товар',
        seller: '👤 Продавец',
        rating: 'Оцените покупку:',
        comment: '💬 Комментарий (необязательно)',
        skip: 'Пропустить',
        submit: '✅ Отправить отзыв'
      },
      en: {
        title: '⭐ Leave a review',
        product: '📦 Product',
        seller: '👤 Seller',
        rating: 'Rate your purchase:',
        comment: '💬 Comment (optional)',
        skip: 'Skip',
        submit: '✅ Submit review'
      }
    };

    const t = texts[lang] || texts.ru;

    let message = `${t.title}\n\n`;
    message += `${t.product}: ${order.product_id.title}\n`;
    message += `${t.seller}: ${order.seller_id.username || order.seller_id.first_name || 'Продавец'}\n\n`;
    message += `${t.rating}\n`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭐ 1', callback_data: `rate_1_${orderId}` },
            { text: '⭐⭐ 2', callback_data: `rate_2_${orderId}` },
            { text: '⭐⭐⭐ 3', callback_data: `rate_3_${orderId}` }
          ],
          [
            { text: '⭐⭐⭐⭐ 4', callback_data: `rate_4_${orderId}` },
            { text: '⭐⭐⭐⭐⭐ 5', callback_data: `rate_5_${orderId}` }
          ],
          [
            { text: t.skip, callback_data: `skip_review_${orderId}` }
          ]
        ]
      },
      parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка показа формы отзыва:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  }
}

/**
 * Обработка выбора рейтинга
 */
async function handleRatingSelection(bot, chatId, rating, orderId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) return;

    const order = await Order.findById(orderId);
    if (!order || order.buyer_id.toString() !== user._id.toString()) {
      return bot.sendMessage(chatId, '❌ Ошибка доступа к заказу.');
    }

    const lang = user.language || 'ru';

    // Сохраняем состояние для ввода комментария
    if (!global.userStates) global.userStates = {};
    global.userStates[chatId] = {
      action: 'reviewing',
      orderId: orderId,
      rating: parseInt(rating)
    };

    const texts = {
      ru: {
        thanks: 'Спасибо за оценку!',
        comment: '💬 Хотите оставить комментарий? (необязательно)\n\nИли нажмите "Пропустить"',
        skip: 'Пропустить',
        cancel: 'Отменить'
      },
      en: {
        thanks: 'Thank you for rating!',
        comment: '💬 Would you like to leave a comment? (optional)\n\nOr press "Skip"',
        skip: 'Skip',
        cancel: 'Cancel'
      }
    };

    const t = texts[lang] || texts.ru;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t.skip, callback_data: `submit_review_${orderId}` },
            { text: t.cancel, callback_data: `cancel_review_${orderId}` }
          ]
        ]
      }
    };

    await bot.sendMessage(chatId, `${t.thanks}\n\n${t.comment}`, keyboard);
  } catch (error) {
    console.error('❌ Ошибка обработки рейтинга:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка.');
  }
}

/**
 * Сохранение отзыва
 */
async function saveReview(bot, chatId, orderId, rating, comment = null, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) return;

    const order = await Order.findById(orderId)
      .populate('product_id')
      .populate('seller_id');

    if (!order || order.buyer_id.toString() !== user._id.toString()) {
      return bot.sendMessage(chatId, '❌ Ошибка доступа к заказу.');
    }

    // Проверяем, не оставлен ли уже отзыв
    const existingReview = await Review.findOne({ order_id: orderId });
    if (existingReview) {
      return bot.sendMessage(chatId, '✅ Вы уже оставили отзыв на этот заказ.');
    }

    // Создаем отзыв
    const review = new Review({
      order_id: orderId,
      buyer_id: user._id,
      seller_id: order.seller_id._id,
      product_id: order.product_id._id,
      rating: rating,
      comment: comment || null
    });

    await review.save();

    // Обновляем статус заказа на completed
    order.status = 'completed';
    order.completed_at = new Date();
    await order.save();

    const lang = user.language || 'ru';

    const texts = {
      ru: {
        success: '✅ Спасибо за отзыв!',
        seller: 'Продавец получил уведомление о вашем отзыве.'
      },
      en: {
        success: '✅ Thank you for your review!',
        seller: 'The seller has been notified of your review.'
      }
    };

    const t = texts[lang] || texts.ru;

    await bot.sendMessage(chatId, `${t.success}\n\n${t.seller}`);

    // Уведомляем продавца
    if (order.seller_id.telegram_id) {
      const sellerLang = order.seller_id.language || 'ru';
      const sellerTexts = {
        ru: `⭐ Новый отзыв!\n\nВаш товар "${order.product_id.title}" получил оценку ${rating}/5`,
        en: `⭐ New review!\n\nYour product "${order.product_id.title}" received a ${rating}/5 rating`,
      };
      await bot.sendMessage(order.seller_id.telegram_id, sellerTexts[sellerLang] || sellerTexts.ru);
    }

    // Очищаем состояние
    if (global.userStates && global.userStates[chatId]) {
      delete global.userStates[chatId];
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения отзыва:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка при сохранении отзыва.');
  }
}

/**
 * Показать отзывы товара
 */
async function showProductReviews(bot, chatId, productId, lang = 'ru') {
  try {
    const reviews = await Review.find({ product_id: productId })
      .populate('buyer_id', 'username first_name')
      .sort({ created_at: -1 })
      .limit(10);

    if (reviews.length === 0) {
      const texts = {
        ru: '📝 На этот товар пока нет отзывов.',
        en: '📝 No reviews yet for this product.',
      };
      return bot.sendMessage(chatId, texts[lang] || texts.ru);
    }

    const texts = {
      ru: {
        title: '⭐ Отзывы о товаре',
        rating: 'Оценка',
        comment: 'Комментарий',
        noComment: 'Без комментария'
      },
      en: {
        title: '⭐ Product reviews',
        rating: 'Rating',
        comment: 'Comment',
        noComment: 'No comment'
      }
    };

    const t = texts[lang] || texts.ru;

    let message = `${t.title}\n\n`;

    reviews.forEach((review, index) => {
      const buyerName = review.buyer_id?.username || 
                       review.buyer_id?.first_name || 
                       'Покупатель';
      const stars = '⭐'.repeat(review.rating);
      
      message += `${index + 1}. ${buyerName} ${stars} (${review.rating}/5)\n`;
      if (review.comment) {
        message += `   "${review.comment}"\n`;
      }
      message += '\n';
    });

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('❌ Ошибка показа отзывов:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке отзывов.');
  }
}

module.exports = {
  showReviewForm,
  handleRatingSelection,
  saveReview,
  showProductReviews
};

