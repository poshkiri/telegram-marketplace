const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true // Один отзыв на заказ
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
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
reviewSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Статический метод для обновления рейтинга продавца
reviewSchema.statics.updateSellerRating = async function(sellerId) {
  const reviews = await this.find({ seller_id: sellerId });
  
  if (reviews.length === 0) return;
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  const User = require('./User');
  await User.findByIdAndUpdate(sellerId, { 
    rating: Math.round(averageRating * 10) / 10 // Округляем до 1 знака
  });
};

// Статический метод для обновления рейтинга товара
reviewSchema.statics.updateProductRating = async function(productId) {
  const reviews = await this.find({ product_id: productId });
  
  if (reviews.length === 0) return;
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  const Product = require('./Product');
  await Product.findByIdAndUpdate(productId, { 
    rating: Math.round(averageRating * 10) / 10,
    reviews_count: reviews.length
  });
};

// Middleware после сохранения - обновляем рейтинги
reviewSchema.post('save', async function() {
  await this.constructor.updateSellerRating(this.seller_id);
  await this.constructor.updateProductRating(this.product_id);
});

module.exports = mongoose.model('Review', reviewSchema);

