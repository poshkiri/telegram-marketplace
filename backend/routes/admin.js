const express = require('express');
const router = express.Router();
const Product = require('../../database/models/Product');
const User = require('../../database/models/User');
const Order = require('../../database/models/Order');
const Review = require('../../database/models/Review');

// Middleware для проверки админ-прав (упрощенная версия)
function isAdmin(req, res, next) {
  // В продакшн здесь должна быть реальная проверка JWT токена
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) {
    return res.status(403).json({ error: 'Admin not configured' });
  }
  // Для простоты используем query параметр, в продакшн - JWT
  req.adminId = adminId;
  next();
}

// Статистика
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'delivered', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const commission = revenue * 0.05; // 5% комиссия

    res.json({
      users: {
        total: totalUsers,
        sellers: totalSellers,
        buyers: totalUsers - totalSellers
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        hidden: totalProducts - activeProducts
      },
      orders: {
        total: totalOrders,
        completed: completedOrders
      },
      revenue: {
        total: revenue.toFixed(2),
        commission: commission.toFixed(2),
        net: (revenue - commission).toFixed(2)
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Список товаров
router.get('/products', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .populate('seller_id', 'username first_name telegram_id')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Product.countDocuments();

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Управление товаром
router.patch('/products/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status && !['active', 'hidden', 'moderation'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status, ...req.body },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('❌ Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Список пользователей
router.get('/users', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip)
      .select('-__v');

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Управление пользователем
router.patch('/users/:id', isAdmin, async (req, res) => {
  try {
    const { is_blocked, role } = req.body;

    const update = {};
    if (is_blocked !== undefined) update.is_blocked = is_blocked;
    if (role && ['buyer', 'seller', 'admin'].includes(role)) update.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('❌ Ошибка обновления пользователя:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Список заказов
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate('buyer_id', 'username first_name telegram_id')
      .populate('seller_id', 'username first_name telegram_id')
      .populate('product_id', 'title price')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Order.countDocuments();

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения заказов:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

