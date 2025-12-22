const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true,
    unique: true
  },
  username: {
    type: String,
    default: null
  },
  first_name: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    default: 'buyer'
  },
  wallet_address: {
    type: String,
    default: null
  },
  balance: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  sales_count: {
    type: Number,
    default: 0
  },
  purchases_count: {
    type: Number,
    default: 0
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_blocked: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_active: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    enum: ['ru', 'en', 'uk'],
    default: null
  }
});

// Метод для обновления последней активности
userSchema.methods.updateActivity = function() {
  this.last_active = new Date();
  return this.save();
};

// Статический метод для поиска или создания пользователя
userSchema.statics.findOrCreate = async function(telegramUser) {
  let user = await this.findOne({ telegram_id: telegramUser.id });
  
  if (!user) {
    user = await this.create({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      language: null
    });
    console.log('✅ Новый пользователь создан:', user.telegram_id);
  } else {
    // Обновляем активность
    await user.updateActivity();
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);

