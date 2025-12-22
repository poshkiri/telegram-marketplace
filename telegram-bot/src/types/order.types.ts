/**
 * Типы для работы с заказами
 */

export type PaymentNetwork = 'TRC20' | 'ERC20' | 'BEP20';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export interface IOrder {
  _id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  price: number;
  commission: number;
  payment_address: string;
  payment_network: PaymentNetwork;
  tx_hash?: string;
  status: OrderStatus;
  escrow_until?: Date;
  dispute_reason?: string;
  created_at: Date;
  paid_at?: Date;
  delivered_at?: Date;
  completed_at?: Date;
}

export interface OrderDocument extends IOrder {
  setEscrow(hours?: number): Promise<OrderDocument>;
  isEscrowExpired(): boolean;
}

