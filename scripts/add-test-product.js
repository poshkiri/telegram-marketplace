require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../database/models/Product');
const User = require('../database/models/User');

async function addTestProduct() {
  try {
    // Подключение к MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB подключена');

    // Находим или создаем тестового пользователя
    // Замените на ваш Telegram ID из .env
    const adminTelegramId = parseInt(process.env.ADMIN_TELEGRAM_ID) || 123456789;
    
    let user = await User.findOne({ telegram_id: adminTelegramId });
    
    if (!user) {
      // Создаем тестового пользователя
      user = new User({
        telegram_id: adminTelegramId,
        username: 'test_seller',
        first_name: 'Test',
        role: 'seller'
      });
      await user.save();
      console.log('✅ Тестовый пользователь создан');
    } else {
      // Делаем его продавцом если еще не продавец
      if (user.role === 'buyer') {
        user.role = 'seller';
        await user.save();
        console.log('✅ Пользователь стал продавцом');
      }
    }

    // Проверяем, есть ли уже тестовый товар
    const existingProduct = await Product.findOne({ 
      seller_id: user._id,
      title: 'Тестовый товар'
    });

    if (existingProduct) {
      console.log('⚠️ Тестовый товар уже существует!');
      console.log(`ID: ${existingProduct._id}`);
      console.log(`Название: ${existingProduct.title}`);
      console.log(`Цена: ${existingProduct.price} USDT`);
      await mongoose.disconnect();
      return;
    }

    // Создаем тестовый товар
    const testProduct = new Product({
      seller_id: user._id,
      title: 'Тестовый товар',
      description: 'Это тестовый товар для проверки работы маркетплейса. Создан автоматически через скрипт.',
      price: 10,
      category: 'it',
      file_url: 'https://example.com/test-file',
      file_type: 'link',
      status: 'active'
    });

    await testProduct.save();

    console.log('✅ Тестовый товар успешно добавлен!');
    console.log('\n📦 Информация о товаре:');
    console.log(`   ID: ${testProduct._id}`);
    console.log(`   Название: ${testProduct.title}`);
    console.log(`   Цена: ${testProduct.price} USDT`);
    console.log(`   Категория: ${testProduct.category}`);
    console.log(`   Статус: ${testProduct.status}`);
    console.log(`   Продавец: ${user.username || user.first_name}`);
    console.log('\n🎉 Теперь откройте бота и нажмите /catalog - увидите товар!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Запуск
addTestProduct();

