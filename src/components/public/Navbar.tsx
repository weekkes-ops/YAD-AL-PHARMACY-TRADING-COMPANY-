import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Clock, 
  Upload, 
  Bot, 
  ShoppingBag, 
  LogIn, 
  Menu, 
  X, 
  ChevronRight, 
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Pill,
  Search,
  MessageCircle,
  FileCheck2
} from 'lucide-react';
import { PharmacyLogo } from '../PharmacyLogo';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  onOpenPortal: () => void;
  onOpenCart: () => void;
  cartCount: number;
  onOpenPrescription: () => void;
  onOpenAiConsultation: () => void;
}

export function Navbar({
  onNavigate,
  onOpenPortal,
  onOpenCart,
  cartCount,
  onOpenPrescription,
  onOpenAiConsultation,
}: NavbarProps) {
  const { user, staff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigate(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      {/* Top Notification / Emergency Ribbon */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>24/7 Dispensary &amp; Emergency Care</span>
            </div>
            <span className="hidden md:inline text-emerald-700">|</span>
            <div className="flex items-center gap-1.5 text-gray-200">
              <MapPin size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{PHARMACY_CONFIG.address}, Sierra Leone</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-medium">
            <a
              href={`tel:${PHARMACY_CONFIG.primaryPhone}`}
              className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors text-emerald-200"
            >
              <Phone size={12} className="text-emerald-400" />
              <span className="font-mono">{PHARMACY_CONFIG.phoneDisplay}</span>
            </a>
            <span className="text-emerald-700">|</span>
            <a
              href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%20YAD-AL%20PHARMACY%20TRADING%20COMPANY%2C%20I%20have%20an%20inquiry%20regarding%20medications.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-300 hover:text-white transition-colors"
            >
              <MessageCircle size={12} />
              <span>WhatsApp Us</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div 
          onClick={() => handleNavClick('hero')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <PharmacyLogo size="md" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-gray-900 group-hover:text-emerald-700 transition-colors">
                {PHARMACY_CONFIG.name}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wide border border-emerald-200/60">
                <ShieldCheck size={11} /> Freetown, Sierra Leone
              </span>
            </div>
            <span className="text-xs text-gray-500 font-medium hidden sm:block">
              29 Wilberforce Street &bull; Tel: {PHARMACY_CONFIG.phoneDisplay}
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-7 text-sm font-semibold text-gray-600">
          <button
            onClick={() => handleNavClick('hero')}
            className="hover:text-emerald-600 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('services')}
            className="hover:text-emerald-600 transition-colors cursor-pointer"
          >
            Clinical Services
          </button>
          <button
            onClick={() => handleNavClick('catalog')}
            className="hover:text-emerald-600 transition-colors cursor-pointer"
          >
            Medicine Catalog
          </button>
          <button
            onClick={() => handleNavClick('prescription')}
            className="hover:text-emerald-600 transition-colors cursor-pointer flex items-center gap-1 text-emerald-700"
          >
            <Upload size={14} />
            <span>Prescription Refills</span>
          </button>
          <button
            onClick={() => handleNavClick('ai-consultant')}
            className="hover:text-emerald-600 transition-colors cursor-pointer flex items-center gap-1 text-teal-700"
          >
            <Sparkles size={14} className="text-emerald-500" />
            <span>AI Health Assistant</span>
          </button>
          <button
            onClick={() => handleNavClick('booking')}
            className="hover:text-emerald-600 transition-colors cursor-pointer"
          >
            Book Appointment
          </button>
          <button
            onClick={() => handleNavClick('location')}
            className="hover:text-emerald-600 transition-colors cursor-pointer"
          >
            Bo Clinic
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick AI Help button */}
          <button
            onClick={onOpenAiConsultation}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all"
            title="Ask AI Pharmacist"
          >
            <Sparkles size={14} className="text-teal-600" />
            <span>AI Pharmacist</span>
          </button>

          {/* Cart Icon */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale">
                {cartCount}
              </span>
            )}
          </button>

          {/* Staff / Hospital Management Portal Button */}
          <button
            onClick={onOpenPortal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
              staff
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-gray-900 hover:bg-black text-white'
            }`}
          >
            {staff ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>Staff Portal ({staff.name.split(' ')[0]})</span>
              </>
            ) : (
              <>
                <LogIn size={14} className="text-emerald-400" />
                <span>Staff Login</span>
              </>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-100 bg-white px-6 py-5 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-3 font-semibold text-gray-700">
            <button
              onClick={() => handleNavClick('hero')}
              className="text-left py-2 hover:text-emerald-600 border-b border-gray-50"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('services')}
              className="text-left py-2 hover:text-emerald-600 border-b border-gray-50 flex items-center justify-between"
            >
              <span>Clinical Services</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => handleNavClick('catalog')}
              className="text-left py-2 hover:text-emerald-600 border-b border-gray-50 flex items-center justify-between"
            >
              <span>Medicine Catalog</span>
              <Pill size={16} className="text-emerald-500" />
            </button>
            <button
              onClick={() => handleNavClick('prescription')}
              className="text-left py-2 text-emerald-700 hover:text-emerald-800 border-b border-gray-50 flex items-center justify-between"
            >
              <span>Upload Prescription</span>
              <Upload size={16} />
            </button>
            <button
              onClick={() => handleNavClick('ai-consultant')}
              className="text-left py-2 text-teal-700 hover:text-teal-800 border-b border-gray-50 flex items-center justify-between"
            >
              <span>AI Clinical Assistant</span>
              <Sparkles size={16} className="text-teal-500" />
            </button>
            <button
              onClick={() => handleNavClick('booking')}
              className="text-left py-2 hover:text-emerald-600 border-b border-gray-50"
            >
              Book Health Appointment
            </button>
            <button
              onClick={() => handleNavClick('location')}
              className="text-left py-2 hover:text-emerald-600 border-b border-gray-50"
            >
              Freetown Location &amp; Hours
            </button>
            <button
              onClick={() => handleNavClick('health-tips')}
              className="text-left py-2 hover:text-emerald-600"
            >
              Health Articles &amp; Advice
            </button>

            <div className="pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPrescription();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Upload size={15} />
                <span>Upload Doctor's Prescription</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPortal();
                }}
                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <LogIn size={15} className="text-emerald-400" />
                <span>{staff ? 'Open Staff Management Portal' : 'Staff & Pharmacist Login'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
