
export type ProductCondition = 'nuovo' | 'reso da cliente' | 'packaging rovinato';

export type DropStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'active' 
  | 'inactive' 
  | 'completed' 
  | 'expired' 
  | 'cancelled';

export interface Product {
  id: string;
  supplierId: string;
  supplierName: string;
  listId: string;
  name: string;
  description?: string;
  brand?: string;
  sku?: string;
  imageUrl: string;
  imageUrls: string[];
  originalPrice: number;
  minDiscount: number;
  maxDiscount: number;
  minReservationValue: number;
  maxReservationValue: number;
  category?: string;
  stock?: number;
  sizes?: string[];
  colors?: string[];
  condition?: ProductCondition;
  availableSizes?: string[];
  availableColors?: string[];
}

export interface ProductList {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  minDiscount: number;
  maxDiscount: number;
  minReservationValue: number;
  maxReservationValue: number;
  products: Product[];
  createdAt: Date;
}

export interface UserReservation {
  id: string;
  userId: string;
  productId: string;
  listId: string;
  pickupPoint: string;
  status: 'interested' | 'booked' | 'paid' | 'ready' | 'completed';
  createdAt: Date;
}

export interface Drop {
  id: string;
  listId: string;
  pickupPoint: string;
  supplierName: string;
  currentDiscount: number;
  minDiscount: number;
  maxDiscount: number;
  currentValue: number;
  minValue: number;
  maxValue: number;
  startTime: Date;
  endTime: Date;
  status: DropStatus;
  products: Product[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  pickupPoint: string;
  reservations: UserReservation[];
}
