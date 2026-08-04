export type AdminRole = "admin" | "super_admin" | "customer";

export interface Location {
  _id: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRole;
  location?: Location | string;
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  _id?: string;
  label: string;
  material?: string;
  color?: string;
  size?: string;
  price: number;
  stock: number;
  totalStock?: number;
  sku?: string;
  stockByLocation?: {
    locationId: string;
    locationCode?: string;
    locationName?: string;
    stock: number;
  }[];
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  category: Category | string;
  tags?: string[];
  images: string[];
  variants: ProductVariant[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    weight?: number;
  };
  printTime?: string;
  isCustomizable?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  averageRating?: number;
  reviewCount?: number;
  totalSold?: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | "pending"
  | "payment_confirmed"
  | "in_production"
  | "quality_check"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund_initiated"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  _id?: string;
  product?: string | Product;
  variantId?: string;
  title: string;
  variantLabel?: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface TimelineEvent {
  status: string;
  message?: string;
  note?: string;
  at: string;
}

export interface Order {
  _id: string;
  orderId: string;
  user: User | string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  coupon?: { code?: string; discountAmount?: number };
  paymentMethod: "razorpay" | "cod" | "manual_transfer";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  logisticsPartner?: string;
  logisticsTrackingUrl?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  cancelReason?: string;
  location?: Location | string;
  timeline?: TimelineEvent[];
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: "flat" | "percentage";
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  expiresAt: string;
  usageLimit?: number | null;
  usageLimitPerUser?: number;
  applicableTo?: {
    type: "all" | "category" | "product";
    categories?: string[];
    products?: string[];
  };
  isActive: boolean;
  usedCount?: number;
  createdAt?: string;
}

export type CustomOrderStatus =
  | "pending_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "in_production"
  | "shipped"
  | "delivered";

export interface CustomOrder {
  _id: string;
  requestId: string;
  user: User | string;
  description: string;
  referenceImages?: string[];
  preferredMaterial?: string;
  preferredColor?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  quantity: number;
  deadlinePreference?: string;
  budgetRange?: { min?: number; max?: number };
  preferredContact?: "whatsapp" | "email";
  additionalNotes?: string;
  status: CustomOrderStatus;
  quote?: {
    amount?: number;
    estimatedDays?: number;
    adminNote?: string;
    quotedAt?: string;
  };
  timeline?: TimelineEvent[];
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  product: string;
  user: User | string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  helpfulVotes?: number;
  isHidden?: boolean;
  createdAt: string;
}
