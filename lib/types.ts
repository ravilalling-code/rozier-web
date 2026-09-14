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

export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_despacho'
  | 'entregado'
  | 'cancelado';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DeliveryZone {
  id: number;
  district: string;
  cost: number;
  active?: boolean;
}

export interface AddOnItem {
  id: string;
  name: string;
  price: number;
  icon?: string;
  image?: string;
}

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number;
  payment_method: string;
  operation_number: string | null;
  voucher_url: string | null;
  delivery_date: string | null;
  recipient_name: string | null;
  delivery_address: string | null;
  delivery_district?: string | null;
  delivery_cost?: number | null;
  delivery_time_slot?: string | null;
  occasion?: string | null;
  special_date?: string | null;
  extra_items?: Array<{ name: string; price: number; quantity: number }> | null;
  dedication_message: string | null;
  status: OrderStatus;
  tracking_code?: string | null;
  created_at?: string;
  customer?: Customer | null;
}

export interface StoreSettings {
  id: number;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  whatsapp_number: string;
  logo_url?: string;
  yape_qr_url?: string;
  updated_at?: string;
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

export interface CategoryBanner {
  id: string;
  title: string;
  badge_text: string;
  image_url: string;
  category_slug: string;
  order_index?: number;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  badge_text: string;
  layout_type: 'carousel' | 'banner';
  images: string[];
  cta_text: string;
  cta_link?: string;
  is_active: boolean;
  updated_at?: string;
}
