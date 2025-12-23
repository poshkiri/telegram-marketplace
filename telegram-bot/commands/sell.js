const Product = require('../../database/models/Product');
const User = require('../../database/models/User');
const { notifyNewProduct } = require('../services/notifications');

// Начать процесс продажи
async function startSelling(bot, chatId, telegramUser) {
  try {
    // Находим или создаем пользователя
    const user = await User.findOrCreate(telegramUser);
    const lang = user.language || 'ru';

    const texts = {
      ru: {
        blocked: '❌ Ваш аккаунт заблокирован. Обратитесь к администратору.',
        title: '💼 **Стать продавцом**',
        description: 'Вы хотите начать продавать товары в нашем маркетплейсе!',
        advantages: 'Преимущества:',
        advantage1: '✅ Простое добавление товаров',
        advantage2: '✅ Автоматические платежи в USDT',
        advantage3: '✅ Защита через эскроу',
        advantage4: '✅ Система рейтингов',
        commission: 'Комиссия: 5% с продажи',
        ready: 'Готовы начать?',
        yes: '✅ Да, стать продавцом',
        cancel: '❌ Отмена',
        error: '❌ Ошибка. Попробуйте позже.'
      },
      en: {
        blocked: '❌ Your account is blocked. Contact administrator.',
        title: '💼 **Become a seller**',
        description: 'You want to start selling products in our marketplace!',
        advantages: 'Advantages:',
        advantage1: '✅ Easy product addition',
        advantage2: '✅ Automatic USDT payments',
        advantage3: '✅ Escrow protection',
        advantage4: '✅ Rating system',
        commission: 'Commission: 5% per sale',
        ready: 'Ready to start?',
        yes: '✅ Yes, become a seller',
        cancel: '❌ Cancel',
        error: '❌ Error. Please try later.'
      }
    };

    const t = texts[lang] || texts.ru;

    // Проверяем, может ли пользователь продавать
    if (user.is_blocked) {
      return bot.sendMessage(chatId, t.blocked);
    }

    // Если еще не продавец, предлагаем стать
    if (user.role === 'buyer') {
      const message = `
${t.title}

${t.description}

${t.advantages}
${t.advantage1}
${t.advantage2}
${t.advantage3}
${t.advantage4}

${t.commission}

${t.ready}
      `;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: t.yes, callback_data: 'become_seller' }],
            [{ text: t.cancel, callback_data: 'main_menu' }]
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
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка. Попробуйте позже.',
      en: '❌ Error. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Стать продавцом (обновить роль)
async function becomeSeller(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';
    
    const texts = {
      ru: {
        userNotFound: '❌ Пользователь не найден. Используйте /start',
        title: '🎉 **Поздравляем!**',
        description: 'Вы стали продавцом! Теперь вы можете:',
        can1: '✅ Добавлять товары',
        can2: '✅ Получать оплату в USDT',
        can3: '✅ Строить свой бизнес',
        commission: 'Комиссия: 5% с каждой продажи',
        next: 'Что дальше?',
        addFirst: '➕ Добавить первый товар',
        panel: '💼 Панель продавца',
        mainMenu: '🔙 Главное меню',
        error: '❌ Ошибка. Попробуйте позже.'
      },
      en: {
        userNotFound: '❌ User not found. Use /start',
        title: '🎉 **Congratulations!**',
        description: 'You became a seller! Now you can:',
        can1: '✅ Add products',
        can2: '✅ Receive USDT payments',
        can3: '✅ Build your business',
        commission: 'Commission: 5% per sale',
        next: 'What\'s next?',
        addFirst: '➕ Add first product',
        panel: '💼 Seller panel',
        mainMenu: '🔙 Main Menu',
        error: '❌ Error. Please try later.'
      }
    };

    const t = texts[lang] || texts.ru;
    
    if (!user) {
      return bot.sendMessage(chatId, t.userNotFound);
    }

    // Обновляем роль на продавца
    user.role = 'seller';
    await user.save();

    const message = `
${t.title}

${t.description}
${t.can1}
${t.can2}
${t.can3}

${t.commission}

${t.next}
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.addFirst, callback_data: 'add_product' }],
          [{ text: t.panel, callback_data: 'seller_menu' }],
          [{ text: t.mainMenu, callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка becomeSeller:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка. Попробуйте позже.',
      en: '❌ Error. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Меню продавца
async function showSellerMenu(bot, chatId, user) {
  try {
    const lang = user.language || 'ru';
    
    const myProducts = await Product.countDocuments({ 
      seller_id: user._id,
      status: { $ne: 'hidden' }
    });

    const activeProducts = await Product.countDocuments({ 
      seller_id: user._id,
      status: 'active'
    });

    const texts = {
      ru: {
        title: '💼 **Панель продавца**',
        stats: 'Ваша статистика:',
        total: '📦 Всего товаров:',
        active: '✅ Активных:',
        sold: '💰 Продано:',
        rating: '⭐ Рейтинг:',
        noRating: 'Нет оценок',
        question: 'Что хотите сделать?',
        addProduct: '➕ Добавить товар',
        myProducts: '📦 Мои товары',
        mySales: '💰 Мои продажи',
        statsBtn: '📊 Статистика',
        mainMenu: '🔙 Главное меню',
        error: '❌ Ошибка загрузки меню.'
      },
      en: {
        title: '💼 **Seller Panel**',
        stats: 'Your statistics:',
        total: '📦 Total products:',
        active: '✅ Active:',
        sold: '💰 Sold:',
        rating: '⭐ Rating:',
        noRating: 'No ratings',
        question: 'What would you like to do?',
        addProduct: '➕ Add product',
        myProducts: '📦 My products',
        mySales: '💰 My sales',
        statsBtn: '📊 Statistics',
        mainMenu: '🔙 Main Menu',
        error: '❌ Error loading menu.'
      }
    };

    const t = texts[lang] || texts.ru;

    const message = `
${t.title}

${t.stats}
${t.total} ${myProducts}
${t.active} ${activeProducts}
${t.sold} ${user.sales_count || 0}
${t.rating} ${user.rating > 0 ? user.rating.toFixed(1) : t.noRating}

${t.question}
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.addProduct, callback_data: 'add_product' }],
          [{ text: t.myProducts, callback_data: 'my_products' }],
          [{ text: t.mySales, callback_data: 'my_sales' }],
          [{ text: t.statsBtn, callback_data: 'seller_stats' }],
          [{ text: t.mainMenu, callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка showSellerMenu:', error);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка загрузки меню.',
      en: '❌ Error loading menu.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Начать добавление товара
async function startAddingProduct(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';

    const texts = {
      ru: {
        notSeller: '❌ Вы не являетесь продавцом. Используйте /sell для регистрации.',
        title: '➕ **Добавление товара**',
        description: 'Давайте добавим ваш товар! Следуйте инструкциям.',
        step1: '**Шаг 1 из 5: Название товара**',
        instruction: 'Напишите название вашего товара (максимум 100 символов):',
        example: 'Пример: "Готовый Telegram бот для продаж"',
        error: '❌ Ошибка. Попробуйте позже.'
      },
      en: {
        notSeller: '❌ You are not a seller. Use /sell to register.',
        title: '➕ **Add Product**',
        description: 'Let\'s add your product! Follow the instructions.',
        step1: '**Step 1 of 5: Product Name**',
        instruction: 'Write your product name (maximum 100 characters):',
        example: 'Example: "Ready Telegram bot for sales"',
        error: '❌ Error. Please try later.'
      }
    };

    const t = texts[lang] || texts.ru;

    if (!user || user.role !== 'seller' && user.role !== 'admin') {
      return bot.sendMessage(chatId, t.notSeller);
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
${t.title}

${t.description}

${t.step1}

${t.instruction}

${t.example}
    `;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Ошибка startAddingProduct:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка. Попробуйте позже.',
      en: '❌ Error. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
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
    const lang = user?.language || 'ru';

    const texts = {
      ru: {
        titleTooLong: '❌ Название слишком длинное (максимум 100 символов). Попробуйте снова:',
        titleSaved: '✅ Название сохранено!',
        step2: '**Шаг 2 из 5: Описание**',
        descriptionInstruction: 'Напишите подробное описание товара (максимум 1000 символов):',
        descriptionExample: 'Пример: "Полнофункциональный Telegram бот для автоматизации продаж. Включает каталог, корзину, платежи."',
        descriptionTooLong: '❌ Описание слишком длинное (максимум 1000 символов). Попробуйте снова:',
        descriptionSaved: '✅ Описание сохранено!',
        step3: '**Шаг 3 из 5: Цена**',
        priceInstruction: 'Укажите цену в USDT (только число, например: 50):',
        priceMin: 'Минимум: 1 USDT',
        priceMax: 'Максимум: 10000 USDT',
        priceInvalid: '❌ Неверная цена. Введите число от 1 до 10000:',
        priceSaved: '✅ Цена сохранена:',
        step4: '**Шаг 4 из 5: Категория**',
        categoryInstruction: 'Выберите категорию товара:',
        category1: '💻 IT-продукты',
        category2: '📚 Курсы и обучение',
        category3: '🎨 Дизайн и графика',
        category4: '🎮 Игровые товары',
        category5: '🛠 Услуги',
        category6: '📦 Другое'
      },
      en: {
        titleTooLong: '❌ Title too long (maximum 100 characters). Try again:',
        titleSaved: '✅ Title saved!',
        step2: '**Step 2 of 5: Description**',
        descriptionInstruction: 'Write a detailed product description (maximum 1000 characters):',
        descriptionExample: 'Example: "Full-featured Telegram bot for sales automation. Includes catalog, cart, payments."',
        descriptionTooLong: '❌ Description too long (maximum 1000 characters). Try again:',
        descriptionSaved: '✅ Description saved!',
        step3: '**Step 3 of 5: Price**',
        priceInstruction: 'Specify price in USDT (number only, e.g.: 50):',
        priceMin: 'Minimum: 1 USDT',
        priceMax: 'Maximum: 10000 USDT',
        priceInvalid: '❌ Invalid price. Enter a number from 1 to 10000:',
        priceSaved: '✅ Price saved:',
        step4: '**Step 4 of 5: Category**',
        categoryInstruction: 'Choose product category:',
        category1: '💻 IT products',
        category2: '📚 Courses and training',
        category3: '🎨 Design and graphics',
        category4: '🎮 Gaming products',
        category5: '🛠 Services',
        category6: '📦 Other'
      }
    };

    const t = texts[lang] || texts.ru;

    switch (state.step) {
      case 'title':
        if (text.length > 100) {
          return bot.sendMessage(chatId, t.titleTooLong);
        }
        state.data.title = text;
        state.step = 'description';
        bot.sendMessage(chatId, `
${t.titleSaved}

${t.step2}

${t.descriptionInstruction}

${t.descriptionExample}
        `, { parse_mode: 'Markdown' });
        break;

      case 'description':
        if (text.length > 1000) {
          return bot.sendMessage(chatId, t.descriptionTooLong);
        }
        state.data.description = text;
        state.step = 'price';
        bot.sendMessage(chatId, `
${t.descriptionSaved}

${t.step3}

${t.priceInstruction}

${t.priceMin}
${t.priceMax}
        `, { parse_mode: 'Markdown' });
        break;

      case 'price':
        const price = parseFloat(text);
        if (isNaN(price) || price < 1 || price > 10000) {
          return bot.sendMessage(chatId, t.priceInvalid);
        }
        state.data.price = price;
        state.step = 'category';
        bot.sendMessage(chatId, `
${t.priceSaved} ${price} USDT

${t.step4}

${t.categoryInstruction}
        `, {
          reply_markup: {
            inline_keyboard: [
              [{ text: t.category1, callback_data: 'category_it' }],
              [{ text: t.category2, callback_data: 'category_courses' }],
              [{ text: t.category3, callback_data: 'category_design' }],
              [{ text: t.category4, callback_data: 'category_gaming' }],
              [{ text: t.category5, callback_data: 'category_services' }],
              [{ text: t.category6, callback_data: 'category_other' }]
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
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка. Попробуйте начать заново: /sell',
      en: '❌ Error. Please start over: /sell'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Показать превью товара перед сохранением
async function showProductPreview(bot, chatId, productData, user) {
  const lang = user?.language || 'ru';
  
  const texts = {
    ru: {
      title: '✅ **Превью товара**',
      name: '📦 Название:',
      description: '📝 Описание:',
      price: '💰 Цена:',
      category: '📂 Категория:',
      file: '📎 Файл:',
      notSpecified: 'Не указан',
      question: 'Всё верно? Нажмите "Опубликовать" для добавления товара.',
      publish: '✅ Опубликовать',
      cancel: '❌ Отмена'
    },
    en: {
      title: '✅ **Product Preview**',
      name: '📦 Name:',
      description: '📝 Description:',
      price: '💰 Price:',
      category: '📂 Category:',
      file: '📎 File:',
      notSpecified: 'Not specified',
      question: 'Everything correct? Press "Publish" to add the product.',
      publish: '✅ Publish',
      cancel: '❌ Cancel'
    }
  };

  const t = texts[lang] || texts.ru;

  const message = `
${t.title}

${t.name} ${productData.title}
${t.description} ${productData.description.substring(0, 100)}...
${t.price} ${productData.price} USDT
${t.category} ${productData.category}
${t.file} ${productData.file_url || t.notSpecified}

${t.question}
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: t.publish, callback_data: 'confirm_product' }],
        [{ text: t.cancel, callback_data: 'cancel_product' }]
      ]
    },
    parse_mode: 'Markdown'
  };

  bot.sendMessage(chatId, message, keyboard);
}

