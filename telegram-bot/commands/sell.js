const Product = require('../../database/models/Product');
const User = require('../../database/models/User');
const { notifyNewProduct } = require('../services/notifications');

// Начать процесс продажи
async function startSelling(bot, chatId, telegramUser) {
  try {
    // Находим или создаем пользователя
    const user = await User.findOrCreate(telegramUser);

    // Проверяем, может ли пользователь продавать
    if (user.is_blocked) {
      return bot.sendMessage(chatId, '❌ Ваш аккаунт заблокирован. Обратитесь к администратору.');
    }

    // Если еще не продавец, предлагаем стать
    if (user.role === 'buyer') {
      const message = `
💼 **Стать продавцом**

Вы хотите начать продавать товары в нашем маркетплейсе!

Преимущества:
✅ Простое добавление товаров
✅ Автоматические платежи в USDT
✅ Защита через эскроу
✅ Система рейтингов

Комиссия: 5% с продажи

Готовы начать?
      `;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да, стать продавцом', callback_data: 'become_seller' }],
            [{ text: '❌ Отмена', callback_data: 'main_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      };

      return bot.sendMessage(chatId, message, keyboard);
    }

    // Если уже продавец, показываем меню
    showSellerMenu(bot, chatId, user);
  } catch (error) {
    console.error('❌ Ошибка startSelling:', error);
    bot.sendMessage(chatId, '❌ Ошибка. Попробуйте позже.');
  }
}

// Стать продавцом (обновить роль)
async function becomeSeller(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    
    if (!user) {
      return bot.sendMessage(chatId, '❌ Пользователь не найден. Используйте /start');
    }

    // Обновляем роль на продавца
    user.role = 'seller';
    await user.save();

    const message = `
🎉 **Поздравляем!**

Вы стали продавцом! Теперь вы можете:
✅ Добавлять товары
✅ Получать оплату в USDT
✅ Строить свой бизнес

Комиссия: 5% с каждой продажи

Что дальше?
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Добавить первый товар', callback_data: 'add_product' }],
          [{ text: '💼 Панель продавца', callback_data: 'seller_menu' }],
          [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка becomeSeller:', error);
    bot.sendMessage(chatId, '❌ Ошибка. Попробуйте позже.');
  }
}

// Меню продавца
async function showSellerMenu(bot, chatId, user) {
  try {
    const myProducts = await Product.countDocuments({ 
      seller_id: user._id,
      status: { $ne: 'hidden' }
    });

    const activeProducts = await Product.countDocuments({ 
      seller_id: user._id,
      status: 'active'
    });

    const message = `
💼 **Панель продавца**

Ваша статистика:
📦 Всего товаров: ${myProducts}
✅ Активных: ${activeProducts}
💰 Продано: ${user.sales_count || 0}
⭐ Рейтинг: ${user.rating > 0 ? user.rating.toFixed(1) : 'Нет оценок'}

Что хотите сделать?
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Добавить товар', callback_data: 'add_product' }],
          [{ text: '📦 Мои товары', callback_data: 'my_products' }],
          [{ text: '💰 Мои продажи', callback_data: 'my_sales' }],
          [{ text: '📊 Статистика', callback_data: 'seller_stats' }],
          [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка showSellerMenu:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки меню.');
  }
}

// Начать добавление товара
async function startAddingProduct(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });

    if (!user || user.role !== 'seller' && user.role !== 'admin') {
      return bot.sendMessage(chatId, '❌ Вы не являетесь продавцом. Используйте /sell для регистрации.');
    }

    // Сохраняем состояние (что пользователь добавляет товар)
    // В реальном проекте используйте Redis или базу для состояний
    // Сейчас упрощенная версия - используем переменную в памяти
    if (!global.userStates) global.userStates = {};
    global.userStates[chatId] = {
      action: 'adding_product',
      step: 'title',
      data: {}
    };

    const message = `
➕ **Добавление товара**

Давайте добавим ваш товар! Следуйте инструкциям.

**Шаг 1 из 5: Название товара**

Напишите название вашего товара (максимум 100 символов):

Пример: "Готовый Telegram бот для продаж"
    `;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Ошибка startAddingProduct:', error);
    bot.sendMessage(chatId, '❌ Ошибка. Попробуйте позже.');
  }
}

