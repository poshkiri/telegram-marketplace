/**
 * Типы для Telegram бота
 */

import { TelegramUser } from './user.types';

export interface UserState {
  action: string;
  step?: string;
  data?: Record<string, any>;
  orderId?: string;
  rating?: number;
  orderAmount?: number;
}

export interface BotContext {
  chatId: number;
  user: TelegramUser;
  messageId?: number;
  language?: string;
}

export interface CallbackQueryData {
  action: string;
  [key: string]: string | number | undefined;
}

