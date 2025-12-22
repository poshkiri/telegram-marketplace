/**
 * Типы для работы с пользователями
 */

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot: boolean;
  language_code?: string;
}

export type UserRole = 'buyer' | 'seller' | 'admin';

export type Language = 'ru' | 'en' | 'uk';

export interface IUser {
  _id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  role: UserRole;
  wallet_address?: string;
  balance: number;
  rating: number;
  sales_count: number;
  purchases_count: number;
  is_verified: boolean;
  is_blocked: boolean;
  created_at: Date;
  last_active: Date;
  language?: Language;
}

export interface UserDocument extends IUser {
  updateActivity(): Promise<UserDocument>;
}

