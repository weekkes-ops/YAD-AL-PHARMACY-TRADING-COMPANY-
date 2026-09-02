import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, PackageSearch, Download, Filter, Search, Plus, Bell, X, Minus, CheckCircle2, Clock, MoreVertical, LineChart, BrainCircuit, History } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Medication, StockLog, Sale } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, differenceInDays, isBefore, addDays, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { forecastStockNeeds } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { parseFirestoreDate } from '../lib/dateUtils';
import { logStaffActivity } from '../lib/activityLogger';

export function Inventory() {
  const { user, staff } = useAuth();
  const isAdmin = staff?.role === 'admin';
  const isPharmacist = staff?.role === 'pharmacist';
  const isManager = staff?.role === 'manager';
  const isTechnician = staff?.role === 'technician';
  const isCashier = staff?.role === 'cashier';
  const isViewer = staff?.role === 'viewer';

  const canEditMedication = isAdmin || isPharmacist || isManager;
  const canUpdateStock = canEditMedication || isTechnician;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'ai-forecast'>('inventory');
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [forecast, setForecast] = useState<string | null>(null);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilters, setLogFilters] = useState({
    medicationId: 'all',
    reason: 'all',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [restockData, setRestockData] = useState({
    quantityToAdd: 0,
    newPrice: 0,
    newExpiry: ''
  });
  const [adjustmentData, setAdjustmentData] = useState({
    newLevel: 0,
    reason: 'Stock Count Correction'
  });
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsMed, setDetailsMed] = useState<Medication | null>(null);

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

  const ADJUSTMENT_REASONS = [
    'Stock Count Correction',
    'Damaged',
    'Returned',
    'Expired Disposal',
    'Wastage',
    'Other'
  ];

  const handleRestockClick = (med: Medication) => {
    setSelectedMed(med);
    setRestockData({
      quantityToAdd: 0,
      newPrice: med.price,
      newExpiry: med.expiryDate || ''
    });
    setIsRestockModalOpen(true);
  };

  const logStockChange = async (medId: string, medName: string, change: number, reason: string) => {
    try {
      await addDoc(collection(db, 'stockLogs'), {
        medicationId: medId,
        medicationName: medName,
        change: change,
        reason: reason,
        performedBy: staff?.id || 'unknown',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to log stock change:', error);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed || restockData.quantityToAdd <= 0) return;

    try {
      const medRef = doc(db, 'medications', selectedMed.id);
      const newStockLevel = selectedMed.stockLevel + restockData.quantityToAdd;
      
      await updateDoc(medRef, {
        stockLevel: newStockLevel,
        price: restockData.newPrice,
        expiryDate: restockData.newExpiry,
        updatedAt: serverTimestamp()
      });

      // Log the restock
      await logStockChange(selectedMed.id, selectedMed.name, restockData.quantityToAdd, 'Received Stock (Restock)');

      // Update local state
      setMedications(prev => prev.map(m => 
        m.id === selectedMed.id 
          ? { ...m, stockLevel: newStockLevel, price: restockData.newPrice, expiryDate: restockData.newExpiry }
          : m
      ));

      setIsRestockModalOpen(false);
      setSelectedMed(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'medications');
    }
  };
  const [filters, setFilters] = useState({
    category: 'all',
    stockStatus: 'all',
    expiryRange: 'all'
  });
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    manufacturer: '',
    category: 'General',
    price: 0,
    stockLevel: 0,
    unit: 'tablets' as const,
    expiryDate: '',
    description: '',
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'medications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
      setMedications(data);
      if (activeTab === 'inventory') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab !== 'history') return;

    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        let q = query(
          collection(db, 'stockLogs'),
          orderBy('timestamp', 'desc'),
          limit(200)
        );

        if (logFilters.medicationId !== 'all') {
          q = query(q, where('medicationId', '==', logFilters.medicationId));
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          timestamp: (doc.data().timestamp as any)?.toDate?.() || new Date()
        } as StockLog));

        // Memory filter for date range and reason
        const filtered = data.filter(log => {
          const date = new Date(log.timestamp);
          const matchesDate = date >= startOfDay(new Date(logFilters.startDate)) && 
                            date <= endOfDay(new Date(logFilters.endDate));
          const matchesReason = logFilters.reason === 'all' || log.reason.toLowerCase().includes(logFilters.reason.toLowerCase());
          return matchesDate && matchesReason;
        });

        setStockLogs(filtered);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setLoadingLogs(false);
        setLoading(false);
      }
    };

    fetchLogs();
  }, [activeTab, logFilters]);

  const generateForecast = async () => {
    setIsGeneratingForecast(true);
    setForecast(null);
    try {
      // Get recent sales for trends
      const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: parseFirestoreDate(doc.data().timestamp).toISOString()
      } as any));

      const aiForecast = await forecastStockNeeds(
        medications.map(m => ({ name: m.name, stockLevel: m.stockLevel, category: m.category })),
        sales
      );
      setForecast(aiForecast);
    } catch (error) {
      console.error("Forecast failed:", error);
      setForecast("Failed to generate AI forecast. Please try again later.");
    } finally {
      setIsGeneratingForecast(false);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'medications'), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log initial stock if any
      if (formData.stockLevel > 0) {
        await logStockChange(docRef.id, formData.name, formData.stockLevel, 'initial');
      }

      if (staff) {
        logStaffActivity({
          staffId: staff.id,
          staffName: staff.name,
          action: 'medication_add',
          title: 'Added Medication',
          description: `Created new medication catalog item: ${formData.name} (${formData.stockLevel} ${formData.unit})`
        });
      }

      setIsModalOpen(false);
      setFormData({ 
        name: '', 
        genericName: '',
        manufacturer: '',
        category: 'General', 
        price: 0, 
        stockLevel: 0, 
        unit: 'tablets', 
        expiryDate: '', 
        description: '' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medications');
    }
  };

  const updateStock = async (medId: string, medName: string, oldLevel: number, newLevel: number, reason: string) => {
    if (newLevel < 0) return;
    try {
      const medRef = doc(db, 'medications', medId);
      await updateDoc(medRef, {
        stockLevel: newLevel,
        updatedAt: serverTimestamp()
      });
      
      // Log the manual change
      await logStockChange(medId, medName, newLevel - oldLevel, reason);

      if (staff) {
        const delta = newLevel - oldLevel;
        logStaffActivity({
          staffId: staff.id,
          staffName: staff.name,
          action: 'stock_update',
          title: 'Stock Adjustment',
          description: `Adjusted ${medName} (${delta > 0 ? '+' : ''}${delta} units, Reason: ${reason})`,
          details: { medicationId: medId, oldLevel, newLevel, delta, reason }
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'medications');
    }
  };

  const handleStockAdjustment = (medId: string, delta: number) => {
    const med = medications.find(m => m.id === medId);
    if (med) {
      const newLevel = Math.max(0, med.stockLevel + delta);
      setSelectedMed(med);
      setAdjustmentData({
        newLevel: newLevel,
        reason: 'Stock Count Correction'
      });
      setIsAdjustModalOpen(true);
    }
  };

  const handleStockChange = (medId: string, value: number) => {
    const med = medications.find(m => m.id === medId);
    if (med) {
      const newLevel = Math.max(0, value);
      setSelectedMed(med);
      setAdjustmentData({
        newLevel: newLevel,
        reason: 'Stock Count Correction'
      });
      setIsAdjustModalOpen(true);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    await updateStock(selectedMed.id, selectedMed.name, selectedMed.stockLevel, adjustmentData.newLevel, adjustmentData.reason);
    
    setIsAdjustModalOpen(false);
    setSelectedMed(null);
  };

  const handleViewDetails = (med: Medication) => {
    setDetailsMed(med);
    setIsDetailsModalOpen(true);
  };

  const exportStockLogsToCSV = async () => {
    try {
      const q = query(collection(db, 'stockLogs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as any)?.toDate?.() || new Date()
      } as StockLog & { timestamp: Date }));

      if (logs.length === 0) {
        showNotification('No stock logs found to export.', 'warning');
        return;
      }

      // CSV Headers
      const headers = ['Medication Name', 'Change', 'Reason', 'Performed By', 'Timestamp'];
      
      // Map logs to CSV rows
      const csvRows = logs.map(log => [
        `"${log.medicationName || 'Unknown'}"`,
        log.change,
        `"${log.reason}"`,
        `"${log.performedBy}"`,
        log.timestamp ? `"${format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}"` : '"N/A"'
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `stock_history_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Stock history exported successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('Failed to export stock logs.', 'error');
    }
  };

  const inventoryAlerts = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = addDays(today, 7);
    const thirtyDaysFromNow = addDays(today, 30);

    const alerts = {
      outOfStock: medications.filter(m => m.stockLevel <= 0),
      expired: medications.filter(m => m.expiryDate && isBefore(new Date(m.expiryDate), today)),
      expiringSoon: medications.filter(m => {
        if (!m.expiryDate) return false;
        const expiry = new Date(m.expiryDate);
        return isBefore(expiry, thirtyDaysFromNow) && !isBefore(expiry, today);
      }),
      lowStock: medications.filter(m => m.stockLevel > 0 && m.stockLevel <= 20)
    };

    return alerts;
  }, [medications]);

  const activeAlerts = [
    { id: 'out-of-stock', items: inventoryAlerts.outOfStock, label: 'Out of Stock', icon: PackageSearch, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { id: 'expired', items: inventoryAlerts.expired, label: 'Already Expired', icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
    { id: 'expiring-soon', items: inventoryAlerts.expiringSoon, label: 'Expiring Soon (<30d)', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: 'low-stock', items: inventoryAlerts.lowStock, label: 'Low Stock Level', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
  ].filter(alert => alert.items.length > 0 && !dismissedAlerts.includes(alert.id));

  const expiredAlertItems = inventoryAlerts.expired.filter(item => !dismissedAlerts.includes(`expired-${item.id}`));
  const expiringSoonAlertItems = inventoryAlerts.expiringSoon.filter(item => !dismissedAlerts.includes(`expiring-soon-${item.id}`));

  const getExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return { label: 'No Date', color: 'text-gray-400', bg: 'bg-gray-50', icon: null, level: 'normal' };
    const date = new Date(expiryDate);
    const today = new Date();
    const thirtyDays = addDays(today, 30);
    const threeMonths = addDays(today, 90);
    
    if (isBefore(date, today)) return { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50', icon: AlertCircle, level: 'critical' };
    if (isBefore(date, thirtyDays)) return { label: 'Critical Expiry', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock, level: 'critical' };
    if (isBefore(date, threeMonths)) return { label: 'Expiring Soon', color: 'text-orange-400', bg: 'bg-orange-50', icon: AlertCircle, level: 'warning' };
    return { label: format(date, 'MMM dd, yyyy'), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2, level: 'normal' };
  };

  const filteredMeds = medications.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (m.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                         m.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filters.category === 'all' || m.category === filters.category;
    
    const matchesStock = filters.stockStatus === 'all' || 
                        (filters.stockStatus === 'in-stock' && m.stockLevel > 0) ||
                        (filters.stockStatus === 'out-of-stock' && m.stockLevel === 0) ||
                        (filters.stockStatus === 'low-stock' && m.stockLevel > 0 && m.stockLevel <= 20) ||
                        (filters.stockStatus === 'critical-stock' && m.stockLevel > 0 && m.stockLevel <= 5);

    let matchesExpiry = true;
    if (filters.expiryRange !== 'all' && m.expiryDate) {
      const expiryDate = new Date(m.expiryDate);
      const today = new Date();
      
      if (filters.expiryRange === 'expired') {
        matchesExpiry = isBefore(expiryDate, today);
      } else {
        const days = filters.expiryRange === 'next-30' ? 30 : 
                     filters.expiryRange === 'next-90' ? 90 : 180;
        const targetDate = addDays(today, days);
        matchesExpiry = !isBefore(expiryDate, today) && isBefore(expiryDate, targetDate);
      }
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
  });

  const categories = ['all', ...Array.from(new Set(medications.map(m => m.category)))];

  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    const matches: { value: string; type: 'name' | 'category' | 'generic' }[] = [];
    
    // Check categories
    categories.forEach(cat => {
      if (cat !== 'all' && cat.toLowerCase().includes(searchLower)) {
        matches.push({ value: cat, type: 'category' });
      }
    });
    
    // Check medication names
    medications.forEach(med => {
      if (med.name.toLowerCase().includes(searchLower)) {
        matches.push({ value: med.name, type: 'name' });
      } else if (med.genericName?.toLowerCase().includes(searchLower)) {
        matches.push({ value: med.genericName, type: 'generic' });
      }
    });

    // Remove duplicates and limit results
    const seen = new Set();
    return matches.filter(m => {
      const key = `${m.type}-${m.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [searchTerm, medications, categories]);

  const handleSuggestionClick = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {(expiredAlertItems.length > 0 || expiringSoonAlertItems.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="mb-8 space-y-3"
          >
            {expiredAlertItems.map((med) => (
              <div 
                key={`expired-alert-${med.id}`}
                className="p-4 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-600/20 flex items-center justify-between gap-4 border border-red-500"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <AlertCircle size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">Product Expired</h4>
                    <p className="text-xs font-medium opacity-90">
                      <span className="font-black underline">{med.name}</span> expired on <span className="font-black">{format(new Date(med.expiryDate!), 'MMM dd, yyyy')}</span>. Please remove from active inventory immediately.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleRestockClick(med)}
                    className="px-4 py-2 bg-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all shadow-sm"
                  >
                    Update Expiry
                  </button>
                  <button 
                    onClick={() => setDismissedAlerts(prev => [...prev, `expired-${med.id}`])}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}

            {expiringSoonAlertItems.map((med) => {
              const daysLeft = differenceInDays(new Date(med.expiryDate!), new Date());
              const isUrgent = daysLeft <= 7;
              return (
                <div 
                  key={`expiring-soon-alert-${med.id}`}
                  className={cn(
                    "p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border transition-all",
                    isUrgent 
                      ? "bg-orange-600 text-white shadow-orange-600/20 border-orange-500" 
                      : "bg-amber-500 text-white shadow-amber-500/20 border-amber-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Clock size={24} className={cn(isUrgent && "animate-pulse")} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">
                        {isUrgent ? 'Critical Expiry Warning' : 'Near Expiry Alert'}
                      </h4>
                      <p className="text-xs font-medium opacity-90">
                        <span className="font-black underline">{med.name}</span> expires in <span className="font-black">{daysLeft} days</span> ({format(new Date(med.expiryDate!), 'MMM dd, yyyy')}).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRestockClick(med)}
                      className={cn(
                        "px-4 py-2 bg-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-opacity-90 transition-all shadow-sm",
                        isUrgent ? "text-orange-600" : "text-amber-600"
                      )}
                    >
                      Restock Item
                    </button>
                    <button 
                      onClick={() => setDismissedAlerts(prev => [...prev, `expiring-soon-${med.id}`])}
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-red-500 animate-bounce" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Critical Stock Alerts</h3>
              </div>
              <button 
                onClick={() => setDismissedAlerts(activeAlerts.map(a => a.id))}
                className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                Dismiss All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeAlerts.map((alert) => (
                <motion.div
                  layout
                  key={alert.id}
                  className={cn(
                    "relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between group shadow-sm transition-all hover:shadow-md",
                    alert.bg,
                    alert.border
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className={cn("p-2 rounded-xl bg-white/60 shadow-sm", alert.color)}>
                      <alert.icon size={20} />
                    </div>
                    <button 
                      onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                      className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <p className={cn("text-[10px] font-black uppercase tracking-widest leading-none", alert.color)}>
                      {alert.label}
                    </p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {alert.items.length}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {alert.items.slice(0, 2).map(item => (
                        <span key={item.id} className="text-[9px] font-bold px-1.5 py-0.5 bg-white/40 rounded border border-white/50 text-gray-600 truncate max-w-[100px]">
                          {item.name}
                        </span>
                      ))}
                      {alert.items.length > 2 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/40 rounded border border-white/50 text-gray-400">
                          +{alert.items.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12",
                    alert.color
                  )}>
                    <alert.icon size={80} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Inventory <span className="text-emerald-500">Control</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage stock, track history, and forecast needs with AI</p>
        </div>
        <div className="flex gap-2">
          {canEditMedication && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl border border-emerald-500 hover:bg-emerald-700 transition-all font-bold text-sm shadow-sm"
            >
              <Plus size={18} />
              Add Medication
            </button>
          )}
          <button 
            onClick={exportStockLogsToCSV}
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
          >
            <Download size={18} />
            Export Logs
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm mb-6 w-fit">
        {[
          { id: 'inventory', icon: PackageSearch, label: 'Current Inventory' },
          { id: 'history', icon: History, label: 'Stock History' },
          { id: 'ai-forecast', icon: BrainCircuit, label: 'AI Forecasting' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' ? (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or category..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSuggestions(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden"
                  >
                    <div className="p-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={`${suggestion.type}-${suggestion.value}-${idx}`}
                          onClick={() => handleSuggestionClick(suggestion.value)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-50 rounded-lg transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-gray-50 rounded-md group-hover:bg-white text-gray-400 group-hover:text-emerald-500 transition-colors">
                              {suggestion.type === 'category' ? <Filter size={14} /> : <Clock size={14} />}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{suggestion.value}</span>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 group-hover:text-emerald-400">
                            {suggestion.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium",
              showFilters ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            )}
          >
            <Filter size={16} />
            <span>Filters</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-gray-50/50 border-b border-gray-100"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Stock Level</label>
                  <select
                    value={filters.stockStatus}
                    onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All Levels</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock (≤20)</option>
                    <option value="critical-stock">Critical Stock (≤5)</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Expiry Range</label>
                  <select
                    value={filters.expiryRange}
                    onChange={(e) => setFilters({ ...filters, expiryRange: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All Dates</option>
                    <option value="next-30">Next 30 Days</option>
                    <option value="next-90">Next 3 months</option>
                    <option value="next-180">Next 6 months</option>
                    <option value="expired">Already Expired</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Medication</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading medications...</td>
                </tr>
              ) : filteredMeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No medications found matching your search.</td>
                </tr>
              ) : filteredMeds.map((med) => {
                const expiry = getExpiryStatus(med.expiryDate);
                const isCritical = expiry.level === 'critical' || med.stockLevel <= 0;
                return (
                <tr key={med.id} className={cn(
                  "hover:bg-gray-50 transition-colors group",
                  isCritical && "bg-red-50/30"
                )}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="font-bold text-gray-900 leading-tight cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => handleViewDetails(med)}
                    >
                      {med.name}
                    </div>
                    {(med.genericName || med.manufacturer) && (
                      <div className="flex flex-wrap gap-x-2 mt-0.5">
                        {med.genericName && (
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Gen:</span>
                            <span className="text-[10px] text-gray-500 italic font-medium">{med.genericName}</span>
                          </div>
                        )}
                        {med.manufacturer && (
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Mfr:</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{med.manufacturer}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 font-mono mt-1">{med.unit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                      {med.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    SLE {med.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        med.stockLevel > 50 ? "bg-emerald-500" : med.stockLevel > 20 ? "bg-orange-500" : "bg-red-500"
                      )} />
                      {canUpdateStock ? (
                        <div className="flex items-center bg-gray-100/50 rounded-lg p-0.5 border border-gray-200">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockAdjustment(med.id, -1);
                            }}
                            className="p-1 hover:bg-white rounded-md transition-all text-gray-500 hover:text-red-600 disabled:opacity-50"
                            disabled={med.stockLevel <= 0}
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            value={med.stockLevel}
                            readOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockChange(med.id, med.stockLevel);
                            }}
                            className="w-12 bg-transparent text-center text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockAdjustment(med.id, 1);
                            }}
                            className="p-1 hover:bg-white rounded-md transition-all text-gray-500 hover:text-emerald-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-700">{med.stockLevel} units</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn(
                      "flex items-center text-[10px] font-bold px-2 py-1 rounded-full w-fit",
                      expiry.bg,
                      expiry.color
                    )}>
                      {expiry.icon && React.createElement(expiry.icon as any, { size: 12, className: "mr-1" })}
                      {expiry.label.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {med.stockLevel <= 0 ? (
                      <div className="flex items-center text-red-600 text-[10px] font-black bg-red-50 px-2.5 py-1 rounded-full w-fit border border-red-100 uppercase tracking-tight">
                        <AlertCircle size={12} className="mr-1" />
                        OUT OF STOCK
                      </div>
                    ) : med.stockLevel <= 20 ? (
                      <div className="flex items-center text-orange-600 text-[10px] font-black bg-orange-50 px-2.5 py-1 rounded-full w-fit border border-orange-100 uppercase tracking-tight">
                        <AlertTriangle size={12} className="mr-1" />
                        LOW STOCK
                      </div>
                    ) : (
                      <div className="flex items-center text-emerald-600 text-[10px] font-black bg-emerald-50 px-2.5 py-1 rounded-full w-fit border border-emerald-100 uppercase tracking-tight">
                        <CheckCircle2 size={12} className="mr-1" />
                        IN STOCK
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    {canUpdateStock && (
                      <button 
                        onClick={() => handleRestockClick(med)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                      >
                        Restock
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewDetails(med)}
                      className="text-gray-400 hover:text-emerald-600 transition-colors"
                      title="View Details"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
          </motion.div>
        ) : activeTab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Medication</label>
                <select 
                  value={logFilters.medicationId}
                  onChange={e => setLogFilters({ ...logFilters, medicationId: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All Medications</option>
                  {medications.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reason</label>
                <select 
                  value={logFilters.reason}
                  onChange={e => setLogFilters({ ...logFilters, reason: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All Reasons</option>
                  <option value="restock">Restock</option>
                  <option value="sale">Sales</option>
                  <option value="manual">Manual Adjustment</option>
                  <option value="correction">Corrections</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</label>
                <input 
                  type="date"
                  value={logFilters.startDate}
                  onChange={e => setLogFilters({ ...logFilters, startDate: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</label>
                <input 
                  type="date"
                  value={logFilters.endDate}
                  onChange={e => setLogFilters({ ...logFilters, endDate: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medication</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Change</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <BrainCircuit className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                          <p className="mt-2 text-xs text-gray-500 font-bold uppercase tracking-widest">Fetching history...</p>
                        </td>
                      </tr>
                    ) : stockLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs italic">
                          No logs found matching your filters.
                        </td>
                      </tr>
                    ) : stockLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-300" />
                            <span className="text-xs font-medium text-gray-600">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">
                          {log.medicationName || medications.find(m => m.id === log.medicationId)?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight",
                            log.change > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          )}>
                            {log.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs">
                          <span className={log.change > 0 ? "text-emerald-600" : "text-red-600"}>
                            {log.change > 0 ? '+' : ''}{log.change}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-gray-400 font-mono tracking-tighter">
                          UID: {log.performedBy.slice(-6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center max-w-4xl mx-auto min-h-[400px] flex flex-col items-center justify-center">
              {!forecast && !isGeneratingForecast ? (
                <>
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                    <BrainCircuit size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">AI Stock Intelligence</h2>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">Analyze sales trends and inventory levels to predict future stock needs and avoid shortages.</p>
                  <button 
                    onClick={generateForecast}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg text-sm"
                  >
                    Generate AI Forecast
                  </button>
                </>
              ) : isGeneratingForecast ? (
                <div className="space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <BrainCircuit className="w-full h-full text-emerald-500 animate-pulse" />
                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 animate-spin" />
                  </div>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em]">Processing Analytics...</p>
                </div>
              ) : (
                <div className="text-left bg-gray-50/50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden w-full">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <BrainCircuit size={120} />
                  </div>
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <LineChart size={20} />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tighter">Inventory Intelligence Report</h3>
                  </div>
                  <div className="markdown-body prose prose-emerald prose-sm max-w-none">
                    <ReactMarkdown>{forecast!}</ReactMarkdown>
                  </div>
                  <button 
                    onClick={generateForecast}
                    className="mt-8 flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-[10px] hover:text-emerald-700 transition-colors"
                  >
                    Refresh Forecast
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Restock Modal */}
      <AnimatePresence>
        {isAdjustModalOpen && selectedMed && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdjustModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Adjust Stock</h2>
                  <p className="text-xs text-gray-500">{selectedMed.name}</p>
                </div>
                <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current</p>
                    <p className="text-xl font-black text-gray-900">{selectedMed.stockLevel}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Target</p>
                    <input 
                      type="number"
                      value={adjustmentData.newLevel}
                      onChange={(e) => setAdjustmentData({...adjustmentData, newLevel: Math.max(0, parseInt(e.target.value) || 0)})}
                      className="w-full bg-transparent text-xl font-black text-emerald-900 outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason for Adjustment</label>
                  <select
                    required
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-sm"
                  >
                    {ADJUSTMENT_REASONS.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-black font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Confirm Change
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}

        {isRestockModalOpen && selectedMed && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRestockModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Restock Medication</h2>
                  <p className="text-xs text-gray-500">{selectedMed.name} ({selectedMed.unit})</p>
                </div>
                <button onClick={() => setIsRestockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                  <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1">Current Stock</p>
                  <p className="text-sm font-black text-orange-900">{selectedMed.stockLevel} units</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantity to Add</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={restockData.quantityToAdd}
                    onChange={(e) => setRestockData({...restockData, quantityToAdd: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold"
                    placeholder="Enter amount received"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price per unit (SLE)</label>
                    <input 
                      required
                      type="number" 
                      value={restockData.newPrice}
                      onChange={(e) => setRestockData({...restockData, newPrice: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                    <input 
                      required
                      type="date" 
                      value={restockData.newExpiry}
                      onChange={(e) => setRestockData({...restockData, newExpiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsRestockModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 text-sm uppercase tracking-widest"
                  >
                    Confirm Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Medication</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleAddMedication} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Medication Name (Brand)</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        placeholder="e.g. Panadol"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Generic Name</label>
                      <input 
                        type="text" 
                        value={formData.genericName}
                        onChange={(e) => setFormData({...formData, genericName: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        placeholder="e.g. Paracetamol"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manufacturer</label>
                    <input 
                      type="text" 
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      placeholder="e.g. GSK"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <input 
                      required
                      type="text" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      placeholder="e.g. Analgesic"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                      placeholder="Brief details about the medication..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit Type</label>
                    <select 
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="tablets">Tablets</option>
                      <option value="capsules">Capsules</option>
                      <option value="bottles">Bottles</option>
                      <option value="tubes">Tubes</option>
                      <option value="vials">Vials</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (SLE)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Stock</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stockLevel}
                      onChange={(e) => setFormData({...formData, stockLevel: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30"
                  >
                    Save Medication
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Medication Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && detailsMed && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="relative h-32 bg-emerald-600 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent" />
                  <div className="grid grid-cols-8 gap-4 p-4 opacity-20">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="h-4 w-px bg-white mx-auto" />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-6 left-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
                  <PackageSearch size={40} className="text-emerald-600" />
                </div>
              </div>

              <div className="px-8 pt-16 pb-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{detailsMed.name}</h2>
                    <p className="text-emerald-600 font-bold italic">{detailsMed.genericName || 'Generic Name Not Specified'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unit Price</p>
                    <p className="text-2xl font-black text-gray-900">SLE {detailsMed.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-white text-emerald-600 rounded-lg shadow-sm">
                        <Filter size={16} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Classification</p>
                    </div>
                    <p className="font-bold text-gray-900">{detailsMed.category}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Manufacturer: {detailsMed.manufacturer || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-white text-emerald-600 rounded-lg shadow-sm">
                        <PackageSearch size={16} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</p>
                    </div>
                    <p className="font-bold text-gray-900">{detailsMed.stockLevel} {detailsMed.unit}</p>
                    <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          detailsMed.stockLevel > 50 ? "bg-emerald-500" : detailsMed.stockLevel > 20 ? "bg-orange-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(100, (detailsMed.stockLevel / 200) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-white text-emerald-600 rounded-lg shadow-sm">
                        <Clock size={16} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiration</p>
                    </div>
                    <p className={cn(
                      "font-bold",
                      getExpiryStatus(detailsMed.expiryDate).color
                    )}>
                      {detailsMed.expiryDate ? format(new Date(detailsMed.expiryDate), 'MMM dd, yyyy') : 'No Date Set'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Status: {getExpiryStatus(detailsMed.expiryDate).label}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Full Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {detailsMed.description || 'No description available for this medication. Please consult the digital catalogue or manufacturer datasheet for detailed pharmacological information.'}
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Close View
                  </button>
                  {canUpdateStock && (
                    <button 
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleRestockClick(detailsMed);
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 text-sm"
                    >
                      Restock Item
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
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
                <CheckCircle2 size={18} />
              ) : notification.type === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                <AlertTriangle size={18} />
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
