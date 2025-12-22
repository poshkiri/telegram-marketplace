const PromoCode = require('../../database/models/PromoCode');
const User = require('../../database/models/User');

/**
 * Применить промо-код
 */
async function applyPromoCode(bot, chatId, code, orderAmount, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) {
      return { success: false, message: '❌ Пользователь не найден.' };
    }

    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase().trim() 
    });

    if (!promoCode) {
      const lang = user.language || 'ru';
      const texts = {
        ru: '❌ Промо-код не найден.',
        en: '❌ Promo code not found.'
      };
      return { success: false, message: texts[lang] || texts.ru };
    }

    // Проверяем валидность
    const validation = promoCode.isValid(orderAmount);
    if (!validation.valid) {
      return { success: false, message: `❌ ${validation.reason}` };
    }

    // Рассчитываем скидку
    const discount = promoCode.calculateDiscount(orderAmount);
    const finalAmount = orderAmount - discount;

    return {
      success: true,
      promoCode: promoCode,
      discount: discount,
      finalAmount: finalAmount,
      originalAmount: orderAmount
    };
  } catch (error) {
    console.error('❌ Ошибка применения промо-кода:', error);
    return { success: false, message: '❌ Произошла ошибка при применении промо-кода.' };
  }
}

/**
 * Показать форму ввода промо-кода
 */
async function showPromoCodeForm(bot, chatId, orderAmount, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user) return;

    const lang = user.language || 'ru';

    const texts = {
      ru: {
        title: '🎟️ Промо-код',
        enter: 'Введите промо-код:',
        cancel: '❌ Отменить',
        info: 'Или нажмите "Отменить", чтобы продолжить без промо-кода'
      },
      en: {
        title: '🎟️ Promo code',
        enter: 'Enter promo code:',
        cancel: '❌ Cancel',
        info: 'Or press "Cancel" to continue without promo code'
      }
    };

    const t = texts[lang] || texts.ru;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t.cancel, callback_data: 'cancel_promo' }
          ]
        ]
      }
    };

    await bot.sendMessage(chatId, `${t.title}\n\n${t.enter}\n\n${t.info}`, keyboard);

    // Устанавливаем состояние для ввода промо-кода
    if (!global.userStates) global.userStates = {};
    global.userStates[chatId] = {
      action: 'entering_promo',
      orderAmount: orderAmount
    };
  } catch (error) {
    console.error('❌ Ошибка показа формы промо-кода:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка.');
  }
}

/**
 * Создать промо-код (только для админов)
 */
async function createPromoCode(bot, chatId, code, discountType, discountValue, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    if (!user || user.role !== 'admin') {
      return bot.sendMessage(chatId, '❌ Только администраторы могут создавать промо-коды.');
    }

    const promoCode = new PromoCode({
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      created_by: user._id
    });

    await promoCode.save();

    const lang = user.language || 'ru';
    const texts = {
      ru: `✅ Промо-код "${code.toUpperCase()}" создан!`,
      en: `✅ Promo code "${code.toUpperCase()}" created!`
    };

    await bot.sendMessage(chatId, texts[lang] || texts.ru);
  } catch (error) {
    if (error.code === 11000) {
      return bot.sendMessage(chatId, '❌ Промо-код с таким кодом уже существует.');
    }
    console.error('❌ Ошибка создания промо-кода:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка при создании промо-кода.');
  }
}

module.exports = {
  applyPromoCode,
  showPromoCodeForm,
  createPromoCode
};

