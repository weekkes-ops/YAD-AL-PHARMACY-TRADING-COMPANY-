import React from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Mail, 
  MessageCircle, 
  Navigation, 
  CheckCircle2, 
  Building2, 
  ShieldCheck,
  Truck,
  Car
} from 'lucide-react';
import { PHARMACY_CONFIG } from '../../config/pharmacy';

export function LocationContact() {
  return (
    <section id="location" className="py-20 bg-gray-50/70 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <MapPin size={13} className="text-emerald-600" />
            <span>Visit Us in Freetown</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Our Freetown Dispensary &amp; Trading Center
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Conveniently situated at {PHARMACY_CONFIG.address} in central Freetown to serve patients, wholesale partners, and clinics across Sierra Leone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Contact & Hours Details */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-md space-y-6">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <MapPin size={24} />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Physical Address</span>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5">{PHARMACY_CONFIG.address}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Central Freetown, Sierra Leone (29 Wilberforce Street business &amp; commercial district)
                  </p>
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="flex items-start gap-4 border-t border-gray-100 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                  <Phone size={24} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Direct Telephone &amp; Mobile</span>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={`tel:${PHARMACY_CONFIG.primaryPhone}`}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-mono font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>{PHARMACY_CONFIG.primaryPhone}</span>
                    </a>
                    <a
                      href={`tel:${PHARMACY_CONFIG.secondaryPhone}`}
                      className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-mono font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>{PHARMACY_CONFIG.secondaryPhone}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-4 border-t border-gray-100 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp Support &amp; Orders</span>
                  <div className="mt-1">
                    <a
                      href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%20SUSSEX%20PHARMCY%20Freetown%20Sierra%20Leone%2C%20I%20have%20an%20inquiry.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      <span>{PHARMACY_CONFIG.whatsappDisplay}</span>
                      <Navigation size={13} className="rotate-45" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours Table */}
              <div className="border-t border-gray-100 pt-6 space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-600" /> Opening Schedule
                </span>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-600">Monday &ndash; Friday:</span>
                    <span className="font-bold text-gray-900">{PHARMACY_CONFIG.openingHours.weekdays}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                    <span className="font-semibold text-gray-600">Saturday:</span>
                    <span className="font-bold text-gray-900">{PHARMACY_CONFIG.openingHours.saturday}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                    <span className="font-semibold text-gray-600">Sunday:</span>
                    <span className="font-bold text-gray-900">{PHARMACY_CONFIG.openingHours.sunday}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-2 text-emerald-800 font-bold">
                    <span>Emergency Dispensary:</span>
                    <span>24/7 On-Call Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Map Card & Patient Guidelines */}
          <div className="lg:col-span-6 space-y-6">
            {/* Visual Simulated Map Tile */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-md space-y-6">
              <div className="relative h-64 rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-gray-900 overflow-hidden flex flex-col justify-between p-6 text-white border border-gray-800">
                {/* Visual grid / road map pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/20">
                    Freetown, Sierra Leone
                  </div>
                  <span className="text-[11px] text-gray-300 font-mono">GPS: 8.4844° N, 13.2344° W</span>
                </div>

                <div className="relative z-10 flex items-center gap-4 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/40 animate-pulse">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">{PHARMACY_CONFIG.name}</h4>
                    <p className="text-xs text-emerald-300 font-mono">{PHARMACY_CONFIG.address}</p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between text-xs text-gray-300">
                  <span>Accessible via Car, Taxi &amp; Commercial Transit</span>
                  <a
                    href="https://maps.google.com/?q=29+Wilberforce+Street+Freetown+Sierra+Leone"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-300 hover:text-white font-bold transition-colors"
                  >
                    <span>Open in Maps</span>
                    <Navigation size={12} />
                  </a>
                </div>
              </div>

              {/* In-Store Amenities & Payment Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Accepted Payments &amp; In-Store Amenities
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-700">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Orange Money</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Africell Money</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Cash (NLe / SLL)</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <Car size={14} className="text-emerald-600 shrink-0" />
                    <span>Customer Parking</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <Truck size={14} className="text-emerald-600 shrink-0" />
                    <span>Freetown Dispatch</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 font-semibold flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>Licensed Staff</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
