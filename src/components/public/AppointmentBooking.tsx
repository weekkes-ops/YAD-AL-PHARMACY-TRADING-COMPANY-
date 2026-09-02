import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  HeartPulse, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  MapPin,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { ClinicAppointment } from '../../types';

interface AppointmentBookingProps {
  initialService?: string;
  onSuccessToast?: (msg: string) => void;
}

export function AppointmentBooking({ initialService, onSuccessToast }: AppointmentBookingProps) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [serviceType, setServiceType] = useState(initialService || 'Blood Pressure & Cardiovascular Screening');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ClinicAppointment | null>(null);

  const availableServices = [
    'Blood Pressure & Cardiovascular Screening',
    'Blood Glucose & Diabetic Check',
    'Malaria Rapid Diagnostic Test (RDT)',
    'Full Medication & Dosage Review with Pharmacist',
    'Maternal & Pediatric Wellness Check',
    'Wound Dressing & First Aid Care',
    'Injectables & Immunization Support'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) return;

    setIsSubmitting(true);
    const appointmentId = `APT-YAD-${Math.floor(10000 + Math.random() * 90000)}`;

    const newAppointment: ClinicAppointment = {
      id: appointmentId,
      patientName,
      patientPhone,
      serviceType,
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      preferredTime,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore appointment note:', err);
    }

    try {
      const stored = JSON.parse(localStorage.getItem('yadal_appointments') || '[]');
      localStorage.setItem('yadal_appointments', JSON.stringify([newAppointment, ...stored]));
    } catch (e) {
      console.warn(e);
    }

    setIsSubmitting(false);
    setConfirmedBooking(newAppointment);
    if (onSuccessToast) {
      onSuccessToast(`Appointment scheduled! Ref #${appointmentId}`);
    }
  };

  return (
    <section id="booking" className="py-20 bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <HeartPulse size={13} className="text-emerald-600" />
            <span>Clinical Care in Freetown</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Schedule a Health Screening or Consultation
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Book an in-person check-up with our licensed clinical pharmacists at {PHARMACY_CONFIG.address}. 
            Walk-ins are also welcome 7 days a week.
          </p>
        </div>

        {confirmedBooking ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xl space-y-6">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-emerald-950">Appointment Scheduled!</h3>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                Thank you, <strong className="text-emerald-950">{confirmedBooking.patientName}</strong>. Our clinical team at {PHARMACY_CONFIG.address} has reserved your screening slot.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-semibold">Appointment ID:</span>
                <span className="font-mono font-bold text-emerald-700">{confirmedBooking.id}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-semibold">Service:</span>
                <span className="font-bold text-gray-800">{confirmedBooking.serviceType}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-semibold">Scheduled Date:</span>
                <span className="font-bold text-gray-800">{confirmedBooking.preferredDate}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-semibold">Time Slot:</span>
                <span className="font-bold text-gray-800">{confirmedBooking.preferredTime}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-semibold">Location:</span>
                <span className="font-medium text-gray-800">{PHARMACY_CONFIG.address}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setPatientName('');
                  setPatientPhone('');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                Book Another Screening
              </button>

              <a
                href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%2C%20I%20have%20scheduled%20appointment%20${confirmedBooking.id}%20for%20${encodeURIComponent(confirmedBooking.serviceType)}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-gray-50 text-emerald-950 border border-emerald-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={15} />
                <span>Confirm on WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-50/90 rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-md space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ibrahim Kamara"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Phone Number (Call/SMS) *
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. 078386123 or 033327227"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Select Clinical Service *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {availableServices.map((srv, idx) => (
                  <option key={idx} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Preferred Time Window
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                  <option value="Evening (4:00 PM - 8:00 PM)">Evening (4:00 PM - 8:00 PM)</option>
                  <option value="Flexible / Any Time">Flexible / Any Time</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Special Health Notes or Symptoms (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. History of diabetes, feeling dizzy in the morning, requesting rapid malaria test..."
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Reserving Slot...</span>
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  <span>Confirm Clinical Appointment</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
