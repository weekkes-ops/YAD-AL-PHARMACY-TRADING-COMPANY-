import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  ShieldAlert, 
  Sparkles, 
  Copy, 
  Check,
  ArrowRight
} from 'lucide-react';
import { PharmacyLogo } from '../PharmacyLogo';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { useAuth } from '../../context/AuthContext';
import { StaffRole } from '../../types';
import { motion } from 'motion/react';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffLoginModal({ isOpen, onClose, onSuccess }: StaffLoginModalProps) {
  const { login, loginAsStaff } = useAuth();
  const [loginMode, setLoginMode] = useState<'google' | 'direct'>('google');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [staffName, setStaffName] = useState('Administrator');
  const [staffEmail, setStaffEmail] = useState('dgookt@gmail.com');
  const [staffRole, setStaffRole] = useState<StaffRole>(StaffRole.ADMIN);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isUnauthorizedDomainError =
    authError?.toLowerCase().includes('unauthorized-domain') ||
    authError?.toLowerCase().includes('auth/unauthorized-domain');

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await login();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      const errMsg = err?.message || 'Failed to sign in with Google.';
      setAuthError(errMsg);
      if (errMsg.includes('unauthorized-domain')) {
        setLoginMode('direct');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePresetLogin = async (name: string, email: string, role: StaffRole) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginAsStaff(email, name, role);
      onSuccess();
      onClose();
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginAsStaff(staffEmail, staffName, staffRole);
      onSuccess();
      onClose();
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#13161f] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <PharmacyLogo size="md" />
          <div>
            <h2 className="text-xl font-black text-white">Staff Management Portal</h2>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">
              YAD-AL PHARMACY TRADING COMPANY &bull; Freetown
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex bg-gray-900/90 p-1 rounded-xl mb-5 border border-gray-800 text-xs font-semibold">
          <button
            onClick={() => setLoginMode('google')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'google'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Google Account</span>
          </button>
          <button
            onClick={() => setLoginMode('direct')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'direct'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound size={13} />
            <span>Direct Staff Access</span>
          </button>
        </div>

        {/* Error notification */}
        {isUnauthorizedDomainError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2.5">
            <div className="flex items-start gap-2">
              <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Domain needs Firebase authorization. Use Direct Staff Access below for instant entry.
              </p>
            </div>
            <div className="bg-black/40 p-2 rounded-xl flex items-center justify-between gap-2 border border-amber-500/20">
              <span className="font-mono text-[11px] truncate">{currentDomain}</span>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] rounded"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {authError && !isUnauthorizedDomainError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert size={15} />
            <span>{authError}</span>
          </div>
        )}

        {loginMode === 'google' ? (
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLoginMode('direct')}
              className="w-full text-center text-xs text-gray-400 hover:text-emerald-400 py-1 transition-colors flex items-center justify-center gap-1"
            >
              <span>Use 1-Click Role Access</span>
              <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePresetLogin('Administrator', 'dgookt@gmail.com', StaffRole.ADMIN)}
                disabled={isLoggingIn}
                className="p-3 bg-gray-900 hover:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500 rounded-xl text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Admin</span>
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('Lead Pharmacist', 'pharmacist@yadal.sl', StaffRole.PHARMACIST)}
                disabled={isLoggingIn}
                className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Pharmacist</span>
                  <UserCheck size={14} className="text-teal-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Clinical / Dispense</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('POS Cashier', 'cashier@yadal.sl', StaffRole.CASHIER)}
                disabled={isLoggingIn}
                className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Cashier</span>
                  <UserCheck size={14} className="text-blue-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">POS Counter</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetLogin('Store Manager', 'manager@yadal.sl', StaffRole.MANAGER)}
                disabled={isLoggingIn}
                className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Manager</span>
                  <UserCheck size={14} className="text-purple-400" />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Inventory</span>
              </button>
            </div>

            {/* Custom input form */}
            <form onSubmit={handleDirectFormSubmit} className="space-y-3 pt-2 border-t border-gray-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Staff Name</label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={StaffRole.ADMIN}>Admin</option>
                    <option value={StaffRole.MANAGER}>Manager</option>
                    <option value={StaffRole.PHARMACIST}>Pharmacist</option>
                    <option value={StaffRole.CASHIER}>Cashier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <KeyRound size={13} />
                <span>Enter as {staffName}</span>
              </button>
            </form>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-800 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>YAD-AL PHARMACY TRADING COMPANY &bull; Clinical &amp; Inventory Management</span>
        </div>
      </motion.div>
    </div>
  );
}
