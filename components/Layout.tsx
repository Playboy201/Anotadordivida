
import React from 'react';
import { LayoutDashboard, ReceiptText, Users2, CircleDollarSign, LogOut, Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'resumo' | 'venda' | 'clientes' | 'dividas';
  onNavigate: (tab: 'resumo' | 'venda' | 'clientes' | 'dividas') => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, onLogout, isDark, onToggleTheme }) => {
  return (
    <div className="flex flex-col min-h-screen pb-24 dark:bg-slate-950">
      <header className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-40 flex justify-between items-center safe-top backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-600/20">
            <CircleDollarSign size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight italic">DívidaZero</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleTheme}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full transition-all active:scale-90"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={onLogout} 
            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full active:scale-90 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-grow p-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center py-3 px-2 safe-bottom z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <NavItem 
          active={activeTab === 'resumo'} 
          onClick={() => onNavigate('resumo')} 
          icon={<LayoutDashboard size={22} />} 
          label="Início" 
        />
        <NavItem 
          active={activeTab === 'venda'} 
          onClick={() => onNavigate('venda')} 
          icon={<ReceiptText size={22} />} 
          label="Venda" 
        />
        <NavItem 
          active={activeTab === 'clientes'} 
          onClick={() => onNavigate('clientes')} 
          icon={<Users2 size={22} />} 
          label="Clientes" 
        />
        <NavItem 
          active={activeTab === 'dividas'} 
          onClick={() => onNavigate('dividas')} 
          icon={<CircleDollarSign size={22} />} 
          label="Dívidas" 
        />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center py-1 flex-1 transition-all duration-300 ${active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
  >
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-green-50 dark:bg-green-900/20 shadow-sm' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] mt-1 font-bold tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>
      {label}
    </span>
  </button>
);

export default Layout;
