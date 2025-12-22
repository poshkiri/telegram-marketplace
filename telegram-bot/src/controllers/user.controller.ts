/**
 * Controller для обработки команд пользователя
 * Отвечает за взаимодействие с Telegram API
 */

import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../services/user.service';
import { TelegramUser } from '../types/user.types';
import { handleError } from '../utils/error-handler';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Обработка команды /start
   */
  async handleStart(bot: TelegramBot, chatId: number, telegramUser: TelegramUser): Promise<void> {
    try {
      const user = await this.userService.findOrCreateUser(telegramUser);

      // Если язык не выбран, показываем выбор языка
      if (!user.language) {
        await this.showLanguageSelection(bot, chatId);
        return;
      }

      await this.showMainMenu(bot, chatId, user);
    } catch (error) {
      await handleError(bot, chatId, error);
    }
  }

  /**
   * Показать выбор языка
   */
  async showLanguageSelection(bot: TelegramBot, chatId: number): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇷🇺 Русский', callback_data: 'select_language_ru' },
            { text: '🇬🇧 English', callback_data: 'select_language_en' },
            { text: '🇺🇦 Українська', callback_data: 'select_language_uk' },
          ],
        ],
      },
    };

    const message = '🌍 Выберите язык / Choose language / Оберіть мову:';
    await bot.sendMessage(chatId, message, keyboard);
  }

  /**
   * Обработка выбора языка
   */
  async handleLanguageSelection(
    bot: TelegramBot,
    chatId: number,
    telegramUser: TelegramUser,
    language: 'ru' | 'en' | 'uk'
  ): Promise<void> {
    try {
      await this.userService.updateLanguage(telegramUser.id, language);

      const texts = {
        ru: '✅ Язык выбран!',
        en: '✅ Language selected!',
        uk: '✅ Мову вибрано!',
      };

      await bot.sendMessage(chatId, texts[language]);

      // Показываем главное меню
      const user = await this.userService.getUserProfile(telegramUser.id);
      await this.showMainMenu(bot, chatId, user);
    } catch (error) {
      await handleError(bot, chatId, error);
    }
  }

  /**
   * Показать главное меню
   */
  async showMainMenu(bot: TelegramBot, chatId: number, user: any): Promise<void> {
    const texts = this.getTexts(user.language || 'ru');
    const username = user.first_name || user.username || 'Пользователь';

    const welcomeMessage = texts.welcome(username);
    const keyboard = this.getMainMenuKeyboard(user.language || 'ru');

    await bot.sendMessage(chatId, welcomeMessage, keyboard);
  }

  /**
   * Получить тексты для языка
   */
  private getTexts(lang: string) {
    const texts = {
      ru: {
        welcome: (username: string) =>
          `🛍️ Привет, ${username}!\n\nДобро пожаловать в **Telegram Marketplace**!\n\nЗдесь вы можете:\n• 🛒 Покупать цифровые товары\n• 💼 Продавать свои продукты\n• 💰 Получать оплату в USDT\n\nВыберите действие:`,
        catalog: '🛒 Каталог',
        sell: '💼 Продавать',
        myOrders: '📦 Мои покупки',
        balance: '💰 Мой баланс',
        favorites: '⭐ Избранное',
        help: 'ℹ️ Помощь',
        changeLanguage: '🌍 Язык',
        mainMenu: '🔙 Главное меню',
      },
      en: {
        welcome: (username: string) =>
          `🛍️ Hello, ${username}!\n\nWelcome to **Telegram Marketplace**!\n\nHere you can:\n• 🛒 Buy digital goods\n• 💼 Sell your products\n• 💰 Receive payment in USDT\n\nChoose an action:`,
        catalog: '🛒 Catalog',
        sell: '💼 Sell',
        myOrders: '📦 My Orders',
        balance: '💰 My Balance',
        favorites: '⭐ Favorites',
        help: 'ℹ️ Help',
        changeLanguage: '🌍 Language',
        mainMenu: '🔙 Main Menu',
      },
      uk: {
        welcome: (username: string) =>
          `🛍️ Привіт, ${username}!\n\nЛаскаво просимо до **Telegram Marketplace**!\n\nТут ви можете:\n• 🛒 Купувати цифрові товари\n• 💼 Продавати свої продукти\n• 💰 Отримувати оплату в USDT\n\nОберіть дію:`,
        catalog: '🛒 Каталог',
        sell: '💼 Продавати',
        myOrders: '📦 Мої покупки',
        balance: '💰 Мій баланс',
        favorites: '⭐ Обране',
        help: 'ℹ️ Допомога',
        changeLanguage: '🌍 Мова',
        mainMenu: '🔙 Головне меню',
      },
    };

    return texts[lang as keyof typeof texts] || texts.ru;
  }

  /**
   * Получить клавиатуру главного меню
   */
  private getMainMenuKeyboard(lang: string) {
    const texts = this.getTexts(lang);

    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: texts.catalog, callback_data: 'catalog' },
            { text: texts.sell, callback_data: 'start_selling' },
          ],
          [
            { text: texts.myOrders, callback_data: 'my_orders' },
            { text: texts.favorites, callback_data: 'favorites' },
          ],
          [{ text: texts.balance, callback_data: 'balance' }],
          [
            { text: texts.help, callback_data: 'help' },
            { text: texts.changeLanguage, callback_data: 'change_language' },
          ],
        ],
      },
      parse_mode: 'Markdown' as const,
    };
  }

  /**
   * Показать баланс пользователя
   */
  async showBalance(bot: TelegramBot, chatId: number, telegramUser: TelegramUser): Promise<void> {
    try {
      const user = await this.userService.getUserProfile(telegramUser.id);
      const lang = user.language || 'ru';

      const texts = {
        ru: `💰 Ваш баланс: ${user.balance || 0} USDT`,
        en: `💰 Your balance: ${user.balance || 0} USDT`,
        uk: `💰 Ваш баланс: ${user.balance || 0} USDT`,
      };

      await bot.sendMessage(chatId, texts[lang as keyof typeof texts] || texts.ru);
    } catch (error) {
      await handleError(bot, chatId, error, 'ru');
    }
  }
}

