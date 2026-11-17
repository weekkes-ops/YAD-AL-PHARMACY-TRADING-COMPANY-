import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Consultation } from './components/Consultation';
import { Customers } from './components/Customers';
import { StaffManagement } from './components/Staff';
import { PharmacyLogo } from './components/PharmacyLogo';
import { PublicWebsite } from './components/public/PublicWebsite';
import { StaffRole } from './types';
import { 
  ShieldAlert, 
  MapPin, 
  Phone, 
  ChevronRight,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  Globe,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PHARMACY_CONFIG } from './config/pharmacy';

function Header({ 
  activeTab, 
  onSwitchToPublic 
}: { 
  activeTab: string; 
  onSwitchToPublic: () => void;
}) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sm:px-8">
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-400 capitalize">SUSSEX PHARMCY Management</span>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="font-bold text-gray-900 capitalize">{activeTab}</span>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 text-sm font-medium">
        {/* Switch back to Public Website Button */}
        <button
          onClick={onSwitchToPublic}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          title="View Live Public Pharmacy Website"
        >
          <Globe size={13} className="text-emerald-600" />
          <span className="hidden sm:inline">View Public Website</span>
          <span className="sm:hidden">Website</span>
        </button>

        <div className="hidden lg:flex items-center text-gray-500 space-x-1.5" title={PHARMACY_CONFIG.address}>
          <MapPin size={15} className="text-emerald-500 shrink-0" />
          <span className="truncate max-w-[180px]">{PHARMACY_CONFIG.address}</span>
        </div>

        <div className="hidden md:block w-px h-4 bg-gray-200" />

        <div className="hidden md:flex items-center text-gray-600 space-x-1.5 font-mono text-xs">
          <Phone size={13} className="text-emerald-500 shrink-0" />
          <span>{PHARMACY_CONFIG.phoneDisplay}</span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center text-emerald-600 space-x-1.5 text-xs font-semibold">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Live Freetown Server</span>
        </div>
      </div>
    </header>
  );
}

function Main() {
  const { user, staff, loading, login, loginAsStaff, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<'public' | 'portal'>('public');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading SUSSEX PHARMCY Freetown Sierra Leone...
          </p>
        </div>
      </div>
    );
  }

  // If in Public view mode, show the stunning modern website
  if (viewMode === 'public') {
    return (
      <PublicWebsite
        onOpenPortal={() => {
          setViewMode('portal');
        }}
      />
    );
  }

  // If in Portal view mode but not logged in, render the login screen with a button to return to public website
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-[#181b24] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewMode('public')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Public Website</span>
            </button>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              Staff Portal
            </span>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <PharmacyLogo size="lg" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{PHARMACY_CONFIG.name}</h1>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mt-1">
                Pharmacy &amp; System Management
              </p>
            </div>
          </div>

          {/* 1-Click Role Presets */}
          <div className="space-y-4">
            <div className="text-xs text-gray-400 font-medium">
              Select a staff profile to sign into the dispensary system:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => loginAsStaff('dgookt@gmail.com', 'Administrator', StaffRole.ADMIN)}
                className="p-3 bg-gray-900/90 hover:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500 rounded-xl text-left transition-all flex flex-col group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400">Admin Portal</span>
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">Full Access Control</span>
              </button>

              <button
                type="button"
                onClick={() => loginAsStaff('pharmacist@sussexpharmcy.sl', 'Lead Pharmacist', StaffRole.PHARMACIST)}
                className="p-3 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-left transition-all flex flex-col group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400">Clinical Pharmacist</span>
                  <UserCheck size={14} className="text-teal-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">Dispensing &amp; RX</span>
              </button>

              <button
                type="button"
                onClick={() => loginAsStaff('cashier@sussexpharmcy.sl', 'POS Cashier', StaffRole.CASHIER)}
                className="p-3 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-left transition-all flex flex-col group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400">POS Cashier</span>
                  <UserCheck size={14} className="text-blue-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">Counter Sales</span>
              </button>

              <button
                type="button"
                onClick={() => loginAsStaff('manager@sussexpharmcy.sl', 'Pharmacy Manager', StaffRole.MANAGER)}
                className="p-3 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-left transition-all flex flex-col group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400">Store Manager</span>
                  <UserCheck size={14} className="text-purple-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">Inventory &amp; Batches</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={login}
                className="w-full py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <KeyRound size={14} className="text-emerald-400" />
                <span>Or Sign in with Google Account</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-800 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Authorized Medical &amp; Clinical Personnel Only</span>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification view
  if (staff && staff.isVerified === false) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-[#181b24] border border-gray-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black mb-2">Account Verification Pending</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Welcome, <strong className="text-white">{staff.name || user.email}</strong>. Your staff registration has been received and is waiting for administrator approval.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('public')}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors"
            >
              Public Website
            </button>
            <button
              onClick={() => signOut()}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Staff Dashboard View
  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onSwitchToPublic={() => setViewMode('public')}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeTab={activeTab} 
          onSwitchToPublic={() => setViewMode('public')}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'inventory' && <Inventory />}
              {activeTab === 'pos' && <POS />}
              {activeTab === 'consultation' && <Consultation />}
              {activeTab === 'customers' && <Customers />}
              {activeTab === 'staff' && <StaffManagement />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}


