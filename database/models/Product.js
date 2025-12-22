const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    enum: ['it', 'courses', 'design', 'gaming', 'services', 'other'],
    default: 'other'
  },
  file_url: {
    type: String,
    default: null
  },
  file_type: {
    type: String,
    enum: ['link', 'file', 'text'],
    default: 'link'
  },
  preview_image: {
    type: String,
    default: null
  },
  sales_count: {
    type: Number,
    default: 0
  },
  views_count: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  reviews_count: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'hidden', 'moderation'],
    default: 'active'
  },
  is_premium: {
    type: Boolean,
    default: false
  },
  premium_until: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware для обновления updated_at
productSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Метод для увеличения просмотров
productSchema.methods.incrementViews = function() {
  this.views_count += 1;
  return this.save();
};

// Метод для увеличения продаж
productSchema.methods.incrementSales = function() {
  this.sales_count += 1;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);

