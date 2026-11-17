import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Camera, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { PrescriptionSubmission } from '../../types';

interface PrescriptionUploadProps {
  onSuccessToast?: (msg: string) => void;
}

export function PrescriptionUpload({ onSuccessToast }: PrescriptionUploadProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'track'>('upload');
  
  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracking State
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<PrescriptionSubmission | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const generatedRefId = `RX-SSX-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPrescription: PrescriptionSubmission = {
      id: generatedRefId,
      patientName,
      patientPhone,
      patientAge,
      doctorName,
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : PHARMACY_CONFIG.address,
      notes,
      fileName: selectedFile ? selectedFile.name : 'Prescription Slip',
      fileData: selectedFile ? `Uploaded ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'Prescription notes provided',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      // Save in Firestore
      await addDoc(collection(db, 'prescriptions'), {
        ...newPrescription,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not write to remote Firestore, saving to local cache:', err);
    }

    // Save in localStorage for immediate client-side tracking
    try {
      const existing = JSON.parse(localStorage.getItem('sussex_prescriptions') || '[]');
      localStorage.setItem('sussex_prescriptions', JSON.stringify([newPrescription, ...existing]));
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }

    setIsSubmitting(false);
    setSubmittedRef(generatedRefId);
    if (onSuccessToast) {
      onSuccessToast(`Prescription submitted with Ref #${generatedRefId}`);
    }
  };

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingIdInput.trim()) return;

    setIsTracking(true);
    setTrackingError(null);
    setTrackingResult(null);

    const cleanId = trackingIdInput.trim().toUpperCase();

    // Check local storage first
    try {
      const localList: PrescriptionSubmission[] = JSON.parse(localStorage.getItem('sussex_prescriptions') || '[]');
      const foundLocal = localList.find((p) => p.id?.toUpperCase() === cleanId || p.patientPhone === cleanId);
      if (foundLocal) {
        setTrackingResult(foundLocal);
        setIsTracking(false);
        return;
      }
    } catch (e) {
      console.warn(e);
    }

    // Check Firestore
    try {
      const q = query(collection(db, 'prescriptions'), where('id', '==', cleanId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTrackingResult(snap.docs[0].data() as PrescriptionSubmission);
      } else {
        setTrackingError(`No prescription record found for "${cleanId}". Please check your Reference # or Phone Number.`);
      }
    } catch (err: any) {
      setTrackingError('Unable to check status right now. Please call Freetown Dispensary at ' + PHARMACY_CONFIG.primaryPhone);
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <section id="prescription" className="py-20 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Upload size={13} className="text-emerald-600" />
            <span>Fast Digital Dispensing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Prescription Upload &amp; Refill Request
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Snap a photo of your doctor’s prescription slip. Our clinical pharmacists in Freetown will verify the dosage, prepare your medicine, and notify you when ready.
          </p>

          {/* Toggle between Upload and Track */}
          <div className="inline-flex p-1 bg-gray-100 rounded-2xl mt-4 border border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload New Prescription
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Track Existing Order
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          submittedRef ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-lg space-y-6">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-emerald-950">Prescription Received!</h3>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  Thank you, <strong className="text-emerald-950">{patientName}</strong>. Our clinical pharmacist at {PHARMACY_CONFIG.address} is currently reviewing your prescription.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-semibold">Your Tracking Reference:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{submittedRef}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2">
                  <span className="text-gray-500 font-semibold">Contact Phone:</span>
                  <span className="font-mono text-gray-800">{patientPhone}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2">
                  <span className="text-gray-500 font-semibold">Fulfillment Method:</span>
                  <span className="font-bold text-gray-800 capitalize">
                    {deliveryType === 'pickup' ? `In-Store Pickup (${PHARMACY_CONFIG.address})` : `Delivery to ${deliveryAddress || 'Freetown Address'}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSubmittedRef(null);
                    setPatientName('');
                    setPatientPhone('');
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setNotes('');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                >
                  Upload Another Prescription
                </button>
                <a
                  href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%2C%20I%20just%20submitted%20prescription%20Ref%3A%20${submittedRef}.%20Can%20you%20confirm%20it%20is%20received%3F`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-gray-50 text-emerald-900 border border-emerald-200 font-bold text-xs transition-colors"
                >
                  Notify via WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50/80 rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: File Upload & Camera */}
                <div className="lg:col-span-5 space-y-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prescription Photo / Document
                  </label>

                  <div className="relative border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-3xl p-6 text-center bg-white transition-all group flex flex-col items-center justify-center min-h-[260px] cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />

                    {previewUrl ? (
                      <div className="space-y-3 w-full">
                        <img
                          src={previewUrl}
                          alt="Prescription preview"
                          className="max-h-44 mx-auto rounded-xl object-contain border border-gray-200 shadow-xs"
                        />
                        <p className="text-xs font-bold text-emerald-700 truncate">{selectedFile?.name}</p>
                        <span className="text-[11px] text-gray-400">Click or drag to replace image</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto transition-colors">
                          <Camera size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">
                            Upload Prescription Photo or PDF
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Take a photo with your phone or select a file (PNG, JPG, PDF up to 10MB)
                          </p>
                        </div>
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold">
                          Browse Files
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-teal-700 shrink-0 mt-0.5" />
                    <span>
                      All prescription documents are reviewed in strict compliance with Sierra Leone Pharmacy Board standards.
                    </span>
                  </div>
                </div>

                {/* Right Column: Patient Details */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">
                        Patient Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Fatima Koroma"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">
                        Phone Number (SMS / Call) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="e.g. 078386123 or 033327227"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">
                        Patient Age (Optional)
                      </label>
                      <input
                        type="text"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="e.g. 34 years / 4 months"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">
                        Doctor / Clinic Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="e.g. Dr. Sesay (Connaught Hospital, Freetown)"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Delivery or Pickup selection */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">
                      Fulfillment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('pickup')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          deliveryType === 'pickup'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div>In-Store Pickup</div>
                          <div className="text-[10px] text-gray-500 font-normal">{PHARMACY_CONFIG.address}</div>
                        </div>
                        {deliveryType === 'pickup' && <CheckCircle2 size={16} className="text-emerald-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType('delivery')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          deliveryType === 'delivery'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div>Freetown Delivery</div>
                          <div className="text-[10px] text-gray-500 font-normal">Direct to Home/Office</div>
                        </div>
                        {deliveryType === 'delivery' && <CheckCircle2 size={16} className="text-emerald-600" />}
                      </button>
                    </div>
                  </div>

                  {deliveryType === 'delivery' && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">
                        Delivery Address in Freetown *
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g. Near Cotton Tree, Siaka Stevens St, Freetown"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">
                      Medication Notes &amp; Allergies (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Patient is allergic to Penicillin, needs syrup formulation if available..."
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Transmitting to Pharmacist...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Submit Prescription for Dispensing</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )
        ) : (
          /* Track Tab */
          <div className="bg-gray-50/80 rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-md max-w-2xl mx-auto space-y-6">
            <form onSubmit={handleTrackLookup} className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Enter Tracking Reference # or Phone Number
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={trackingIdInput}
                  onChange={(e) => setTrackingIdInput(e.target.value)}
                  placeholder="e.g. RX-SSX-849201 or 078386123"
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isTracking}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                >
                  {isTracking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Check Status</span>
                </button>
              </div>
            </form>

            {trackingError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackingResult && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Reference</span>
                    <h4 className="font-mono font-black text-base text-gray-900">{trackingResult.id}</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                    trackingResult.status === 'ready'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trackingResult.status === 'dispensed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {trackingResult.status === 'pending' ? 'Pharmacist Reviewing' : trackingResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Patient:</span>
                    <p className="font-bold text-gray-800">{trackingResult.patientName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-mono font-bold text-gray-800">{trackingResult.patientPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Fulfillment Method:</span>
                    <p className="font-medium text-gray-800 capitalize">
                      {trackingResult.deliveryType === 'pickup' ? `In-Store Pickup (${PHARMACY_CONFIG.address})` : `Delivery to ${trackingResult.deliveryAddress}`}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 border border-emerald-200/60">
                  <strong>Estimated Status:</strong>{' '}
                  {trackingResult.status === 'ready'
                    ? 'Your medication is prepared and ready for collection at our counter!'
                    : trackingResult.status === 'dispensed'
                    ? 'This prescription order has been completed and collected.'
                    : 'Our dispensary is preparing the dosage. We will call or text your phone when ready.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