// Обработка шагов добавления товара
async function handleProductStep(bot, chatId, text, telegramUser) {
  try {
    if (!global.userStates || !global.userStates[chatId]) {
      return; // Не в процессе добавления
    }

    const state = global.userStates[chatId];
    const user = await User.findOne({ telegram_id: telegramUser.id });

    switch (state.step) {
      case 'title':
        if (text.length > 100) {
          return bot.sendMessage(chatId, '❌ Название слишком длинное (максимум 100 символов). Попробуйте снова:');
        }
        state.data.title = text;
        state.step = 'description';
        bot.sendMessage(chatId, `
✅ Название сохранено!

**Шаг 2 из 5: Описание**

Напишите подробное описание товара (максимум 1000 символов):

Пример: "Полнофункциональный Telegram бот для автоматизации продаж. Включает каталог, корзину, платежи."
        `, { parse_mode: 'Markdown' });
        break;

      case 'description':
        if (text.length > 1000) {
          return bot.sendMessage(chatId, '❌ Описание слишком длинное (максимум 1000 символов). Попробуйте снова:');
        }
        state.data.description = text;
        state.step = 'price';
        bot.sendMessage(chatId, `
✅ Описание сохранено!

**Шаг 3 из 5: Цена**

Укажите цену в USDT (только число, например: 50):

Минимум: 1 USDT
Максимум: 10000 USDT
        `, { parse_mode: 'Markdown' });
        break;

      case 'price':
        const price = parseFloat(text);
        if (isNaN(price) || price < 1 || price > 10000) {
          return bot.sendMessage(chatId, '❌ Неверная цена. Введите число от 1 до 10000:');
        }
        state.data.price = price;
        state.step = 'category';
        bot.sendMessage(chatId, `
✅ Цена сохранена: ${price} USDT

**Шаг 4 из 5: Категория**

Выберите категорию товара:
        `, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💻 IT-продукты', callback_data: 'category_it' }],
              [{ text: '📚 Курсы и обучение', callback_data: 'category_courses' }],
              [{ text: '🎨 Дизайн и графика', callback_data: 'category_design' }],
              [{ text: '🎮 Игровые товары', callback_data: 'category_gaming' }],
              [{ text: '🛠 Услуги', callback_data: 'category_services' }],
              [{ text: '📦 Другое', callback_data: 'category_other' }]
            ]
          },
          parse_mode: 'Markdown'
        });
        break;

      case 'file':
        // Для упрощения - принимаем ссылку или текст
        state.data.file_url = text;
        state.data.file_type = text.startsWith('http') ? 'link' : 'text';
        state.step = 'confirm';
        await showProductPreview(bot, chatId, state.data, user);
        break;
    }
  } catch (error) {
    console.error('❌ Ошибка handleProductStep:', error);
    bot.sendMessage(chatId, '❌ Ошибка. Попробуйте начать заново: /sell');
  }
}

// Показать превью товара перед сохранением
async function showProductPreview(bot, chatId, productData, user) {
  const message = `
✅ **Превью товара**

📦 Название: ${productData.title}
📝 Описание: ${productData.description.substring(0, 100)}...
💰 Цена: ${productData.price} USDT
📂 Категория: ${productData.category}
📎 Файл: ${productData.file_url || 'Не указан'}

Всё верно? Нажмите "Опубликовать" для добавления товара.
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Опубликовать', callback_data: 'confirm_product' }],
        [{ text: '❌ Отмена', callback_data: 'cancel_product' }]
      ]
    },
    parse_mode: 'Markdown'
  };

  bot.sendMessage(chatId, message, keyboard);
}

// Сохранить товар
async function saveProduct(bot, chatId, telegramUser) {
  try {
    if (!global.userStates || !global.userStates[chatId]) {
      return bot.sendMessage(chatId, '❌ Сессия истекла. Начните заново: /sell');
    }

    const state = global.userStates[chatId];
    const user = await User.findOne({ telegram_id: telegramUser.id });

    if (!state.data.title || !state.data.description || !state.data.price || !state.data.category) {
      return bot.sendMessage(chatId, '❌ Не все данные заполнены. Начните заново: /sell');
    }

    // Создаем товар
    const product = new Product({
      seller_id: user._id,
      title: state.data.title,
      description: state.data.description,
      price: state.data.price,
      category: state.data.category,
      file_url: state.data.file_url || null,
      file_type: state.data.file_type || 'link',
      status: 'active'
    });

    await product.save();

    // Отправляем уведомления о новом товаре (асинхронно, не блокируем ответ)
    notifyNewProduct(bot, product._id).catch(err => 
      console.error('❌ Ошибка отправки уведомлений:', err)
    );

    // Очищаем состояние
    delete global.userStates[chatId];

    const message = `
🎉 **Товар успешно добавлен!**

📦 ${product.title}
💰 ${product.price} USDT

Товар появится в каталоге через несколько секунд.

ID товара: ${product._id}
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Посмотреть в каталоге', callback_data: `view_product_${product._id}` }],
          [{ text: '➕ Добавить ещё товар', callback_data: 'add_product' }],
          [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка saveProduct:', error);
    bot.sendMessage(chatId, '❌ Ошибка сохранения товара. Попробуйте позже.');
  }
}

// Мои товары
async function showMyProducts(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const products = await Product.find({ seller_id: user._id })
      .sort({ created_at: -1 })
      .limit(10);

    if (products.length === 0) {
      return bot.sendMessage(chatId, '📦 У вас пока нет товаров.\n\nИспользуйте /sell для добавления первого товара!');
    }

    let message = `📦 **Мои товары**\n\n`;
    products.forEach((product, index) => {
      const statusEmoji = product.status === 'active' ? '✅' : '⏸️';
      message += `${index + 1}. ${statusEmoji} **${product.title}**\n`;
      message += `   💰 ${product.price} USDT | 👁 ${product.views_count} | 🛒 ${product.sales_count}\n\n`;
    });

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          ...products.map(product => [
            {
              text: `${product.title} - ${product.price} USDT`,
              callback_data: `view_my_product_${product._id}`
            }
          ]),
          [{ text: '➕ Добавить товар', callback_data: 'add_product' }],
          [{ text: '🔙 Назад', callback_data: 'seller_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка showMyProducts:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки товаров.');
  }
}

module.exports = {
  startSelling,
  becomeSeller,
  showSellerMenu,
  startAddingProduct,
  handleProductStep,
  saveProduct,
  showMyProducts
};

