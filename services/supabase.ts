
import { createClient } from '@supabase/supabase-js';
import { Sale, Customer, Profile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dfmtoysfvsmcoaosicky.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbXRveXNmdnNtY29hb3NpY2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzAxMTUsImV4cCI6MjA4MjIwNjExNX0.TInj5oUuV_yU1n8AOnqNYbEdOxU6vZr2dPkuhlZuubY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  async login(phone: string, pin: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .eq('pin', pin)
      .single();

    if (error || !data) return null;
    return data as Profile;
  },

  async checkPhoneExists(phone: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone);
    return data && data.length > 0;
  },

  async createProfile(businessName: string, phone: string, pin: string) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        business_name: businessName,
        phone,
        pin,
        status: 'trial'
      })
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
