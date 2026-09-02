import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Pill, 
  ShoppingBag, 
  Check, 
  Info, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  Plus, 
  Minus,
  MessageCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Medication, PublicCartItem } from '../../types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { motion, AnimatePresence } from 'motion/react';

interface MedicineCatalogProps {
  initialSearch?: string;
  onAddToCart: (med: Medication, quantity: number) => void;
  onOpenPrescriptionUpload: () => void;
  onOpenAiConsultant: () => void;
}

export function MedicineCatalog({
  initialSearch = '',
  onAddToCart,
  onOpenPrescriptionUpload,
  onOpenAiConsultant,
}: MedicineCatalogProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterPrescriptionOnly, setFilterPrescriptionOnly] = useState(false);
  const [selectedMedModal, setSelectedMedModal] = useState<Medication | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [addedNotification, setAddedNotification] = useState<string | null>(null);

  // Sync initialSearch if prop changes
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  // Load medications from Firestore or fallback to sampleMedications
  useEffect(() => {
    try {
      const q = query(collection(db, 'medications'), orderBy('name'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetchedMeds: Medication[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Medication[];
            setMedications(fetchedMeds);
          } else {
            // Use pre-seeded pharmaceutical catalog
            setMedications(PHARMACY_CONFIG.sampleMedications as unknown as Medication[]);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Using local catalog fallback due to snapshot notice:', error);
          setMedications(PHARMACY_CONFIG.sampleMedications as unknown as Medication[]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      setMedications(PHARMACY_CONFIG.sampleMedications as unknown as Medication[]);
      setLoading(false);
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    medications.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [medications]);

  const filteredMedications = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch =
        searchTerm === '' ||
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (med.genericName && med.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (med.description && med.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        med.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || med.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [medications, searchTerm, selectedCategory]);

  const handleQuickAdd = (med: Medication, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(med, 1);
    setAddedNotification(`Added ${med.name} to cart`);
    setTimeout(() => setAddedNotification(null), 2500);
  };

  const handleOpenDetailModal = (med: Medication) => {
    setSelectedMedModal(med);
    setModalQuantity(1);
  };

  return (
    <section id="catalog" className="py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Pill size={13} className="text-emerald-600" />
              <span>Certified Medicine Directory</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Medicines &amp; Clinical Supplies
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl">
              Browse our authentic, quality-tested medicines available at {PHARMACY_CONFIG.address}. 
              Order for in-store pickup or local Freetown delivery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenPrescriptionUpload}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <FileText size={14} />
              <span>Submit Doctor's Prescription</span>
            </button>

            <button
              onClick={onOpenAiConsultant}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-teal-600" />
              <span>Ask Drug Dosage</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-200/80 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medication name, active ingredient or purpose (e.g. Paracetamol, Coartem, Blood Pressure)..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Total Results Count */}
            <div className="text-xs text-gray-500 font-semibold shrink-0">
              Showing <span className="text-gray-900 font-bold">{filteredMedications.length}</span> medications
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading authentic medicines...</p>
          </div>
        ) : filteredMedications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-200 p-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Pill size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No medications matched "{searchTerm}"</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-6">
              We stock hundreds of additional pharmaceuticals and medical supplies at {PHARMACY_CONFIG.address}. Contact our dispensary directly to check off-shelf stock.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Clear Filters
              </button>
              <a
                href={`tel:${PHARMACY_CONFIG.primaryPhone}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Call Bo Dispensary
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedications.map((med) => {
              const isLowStock = med.stockLevel <= 5;
              const isOutOfStock = med.stockLevel <= 0;

              return (
                <div
                  key={med.id}
                  onClick={() => handleOpenDetailModal(med)}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col justify-between cursor-pointer group relative"
                >
                  <div>
                    {/* Top Tag & Stock Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wide uppercase">
                        {med.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                          Only {med.stockLevel} left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                          <Check size={10} /> In Stock
                        </span>
                      )}
                    </div>

                    {/* Drug Title & Generic Info */}
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {med.name}
                    </h3>
                    {med.genericName && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5 line-clamp-1">
                        {med.genericName}
                      </p>
                    )}

                    {med.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                        {med.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-5 mt-4 border-t border-gray-100">
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Unit Price</span>
                        <span className="text-lg font-black text-gray-900 font-mono">
                          NLe {med.price.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 capitalize">
                        Per {med.unit || 'unit'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(med, e)}
                        disabled={isOutOfStock}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ShoppingBag size={14} />
                        <span>Add to Cart</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(med);
                        }}
                        className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-colors"
                        title="View Full Details"
                      >
                        <Info size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notification Toast */}
        <AnimatePresence>
          {addedNotification && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-gray-800"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Check size={12} />
              </div>
              <span>{addedNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drug Detail Modal */}
        <AnimatePresence>
          {selectedMedModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-200 relative overflow-hidden"
              >
                <button
                  onClick={() => setSelectedMedModal(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-3 border border-emerald-200">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>{selectedMedModal.category}</span>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-1">
                  {selectedMedModal.name}
                </h3>
                {selectedMedModal.genericName && (
                  <p className="text-xs font-mono text-emerald-700 font-semibold mb-4">
                    Active: {selectedMedModal.genericName}
                  </p>
                )}

                <div className="space-y-4 text-xs text-gray-600 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[10px] mb-1">Clinical Indications &amp; Description</h4>
                    <p className="leading-relaxed">{selectedMedModal.description || `Authentic certified pharmaceutical formulation stocked at ${PHARMACY_CONFIG.name}.`}</p>
                  </div>

                  {selectedMedModal.manufacturer && (
                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                      <span className="font-bold text-gray-700">Manufacturer / Brand:</span>
                      <span className="font-semibold text-gray-900">{selectedMedModal.manufacturer}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                    <span className="font-bold text-gray-700">Stock Availability:</span>
                    <span className="font-semibold text-emerald-700">{selectedMedModal.stockLevel} {selectedMedModal.unit || 'units'} in Freetown Dispensary</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                    <span className="font-bold text-gray-700">Unit Price:</span>
                    <span className="font-mono text-base font-black text-gray-900">NLe {selectedMedModal.price.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quantity Selector & Add Button */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Quantity Needed:</span>
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                      <button
                        onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                        className="p-1.5 rounded-lg hover:bg-white text-gray-700 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 font-mono font-bold text-sm text-gray-900">{modalQuantity}</span>
                      <button
                        onClick={() => setModalQuantity(Math.min(selectedMedModal.stockLevel || 99, modalQuantity + 1))}
                        className="p-1.5 rounded-lg hover:bg-white text-gray-700 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        onAddToCart(selectedMedModal, modalQuantity);
                        setSelectedMedModal(null);
                        setAddedNotification(`Added ${modalQuantity}x ${selectedMedModal.name} to cart`);
                        setTimeout(() => setAddedNotification(null), 2500);
                      }}
                      className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      <ShoppingBag size={15} />
                      <span>Add to Cart (NLe {(selectedMedModal.price * modalQuantity).toFixed(2)})</span>
                    </button>

                    <a
                      href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%2C%20I%20would%20like%20to%20order%20${modalQuantity}x%20${encodeURIComponent(selectedMedModal.name)}%20from%20YAD-AL%20PHARMACY%20TRADING%20COMPANY.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                      title="Order via WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
