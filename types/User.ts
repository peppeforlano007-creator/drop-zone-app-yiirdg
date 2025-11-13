
export type UserRole = 'consumer' | 'supplier' | 'pickup-point' | 'admin';

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
  businessName?: string;
  vatNumber?: string;
  address: string;
  city: string;
  postalCode?: string;
  province?: string;
  region?: string;
  phone: string;
  alternativePhone?: string;
  email: string;
  contactPerson: string;
  openingHours: string;
  storageCapacity?: string;
  directionsForConsumers: string;
  shippingInstructions: string;
  parkingAvailable?: boolean;
  wheelchairAccessible?: boolean;
  iban?: string;
  bankName?: string;
  accountHolder?: string;
  commissionPerOrder: number;
  totalEarnings: number;
  totalOrdersDelivered: number;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
}

export interface PickupPointOrder {
  id: string;
  orderNumber: string;
  pickupPointId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  products: OrderProduct[];
  totalValue: number;
  commission: number;
  status: 'in-transit' | 'arrived' | 'ready-for-pickup' | 'completed';
  arrivalDate?: Date;
  pickupDate?: Date;
  daysInStorage: number;
  createdAt: Date;
}

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PickupPointEarnings {
  id: string;
  pickupPointId: string;
  month: string;
  year: number;
  ordersDelivered: number;
  totalCommission: number;
  status: 'pending' | 'processing' | 'paid';
  paymentDate?: Date;
  createdAt: Date;
}
