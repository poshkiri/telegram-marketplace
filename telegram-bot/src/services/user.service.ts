/**
 * Service для работы с пользователями
 * Содержит бизнес-логику
 */

import { UserRepository } from '../repositories/user.repository';
import { IUser, UserDocument, TelegramUser } from '../types/user.types';
import { UpdateUserDto } from '../dto/update-user.dto';
import { NotFoundError } from '../utils/errors';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Получить профиль пользователя
   */
  async getUserProfile(telegramId: number): Promise<UserDocument> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Найти или создать пользователя из Telegram данных
   */
  async findOrCreateUser(telegramUser: TelegramUser): Promise<UserDocument> {
    return this.userRepository.findOrCreate({
      id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
    });
  }

  /**
   * Обновить данные пользователя
   */
  async updateUser(telegramId: number, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.userRepository.update(user._id, dto);
  }

  /**
   * Обновить язык пользователя
   */
  async updateLanguage(telegramId: number, language: 'ru' | 'en' | 'uk'): Promise<UserDocument> {
    const dto = new UpdateUserDto({ language });
    return this.updateUser(telegramId, dto);
  }

  /**
   * Обновить роль пользователя (стать продавцом)
   */
  async becomeSeller(telegramId: number): Promise<UserDocument> {
    const dto = new UpdateUserDto({ role: 'seller' });
    return this.updateUser(telegramId, dto);
  }

  /**
   * Обновить баланс пользователя
   */
  async updateBalance(telegramId: number, amount: number): Promise<UserDocument> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.userRepository.updateBalance(user._id, amount);
  }

  /**
   * Увеличить счетчик продаж
   */
  async incrementSales(telegramId: number): Promise<void> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    await this.userRepository.incrementSales(user._id);
  }

  /**
   * Увеличить счетчик покупок
   */
  async incrementPurchases(telegramId: number): Promise<void> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    await this.userRepository.incrementPurchases(user._id);
  }
}

