import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Plus,
  UserRoundCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { PHARMACY_CONFIG } from '../config/pharmacy';
import { PharmacyLogo } from './PharmacyLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchToPublic?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onSwitchToPublic }: SidebarProps) {
  const { staff, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const isAdmin = staff?.role === 'admin';
  const isPharmacist = staff?.role === 'pharmacist';
  const isCashier = staff?.role === 'cashier';
  const isManager = staff?.role === 'manager';
  const isTechnician = staff?.role === 'technician';
  const isViewer = staff?.role === 'viewer';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'pos', label: 'Sales / POS', icon: ShoppingCart, hidden: isViewer },
    { id: 'consultation', label: 'AI Consultation', icon: MessageSquare, hidden: isCashier || isViewer },
    { id: 'customers', label: 'Customers', icon: Users, hidden: isCashier || isViewer },
    { id: 'staff', label: 'Staff Management', icon: UserRoundCog, hidden: !isAdmin && !isManager },
  ].filter(item => !item.hidden);

  return (
    <div className={cn(
      "h-screen bg-[#141414] text-white transition-all duration-300 flex flex-col border-r border-[#333]",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="p-6 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <PharmacyLogo size="sm" />
              <div className="flex flex-col truncate">
                <span className="font-black text-xs uppercase tracking-wider text-emerald-400 truncate">YAD-AL</span>
                <span className="text-[9px] text-gray-400 font-semibold tracking-tighter truncate">Pharmacy Trading Co.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-[#333] rounded-md transition-colors"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-1.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center p-3 rounded-lg transition-all group",
              activeTab === item.id 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "hover:bg-[#222] text-gray-400"
            )}
          >
            <item.icon size={20} className={cn(
              "min-w-[20px]",
              activeTab === item.id ? "text-emerald-400" : "group-hover:text-white"
            )} />
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-4 font-medium text-sm"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {onSwitchToPublic && (
        <div className="px-4 mb-3">
          <button
            onClick={onSwitchToPublic}
            className="w-full flex items-center p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 transition-all text-xs font-semibold"
            title="Switch to Public Website"
          >
            <span className="text-base mr-2">🌐</span>
            {isOpen && <span>View Public Site</span>}
          </button>
        </div>
      )}

      <div className="p-4 border-t border-[#333] mb-2">
        {isOpen ? (
          <div className="flex items-center justify-between px-2">
            <div className="overflow-hidden pr-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Current User</p>
              <p className="text-sm font-medium truncate">{staff?.name || 'Staff'}</p>
              <p className="text-[10px] text-emerald-400 font-mono uppercase font-bold">{staff?.role}</p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#222] rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="w-full flex justify-center p-2 text-gray-400 hover:text-red-400 hover:bg-[#222] rounded-lg transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
