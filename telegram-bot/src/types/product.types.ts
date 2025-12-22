/**
 * Типы для работы с продуктами
 */

export type ProductCategory = 'it' | 'courses' | 'design' | 'gaming' | 'services' | 'other';

export type ProductFileType = 'link' | 'file' | 'text';

export type ProductStatus = 'active' | 'sold' | 'hidden' | 'moderation';

export interface IProduct {
  _id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  file_url?: string;
  file_type: ProductFileType;
  preview_image?: string;
  sales_count: number;
  views_count: number;
  rating: number;
  reviews_count: number;
  status: ProductStatus;
  is_premium: boolean;
  premium_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ProductDocument extends IProduct {
  incrementViews(): Promise<ProductDocument>;
  incrementSales(): Promise<ProductDocument>;
}

