
export type UserRole = 'consumer' | 'supplier' | 'pickup-point';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  pickupPoint?: string;
  reservations?: any[];
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  lists: SupplierList[];
}

export interface SupplierList {
  id: string;
  name: string;
  minDiscount: number;
  maxDiscount: number;
  minOrderValue: number;
  maxOrderValue: number;
  totalListValue: number;
  totalOrderedValue: number;
  totalShippedValue: number;
  createdAt: Date;
  status: 'draft' | 'active' | 'completed';
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  openingHours: string;
  directionsForConsumers: string;
  shippingInstructions: string;
  contactPerson: string;
}
