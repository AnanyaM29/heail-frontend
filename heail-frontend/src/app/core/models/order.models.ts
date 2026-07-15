export type OrderStatus = 'DRAFT' | 'AGREEMENT_ACCEPTED' | 'PAYMENT_INITIATED' | 'PAID' | 'FAILED' | 'ABANDONED';

export interface Order {
  id: string;
  product: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  agreementAcceptedAt?: string;
  gatewayReference?: string;
  paidAt?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}
