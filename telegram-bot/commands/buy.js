const Product = require('../../database/models/Product');
const User = require('../../database/models/User');
const Order = require('../../database/models/Order');
const paymentService = require('../services/paymentService');
const { escapeMarkdown } = require('../utils/markdown');

// Хранилище активных проверок платежей
const activePaymentChecks = new Map();

/**
 * Инициирование покупки товара
 */
async function initiatePurchase(bot, chatId, productId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';
    
    const errorTexts = {
      ru: {
        userNotFound: '❌ Пользователь не найден. Используйте /start',
        productNotFound: '❌ Товар не найден или недоступен.',
        ownProduct: '❌ Вы не можете купить свой собственный товар.'
      },
      en: {
        userNotFound: '❌ User not found. Use /start',
        productNotFound: '❌ Product not found or unavailable.',
        ownProduct: '❌ You cannot buy your own product.'
      }
    };
    
    const et = errorTexts[lang] || errorTexts.ru;
    
    if (!user) {
      return bot.sendMessage(chatId, et.userNotFound);
    }

    const product = await Product.findById(productId)
      .populate('seller_id', 'username first_name');

    if (!product || product.status !== 'active') {
      return bot.sendMessage(chatId, et.productNotFound);
    }

    // Проверяем, не пытается ли пользователь купить свой товар
    if (product.seller_id._id.toString() === user._id.toString()) {
      return bot.sendMessage(chatId, et.ownProduct);
    }

    // Язык уже получен выше (строка 15), используем его

    // Показываем выбор сети для оплаты
    await showNetworkSelection(bot, chatId, productId, lang);
  } catch (error) {
    console.error('❌ Ошибка инициирования покупки:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Произошла ошибка. Попробуйте позже.',
      en: '❌ An error occurred. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

/**
 * Показ выбора сети для оплаты
 */
async function showNetworkSelection(bot, chatId, productId, lang = 'ru') {
  const texts = {
    ru: {
      title: '🌐 Выберите сеть для оплаты',
      trc20: 'TRC20 (Tron) - Низкие комиссии',
      erc20: 'ERC20 (Ethereum) - Высокие комиссии',
      bep20: 'BEP20 (BSC) - Средние комиссии',
      back: '🔙 Назад'
    },
    en: {
      title: '🌐 Choose payment network',
      trc20: 'TRC20 (Tron) - Low fees',
      erc20: 'ERC20 (Ethereum) - High fees',
      bep20: 'BEP20 (BSC) - Medium fees',
      back: '🔙 Back'
    }
  };

  const t = texts[lang] || texts.ru;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t.trc20, callback_data: `select_network_TRC20_${productId}` }
        ],
        [
          { text: t.erc20, callback_data: `select_network_ERC20_${productId}` }
        ],
        [
          { text: t.bep20, callback_data: `select_network_BEP20_${productId}` }
        ],
        [
          { text: t.back, callback_data: `view_product_${productId}` }
        ]
      ]
    },
    parse_mode: 'Markdown'
  };

  await bot.sendMessage(chatId, t.title, keyboard);
}

/**
 * Обработка выбора сети и создание заказа
 */
