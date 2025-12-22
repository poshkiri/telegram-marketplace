/**
 * Модель пользователя с типизацией
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, UserDocument, UserRole, Language } from '../types/user.types';

const userSchema = new Schema<IUser>(
  {
    telegram_id: {
      type: Number,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      default: null,
    },
    first_name: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    wallet_address: {
      type: String,
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    sales_count: {
      type: Number,
      default: 0,
    },
    purchases_count: {
      type: Number,
      default: 0,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    is_blocked: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    last_active: {
      type: Date,
      default: Date.now,
    },
    language: {
      type: String,
      enum: ['ru', 'en', 'uk'],
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// Метод для обновления последней активности
userSchema.methods.updateActivity = function (): Promise<UserDocument> {
  this.last_active = new Date();
  return this.save();
};

// Статический метод для поиска или создания пользователя
userSchema.statics.findOrCreate = async function (
  telegramUser: { id: number; username?: string; first_name?: string }
): Promise<UserDocument> {
  let user = await this.findOne({ telegram_id: telegramUser.id });

  if (!user) {
    user = await this.create({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      language: null,
    });
    console.log('✅ Новый пользователь создан:', user.telegram_id);
  } else {
    // Обновляем активность
    await user.updateActivity();
  }

  return user;
};

export interface UserModel extends Model<IUser> {
  findOrCreate(telegramUser: { id: number; username?: string; first_name?: string }): Promise<UserDocument>;
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema);

