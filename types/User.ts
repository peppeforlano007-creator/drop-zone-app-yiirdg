
export type UserRole = 'consumer' | 'supplier' | 'pickup_point' | 'admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  phone?: string;
  pickupPoint?: string;
  pickupPointId?: string;
  reservations?: string[];
}