async function processNetworkSelection(bot, chatId, network, productId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';
    
    const errorTexts = {
      ru: {
        userNotFound: '❌ Пользователь не найден.',
        productNotFound: '❌ Товар не найден или недоступен.',
        networkUnavailable: '❌ Сеть {network} временно недоступна. Выберите другую сеть.'
      },
      en: {
        userNotFound: '❌ User not found.',
        productNotFound: '❌ Product not found or unavailable.',
        networkUnavailable: '❌ Network {network} is temporarily unavailable. Choose another network.'
      }
    };
    
    const et = errorTexts[lang] || errorTexts.ru;
    
    if (!user) {
      return bot.sendMessage(chatId, et.userNotFound);
    }

    const product = await Product.findById(productId)
      .populate('seller_id');

    if (!product || product.status !== 'active') {
      return bot.sendMessage(chatId, et.productNotFound);
    }

    // Проверяем наличие кошелька для выбранной сети
    if (!paymentService.WALLETS[network]) {
      return bot.sendMessage(chatId, et.networkUnavailable.replace('{network}', network));
    }

    // Создаем заказ
    const { order, qrCode, paymentInfo } = await paymentService.createPaymentOrder(
      user._id,
      productId,
      product.price,
      network
    );

    // Получаем текст инструкции
    const instructionText = paymentService.getPaymentInstructionsText(paymentInfo, lang);

    // Формируем клавиатуру
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: lang === 'ru' ? '✅ Я отправил платеж' : 
                    lang === 'en' ? '✅ I have sent the payment' : 
                    '✅ Я надіслав платіж', 
              callback_data: `check_payment_${order._id}` 
            }
          ],
          [
            { 
              text: lang === 'ru' ? '🔄 Проверить платеж' : 
                    lang === 'en' ? '🔄 Check payment' : 
                    '🔄 Перевірити платіж', 
              callback_data: `check_payment_${order._id}` 
            }
          ],
          [
            { 
              text: lang === 'ru' ? '❌ Отменить заказ' : 
                    lang === 'en' ? '❌ Cancel order' : 
                    '❌ Скасувати замовлення', 
              callback_data: `cancel_order_${order._id}` 
            }
          ],
          [
            { 
              text: lang === 'ru' ? '🔙 Назад к товару' : 
                    lang === 'en' ? '🔙 Back to product' : 
                    '🔙 Назад до товару', 
              callback_data: `view_product_${productId}` 
            }
          ]
        ]
      },
      parse_mode: 'Markdown'
    };

    // Отправляем QR код и инструкции
    if (qrCode) {
      await bot.sendPhoto(chatId, qrCode, {
        caption: instructionText,
        ...keyboard
      });
    } else {
      await bot.sendMessage(chatId, instructionText, keyboard);
    }

    // Запускаем автоматическую проверку платежа
    startPaymentMonitoring(bot, chatId, order._id, lang);

  } catch (error) {
    console.error('❌ Ошибка обработки выбора сети:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Произошла ошибка при создании заказа. Попробуйте позже.',
      en: '❌ An error occurred while creating the order. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

/**
 * Запуск мониторинга платежа
 */
function startPaymentMonitoring(bot, chatId, orderId, lang = 'ru') {
  // Останавливаем предыдущую проверку, если есть
  if (activePaymentChecks.has(chatId)) {
    clearInterval(activePaymentChecks.get(chatId));
  }

  let checkCount = 0;
  const maxChecks = 120; // Максимум 120 проверок (10 минут при интервале 5 сек)
  const checkInterval = 5000; // Проверка каждые 5 секунд

  const intervalId = setInterval(async () => {
    try {
      checkCount++;

      const order = await Order.findById(orderId)
        .populate('product_id')
        .populate('buyer_id');

      if (!order) {
        clearInterval(intervalId);
        activePaymentChecks.delete(chatId);
        return;
      }

      // Если заказ уже обработан, останавливаем проверку
      if (order.status !== 'pending') {
        clearInterval(intervalId);
        activePaymentChecks.delete(chatId);
        return;
      }

      // Проверяем платеж
      const result = await paymentService.checkPayment(order);

      if (result.found) {
        clearInterval(intervalId);
        activePaymentChecks.delete(chatId);

        // Обновляем заказ
        const updatedOrder = await Order.findById(orderId)
          .populate('product_id')
          .populate('buyer_id')
          .populate('seller_id');

        // Доставляем товар
        await deliverProduct(bot, chatId, updatedOrder, lang);
      } else if (checkCount >= maxChecks) {
        // Превышен лимит проверок
        clearInterval(intervalId);
        activePaymentChecks.delete(chatId);

        const texts = {
          ru: '⏱️ Автоматическая проверка платежа остановлена. Вы можете проверить платеж вручную, нажав кнопку "Проверить платеж".',
          en: '⏱️ Automatic payment check stopped. You can check payment manually by pressing "Check payment" button.'
        };

        await bot.sendMessage(chatId, texts[lang] || texts.ru);
      }
    } catch (error) {
      console.error('❌ Ошибка мониторинга платежа:', error);
    }
  }, checkInterval);

  activePaymentChecks.set(chatId, intervalId);
}

/**
 * Ручная проверка платежа
 */
async function manualCheckPayment(bot, chatId, orderId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';

    const errorTexts = {
      ru: {
        orderNotFound: '❌ Заказ не найден.',
        notYourOrder: '❌ Это не ваш заказ.'
      },
      en: {
        orderNotFound: '❌ Order not found.',
        notYourOrder: '❌ This is not your order.'
      }
    };
    
    const et = errorTexts[lang] || errorTexts.ru;

    const order = await Order.findById(orderId)
      .populate('product_id')
      .populate('buyer_id');

    if (!order) {
      return bot.sendMessage(chatId, et.orderNotFound);
    }

    // Проверяем, что заказ принадлежит пользователю
    if (order.buyer_id.telegram_id !== telegramUser.id) {
      return bot.sendMessage(chatId, et.notYourOrder);
    }

    if (order.status !== 'pending') {
      const statusTexts = {
        ru: { 
          paid: '✅ Платеж уже подтвержден!', 
          delivered: '✅ Товар уже доставлен!',
          completed: '✅ Заказ обработан.',
          cancelled: '✅ Заказ отменен.'
        },
        en: { 
          paid: '✅ Payment already confirmed!', 
          delivered: '✅ Product already delivered!',
          completed: '✅ Order processed.',
          cancelled: '✅ Order cancelled.'
        }
      };
      const t = statusTexts[lang] || statusTexts.ru;
      return bot.sendMessage(chatId, t[order.status] || t.completed);
    }

    // Проверяем платеж
    const loadingTexts = {
      ru: '🔄 Проверяю платеж...',
      en: '🔄 Checking payment...'
    };
    await bot.sendMessage(chatId, loadingTexts[lang] || loadingTexts.ru);

    const result = await paymentService.checkPayment(order);

    if (result.found) {
      // Обновляем заказ
      const updatedOrder = await Order.findById(orderId)
        .populate('product_id')
        .populate('buyer_id')
        .populate('seller_id');

      await deliverProduct(bot, chatId, updatedOrder, lang);
    } else {
      const notFoundTexts = {
        ru: '❌ Платеж еще не получен. Пожалуйста, убедитесь, что вы отправили правильную сумму на указанный адрес.',
        en: '❌ Payment not received yet. Please make sure you sent the correct amount to the specified address.'
      };
      await bot.sendMessage(chatId, notFoundTexts[lang] || notFoundTexts.ru);
    }
  } catch (error) {
    console.error('❌ Ошибка ручной проверки платежа:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Произошла ошибка при проверке платежа.',
      en: '❌ An error occurred while checking payment.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

/**
 * Доставка товара покупателю
 */
async function deliverProduct(bot, chatId, order, lang = 'ru') {
  try {
    const product = order.product_id;
    const buyer = order.buyer_id;
    const seller = order.seller_id;

    // Обновляем статус заказа
    order.status = 'delivered';
    order.delivered_at = new Date();
    await order.save();

    // Увеличиваем счетчик продаж товара
    await product.incrementSales();

    // Обновляем статистику продавца
    seller.sales_count = (seller.sales_count || 0) + 1;
    await seller.save();

    // Обновляем статистику покупателя
    buyer.purchases_count = (buyer.purchases_count || 0) + 1;
    await buyer.save();

    // Формируем сообщение для покупателя
    const deliveryTexts = {
      ru: {
        title: '✅ Платеж подтвержден!',
        product: '📦 Ваш товар:',
        file: '📎 Файл/ссылка:',
        text: '📝 Текст/код:',
        thanks: 'Спасибо за покупку!',
        support: 'Если возникли проблемы, обратитесь в поддержку.'
      },
      en: {
        title: '✅ Payment confirmed!',
        product: '📦 Your product:',
        file: '📎 File/link:',
        text: '📝 Text/code:',
        thanks: 'Thank you for your purchase!',
        support: 'If you have any issues, please contact support.'
      }
    };

    const t = deliveryTexts[lang] || deliveryTexts.ru;

    let deliveryMessage = `${t.title}\n\n`;
    deliveryMessage += `*${escapeMarkdown(product.title)}*\n\n`;
    deliveryMessage += `${t.product}\n`;

    // Отправляем файл/ссылку/текст в зависимости от типа
    if (product.file_type === 'link' && product.file_url) {
      deliveryMessage += `${t.file}\n${escapeMarkdown(product.file_url)}\n\n`;
    } else if (product.file_type === 'text' && product.file_url) {
      deliveryMessage += `${t.text}\n${escapeMarkdown(product.file_url)}\n\n`;
    }

    deliveryMessage += `\n${t.thanks}\n${t.support}`;

    const buttonTexts = {
      ru: {
        review: '⭐ Оставить отзыв',
        orders: '📦 Мои заказы'
      },
      en: {
        review: '⭐ Leave a review',
        orders: '📦 My orders'
      }
    };
    
    const bt = buttonTexts[lang] || buttonTexts.ru;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: bt.review, 
              callback_data: `review_order_${order._id}` 
            }
          ],
          [
            { 
              text: bt.orders, 
              callback_data: 'my_orders' 
            }
          ]
        ]
      },
      parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, deliveryMessage, keyboard);

    // Уведомляем продавца о продаже
    if (seller.telegram_id) {
      const sellerNotification = {
        ru: `💰 Продажа!\n\nВаш товар *${escapeMarkdown(product.title)}* был куплен за ${order.price} USDT.\nКомиссия: ${order.commission} USDT\nК получению: ${(order.price - order.commission).toFixed(2)} USDT`,
        en: `💰 Sale!\n\nYour product *${escapeMarkdown(product.title)}* was purchased for ${order.price} USDT.\nCommission: ${order.commission} USDT\nTo receive: ${(order.price - order.commission).toFixed(2)} USDT`
      };
      const sellerLang = seller.language || 'ru';
      await bot.sendMessage(seller.telegram_id, sellerNotification[sellerLang] || sellerNotification.ru, { parse_mode: 'Markdown' });
    }

  } catch (error) {
    console.error('❌ Ошибка доставки товара:', error);
    const errorTexts = {
      ru: '❌ Произошла ошибка при доставке товара. Обратитесь в поддержку.',
      en: '❌ An error occurred while delivering the product. Please contact support.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

/**
 * Отмена заказа
 */
async function cancelOrder(bot, chatId, orderId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';
    
    const errorTexts = {
      ru: {
        orderNotFound: '❌ Заказ не найден.',
        notYourOrder: '❌ Это не ваш заказ.',
        cannotCancel: '❌ Нельзя отменить обработанный заказ.'
      },
      en: {
        orderNotFound: '❌ Order not found.',
        notYourOrder: '❌ This is not your order.',
        cannotCancel: '❌ Cannot cancel a processed order.'
      }
    };
    
    const et = errorTexts[lang] || errorTexts.ru;
    
    const order = await Order.findById(orderId);

    if (!order) {
      return bot.sendMessage(chatId, et.orderNotFound);
    }

    // Проверяем, что заказ принадлежит пользователю
    if (order.buyer_id.toString() !== user._id.toString()) {
      return bot.sendMessage(chatId, et.notYourOrder);
    }

    if (order.status !== 'pending') {
      return bot.sendMessage(chatId, et.cannotCancel);
    }

    // Останавливаем проверку платежа, если она активна
    if (activePaymentChecks.has(chatId)) {
      clearInterval(activePaymentChecks.get(chatId));
      activePaymentChecks.delete(chatId);
    }

    // Отменяем заказ
    order.status = 'cancelled';
    await order.save();

    const cancelTexts = {
      ru: '❌ Заказ отменен.',
      en: '❌ Order cancelled.',
    };

    await bot.sendMessage(chatId, cancelTexts[lang] || cancelTexts.ru);
  } catch (error) {
    console.error('❌ Ошибка отмены заказа:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Произошла ошибка при отмене заказа.',
      en: '❌ An error occurred while cancelling the order.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

module.exports = {
  initiatePurchase,
  processNetworkSelection,
  manualCheckPayment,
  deliverProduct,
  cancelOrder,
  showNetworkSelection
};

