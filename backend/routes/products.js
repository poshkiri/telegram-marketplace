const express = require('express');
const router = express.Router();
const Product = require('../../database/models/Product');
const User = require('../../database/models/User');

// Получить все товары
router.get('/', async (req, res) => {
  try {
    const { page = 0, limit = 20, category, status = 'active' } = req.query;
    const skip = parseInt(page) * parseInt(limit);

    const query = { status };
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .populate('seller_id', 'username first_name rating')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения товаров:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller_id', 'username first_name rating sales_count');

    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    // Увеличиваем просмотры
    await product.incrementViews();

    res.json({ success: true, product });
  } catch (error) {
    console.error('❌ Ошибка получения товара:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Создать товар (через API)
router.post('/', async (req, res) => {
  try {
    const { seller_id, title, description, price, category, file_url, file_type } = req.body;

    // Валидация
    if (!seller_id || !title || !description || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Не все обязательные поля заполнены' 
      });
    }

    if (price < 1 || price > 10000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Цена должна быть от 1 до 10000 USDT' 
      });
    }

    const product = new Product({
      seller_id,
      title,
      description,
      price,
      category,
      file_url: file_url || null,
      file_type: file_type || 'link',
      status: 'active'
    });

    await product.save();

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('❌ Ошибка создания товара:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Поиск товаров
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const products = await Product.find({
      status: 'active',
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .populate('seller_id', 'username first_name')
      .limit(20)
      .sort({ created_at: -1 });

    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить товары продавца
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const products = await Product.find({ 
      seller_id: req.params.sellerId,
      status: { $ne: 'hidden' }
    })
      .sort({ created_at: -1 });

    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('❌ Ошибка получения товаров продавца:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;

