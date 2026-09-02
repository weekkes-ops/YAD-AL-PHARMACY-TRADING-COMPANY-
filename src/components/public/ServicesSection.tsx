import React from 'react';
import { 
  Pill, 
  HeartPulse, 
  ShieldCheck, 
  Baby, 
  Stethoscope, 
  Truck, 
  Clock, 
  Activity, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Phone
} from 'lucide-react';
import { PHARMACY_CONFIG } from '../../config/pharmacy';

interface ServicesSectionProps {
  onOpenBooking: (serviceName?: string) => void;
  onOpenPrescription: () => void;
}

export function ServicesSection({ onOpenBooking, onOpenPrescription }: ServicesSectionProps) {
  const services = [
    {
      id: 'dispensing',
      icon: Pill,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      title: 'Prescription Dispensing & Counseling',
      description: 'Accurate dispensing of doctor prescriptions with personalized dosage explanations, side-effect counseling, and adherence monitoring.',
      features: ['Genuine certified medications', 'Doctor-pharmacist verification', 'Free dosage schedule advice'],
      action: 'Upload Prescription',
      actionType: 'prescription'
    },
    {
      id: 'chronic-care',
      icon: HeartPulse,
      iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
      title: 'Chronic Illness Care (Hypertension & Diabetes)',
      description: 'Dedicated medication management for chronic conditions with automated monthly refills, blood pressure logs, and blood sugar tracking.',
      features: ['Automated monthly refill reminders', 'Blood pressure tracking cards', 'Diabetic supply kits'],
      action: 'Book Health Review',
      actionType: 'booking'
    },
    {
      id: 'tropical-infections',
      icon: ShieldCheck,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      title: 'Malaria & Tropical Disease Care',
      description: 'WHO-approved Rapid Diagnostic Tests (RDT), Artemisinin-based combination therapies (Coartem), and certified antibiotic treatments.',
      features: ['On-site rapid malaria tests', 'Standardized ACT regimens', 'Post-treatment recovery counseling'],
      action: 'Request Test / Meds',
      actionType: 'booking'
    },
    {
      id: 'maternal-child',
      icon: Baby,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      title: 'Maternal, Infant & Pediatric Care',
      description: 'Specialized healthcare support for expectant mothers, nursing mothers, and infants including pediatric suspensions and nutritional supplements.',
      features: ['Prenatal vitamins & Iron-Folic acid', 'Pediatric syrups & drops', 'Oral Rehydration & Zinc therapy'],
      action: 'Consult Pharmacist',
      actionType: 'booking'
    },
    {
      id: 'diagnostics',
      icon: Stethoscope,
      iconColor: 'text-teal-600 bg-teal-50 border-teal-200',
      title: 'Walk-In Health & Vital Screenings',
      description: 'Quick, walk-in checks for blood pressure, blood glucose, oxygen saturation, and body composition performed by trained clinical staff.',
      features: ['Instant results in 3 minutes', 'Pharmacist interpretation', 'Certified health reports'],
      action: 'Book Screening',
      actionType: 'booking'
    },
    {
      id: 'wholesale',
      icon: Truck,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      title: 'Hospital & Clinic Bulk Supply',
      description: 'Wholesale distribution of essential medicines, surgical consumables, IV infusions, and emergency supplies to clinics and hospitals across Freetown & Sierra Leone.',
      features: ['Bulk trading discount pricing', 'Temperature-controlled storage', 'Prompt city deliveries'],
      action: 'Inquire Bulk Supply',
      actionType: 'booking'
    }
  ];

  return (
    <section id="services" className="py-20 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles size={13} className="text-emerald-600" />
            <span>Clinical Healthcare Excellence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Comprehensive Pharmacy &amp; Trading Services
          </h2>
          <p className="text-base text-gray-600 leading-relaxed">
            From emergency prescription refills to clinical health screenings and wholesale supply, 
            {PHARMACY_CONFIG.name} delivers trusted healthcare at {PHARMACY_CONFIG.address}.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className="bg-gray-50/70 hover:bg-white rounded-3xl p-8 border border-gray-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${srv.iconColor} group-hover:scale-105 transition-transform shrink-0`}>
                      <Icon size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {srv.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    {srv.description}
                  </p>

                  {/* Bullet features */}
                  <div className="space-y-2 mb-8">
                    {srv.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action */}
                <button
                  onClick={() => {
                    if (srv.actionType === 'prescription') {
                      onOpenPrescription();
                    } else {
                      onOpenBooking(srv.title);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white group-hover:bg-emerald-600 group-hover:text-white text-gray-800 font-bold text-xs border border-gray-200 group-hover:border-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{srv.action}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner for Emergency Support */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Clock size={16} />
              <span>24/7 Dispensary &amp; Hospital On-Call</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Have an urgent medication request in Bo tonight?
            </h3>
            <p className="text-sm text-gray-300 max-w-xl">
              Our licensed clinical pharmacists are on standby for hospital referrals, critical antibiotics, and emergency supplies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={`tel:${PHARMACY_CONFIG.emergencyPhone}`}
              className="px-6 py-3.5 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-sm transition-all flex items-center gap-2 shadow-md"
            >
              <Phone size={16} className="text-emerald-700" />
              <span>Call {PHARMACY_CONFIG.emergencyPhone}</span>
            </a>
            <a
              href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=EMERGENCY%20REQUEST%3A%20I%20urgently%20need%20medication%20in%20Bo.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold text-sm transition-all"
            >
              WhatsApp Emergency
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
