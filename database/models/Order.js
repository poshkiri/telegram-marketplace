const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true
  },
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    required: true
  },
  payment_address: {
    type: String,
    required: true
  },
  payment_network: {
    type: String,
    enum: ['TRC20', 'ERC20', 'BEP20'],
    default: 'TRC20'
  },
  tx_hash: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'delivered', 'completed', 'disputed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  escrow_until: {
    type: Date,
    default: null
  },
  dispute_reason: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  paid_at: {
    type: Date,
    default: null
  },
  delivered_at: {
    type: Date,
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  }
});

// Генерация уникального ID заказа
orderSchema.statics.generateOrderId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// Метод для установки эскроу
orderSchema.methods.setEscrow = function(hours = 24) {
  const escrowTime = new Date();
  escrowTime.setHours(escrowTime.getHours() + hours);
  this.escrow_until = escrowTime;
  return this.save();
};

// Метод для проверки истечения эскроу
orderSchema.methods.isEscrowExpired = function() {
  if (!this.escrow_until) return false;
  return new Date() > this.escrow_until;
};

module.exports = mongoose.model('Order', orderSchema);

