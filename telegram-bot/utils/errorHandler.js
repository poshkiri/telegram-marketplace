/**
 * Утилиты для обработки ошибок и валидации
 */

/**
 * Обработка ошибок с отправкой сообщения пользователю
 */
async function handleError(bot, chatId, error, userLang = 'ru') {
  console.error('❌ Ошибка:', error);

  // Определяем тип ошибки и отправляем понятное сообщение
  let message = '';

  if (error.name === 'ValidationError') {
    message = getValidationErrorText(userLang, error);
  } else if (error.name === 'CastError') {
    message = getCastErrorText(userLang);
  } else if (error.code === 11000) {
    message = getDuplicateErrorText(userLang);
  } else if (error.message) {
    // Если есть понятное сообщение об ошибке
    message = error.message;
  } else {
    message = getGenericErrorText(userLang);
  }

  try {
    await bot.sendMessage(chatId, message);
  } catch (sendError) {
    console.error('❌ Ошибка отправки сообщения об ошибке:', sendError);
  }
}

/**
 * Тексты ошибок валидации
 */
function getValidationErrorText(lang, error) {
  const texts = {
    ru: {
      default: '❌ Ошибка валидации данных. Проверьте введенные данные.',
      price: '❌ Неверная цена. Цена должна быть числом от 1 до 10000.',
      title: '❌ Название товара обязательно.',
      description: '❌ Описание товара обязательно.'
    },
    en: {
      default: '❌ Data validation error. Please check your input.',
      price: '❌ Invalid price. Price must be a number from 1 to 10000.',
      title: '❌ Product title is required.',
      description: '❌ Product description is required.'
    },
    uk: {
      default: '❌ Помилка валідації даних. Перевірте введені дані.',
      price: '❌ Невірна ціна. Ціна повинна бути числом від 1 до 10000.',
      title: '❌ Назва товару обов\'язкова.',
      description: '❌ Опис товару обов\'язковий.'
    }
  };

  const t = texts[lang] || texts.ru;

  // Проверяем конкретные поля
  if (error.errors) {
    const field = Object.keys(error.errors)[0];
    if (t[field]) {
      return t[field];
    }
  }

  return t.default;
}

/**
 * Тексты ошибок приведения типов
 */
function getCastErrorText(lang) {
  const texts = {
    ru: '❌ Неверный формат данных.',
    en: '❌ Invalid data format.',
    uk: '❌ Невірний формат даних.'
  };
  return texts[lang] || texts.ru;
}

/**
 * Тексты ошибок дубликатов
 */
function getDuplicateErrorText(lang) {
  const texts = {
    ru: '❌ Такой элемент уже существует.',
    en: '❌ This item already exists.',
    uk: '❌ Такий елемент вже існує.'
  };
  return texts[lang] || texts.ru;
}

/**
 * Общие тексты ошибок
 */
function getGenericErrorText(lang) {
  const texts = {
    ru: '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.',
    en: '❌ An error occurred. Please try again later or contact support.',
    uk: '❌ Сталася помилка. Спробуйте пізніше або зверніться до підтримки.'
  };
  return texts[lang] || texts.ru;
}

/**
 * Валидация цены
 */
function validatePrice(price, lang = 'ru') {
  const minPrice = parseFloat(process.env.MIN_PRICE || '1');
  const maxPrice = parseFloat(process.env.MAX_PRICE || '10000');

  if (isNaN(price) || price < minPrice || price > maxPrice) {
    const texts = {
      ru: `❌ Цена должна быть от ${minPrice} до ${maxPrice} USDT.`,
      en: `❌ Price must be between ${minPrice} and ${maxPrice} USDT.`,
      uk: `❌ Ціна повинна бути від ${minPrice} до ${maxPrice} USDT.`
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  return { valid: true };
}

/**
 * Валидация текста
 */
function validateText(text, fieldName, minLength = 3, maxLength = 1000, lang = 'ru') {
  if (!text || typeof text !== 'string') {
    const texts = {
      ru: `❌ Поле "${fieldName}" обязательно.`,
      en: `❌ Field "${fieldName}" is required.`,
      uk: `❌ Поле "${fieldName}" обов'язкове.`
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    const texts = {
      ru: `❌ Поле "${fieldName}" должно содержать минимум ${minLength} символов.`,
      en: `❌ Field "${fieldName}" must contain at least ${minLength} characters.`,
      uk: `❌ Поле "${fieldName}" повинно містити мінімум ${minLength} символів.`
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  if (trimmed.length > maxLength) {
    const texts = {
      ru: `❌ Поле "${fieldName}" не должно превышать ${maxLength} символов.`,
      en: `❌ Field "${fieldName}" must not exceed ${maxLength} characters.`,
      uk: `❌ Поле "${fieldName}" не повинно перевищувати ${maxLength} символів.`
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  return { valid: true };
}

/**
 * Валидация URL
 */
function validateURL(url, lang = 'ru') {
  if (!url || typeof url !== 'string') {
    const texts = {
      ru: '❌ URL обязателен.',
      en: '❌ URL is required.',
      uk: '❌ URL обов\'язковий.'
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch (error) {
    const texts = {
      ru: '❌ Неверный формат URL.',
      en: '❌ Invalid URL format.',
      uk: '❌ Невірний формат URL.'
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }
}

/**
 * Валидация промо-кода
 */
function validatePromoCode(code, lang = 'ru') {
  if (!code || typeof code !== 'string') {
    const texts = {
      ru: '❌ Промо-код обязателен.',
      en: '❌ Promo code is required.',
      uk: '❌ Промо-код обов\'язковий.'
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length < 3 || trimmed.length > 20) {
    const texts = {
      ru: '❌ Промо-код должен содержать от 3 до 20 символов.',
      en: '❌ Promo code must be between 3 and 20 characters.',
      uk: '❌ Промо-код повинен містити від 3 до 20 символів.'
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    const texts = {
      ru: '❌ Промо-код может содержать только буквы и цифры.',
      en: '❌ Promo code can only contain letters and numbers.',
      uk: '❌ Промо-код може містити лише літери та цифри.'
    };
    return { valid: false, message: texts[lang] || texts.ru };
  }

  return { valid: true, code: trimmed };
}

/**
 * Безопасная обработка async функций
 */
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  handleError,
  validatePrice,
  validateText,
  validateURL,
  validatePromoCode,
  asyncHandler
};

