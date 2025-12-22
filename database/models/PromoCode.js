const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discount_type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  max_uses: {
    type: Number,
    default: null // null = без ограничений
  },
  used_count: {
    type: Number,
    default: 0
  },
  min_purchase: {
    type: Number,
    default: 0 // Минимальная сумма покупки
  },
  valid_from: {
    type: Date,
    default: Date.now
  },
  valid_until: {
    type: Date,
    default: null // null = без ограничения по времени
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Метод для проверки валидности промо-кода
promoSchema.methods.isValid = function(purchaseAmount = 0) {
  if (!this.is_active) return { valid: false, reason: 'Промо-код неактивен' };
  
  if (this.max_uses && this.used_count >= this.max_uses) {
    return { valid: false, reason: 'Промо-код исчерпан' };
  }
  
  if (this.valid_until && new Date() > this.valid_until) {
    return { valid: false, reason: 'Промо-код истек' };
  }
  
  if (new Date() < this.valid_from) {
    return { valid: false, reason: 'Промо-код еще не активен' };
  }
  
  if (purchaseAmount < this.min_purchase) {
    return { valid: false, reason: `Минимальная сумма покупки: ${this.min_purchase} USDT` };
  }
  
  return { valid: true };
};

// Метод для расчета скидки
promoSchema.methods.calculateDiscount = function(amount) {
  if (this.discount_type === 'percentage') {
    return Math.min(amount * (this.discount_value / 100), amount);
  } else {
    return Math.min(this.discount_value, amount);
  }
};

// Метод для применения промо-кода
promoSchema.methods.apply = async function() {
  this.used_count += 1;
  await this.save();
};

module.exports = mongoose.model('PromoCode', promoSchema);

