/**
 * Repository для работы с пользователями
 * Отвечает только за работу с базой данных
 */

import { User, UserModel } from '../models/User.model';
import { IUser, UserDocument } from '../types/user.types';
import { UpdateUserDto } from '../dto/update-user.dto';
import { NotFoundError } from '../utils/errors';

export class UserRepository {
  /**
   * Найти пользователя по ID
   */
  async findById(id: string): Promise<UserDocument | null> {
    return User.findById(id);
  }

  /**
   * Найти пользователя по Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return User.findOne({ telegram_id: telegramId });
  }

  /**
   * Найти или создать пользователя
   */
  async findOrCreate(telegramUser: {
    id: number;
    username?: string;
    first_name?: string;
  }): Promise<UserDocument> {
    return (User as UserModel).findOrCreate(telegramUser);
  }

  /**
   * Создать нового пользователя
   */
  async create(data: Partial<IUser>): Promise<UserDocument> {
    return User.create(data);
  }

  /**
   * Обновить пользователя
   */
  async update(id: string, data: UpdateUserDto): Promise<UserDocument> {
    const user = await User.findByIdAndUpdate(id, data, { new: true });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Обновить баланс пользователя
   */
  async updateBalance(id: string, amount: number): Promise<UserDocument> {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.balance += amount;
    return user.save();
  }

  /**
   * Увеличить счетчик продаж
   */
  async incrementSales(id: string): Promise<UserDocument> {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.sales_count += 1;
    return user.save();
  }

  /**
   * Увеличить счетчик покупок
   */
  async incrementPurchases(id: string): Promise<UserDocument> {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.purchases_count += 1;
    return user.save();
  }
}

