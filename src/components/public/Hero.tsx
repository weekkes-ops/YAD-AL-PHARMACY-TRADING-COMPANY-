import React, { useState } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Upload, 
  Sparkles, 
  PhoneCall, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Pill, 
  HeartHandshake, 
  Truck, 
  Stethoscope,
  Activity,
  Award
} from 'lucide-react';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { motion } from 'motion/react';

interface HeroProps {
  onSearch: (query: string) => void;
  onOpenPrescription: () => void;
  onOpenAiConsultant: () => void;
  onNavigateToCatalog: () => void;
  onNavigateToBooking: () => void;
}

export function Hero({
  onSearch,
  onOpenPrescription,
  onOpenAiConsultant,
  onNavigateToCatalog,
  onNavigateToBooking,
}: HeroProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  const popularSearches = [
    'Coartem',
    'Amoxicillin',
    'Paracetamol',
    'Metformin',
    'Amlodipine',
    'Multivitamins',
    'Ventolin Inhaler'
  ];

  return (
    <div className="relative bg-gradient-to-b from-emerald-50/60 via-white to-gray-50/80 pt-8 pb-16 sm:pt-12 sm:pb-24 overflow-hidden">
      {/* Background ambient medical glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Core Message & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pharmacy Accreditation Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/60 text-emerald-900 text-xs font-bold shadow-xs">
              <Award size={14} className="text-emerald-700" />
              <span>Licensed Clinical Pharmacy &amp; Trading Dispensary</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-700">{PHARMACY_CONFIG.address}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.12]">
              Trusted Medicines. <br />
              <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text text-transparent">
                Expert Clinical Care
              </span> <br />
              For You and Your Family.
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed mx-auto lg:mx-0 font-normal">
              Serving the community of Freetown and Sierra Leone with 100% genuine certified pharmaceuticals, 
              rapid prescription dispensing, wholesale medical trading, AI clinical guidance, and comprehensive family care.
            </p>

            {/* Quick Search & Stock Checker Bar */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto lg:mx-0">
              <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-gray-200/80 p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <Search size={20} className="text-gray-400 ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search medication, active ingredient or condition (e.g. Coartem, Blood Pressure)..."
                  className="w-full px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <span>Search</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Popular tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3 text-xs text-gray-500 justify-center lg:justify-start">
                <span className="font-semibold text-gray-400">Popular:</span>
                {popularSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSearchInput(item);
                      onSearch(item);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-gray-100/80 hover:bg-emerald-100 hover:text-emerald-800 text-gray-600 transition-colors text-[11px] font-medium"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </form>

            {/* Call to action buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onOpenPrescription}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                <Upload size={16} />
                <span>Upload Doctor's Prescription</span>
              </button>

              <button
                onClick={onOpenAiConsultant}
                className="px-5 py-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100/80 active:scale-[0.98] text-teal-800 border border-teal-200 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} className="text-teal-600" />
                <span>Ask AI Health Assistant</span>
              </button>

              <a
                href={`tel:${PHARMACY_CONFIG.primaryPhone}`}
                className="px-4 py-3.5 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-sm transition-all flex items-center gap-2"
              >
                <PhoneCall size={16} className="text-emerald-600" />
                <span className="font-mono text-xs sm:text-sm">Call {PHARMACY_CONFIG.primaryPhone}</span>
              </a>
            </div>

            {/* Key Trust Checkmarks */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-left text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>100% Genuine Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Licensed Pharmacists</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Freetown Delivery &amp; Pickup</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Feature Card & Quick Action Grid */}
          <div className="lg:col-span-5 space-y-4">
            {/* Primary Highlight Card */}
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-800/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Stethoscope size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{PHARMACY_CONFIG.shortName}</h3>
                    <p className="text-xs text-emerald-300 font-mono">{PHARMACY_CONFIG.address}</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                  Open Today
                </div>
              </div>

              {/* Operating status & emergency line */}
              <div className="space-y-3.5 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-400" /> Regular Hours:
                  </span>
                  <span className="font-semibold text-white">{PHARMACY_CONFIG.openingHours.weekdays}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-400" /> Direct Phone Line:
                  </span>
                  <span className="font-mono font-bold text-emerald-300">{PHARMACY_CONFIG.primaryPhone}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-400" /> City &amp; Area:
                  </span>
                  <span className="font-semibold text-white">Freetown, Sierra Leone</span>
                </div>
              </div>

              {/* 3 Quick Hub Action Tiles */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={onNavigateToCatalog}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 transition-all text-left border border-white/10 group cursor-pointer"
                >
                  <Pill size={20} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-bold text-xs text-white">Browse Medicine</div>
                  <div className="text-[10px] text-gray-300 mt-0.5">Check Prices &amp; Stock</div>
                </button>

                <button
                  onClick={onNavigateToBooking}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 transition-all text-left border border-white/10 group cursor-pointer"
                >
                  <HeartHandshake size={20} className="text-teal-300 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-bold text-xs text-white">Health Screenings</div>
                  <div className="text-[10px] text-gray-300 mt-0.5">BP, Sugar &amp; Tests</div>
                </button>
              </div>
            </div>

            {/* Quick Delivery / Support Banner */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Direct Prescription Delivery in Freetown</h4>
                  <p className="text-[11px] text-gray-500">Need medicines brought to your door? Order via phone or online.</p>
                </div>
              </div>
              <a
                href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%2C%20I%20would%20like%20to%20order%20medications%20for%20delivery%20in%20Freetown.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
              >
                Order Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
