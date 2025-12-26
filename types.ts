
export type SaleType = 'dinheiro' | 'divida';

export interface Profile {
  id: string;
  business_name: string;
  pin: string;
  phone: string;
  status: 'trial' | 'active' | 'blocked';
  created_at: string;
}

export interface Customer {
  id: string;
  profile_id: string;
  name: string;
  phone?: string;
  totalDebt: number;
  createdAt: number;
}

export interface Sale {
  id: string;
  profile_id: string;
  amount: number;
  type: SaleType;
  customerId?: string;
  description?: string;
  date: number;
  paid: boolean;
}

export interface AppData {
  sales: Sale[];
  customers: Customer[];
  user: Profile | null;
}
