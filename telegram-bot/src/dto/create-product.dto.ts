/**
 * DTO для создания продукта
 */

import { ProductCategory, ProductFileType } from '../types/product.types';

export class CreateProductDto {
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  file_url?: string;
  file_type: ProductFileType;
  preview_image?: string;

  constructor(data: any) {
    this.validate(data);
    this.title = data.title.trim();
    this.description = data.description.trim();
    this.price = data.price;
    this.category = data.category || 'other';
    this.file_url = data.file_url;
    this.file_type = data.file_type || 'link';
    this.preview_image = data.preview_image;
  }

  private validate(data: any): void {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string');
    }

    if (data.title.length > 200) {
      throw new Error('Title must be less than 200 characters');
    }

    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      throw new Error('Description is required and must be a non-empty string');
    }

    if (data.description.length > 2000) {
      throw new Error('Description must be less than 2000 characters');
    }

    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
      throw new Error('Price must be a positive number');
    }

    if (data.price > 100000) {
      throw new Error('Price must be less than 100000 USDT');
    }

    const validCategories: ProductCategory[] = ['it', 'courses', 'design', 'gaming', 'services', 'other'];
    if (data.category && !validCategories.includes(data.category)) {
      throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
    }

    const validFileTypes: ProductFileType[] = ['link', 'file', 'text'];
    if (data.file_type && !validFileTypes.includes(data.file_type)) {
      throw new Error(`File type must be one of: ${validFileTypes.join(', ')}`);
    }
  }
}