// Сохранить товар
async function saveProduct(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';

    const texts = {
      ru: {
        sessionExpired: '❌ Сессия истекла. Начните заново: /sell',
        notFilled: '❌ Не все данные заполнены. Начните заново: /sell',
        title: '🎉 **Товар успешно добавлен!**',
        willAppear: 'Товар появится в каталоге через несколько секунд.',
        productId: 'ID товара:',
        viewInCatalog: '📋 Посмотреть в каталоге',
        addMore: '➕ Добавить ещё товар',
        mainMenu: '🔙 Главное меню',
        error: '❌ Ошибка сохранения товара. Попробуйте позже.'
      },
      en: {
        sessionExpired: '❌ Session expired. Start over: /sell',
        notFilled: '❌ Not all data filled. Start over: /sell',
        title: '🎉 **Product successfully added!**',
        willAppear: 'Product will appear in catalog in a few seconds.',
        productId: 'Product ID:',
        viewInCatalog: '📋 View in catalog',
        addMore: '➕ Add another product',
        mainMenu: '🔙 Main Menu',
        error: '❌ Error saving product. Please try later.'
      }
    };

    const t = texts[lang] || texts.ru;

    if (!global.userStates || !global.userStates[chatId]) {
      return bot.sendMessage(chatId, t.sessionExpired);
    }

    const state = global.userStates[chatId];

    if (!state.data.title || !state.data.description || !state.data.price || !state.data.category) {
      return bot.sendMessage(chatId, t.notFilled);
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
${t.title}

📦 ${product.title}
💰 ${product.price} USDT

${t.willAppear}

${t.productId} ${product._id}
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.viewInCatalog, callback_data: `view_product_${product._id}` }],
          [{ text: t.addMore, callback_data: 'add_product' }],
          [{ text: t.mainMenu, callback_data: 'main_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка saveProduct:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка сохранения товара. Попробуйте позже.',
      en: '❌ Error saving product. Please try later.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
  }
}

