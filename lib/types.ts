export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promotional_price: number | null;
  category: string;
  image_url: string;
  is_active: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  anniversary_date: string | null;
  notes: string | null;
  created_at?: string;
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'en_taller' | 'entregado';

export interface Order {
  id: string;
  customer_id: string | null;
  total_amount: number;
  payment_method: string;
  operation_number: string | null;
  voucher_url: string | null;
  delivery_date: string | null;
  recipient_name: string | null;
  delivery_address: string | null;
  dedication_message: string | null;
  status: OrderStatus;
  created_at?: string;
  customer?: Customer | null;
}

export type ExpenseCategory =
  | 'flores_frescas'
  | 'empaques_bases'
  | 'logistica_delivery'
  | 'fijos'
  | 'publicidad';

export interface Expense {
  id: string;
  concept: string;
  amount: number;
  category: ExpenseCategory | string;
  expense_date: string;
  receipt_url: string | null;
  created_at?: string;
}

export interface OCRResult {
  billetera: 'Yape' | 'Plin' | 'Transferencia';
  monto: number;
  remitente: string;
  numero_operacion: string;
  fecha: string;
}
