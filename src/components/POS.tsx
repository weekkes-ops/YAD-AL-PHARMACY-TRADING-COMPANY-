import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Plus,
  Minus,
  User,
  History,
  UserPlus,
  X,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Ticket,
  FileText,
  Check,
  Printer
} from 'lucide-react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Medication, SaleItem, Sale, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { parseFirestoreDate } from '../lib/dateUtils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { checkDrugInteractions } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { PHARMACY_CONFIG } from '../config/pharmacy';
import { logStaffActivity } from '../lib/activityLogger';

export function POS() {
  const { user, staff } = useAuth();
  const isAdmin = staff?.role === 'admin';
  const isPharmacist = staff?.role === 'pharmacist';
  const isCashier = staff?.role === 'cashier';
  const isManager = staff?.role === 'manager';
  const isTechnician = staff?.role === 'technician';
  const isViewer = staff?.role === 'viewer';

  const canManageCustomers = isAdmin || isPharmacist || isManager || isTechnician;
  const canViewHistory = isAdmin || isPharmacist || isManager || isTechnician;
  const canPerformClinical = isAdmin || isPharmacist || isManager;
  const canProcessRefills = canPerformClinical || isTechnician;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerHistory, setCustomerHistory] = useState<Sale[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [refillModalMed, setRefillModalMed] = useState<Medication | null>(null);
  const [refillQuantity, setRefillQuantity] = useState(1);
  const [refillData, setRefillData] = useState({
    prescriptionNumber: '',
    prescribingDoctor: '',
    prescriptionDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', allergies: '', medicalHistory: '' });
  const [couponInput, setCouponInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [completedSaleReceipt, setCompletedSaleReceipt] = useState<{
    id: string;
    items: SaleItem[];
    subtotal: number;
    discountAmount: number;
    discountCode?: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    date: string;
    soldByName: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const DISCOUNT_CODES: Record<string, { type: 'percentage' | 'fixed'; value: number }> = {
    'SAVE10': { type: 'percentage', value: 10 },
    'SOUTH20': { type: 'percentage', value: 20 },
    'FLAT100': { type: 'fixed', value: 100 },
  };

  const applyDiscount = () => {
    const code = couponInput.toUpperCase().trim();
    const discount = DISCOUNT_CODES[code];
    
    if (discount) {
      let amount = 0;
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (discount.type === 'percentage') {
        amount = (subtotal * discount.value) / 100;
      } else {
        amount = Math.min(discount.value, subtotal);
      }
      
      setAppliedDiscount({ code, amount });
      setCouponInput('');
      showNotification(`Coupon ${code} applied successfully!`, 'success');
    } else {
      showNotification('Invalid discount code', 'error');
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  const updateItemNote = (medicationId: string, note: string) => {
    setItemNotes(prev => ({ ...prev, [medicationId]: note }));
  };

  const customerDropdownRef = React.useRef<HTMLDivElement>(null);

  const confirmRefill = () => {
    if (!refillModalMed) return;
    
    // Safety check for stock
    if (refillQuantity > refillModalMed.stockLevel) {
      showNotification(`Requested quantity (${refillQuantity}) exceeds current stock level (${refillModalMed.stockLevel}).`, 'warning');
      return;
    }

    const existing = cart.find(c => c.medicationId === refillModalMed.id);

    if (existing) {
      setCart(cart.map(c => c.medicationId === refillModalMed.id ? { 
        ...c, 
        quantity: refillQuantity, 
        isRefill: true,
        prescriptionNumber: refillData.prescriptionNumber,
        prescribingDoctor: refillData.prescribingDoctor,
        prescriptionDate: refillData.prescriptionDate,
        ...(refillModalMed.genericName && { genericName: refillModalMed.genericName }),
        ...(refillModalMed.manufacturer && { manufacturer: refillModalMed.manufacturer })
      } : c));
    } else {
      setCart([...cart, { 
        medicationId: refillModalMed.id, 
        name: refillModalMed.name, 
        ...(refillModalMed.genericName && { genericName: refillModalMed.genericName }),
        ...(refillModalMed.manufacturer && { manufacturer: refillModalMed.manufacturer }),
        price: refillModalMed.price, 
        quantity: refillQuantity,
        isRefill: true,
        prescriptionNumber: refillData.prescriptionNumber,
        prescribingDoctor: refillData.prescribingDoctor,
        prescriptionDate: refillData.prescriptionDate
      }]);
    }
    setRefillModalMed(null);
    setRefillQuantity(1);
    setRefillData({
      prescriptionNumber: '',
      prescribingDoctor: '',
      prescriptionDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        allergies: newCustomer.allergies.split(',').map(a => a.trim()).filter(Boolean),
        medicalHistory: newCustomer.medicalHistory,
        createdAt: serverTimestamp()
      });
      
      const createdCustomer = { 
        id: docRef.id, 
        name: newCustomer.name, 
        phone: newCustomer.phone,
        email: newCustomer.email,
        allergies: newCustomer.allergies.split(',').map(a => a.trim()).filter(Boolean),
        medicalHistory: newCustomer.medicalHistory,
        createdAt: new Date().toISOString()
      } as Customer;

      setCustomers(prev => [...prev, createdCustomer]);
      setSelectedCustomer(createdCustomer);
      setIsAddCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', allergies: '', medicalHistory: '' });
      setIsCustomerDropdownOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    }
  };
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showRefillsOnly, setShowRefillsOnly] = useState(false);
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);

  useEffect(() => {
    const checkInteractions = async () => {
      if (cart.length === 0 || !selectedCustomer) {
        setInteractionWarning(null);
        return;
      }

      setIsCheckingInteractions(true);
      try {
        const warning = await checkDrugInteractions(
          cart.map(i => ({ name: i.name, genericName: i.genericName, manufacturer: i.manufacturer })),
          { medicalHistory: selectedCustomer.medicalHistory, allergies: selectedCustomer.allergies }
        );
        setInteractionWarning(warning);
      } catch (error) {
        console.error("Interaction check failed:", error);
      } finally {
        setIsCheckingInteractions(false);
      }
    };

    const timer = setTimeout(checkInteractions, 1000);
    return () => clearTimeout(timer);
  }, [cart, selectedCustomer]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'medications'));
        const snapshot = await getDocs(q);
        setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'medications');
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCustomers = async () => {
      try {
        const q = query(collection(db, 'customers'));
        const snapshot = await getDocs(q);
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'customers');
      }
    };
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isScanning) {
      setScanError(null);
      // Simulate scanning delay
      timeout = setTimeout(() => {
        // Simple simulation: scan a random medication or fail
        const eligibleMeds = medications.filter(m => m.stockLevel > 0);
        if (eligibleMeds.length > 0 && Math.random() > 0.3) {
          const randomMed = eligibleMeds[Math.floor(Math.random() * eligibleMeds.length)];
          addToCart(randomMed);
          setIsScanning(false);
        } else {
          setScanError("Barcode not recognized or item out of stock.");
        }
      }, 2500);
    }
    return () => clearTimeout(timeout);
  }, [isScanning, medications]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedCustomer) {
        setCustomerHistory([]);
        return;
      }
      
      try {
        const start = Timestamp.fromDate(startOfDay(new Date(startDate)));
        const end = Timestamp.fromDate(endOfDay(new Date(endDate)));
        
        // Simple query first to avoid index issues if they haven't set up composite indexes
        // We'll filter the date range in memory for now to ensure it works reliable without index setup
        const q = query(
          collection(db, 'sales'),
          where('customerId', '==', selectedCustomer.id),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(q);
        const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
        
        // Filter by date range in memory
        const filtered = sales.filter(s => {
          const date = parseFirestoreDate(s.timestamp);
          return date >= startOfDay(new Date(startDate)) && date <= endOfDay(new Date(endDate));
        });
        
        setCustomerHistory(filtered);
      } catch (error) {
        console.error("History fetch error:", error);
        handleFirestoreError(error, OperationType.GET, 'sales');
      }
    };
    fetchHistory();
  }, [selectedCustomer, startDate, endDate]);

  const addToCart = (med: Medication) => {
    if (med.stockLevel <= 0) return;
    const existing = cart.find(item => item.medicationId === med.id);
    if (existing) {
      if (existing.quantity >= med.stockLevel) return;
      setCart(cart.map(item => item.medicationId === med.id ? { 
        ...item, 
        quantity: item.quantity + 1,
        ...(med.genericName && { genericName: med.genericName }),
        ...(med.manufacturer && { manufacturer: med.manufacturer })
      } : item));
    } else {
      setCart([...cart, { 
        medicationId: med.id, 
        name: med.name, 
        ...(med.genericName && { genericName: med.genericName }),
        ...(med.manufacturer && { manufacturer: med.manufacturer }),
        price: med.price, 
        quantity: 1 
      }]);
    }
  };

  const handleRefill = (item: SaleItem) => {
    const med = medications.find(m => m.id === item.medicationId);
    if (!med) {
      showNotification("This medication is no longer in the inventory.", "error");
      return;
    }
    if (med.stockLevel <= 0) {
      showNotification("Out of stock.", "warning");
      return;
    }

    setRefillModalMed(med);
    setRefillQuantity(item.quantity);
    if (item.prescriptionNumber) {
      setRefillData({
        prescriptionNumber: item.prescriptionNumber,
        prescribingDoctor: item.prescribingDoctor || '',
        prescriptionDate: item.prescriptionDate || format(new Date(), 'yyyy-MM-dd')
      });
    }
  };

  const updateQuantity = (medicationId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.medicationId === medicationId) {
        const med = medications.find(m => m.id === medicationId);
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (med && newQty > med.stockLevel) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as SaleItem[]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.medicationId !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - (appliedDiscount?.amount || 0));

  const handleCheckout = async () => {
    if (cart.length === 0 || !staff) return;
    setIsProcessing(true);
    try {
      // 1. Create Sale Record
      const sale: Omit<Sale, 'id'> = {
        items: cart.map(item => ({
          ...item,
          notes: itemNotes[item.medicationId] || ''
        })),
        totalAmount: total,
        discountAmount: appliedDiscount?.amount,
        discountCode: appliedDiscount?.code,
        paymentMethod,
        soldBy: staff.id,
        customerId: selectedCustomer?.id,
        timestamp: new Date().toISOString(), // rules use serverTime but we also store client string
      };

      const saleRef = await addDoc(collection(db, 'sales'), {
        ...sale,
        timestamp: serverTimestamp()
      });

      // Prepare receipt for instant printing/viewing
      setCompletedSaleReceipt({
        id: saleRef.id,
        items: [...cart],
        subtotal,
        discountAmount: appliedDiscount?.amount || 0,
        discountCode: appliedDiscount?.code,
        totalAmount: total,
        paymentMethod,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        date: format(new Date(), 'dd MMM yyyy, HH:mm'),
        soldByName: staff.name
      });

      // 2. Update Inventory and log changes
      for (const item of cart) {
        const medRef = doc(db, 'medications', item.medicationId);
        await updateDoc(medRef, {
          stockLevel: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });

        // Log the sale deduction
        await addDoc(collection(db, 'stockLogs'), {
          medicationId: item.medicationId,
          medicationName: item.name,
          change: -item.quantity,
          reason: 'sale',
          performedBy: staff.id,
          timestamp: serverTimestamp()
        });
      }

      // Log staff sale activity
      logStaffActivity({
        staffId: staff.id,
        staffName: staff.name,
        action: 'sale',
        title: 'Processed POS Sale',
        description: `Dispensed ${cart.length} item(s) for SLE ${total.toLocaleString()} (${paymentMethod.toUpperCase()})`,
        details: {
          saleId: saleRef.id,
          totalAmount: total,
          itemCount: cart.length,
          paymentMethod,
          customerName: selectedCustomer?.name
        }
      });

      setCart([]);
      setSelectedCustomer(null);
      setAppliedDiscount(null);
      setItemNotes({});
      // Refresh local med data
      const q = query(collection(db, 'medications'));
      const snapshot = await getDocs(q);
      setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
      showNotification('Sale completed successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMeds = medications.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search medications..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button 
              onClick={() => setIsScanning(!isScanning)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all",
                isScanning ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
              title="Scan Barcode"
            >
              <Smartphone size={16} />
            </button>
          </div>
          
          <div className="relative w-72" ref={customerDropdownRef}>
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Customer (Name/Phone)..." 
              value={selectedCustomer ? selectedCustomer.name : customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                if (selectedCustomer) setSelectedCustomer(null);
                setIsCustomerDropdownOpen(true);
              }}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            />
            {selectedCustomer && (
              <button 
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            )}
            
            <AnimatePresence>
              {isCustomerDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-xl z-50 max-h-64 overflow-y-auto"
                >
                  <div className="p-2 space-y-1">
                    {filteredCustomers.length > 0 ? (
                      <>
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearch('');
                            }}
                            className="w-full text-left p-3 hover:bg-emerald-50 rounded-lg transition-colors group"
                          >
                            <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-600">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                          </button>
                        ))}
                        {canManageCustomers && (
                          <div className="p-2 border-t border-gray-50">
                            <button 
                              onClick={() => {
                                setIsAddCustomerModalOpen(true);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="text-xs font-bold text-emerald-600 flex items-center justify-center w-full gap-1 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <UserPlus size={14} /> Add New Customer
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-gray-500 mb-2">No customer found</p>
                        {canManageCustomers && (
                          <button 
                            onClick={() => {
                              setIsAddCustomerModalOpen(true);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="text-xs font-bold text-emerald-600 flex items-center justify-center w-full gap-1 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <UserPlus size={14} /> Create "{customerSearch}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {isAddCustomerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900">Add New Customer</h3>
                  <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Name *</label>
                    <input
                      required
                      type="text"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Phone</label>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g. +232..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email</label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Allergies (comma separated)</label>
                    <input
                      type="text"
                      value={newCustomer.allergies}
                      onChange={e => setNewCustomer({ ...newCustomer, allergies: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="e.g. Penicillin, Aspirin"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Medical history / notes</label>
                    <textarea
                      value={newCustomer.medicalHistory}
                      onChange={e => setNewCustomer({ ...newCustomer, medicalHistory: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px]"
                      placeholder="Any pre-existing conditions..."
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-xs"
                    >
                      Save Customer
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {refillModalMed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Prescription Refill</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{refillModalMed.name}</p>
                  </div>
                  <button onClick={() => setRefillModalMed(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Stock</p>
                      <p className="text-lg font-black text-gray-900">{refillModalMed.stockLevel} units</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit Price</p>
                      <p className="text-lg font-black text-emerald-600 font-mono">SLE {refillModalMed.price}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prescription #</label>
                      <input
                        required
                        type="text"
                        value={refillData.prescriptionNumber}
                        onChange={e => setRefillData({ ...refillData, prescriptionNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        placeholder="e.g. RX-10293"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prescribing Doctor</label>
                      <input
                        type="text"
                        value={refillData.prescribingDoctor}
                        onChange={e => setRefillData({ ...refillData, prescribingDoctor: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        placeholder="e.g. Dr. Sierra"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prescription Date</label>
                      <input
                        type="date"
                        value={refillData.prescriptionDate}
                        onChange={e => setRefillData({ ...refillData, prescriptionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                       Refill Quantity 
                      <span className="text-[10px] text-gray-400 font-normal normal-case">(Specify number of {refillModalMed.unit})</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setRefillQuantity(Math.max(1, refillQuantity - 1))}
                        className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-600 transition-all font-bold text-xl"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        value={refillQuantity}
                        onChange={(e) => setRefillQuantity(Math.min(refillModalMed.stockLevel, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 h-12 text-center text-xl font-black bg-gray-50 border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none"
                      />
                      <button 
                        onClick={() => setRefillQuantity(Math.min(refillModalMed.stockLevel, refillQuantity + 1))}
                        className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-xl hover:bg-emerald-200 text-emerald-600 transition-all font-bold text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={confirmRefill}
                      disabled={refillQuantity > refillModalMed.stockLevel}
                      className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={18} /> Confirm & Add to Cart
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-4 uppercase font-bold tracking-tighter">
                      Linked to: <span className="text-emerald-600">{selectedCustomer?.name}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {selectedCustomer && canViewHistory && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-emerald-100 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <div className="text-center">
                  <p className="text-gray-400 font-bold uppercase">Allergies</p>
                  <p className="text-red-500 font-bold">{selectedCustomer.allergies?.join(', ') || 'None'}</p>
                </div>
                <div className="text-center border-l border-emerald-200 pl-4">
                  <p className="text-gray-400 font-bold uppercase">Total Value</p>
                  <p className="text-emerald-600 font-bold">SLE {customerHistory.reduce((s, h) => s + h.totalAmount, 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <History size={12} className="mr-1" /> Purchase History
                </h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-gray-400 text-[10px]">to</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button 
                  onClick={() => setShowRefillsOnly(!showRefillsOnly)}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5",
                    showRefillsOnly 
                      ? "bg-emerald-100 border-emerald-200 text-emerald-700" 
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-white"
                  )}
                >
                  <RotateCcw size={10} className={cn(showRefillsOnly && "animate-spin-slow")} />
                  {showRefillsOnly ? "Refills Only" : "All Sales"}
                </button>
              </div>
              
              <div className="space-y-3">
                {customerHistory.filter(sale => !showRefillsOnly || sale.items.some(item => item.isRefill)).map(sale => (
                  <div key={sale.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                          {format(parseFirestoreDate(sale.timestamp), 'MMM dd, yyyy')}
                        </span>
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                          sale.paymentMethod === 'cash' ? "bg-emerald-50 text-emerald-600" : 
                          sale.paymentMethod === 'card' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        )}>
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 font-mono">
                        SLE {sale.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 pl-1 border-l-2 border-emerald-200">
                      {sale.items.map((item, i) => (
                        <div key={i} className="flex flex-col text-[11px] group">
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600">
                              <span className="font-bold text-gray-900">{item.quantity}x</span> {item.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">SLE {(item.price * item.quantity).toLocaleString()}</span>
                              {canProcessRefills && (
                                <button 
                                  onClick={() => handleRefill(item)}
                                  className="p-1 px-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 border border-emerald-500"
                                  title="Process Refill"
                                >
                                  <RotateCcw size={10} />
                                  <span className="text-[8px] font-black uppercase">Refill</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {(item.genericName || item.manufacturer || item.notes) && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <div className="flex flex-wrap gap-x-3">
                                {item.genericName && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Gen:</span>
                                    <span className="text-[10px] text-gray-500 italic font-medium">{item.genericName}</span>
                                  </div>
                                )}
                                {item.manufacturer && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Mfr:</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{item.manufacturer}</span>
                                  </div>
                                )}
                              </div>
                              {item.notes && (
                                <div className="flex items-start gap-1 p-1 bg-white border border-gray-100 rounded mt-0.5">
                                  <FileText size={8} className="text-gray-400 mt-1" />
                                  <span className="text-[9px] text-gray-500 font-medium italic">{item.notes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {(sale.discountAmount && sale.discountAmount > 0) && (
                        <div className="flex justify-between text-[9px] font-bold text-emerald-600 pt-1 mt-1 border-t border-dashed border-gray-200">
                          <span className="uppercase tracking-widest flex items-center gap-1">
                            <Ticket size={8} /> Discount ({sale.discountCode})
                          </span>
                          <span>- SLE {sale.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {customerHistory.length === 0 && (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-400 italic">No transaction records found for this period.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {filteredMeds.map((med) => (
            <motion.button
              layout
              key={med.id}
              onClick={() => addToCart(med)}
              disabled={med.stockLevel <= 0}
              className={cn(
                "p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left hover:shadow-md transition-all group flex flex-col justify-between",
                med.stockLevel <= 0 && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-gray-50 px-2 py-0.5 rounded mb-2 inline-block">
                  {med.category}
                </span>
                <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{med.name}</h3>
                {med.genericName && <p className="text-[10px] text-gray-400 italic mt-0.5">{med.genericName}</p>}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">{med.unit}</p>
                  {med.manufacturer && <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{med.manufacturer}</p>}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-600">SLE {med.price}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded",
                  med.stockLevel > 20 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {med.stockLevel} left
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="w-96 flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center space-x-2">
          <ShoppingCart size={20} className="text-emerald-600" />
          <h2 className="font-bold text-gray-900">Current Cart</h2>
          <span className="ml-auto bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {isCheckingInteractions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center p-3 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold gap-2 mb-2"
              >
                <Loader2 size={14} className="animate-spin" />
                Checking for drug interactions...
              </motion.div>
            )}

            {isScanning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-900 text-white rounded-xl mb-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 size={16} className="animate-spin text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">Scanner Active</span>
                </div>
                <div className="aspect-video bg-black/40 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-48 h-0.5 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Align barcode within frame</p>
                </div>
                {scanError && (
                  <p className="mt-2 text-red-400 text-[10px] font-bold">{scanError}</p>
                )}
                <button 
                  onClick={() => setIsScanning(false)}
                  className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase transition-colors"
                >
                  Cancel Scanning
                </button>
              </motion.div>
            )}

            {interactionWarning && !isCheckingInteractions && canPerformClinical && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-3 rounded-lg border text-[11px] mb-4",
                  interactionWarning.includes('WARNING') 
                    ? "bg-red-50 border-red-100 text-red-700" 
                    : interactionWarning.includes('No significant interactions')
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-orange-50 border-orange-100 text-orange-700"
                )}
              >
                <div className="flex items-start gap-2 mb-1">
                  {interactionWarning.includes('WARNING') ? (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  ) : interactionWarning.includes('No significant interactions') ? (
                    <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="font-bold uppercase tracking-widest text-[9px]">
                    AI Interaction Guard
                  </div>
                </div>
                <div className="markdown-body text-[10px] leading-relaxed">
                  <ReactMarkdown>{interactionWarning}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : cart.map((item) => (
              <motion.div
                key={item.medicationId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{item.name}</p>
                      {item.isRefill && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm border border-emerald-200">
                          Refill
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {item.genericName && (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Gen:</span>
                          <span className="text-[10px] text-gray-500 italic font-medium">{item.genericName}</span>
                        </div>
                      )}
                      {item.manufacturer && (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Mfr:</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest uppercase">{item.manufacturer}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-emerald-600 font-mono mt-1">SLE {item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.medicationId)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-gray-100 rounded-md overflow-hidden">
                      <button onClick={() => updateQuantity(item.medicationId, -1)} className="p-1 px-2 hover:bg-gray-50 text-gray-500 transition-colors border-r border-gray-100">
                        <Minus size={12} />
                      </button>
                      <span className="px-3 text-xs font-bold w-10 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.medicationId, 1)} className="p-1 px-2 hover:bg-gray-50 text-gray-500 transition-colors border-l border-gray-100">
                        <Plus size={12} />
                      </button>
                    </div>
                    {item.isRefill ? (
                      <button 
                        onClick={() => handleRefill(item)}
                        className="p-1.5 px-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 border border-emerald-500"
                        title="Adjust Refill quantity & check stock"
                      >
                        <RotateCcw size={12} />
                        <span className="text-[9px] font-black uppercase">Refill</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const med = medications.find(m => m.id === item.medicationId);
                          if (med) {
                            handleRefill(item);
                          }
                        }}
                        className="p-1.5 px-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-sm border border-emerald-100"
                        title="Convert to Refill"
                      >
                        <RotateCcw size={12} />
                        <span className="text-[9px] font-black uppercase">Refill</span>
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-sm">
                    SLE {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
                
                <div className="mt-2 group/note relative">
                  <FileText size={12} className="absolute left-2 top-1.5 text-gray-300 group-focus-within/note:text-emerald-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Add instruction or note..."
                    value={itemNotes[item.medicationId] || ''}
                    onChange={(e) => updateItemNote(item.medicationId, e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-white border border-gray-100 focus:border-emerald-200 outline-none text-[10px] italic text-gray-600 rounded placeholder:text-gray-300 transition-all"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', icon: Banknote, label: 'Cash' },
                { id: 'card', icon: CreditCard, label: 'Card' },
                { id: 'mobile_money', icon: Smartphone, label: 'Mobile' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border text-[10px] font-bold transition-all",
                    paymentMethod === method.id 
                      ? "bg-emerald-600 border-emerald-600 text-white" 
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <method.icon size={16} className="mb-1" />
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Discount Code</p>
            {appliedDiscount ? (
              <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded text-emerald-600">
                    <Ticket size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">{appliedDiscount.code}</p>
                    <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Applied Discount: SLE {appliedDiscount.amount}</p>
                  </div>
                </div>
                <button onClick={removeDiscount} className="text-emerald-400 hover:text-red-500 p-1">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Enter coupon..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                    className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium uppercase placeholder:normal-case placeholder:text-gray-300"
                  />
                </div>
                <button 
                  onClick={applyDiscount}
                  className="px-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Subtotal</span>
              <span>SLE {subtotal.toLocaleString()}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-emerald-600 text-xs font-bold">
                <span>Discount ({appliedDiscount.code})</span>
                <span>- SLE {appliedDiscount.amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-t border-gray-100 pt-1 mt-1">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-emerald-600 font-mono">SLE {total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest text-sm"
          >
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      <AnimatePresence>
        {completedSaleReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Receipt Header */}
              <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sale Receipt</span>
                  <h3 className="text-lg font-black text-white">{PHARMACY_CONFIG.name}</h3>
                </div>
                <button 
                  onClick={() => setCompletedSaleReceipt(null)} 
                  className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Printable Body */}
              <div id="printable-receipt" className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-white">
                <div className="text-center pb-3 border-b border-dashed border-gray-300 space-y-1">
                  <p className="font-bold text-sm text-gray-900 font-sans">{PHARMACY_CONFIG.name}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider font-sans">{PHARMACY_CONFIG.tagline}</p>
                  <p className="text-[11px] text-gray-500 font-sans">{PHARMACY_CONFIG.address}, {PHARMACY_CONFIG.country}</p>
                  <p className="text-[11px] text-gray-500 font-sans">Tel: {PHARMACY_CONFIG.phoneDisplay}</p>
                  <div className="pt-2 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>INV: #{completedSaleReceipt.id.slice(-8).toUpperCase()}</span>
                    <span>{completedSaleReceipt.date}</span>
                  </div>
                </div>

                {completedSaleReceipt.customerName && (
                  <div className="py-2 border-b border-dashed border-gray-200 text-[11px]">
                    <span className="text-gray-500">Customer: </span>
                    <strong className="text-gray-900">{completedSaleReceipt.customerName}</strong>
                    {completedSaleReceipt.customerPhone && <span className="text-gray-400"> ({completedSaleReceipt.customerPhone})</span>}
                  </div>
                )}

                <div className="space-y-2 py-2 border-b border-dashed border-gray-200">
                  <div className="flex justify-between font-bold text-gray-600 text-[11px]">
                    <span>Item & Qty</span>
                    <span>Amount</span>
                  </div>
                  {completedSaleReceipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-gray-800">
                      <div className="pr-2">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[10px] text-gray-500">{item.quantity} x SLE {item.price.toLocaleString()}</p>
                        {item.genericName && (
                          <p className="text-[9px] text-gray-400 italic">({item.genericName})</p>
                        )}
                        {item.prescriptionNumber && (
                          <p className="text-[9px] text-purple-600 font-sans">Rx: {item.prescriptionNumber} {item.prescribingDoctor ? `(Dr. ${item.prescribingDoctor})` : ''}</p>
                        )}
                      </div>
                      <span className="font-bold shrink-0">SLE {(item.quantity * item.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2 text-[11px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>SLE {completedSaleReceipt.subtotal.toLocaleString()}</span>
                  </div>
                  {completedSaleReceipt.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({completedSaleReceipt.discountCode}):</span>
                      <span>- SLE {completedSaleReceipt.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300 font-sans">
                    <span>TOTAL DUE:</span>
                    <span className="text-emerald-600">SLE {completedSaleReceipt.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                    <span>Payment Method:</span>
                    <span className="uppercase font-bold text-gray-700">{completedSaleReceipt.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Dispensed by:</span>
                    <span className="font-semibold text-gray-700">{completedSaleReceipt.soldByName}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-600 font-bold pt-1">
                    <span>Status:</span>
                    <span>PAID IN FULL</span>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-sans space-y-0.5">
                  <p className="font-bold text-gray-600">Thank you for your business!</p>
                  <p>Quality Healthcare & Pharmaceuticals</p>
                  <p className="text-[9px] text-gray-400">Keep receipt for warranty & verification</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.print();
                    }
                  }}
                  className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedSaleReceipt(null)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border bg-white"
            style={{
              borderColor: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : '#f59e0b',
            }}
          >
            <div className={cn(
              "p-1.5 rounded-xl text-white",
              notification.type === 'success' ? 'bg-emerald-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-amber-500'
            )}>
              {notification.type === 'success' ? (
                <ShieldCheck size={18} />
              ) : notification.type === 'error' ? (
                <AlertTriangle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </div>
            <p className="text-sm font-black text-gray-900 pr-4">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
