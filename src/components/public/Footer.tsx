import React from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  MessageCircle, 
  ShieldCheck, 
  Award, 
  Heart, 
  LogIn, 
  Upload, 
  Sparkles,
  Pill,
  ChevronRight
} from 'lucide-react';
import { PharmacyLogo } from '../PharmacyLogo';
import { PHARMACY_CONFIG } from '../../config/pharmacy';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenPortal: () => void;
  onOpenPrescription: () => void;
  onOpenAiConsultant: () => void;
}

export function Footer({
  onNavigate,
  onOpenPortal,
  onOpenPrescription,
  onOpenAiConsultant,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-emerald-950 text-white pt-16 pb-12 border-t border-emerald-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-gray-800">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <PharmacyLogo size="md" />
              <div>
                <h3 className="font-black text-xl text-white tracking-tight">{PHARMACY_CONFIG.name}</h3>
                <p className="text-xs text-emerald-400 font-medium">Freetown, Sierra Leone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Sierra Leone's premier clinical pharmacy and healthcare trading enterprise. Providing 100% genuine certified medications, 
              rapid prescription dispensing, AI clinical guidance, and wholesale supplies across Freetown and nationwide.
            </p>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck size={16} />
                <span>Pharmacy Board of Sierra Leone Standards</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Licensed pharmaceutical dispensary strictly complying with national drug quality, storage, and clinical dispensing protocols.
              </p>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-medium text-gray-300">
              <li>
                <button
                  onClick={() => onNavigate('hero')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('services')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Clinical Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Medicine Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('prescription')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Upload Prescription
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('ai-consultant')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  AI Clinical Assistant
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('booking')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Book Screening
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('location')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Location &amp; Hours
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Services & Health */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Dispensary Services
            </h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-emerald-500" />
                <span>Prescription Verification &amp; Refills</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-emerald-500" />
                <span>Malaria Rapid Testing &amp; ACT Treatment</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-emerald-500" />
                <span>Hypertension &amp; Diabetes Monitoring</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-emerald-500" />
                <span>Maternal, Infant &amp; Child Care</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-emerald-500" />
                <span>Hospital Bulk Consumables &amp; Supplies</span>
              </li>
              <li className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <ChevronRight size={12} className="text-emerald-400" />
                <span>24/7 Night Emergency On-Call</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Freetown Center */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Freetown Center &amp; Trading
            </h4>
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{PHARMACY_CONFIG.address}, Sierra Leone</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone size={14} className="text-emerald-400 shrink-0" />
                <a href={`tel:${PHARMACY_CONFIG.primaryPhone}`} className="hover:text-emerald-300 font-mono">
                  {PHARMACY_CONFIG.phoneDisplay}
                </a>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-mono text-emerald-300"
                >
                  WhatsApp: {PHARMACY_CONFIG.whatsappDisplay}
                </a>
              </div>

              <div className="flex items-start gap-2 pt-1 border-t border-gray-800 text-[11px] text-gray-400">
                <Clock size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Mon-Sat: 7:30 AM &ndash; 10:00 PM | Sun: 9:00 AM &ndash; 8:00 PM</span>
              </div>

              {/* Staff Management Portal Access */}
              <div className="pt-3">
                <button
                  onClick={onOpenPortal}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  <LogIn size={13} className="text-emerald-400" />
                  <span>SUSSEX PHARMCY Management Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>&copy; {currentYear} {PHARMACY_CONFIG.name}. All rights reserved. Freetown, Sierra Leone.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Licensed Dispensary &amp; Trading</span>
            <span>&bull;</span>
            <span>29 Wilberforce Street, Freetown</span>
            <span>&bull;</span>
            <span className="text-emerald-400">Health &amp; Wellness Partner</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
