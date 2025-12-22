/**
 * DTO для обновления пользователя
 */

import { Language, UserRole } from '../types/user.types';

export class UpdateUserDto {
  username?: string;
  first_name?: string;
  language?: Language;
  role?: UserRole;
  wallet_address?: string;

  constructor(data: any) {
    if (data.username !== undefined) {
      if (typeof data.username !== 'string') {
        throw new Error('Username must be a string');
      }
      this.username = data.username.trim() || undefined;
    }

    if (data.first_name !== undefined) {
      if (typeof data.first_name !== 'string') {
        throw new Error('First name must be a string');
      }
      this.first_name = data.first_name.trim() || undefined;
    }

    if (data.language !== undefined) {
      const validLanguages: Language[] = ['ru', 'en', 'uk'];
      if (!validLanguages.includes(data.language)) {
        throw new Error(`Language must be one of: ${validLanguages.join(', ')}`);
      }
      this.language = data.language;
    }

    if (data.role !== undefined) {
      const validRoles: UserRole[] = ['buyer', 'seller', 'admin'];
      if (!validRoles.includes(data.role)) {
        throw new Error(`Role must be one of: ${validRoles.join(', ')}`);
      }
      this.role = data.role;
    }

    if (data.wallet_address !== undefined) {
      if (typeof data.wallet_address !== 'string') {
        throw new Error('Wallet address must be a string');
      }
      this.wallet_address = data.wallet_address.trim() || undefined;
    }
  }
}

