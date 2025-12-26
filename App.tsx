
import React, { useState, useEffect, useMemo } from 'react';
import { db } from './services/supabase';
import { formatCurrency, formatDate, formatDateTime } from './services/storage';
import { Sale, Customer, SaleType, Profile } from './types';
import Layout from './components/Layout';
import {
  CheckCircle, X, Wallet, Users, RefreshCcw, ArrowRight, Phone,
  Trash2, Search, TrendingUp, CircleDollarSign, Plus, ReceiptText
} from 'lucide-react';

const DEBIT_CRITICAL_THRESHOLD = 2500;
const SESSION_KEY = 'caderno_session_pin';
const THEME_KEY = 'caderno_theme_pref';

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'resumo' | 'venda' | 'clientes' | 'dividas'>('resumo');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Interface states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDividas, setSearchTermDividas] = useState('');
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [isAddingCustomerStandalone, setIsAddingCustomerStandalone] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Form states
  const [standaloneCustomerName, setStandaloneCustomerName] = useState('');
  const [standaloneCustomerPhone, setStandaloneCustomerPhone] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('dinheiro');
  const [saleDescription, setSaleDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Theme logic
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem(THEME_KEY, newDark ? 'dark' : 'light');
    if (newDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    const savedPin = localStorage.getItem(SESSION_KEY);
    if (savedPin) handleAutoLogin(savedPin);
  }, []);

  const handleAutoLogin = async (savedPin: string) => {
    setLoading(true);
    try {
      const p = await db.getProfileByPin(savedPin);
      if (p) setProfile(p);
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  };

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        db.getCustomers(profile.id),
        db.getSales(profile.id)
      ]);
      setCustomers(c);
      setSales(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) return;
    setValidating(true);
    setLoginError(null);
    try {
      const p = await db.getProfileByPin(pin);
      if (p) {
        setProfile(p);
        localStorage.setItem(SESSION_KEY, p.pin);
        setPin('');
      } else {
        setLoginError('PIN incorreto.');
      }
    } catch (e) {
      setLoginError('Sem conexão.');
    } finally {
      setValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) return;
    setLoading(true);
    try {
      const p = await db.createProfile(newBusinessName);
      setProfile(p);
      localStorage.setItem(SESSION_KEY, p.pin);
      setIsRegistering(false);
      triggerToast('Conta criada!');
    } catch (e) {
      setLoginError('Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setProfile(null);
    localStorage.removeItem(SESSION_KEY);
    setPin('');
    triggerToast('Até breve!');
  };

  const handleAddCustomerStandalone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standaloneCustomerName.trim() || !profile) return;
    setLoading(true);
    try {
      await db.addCustomer({
        id: Date.now().toString(),
        profile_id: profile.id,
        name: standaloneCustomerName.trim(),
        phone: standaloneCustomerPhone.trim() || undefined,
        createdAt: Date.now()
      });
      await loadData();
      setStandaloneCustomerName('');
      setStandaloneCustomerPhone('');
      setIsAddingCustomerStandalone(false);
      triggerToast('Cliente registado!');
    } catch (e) { triggerToast('Erro ao salvar.'); } finally { setLoading(false); }
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(saleAmount);
    if (!saleAmount || isNaN(amount) || amount <= 0 || !profile) return;
    setLoading(true);
    try {
      let customerId = selectedCustomer;
      if (saleType === 'divida' && isAddingNewCustomer) {
        const newCust = { id: Date.now().toString(), profile_id: profile.id, name: newCustomerName.trim(), createdAt: Date.now() };
        await db.addCustomer(newCust);
        customerId = newCust.id;
      }
      const newSale: Sale = { id: Date.now().toString(), profile_id: profile.id, amount, type: saleType, customerId: saleType === 'divida' ? customerId : undefined, description: saleDescription.trim() || undefined, date: Date.now(), paid: saleType === 'dinheiro' };
      await db.addSale(newSale);
      if (saleType === 'divida' && customerId) {
        const currentCustomer = customers.find(c => c.id === customerId);
        if (currentCustomer) await db.updateCustomerDebt(customerId, profile.id, (currentCustomer.totalDebt || 0) + amount);
      }
      await loadData();
      setSaleAmount(''); setSaleType('dinheiro'); setSelectedCustomer(''); setNewCustomerName(''); setIsAddingNewCustomer(false); setSaleDescription('');
      triggerToast('Venda registada!'); setActiveTab('resumo');
    } catch (e) { triggerToast('Erro no registo.'); } finally { setLoading(false); }
  };

  const handlePayment = async (customerId: string) => {
    if (!profile) return;
    const amount = parseFloat(paymentAmount);
    const customer = customers.find(c => c.id === customerId);
    if (!customer || isNaN(amount) || amount <= 0) return;
    setLoading(true);
    try {
      const newDebt = Math.max(0, (customer.totalDebt || 0) - amount);
      await db.updateCustomerDebt(customerId, profile.id, newDebt);
      await loadData();
      setPaymentAmount(''); setViewingCustomerId(null);
      triggerToast('Pagamento registado!');
    } catch (e) { triggerToast('Erro no pagamento.'); } finally { setLoading(false); }
  };
  const handleDeleteSale = async (saleId: string) => {
    if (!profile || !confirm('Tem certeza que deseja apagar esta venda?')) return;

    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    setLoading(true);
    try {
      await db.deleteSale(saleId, profile.id);

      const updatedSales = sales.filter(s => s.id !== saleId);
      setSales(updatedSales);

      if (saleToDelete.type === 'divida' && !saleToDelete.paid && saleToDelete.customerId) {
        const customer = customers.find(c => c.id === saleToDelete.customerId);
        if (customer) {
          const newDebt = Math.max(0, customer.totalDebt - saleToDelete.amount);
          await db.updateCustomerDebt(customer.id, profile.id, newDebt);

          setCustomers(customers.map(c =>
            c.id === customer.id ? { ...c, totalDebt: newDebt } : c
          ));
        }
      }
      triggerToast('Venda apagada com sucesso!');
    } catch (error) {
      console.error(error);
      triggerToast('Erro ao apagar venda.');
    } finally {
      setLoading(false);
    }
  };


  const executeDeleteCustomer = async (id: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      await db.deleteCustomer(id, profile.id);
      await loadData();
      setViewingCustomerId(null);
      setIsConfirmingDelete(false);
      triggerToast('Removido.');
    } catch (e) { triggerToast('Erro ao apagar.'); } finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const todaySales = sales.filter(s => s.date >= today).reduce((acc, s) => acc + s.amount, 0);
    const monthSales = sales.filter(s => s.date >= startOfMonth).reduce((acc, s) => acc + s.amount, 0);
    const totalDebt = customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
    return { todaySales, monthSales, totalDebt };
  }, [sales, customers]);

  const filteredCustomers = useMemo(() => customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [customers, searchTerm]);
  const filteredDebtors = useMemo(() => customers.filter(c => (c.totalDebt || 0) > 0 && c.name.toLowerCase().includes(searchTermDividas.toLowerCase())), [customers, searchTermDividas]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 font-sans safe-top safe-bottom">
        <div className="w-full max-w-sm space-y-12">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-600/20 mb-6">
              <CircleDollarSign size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight italic">DívidaZero</h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold tracking-tight">Saiba quem deve e quanto deve</p>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Introduzir PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="------"
                  className="w-full py-7 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-center text-5xl font-black tracking-[0.4em] focus:border-green-600 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none text-slate-950 dark:text-white"
                  maxLength={6}
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center font-bold">{loginError}</p>}

              <button
                type="submit"
                disabled={validating || pin.length < 4}
                className="w-full py-6 rounded-3xl shadow-xl shadow-green-600/10 text-lg font-black text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all"
              >
                {validating ? <RefreshCcw className="animate-spin mx-auto" /> : 'ENTRAR NA CONTA'}
              </button>

              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="w-full py-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm"
              >
                CRIAR NOVA CONTA
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 page-transition">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Nome do Negócio</label>
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="Ex: Mercearia Mandlate"
                  className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-xl focus:border-green-600 text-slate-950 dark:text-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newBusinessName.trim()}
                className="w-full py-6 rounded-3xl shadow-xl shadow-green-600/10 text-lg font-black text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all"
              >
                {loading ? <RefreshCcw className="animate-spin mx-auto" /> : 'REGISTAR NEGÓCIO'}
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="w-full py-4 text-slate-400 font-bold text-sm"
              >
                VOLTAR
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleWhatsAppNotify = (customer: Customer) => {
    if (!customer.phone) {
      alert('Número não registado.');
      return;
    }
    const message = `Olá ${customer.name}, aqui é da ${profile.business_name}. Notamos o saldo de ${formatCurrency(customer.totalDebt)} pendente no DívidaZero. Obrigado!`;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('258') ? cleanPhone : `258${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Layout activeTab={activeTab} onNavigate={setActiveTab} onLogout={handleLogout} isDark={darkMode} onToggleTheme={toggleTheme}>
      {activeTab === 'resumo' && (
        <div className="space-y-6 page-transition">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{profile.business_name}</h2>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Resumo Financeiro</p>
            </div>
            <button onClick={loadData} className={`p-3 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 ${loading ? 'animate-spin text-green-600' : 'text-slate-300'}`}>
              <RefreshCcw size={20} />
            </button>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
              <TrendingUp size={20} className="text-green-500 mb-2" />
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest block">Hoje</span>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter">{formatCurrency(totals.todaySales)}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
              <CircleDollarSign size={20} className="text-blue-500 mb-2" />
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest block">Mês</span>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter">{formatCurrency(totals.monthSales)}</h3>
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('dividas')}
            className="bg-red-600 p-8 rounded-[2.5rem] shadow-2xl shadow-red-600/20 flex justify-between items-center text-white active:scale-[0.98] transition-all cursor-pointer"
          >
            <div>
              <span className="text-xs font-black uppercase tracking-widest opacity-80 mb-1 block">A Receber</span>
              <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(totals.totalDebt)}</h3>
            </div>
            <div className="bg-white/20 p-4 rounded-3xl">
              <ArrowRight size={28} />
            </div>
          </div>

          <section className="space-y-4 pt-2">
            <h4 className="font-black text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-[0.2em] ml-2">Top Devedores</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
              {customers.filter(c => c.totalDebt > 0).length === 0 ? (
                <div className="w-full text-center text-slate-400 text-xs italic py-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">Nenhum devedor.</div>
              ) : (
                customers
                  .filter(c => c.totalDebt > 0)
                  .sort((a, b) => b.totalDebt - a.totalDebt)
                  .slice(0, 5)
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => setViewingCustomerId(c.id)}
                      className="min-w-[140px] bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm snap-center cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-3 font-black text-sm">
                        {c.name[0].toUpperCase()}
                      </div>
                      <p className="font-black text-slate-950 dark:text-white text-sm truncate">{c.name}</p>
                      <p className="text-red-600 font-black text-xs mt-1">{formatCurrency(c.totalDebt)}</p>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="space-y-4 pt-4">
            <h4 className="font-black text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-[0.2em] ml-2">Movimentação</h4>
            {sales.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-300 dark:text-slate-700 text-sm font-bold tracking-tight">Nenhuma venda registada</p>
              </div>
            ) : sales.slice(0, 5).map(sale => (
              <div key={sale.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm active:bg-slate-50 dark:active:bg-slate-800 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${sale.type === 'dinheiro' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                    {sale.type === 'dinheiro' ? <Wallet size={20} /> : <Users size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-950 dark:text-slate-100 text-sm leading-none">{sale.description || 'Venda'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1.5">{formatDateTime(sale.date)}</p>
                  </div>
                </div>
                <span className={`font-black text-lg ${sale.type === 'dinheiro' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(sale.amount)}
                </span>
              </div>
            ))}
          </section>
        </div>
      )}

      {activeTab === 'venda' && (
        <form onSubmit={handleRegisterSale} className="space-y-6 page-transition">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Lançar Venda</h2>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Qual o valor total?</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-slate-700">MT</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  className="w-full p-8 pl-24 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-green-600 rounded-3xl text-5xl font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSaleType('dinheiro')}
                className={`py-6 rounded-2xl font-black text-xs tracking-widest transition-all border-2 ${saleType === 'dinheiro' ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400 dark:text-slate-600'}`}
              >
                DINHEIRO
              </button>
              <button
                type="button"
                onClick={() => setSaleType('divida')}
                className={`py-6 rounded-2xl font-black text-xs tracking-widest transition-all border-2 ${saleType === 'divida' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400 dark:text-slate-600'}`}
              >
                DÍVIDA
              </button>
            </div>

            {saleType === 'divida' && (
              <div className="space-y-4 bg-red-50/50 dark:bg-red-950/20 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Quem deve?</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                    className="text-[10px] font-black text-red-600 dark:text-red-400 underline uppercase tracking-widest"
                  >
                    {isAddingNewCustomer ? 'CANCELAR' : '+ NOVO CLIENTE'}
                  </button>
                </div>
                {isAddingNewCustomer ? (
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nome do cliente..."
                    className="w-full p-5 bg-white dark:bg-slate-950 border-2 border-red-200 dark:border-red-900/40 rounded-2xl font-black text-slate-950 dark:text-white focus:border-red-500 outline-none"
                    required
                  />
                ) : (
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full p-5 bg-white dark:bg-slate-950 border-2 border-red-200 dark:border-red-900/40 rounded-2xl font-black text-slate-950 dark:text-white focus:border-red-500 outline-none"
                    required
                  >
                    <option value="">Selecionar cliente...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Descrição (O que levou?)</label>
              <input
                type="text"
                value={saleDescription}
                onChange={(e) => setSaleDescription(e.target.value)}
                className="w-full p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-green-600 rounded-3xl font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 outline-none"
                placeholder="Ex: 1kg Arroz, Carvão..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-green-600/30 border-b-8 border-green-800 active:scale-95 active:border-b-4 transition-all"
          >
            {loading ? <RefreshCcw className="animate-spin mx-auto" /> : 'CONFIRMAR AGORA'}
          </button>
        </form>
      )}

      {activeTab === 'clientes' && (
        <div className="space-y-6 page-transition">
          <header className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Clientes</h2>
            <button
              onClick={() => setIsAddingCustomerStandalone(true)}
              className="w-14 h-14 bg-green-600 text-white rounded-[1.5rem] shadow-xl shadow-green-600/20 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus size={32} />
            </button>
          </header>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={22} />
            <input
              type="text"
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-8 py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
            />
          </div>

          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-bold">Nenhum cliente registado.</div>
            ) : filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => setViewingCustomerId(c.id)}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${c.totalDebt > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-950 dark:text-white text-lg leading-tight">{c.name}</p>
                    {c.phone && <p className="text-xs text-slate-400 font-bold tracking-tight">{c.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Dívida</p>
                  <p className={`font-black text-xl tracking-tighter ${c.totalDebt > 0 ? 'text-red-600' : 'text-slate-200 dark:text-slate-800'}`}>
                    {formatCurrency(c.totalDebt || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'dividas' && (
        <div className="space-y-6 page-transition">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dívidas</h2>

          <div className="bg-red-600 p-10 rounded-[3rem] shadow-2xl shadow-red-600/30 text-white relative overflow-hidden mb-8">
            <div className="relative z-10 space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Saldo Devedor Total</p>
              <p className="text-5xl font-black tracking-tighter">{formatCurrency(totals.totalDebt)}</p>
            </div>
            <CircleDollarSign size={160} className="absolute -right-12 -bottom-12 opacity-10 rotate-12" />
          </div>

          <div className="space-y-4">
            {filteredDebtors.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <CheckCircle size={40} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Parabéns! Sem dívidas.</p>
              </div>
            ) : filteredDebtors.map(c => (
              <div
                key={c.id}
                onClick={() => setViewingCustomerId(c.id)}
                className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-transparent dark:border-slate-800 shadow-xl flex justify-between items-center active:scale-[0.97] transition-all cursor-pointer group"
              >
                <div className="space-y-2">
                  <h4 className="font-black text-2xl text-slate-950 dark:text-white leading-tight">{c.name}</h4>
                  <div className="flex gap-2">
                    <span className="bg-red-50 dark:bg-red-900/20 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Deve</span>
                    {c.totalDebt >= DEBIT_CRITICAL_THRESHOLD && <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse">URGENTE</span>}
                  </div>
                </div>
                <div className="text-right space-y-4">
                  <p className="text-3xl font-black text-red-600 tracking-tighter">{formatCurrency(c.totalDebt)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleWhatsAppNotify(c); }}
                    className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-4 rounded-full shadow-lg active:scale-90 transition-all flex items-center justify-center"
                  >
                    <Phone size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS - Estilo Bottom Sheet High Contrast */}
      {viewingCustomerId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center backdrop-blur-md p-4 fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 space-y-8 bottom-sheet shadow-2xl safe-bottom border-t border-slate-100 dark:border-slate-800">
            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto" onClick={() => setViewingCustomerId(null)} />

            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-slate-950 dark:text-white leading-tight">{customers.find(c => c.id === viewingCustomerId)?.name}</h3>
                <p className="text-red-600 font-black text-[10px] uppercase tracking-[0.4em]">Gestão de Cobrança</p>
              </div>
              <button onClick={() => { setViewingCustomerId(null); setPaymentAmount(''); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <X size={28} />
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 p-10 rounded-[2.5rem] text-center border-2 border-red-100/30 dark:border-red-900/20">
              <h4 className="text-6xl font-black text-red-600 tracking-tighter">
                {formatCurrency(customers.find(c => c.id === viewingCustomerId)?.totalDebt || 0)}
              </h4>
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-2">Dívida no DívidaZero</p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Receber Valor</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-grow p-7 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-green-600 rounded-3xl text-4xl font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 outline-none"
                />
                <button
                  onClick={() => handlePayment(viewingCustomerId)}
                  disabled={loading || !paymentAmount}
                  className="w-24 bg-green-600 text-white rounded-3xl font-black shadow-xl shadow-green-600/20 flex items-center justify-center disabled:opacity-50 active:scale-90 transition-all"
                >
                  {loading ? <RefreshCcw size={32} className="animate-spin" /> : <CheckCircle size={40} />}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">O que deve?</label>
              {sales.filter(s => s.customerId === viewingCustomerId && s.type === 'divida' && !s.paid).length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-4 italic">Nenhuma compra em aberto.</p>
              ) : (
                sales.filter(s => s.customerId === viewingCustomerId && s.type === 'divida' && !s.paid)
                  .sort((a, b) => b.date - a.date)
                  .map(sale => (
                    <div key={sale.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800 group">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{sale.description || 'Compra sem descrição'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDateTime(sale.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-black text-red-600">{formatCurrency(sale.amount)}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale.id); }}
                          className="p-2 bg-white dark:bg-slate-900 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  const c = customers.find(x => x.id === viewingCustomerId);
                  if (c) handleWhatsAppNotify(c);
                }}
                className="w-full py-6 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black text-lg rounded-3xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                <Phone size={24} /> ENVIAR COBRANÇA (WA)
              </button>
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-slate-400 dark:text-slate-600 font-black text-[10px] uppercase tracking-widest py-2 active:text-red-500 transition-colors"
              >
                APAGAR DO SISTEMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação Apagar */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-12 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 w-full max-w-xs text-center space-y-8 bottom-sheet shadow-2xl">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-950 dark:text-white leading-tight">Eliminar Cliente?</h3>
              <p className="text-slate-400 font-medium text-sm">Esta operação é irreversível.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => viewingCustomerId && executeDeleteCustomer(viewingCustomerId)} className="w-full py-6 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">SIM, ELIMINAR</button>
              <button onClick={() => setIsConfirmingDelete(false)} className="w-full py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-xs tracking-widest">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Novo Cadastro */}
      {isAddingCustomerStandalone && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center backdrop-blur-md p-4">
          <form onSubmit={handleAddCustomerStandalone} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 space-y-8 bottom-sheet safe-bottom border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Novo Cadastro</h3>
              <button type="button" onClick={() => setIsAddingCustomerStandalone(false)} className="p-3 text-slate-300"><X size={32} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Nome do Cliente</label>
                <input
                  type="text"
                  autoFocus
                  value={standaloneCustomerName}
                  onChange={(e) => setStandaloneCustomerName(e.target.value)}
                  placeholder="Nome completo..."
                  className="w-full p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-green-600 rounded-2xl text-xl font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Telemóvel (Opcional)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={standaloneCustomerPhone}
                  onChange={(e) => setStandaloneCustomerPhone(e.target.value)}
                  placeholder="84 / 82 / 85 / 87"
                  className="w-full p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-green-600 rounded-2xl text-xl font-black text-slate-950 dark:text-white focus:ring-4 focus:ring-green-500/10 outline-none"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-xl shadow-xl shadow-green-600/20 border-b-8 border-green-800 active:scale-95 active:border-b-4 transition-all">
              {loading ? <RefreshCcw className="animate-spin mx-auto" /> : 'REGISTAR CLIENTE'}
            </button>
          </form>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed top-8 left-4 right-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl z-[100] animate-in fade-in slide-in-from-top-12 flex items-center gap-4 border border-white/10 dark:border-slate-100/10 backdrop-blur-xl">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle size={20} className="text-white" />
          </div>
          {toastMessage}
        </div>
      )}
    </Layout>
  );
};

export default App;
