require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Для админ-панели

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB подключена (Backend)'))
  .catch(err => console.error('❌ Ошибка MongoDB:', err));

// Базовый роут
app.get('/', (req, res) => {
  res.json({
    message: '🛍️ Telegram Marketplace API',
    version: '1.0.0',
    status: 'running'
  });
});

// Админ-панель
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// API роуты
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

app.get('/api/orders', (req, res) => {
  res.json({
    orders: [],
    message: 'История заказов скоро будет доступна'
  });
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 API доступен на http://localhost:${PORT}/api`);
});