// Мои товары
async function showMyProducts(bot, chatId, telegramUser) {
  try {
    const user = await User.findOne({ telegram_id: telegramUser.id });
    const lang = user?.language || 'ru';

    const texts = {
      ru: {
        empty: '📦 У вас пока нет товаров.\n\nИспользуйте /sell для добавления первого товара!',
        title: '📦 **Мои товары**',
        addProduct: '➕ Добавить товар',
        back: '🔙 Назад',
        error: '❌ Ошибка загрузки товаров.'
      },
      en: {
        empty: '📦 You have no products yet.\n\nUse /sell to add your first product!',
        title: '📦 **My Products**',
        addProduct: '➕ Add product',
        back: '🔙 Back',
        error: '❌ Error loading products.'
      }
    };

    const t = texts[lang] || texts.ru;

    const products = await Product.find({ seller_id: user._id })
      .sort({ created_at: -1 })
      .limit(10);

    if (products.length === 0) {
      return bot.sendMessage(chatId, t.empty);
    }

    let message = `${t.title}\n\n`;
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
          [{ text: t.addProduct, callback_data: 'add_product' }],
          [{ text: t.back, callback_data: 'seller_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('❌ Ошибка showMyProducts:', error);
    const user = await User.findOne({ telegram_id: telegramUser.id }).catch(() => null);
    const lang = user?.language || 'ru';
    const errorTexts = {
      ru: '❌ Ошибка загрузки товаров.',
      en: '❌ Error loading products.'
    };
    bot.sendMessage(chatId, errorTexts[lang] || errorTexts.ru);
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

