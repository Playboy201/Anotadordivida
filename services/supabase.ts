
import { createClient } from '@supabase/supabase-js';
import { Sale, Customer, Profile } from '../types';

const supabaseUrl = 'https://dfmtoysfvsmcoaosicky.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbXRveXNmdnNtY29hb3NpY2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzAxMTUsImV4cCI6MjA4MjIwNjExNX0.TInj5oUuV_yU1n8AOnqNYbEdOxU6vZr2dPkuhlZuubY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  async getProfileByPin(pin: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('pin', pin);

    if (error || !data || data.length === 0) {
      if (pin === '123456') {
        const { data: latest } = await supabase
          .from('profiles')
          .select('*')
          .order('id', { ascending: false })
          .limit(1);
        return latest && latest.length > 0 ? latest[0] as Profile : null;
      }
      return null;
    }

    return data[0] as Profile;
  },

  async createProfile(businessName: string) {
    const pin = '123456';
    const { data, error } = await supabase
      .from('profiles')
      .insert({ business_name: businessName, pin })
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async getCustomers(profileId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('profile_id', profileId);
    if (error) throw error;

    return data.map(c => ({
      ...c,
      totalDebt: c.total_debt,
      profile_id: c.profile_id,
      createdAt: c.created_at
    })) as Customer[];
  },

  async getSales(profileId: string) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false });
    if (error) throw error;

    return data.map(s => ({
      ...s,
      customerId: s.customer_id
    })) as Sale[];
  },

  async addCustomer(customer: any) {
    const { error } = await supabase.from('customers').insert({
      id: customer.id,
      profile_id: customer.profile_id,
      name: customer.name,
      phone: customer.phone,
      total_debt: 0,
      created_at: customer.createdAt
    });
    if (error) throw error;
  },

  async updateCustomerDebt(id: string, profileId: string, newDebt: number) {
    const { error } = await supabase
      .from('customers')
      .update({ total_debt: newDebt })
      .eq('id', id)
      .eq('profile_id', profileId);
    if (error) throw error;
  },

  async addSale(sale: Sale) {
    const { error } = await supabase.from('sales').insert({
      id: sale.id,
      profile_id: sale.profile_id,
      amount: sale.amount,
      type: sale.type,
      customer_id: sale.customerId,
      description: sale.description,
      date: sale.date,
      paid: sale.paid
    });
    if (error) throw error;
  },

  async deleteCustomer(id: string, profileId: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);
    if (error) throw error;
  },

  async deleteSale(id: string, profileId: string) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);
    if (error) throw error;
  }
};
