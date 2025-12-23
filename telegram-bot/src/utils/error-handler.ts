/**
 * Обработчик ошибок для Telegram бота
 */

import TelegramBot from 'node-telegram-bot-api';
import { NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from './errors';

export async function handleError(
  bot: TelegramBot,
  chatId: number,
  error: unknown,
  language: string = 'ru'
): Promise<void> {
  const texts = {
    ru: {
      notFound: '❌ Не найдено',
      validation: '❌ Ошибка валидации',
      unauthorized: '❌ Не авторизован',
      forbidden: '❌ Доступ запрещен',
      serverError: '❌ Произошла ошибка. Попробуйте позже.',
      default: '❌ Произошла ошибка',
    },
    en: {
      notFound: '❌ Not found',
      validation: '❌ Validation error',
      unauthorized: '❌ Unauthorized',
      forbidden: '❌ Forbidden',
      serverError: '❌ An error occurred. Please try again later.',
      default: '❌ An error occurred',
    },
    uk: {
      notFound: '❌ Не знайдено',
      validation: '❌ Помилка валідації',
      unauthorized: '❌ Не авторизовано',
      forbidden: '❌ Доступ заборонено',
      serverError: '❌ Сталася помилка. Спробуйте пізніше.',
      default: '❌ Сталася помилка',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.ru;

  let message = t.default;

  if (error instanceof NotFoundError) {
    message = `${t.notFound}: ${error.message}`;
  } else if (error instanceof ValidationError) {
    message = `${t.validation}: ${error.message}`;
    if (error.fields.length > 0) {
      const fieldsText = language === 'en' ? 'Fields' : language === 'uk' ? 'Поля' : 'Поля';
      message += `\n${fieldsText}: ${error.fields.join(', ')}`;
    }
  } else if (error instanceof UnauthorizedError) {
    message = t.unauthorized;
  } else if (error instanceof ForbiddenError) {
    message = t.forbidden;
  } else if (error instanceof Error) {
    console.error('❌ Error:', error);
    message = t.serverError;
  } else {
    console.error('❌ Unknown error:', error);
    message = t.serverError;
  }

  try {
    await bot.sendMessage(chatId, message);
  } catch (sendError) {
    console.error('❌ Failed to send error message:', sendError);
  }
}

