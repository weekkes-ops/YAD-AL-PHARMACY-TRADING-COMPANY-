import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Receipt,
  PlusCircle,
  Sparkles,
  Stethoscope,
  Printer,
  Eye,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  Percent,
  BarChart3,
  Search,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Sale, Medication, Customer, StaffRole } from '../types';
import { 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  startOfWeek, 
  startOfMonth, 
  subMonths, 
  isBefore,
  addDays,
  differenceInDays 
} from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { parseFirestoreDate } from '../lib/dateUtils';
import { PHARMACY_CONFIG } from '../config/pharmacy';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Antibiotics': '#3b82f6',
  'Analgesics': '#10b981',
  'Cardiovascular': '#8b5cf6',
  'Antimalarials': '#f59e0b',
  'Vitamins': '#ec4899',
  'Respiratory': '#06b6d4',
  'Gastrointestinal': '#14b8a6',
  'Other': '#64748b'
};

const PIE_PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6', '#64748b'];

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, staff } = useAuth();
  const isAdmin = staff?.role === StaffRole.ADMIN;
  const isManager = staff?.role === StaffRole.MANAGER;
  const isPharmacist = staff?.role === StaffRole.PHARMACIST;
  const isCashier = staff?.role === StaffRole.CASHIER;
  const isViewer = staff?.role === StaffRole.VIEWER;
  
  const canSeeFinancials = isAdmin || isManager || isPharmacist || isViewer;

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Time & Filter States
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '14d' | '30d'>('7d');
  const [reportRange, setReportRange] = useState<'today' | '7d' | '30d' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [stockFilterView, setStockFilterView] = useState<'all' | 'low' | 'expired'>('all');

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      // 1. Fetch Sales (last 3 months)
      const threeMonthsAgo = subMonths(new Date(), 3);
      const salesQuery = query(
        collection(db, 'sales'),
        where('timestamp', '>=', Timestamp.fromDate(threeMonthsAgo)),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      const salesSnap = await getDocs(salesQuery);
      const fetchedSales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setAllSales(fetchedSales);
      setRecentSales(fetchedSales.slice(0, 15));

      // 2. Fetch Medications Inventory
      const medQuery = query(collection(db, 'medications'), limit(300));
      const medSnap = await getDocs(medQuery);
      const fetchedMeds = medSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
      setMedications(fetchedMeds);

      // 3. Fetch Customers
      const custQuery = query(collection(db, 'customers'), limit(200));
      const custSnap = await getDocs(custQuery);
      const fetchedCust = custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(fetchedCust);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'Dashboard Statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Derived Core Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const thisWeekStart = startOfWeek(now);
    const thisMonthStart = startOfMonth(now);

    let todaySalesTotal = 0;
    let todayTxCount = 0;
    let yesterdaySalesTotal = 0;
    let weekSalesTotal = 0;
    let monthSalesTotal = 0;
    let totalItemsDispensedToday = 0;

    // Cost & Profit Estimation Map from Medications
    const medCostMap = new Map<string, number>();
    const medPriceMap = new Map<string, number>();
    medications.forEach(m => {
      medPriceMap.set(m.id, m.price || 0);
      // If no explicit costPrice, assume standard 30% margin baseline
      const estimatedCost = (m as any).costPrice || Math.round(m.price * 0.7);
      medCostMap.set(m.id, estimatedCost);
    });

    let todayCostOfGoods = 0;
    let totalCostOfGoods = 0;
    let allSalesTotal = 0;

    allSales.forEach(sale => {
      const saleDate = parseFirestoreDate(sale.timestamp);
      const amount = sale.totalAmount || 0;
      allSalesTotal += amount;

      // Calculate sale cost
      let saleCost = 0;
      (sale.items || []).forEach(item => {
        const itemCost = medCostMap.get(item.medicationId) || Math.round((item.price || 0) * 0.7);
        saleCost += itemCost * (item.quantity || 1);
      });
      totalCostOfGoods += saleCost;

      if (saleDate >= todayStart) {
        todaySalesTotal += amount;
        todayTxCount += 1;
        todayCostOfGoods += saleCost;
        (sale.items || []).forEach(item => {
          totalItemsDispensedToday += (item.quantity || 1);
        });
      } else if (isWithinInterval(saleDate, { start: yesterdayStart, end: yesterdayEnd })) {
        yesterdaySalesTotal += amount;
      }

      if (saleDate >= thisWeekStart) weekSalesTotal += amount;
      if (saleDate >= thisMonthStart) monthSalesTotal += amount;
    });

    const todayProfit = Math.max(0, todaySalesTotal - todayCostOfGoods);
    const todayMarginPercent = todaySalesTotal > 0 ? Math.round((todayProfit / todaySalesTotal) * 100) : 0;
    const avgBasketSize = todayTxCount > 0 ? Math.round(todaySalesTotal / todayTxCount) : 0;

    // Inventory status
    const totalDistinctMedications = medications.length;
    const totalStockUnits = medications.reduce((sum, m) => sum + (m.stockLevel || 0), 0);
    
    // Low stock: stockLevel < 20 or <= 10
    const lowStockItems = medications.filter(m => m.stockLevel <= 20);
    
    // Expired items: expiryDate < now
    const expiredItems = medications.filter(m => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      return !isNaN(exp.getTime()) && isBefore(exp, todayStart);
    });

    // Expiring soon (within 30 days)
    const expiringSoonItems = medications.filter(m => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      return !isNaN(exp.getTime()) && !isBefore(exp, todayStart) && isBefore(exp, addDays(todayStart, 30));
    });

    // Total Inventory Value
    const inventoryRetailValue = medications.reduce((sum, m) => sum + (m.price * m.stockLevel), 0);

    // Sales growth vs yesterday
    const salesGrowthVsYesterday = yesterdaySalesTotal > 0
      ? Math.round(((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100)
      : todaySalesTotal > 0 ? 100 : 0;

    return {
      todaySalesTotal,
      todayTxCount,
      todayProfit,
      todayMarginPercent,
      avgBasketSize,
      yesterdaySalesTotal,
      weekSalesTotal,
      monthSalesTotal,
      totalItemsDispensedToday,
      totalDistinctMedications,
      totalStockUnits,
      lowStockItems,
      expiredItems,
      expiringSoonItems,
      inventoryRetailValue,
      totalCustomers: customers.length,
      salesGrowthVsYesterday
    };
  }, [allSales, medications, customers]);

  // Chart: Trend over selected days (7d, 14d, 30d)
  const salesTrendData = useMemo(() => {
    const daysCount = chartTimeframe === '7d' ? 7 : chartTimeframe === '14d' ? 14 : 30;
    const result = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = subDays(now, i);
      const dayFormatted = format(dayDate, 'yyyy-MM-dd');
      const dayLabel = daysCount <= 7 ? format(dayDate, 'EEE') : format(dayDate, 'dd MMM');

      const daySales = allSales.filter(s => {
        const d = parseFirestoreDate(s.timestamp);
        return format(d, 'yyyy-MM-dd') === dayFormatted;
      });

      const totalRevenue = daySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
      const txCount = daySales.length;
      const estimatedProfit = Math.round(totalRevenue * 0.32); // Average ~32% margin

      result.push({
        date: dayLabel,
        fullDate: format(dayDate, 'dd MMM yyyy'),
        revenue: totalRevenue,
        profit: estimatedProfit,
        transactions: txCount
      });
    }
    return result;
  }, [allSales, chartTimeframe]);

  // Chart: Inventory by Category
  const categoryDistribution = useMemo(() => {
    const catMap: Record<string, { count: number; units: number; value: number }> = {};
    medications.forEach(med => {
      const cat = med.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { count: 0, units: 0, value: 0 };
      }
      catMap[cat].count += 1;
      catMap[cat].units += med.stockLevel || 0;
      catMap[cat].value += (med.price || 0) * (med.stockLevel || 0);
    });

    return Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        value: data.units,
        count: data.count,
        retailValue: data.value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [medications]);

  // Payment methods breakdown for today / range
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { cash: 0, mobile_money: 0, card: 0 };
    const amounts: Record<string, number> = { cash: 0, mobile_money: 0, card: 0 };

    allSales.forEach(s => {
      const method = s.paymentMethod || 'cash';
      counts[method] = (counts[method] || 0) + 1;
      amounts[method] = (amounts[method] || 0) + (s.totalAmount || 0);
    });

    const total = Object.values(amounts).reduce((a, b) => a + b, 0) || 1;
    return [
      { name: 'Cash', count: counts.cash || 0, amount: amounts.cash || 0, percentage: Math.round(((amounts.cash || 0) / total) * 100), color: '#10b981' },
      { name: 'Mobile Money', count: counts.mobile_money || 0, amount: amounts.mobile_money || 0, percentage: Math.round(((amounts.mobile_money || 0) / total) * 100), color: '#8b5cf6' },
      { name: 'Bank Card', count: counts.card || 0, amount: amounts.card || 0, percentage: Math.round(((amounts.card || 0) / total) * 100), color: '#3b82f6' }
    ];
  }, [allSales]);

  // Filtered Sales Table
  const filteredSales = useMemo(() => {
    const now = new Date();
    return allSales.filter(sale => {
      const saleDate = parseFirestoreDate(sale.timestamp);
      
      // Payment filter
      if (paymentFilter !== 'all' && sale.paymentMethod !== paymentFilter) return false;
      
      // Staff filter
      if (staffFilter !== 'all' && sale.soldBy !== staffFilter) return false;

      // Search term filter
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const idMatch = sale.id.toLowerCase().includes(query);
        const agentMatch = (sale.soldBy || '').toLowerCase().includes(query);
        const itemMatch = (sale.items || []).some(item => item.name.toLowerCase().includes(query));
        if (!idMatch && !agentMatch && !itemMatch) return false;
      }

      // Range filter
      if (reportRange === 'today') {
        return saleDate >= startOfDay(now);
      } else if (reportRange === '7d') {
        return saleDate >= subDays(now, 7);
      } else if (reportRange === '30d') {
        return saleDate >= subDays(now, 30);
      } else if (reportRange === 'custom') {
        return isWithinInterval(saleDate, {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        });
      }

      return true;
    });
  }, [allSales, paymentFilter, staffFilter, tableSearch, reportRange, startDate, endDate]);

  const uniqueAgents = Array.from(new Set(allSales.map(s => s.soldBy))).filter(Boolean);

  const navigateTo = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Live Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Core Operations Center
            </span>
            <span className="text-xs text-gray-400 font-mono">
              • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            Pharmacy Command Dashboard
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Real-time sales, live stock monitoring, patient registry, and automated clinical metrics for {PHARMACY_CONFIG.name}.
          </p>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
            title="Refresh metrics"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-600" : ""} />
            <span className="hidden sm:inline">Sync Live Data</span>
          </button>

          <button
            onClick={() => setIsDailyReportOpen(true)}
            className="px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-gray-700 hover:text-gray-900 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
          >
            <Printer size={14} className="text-gray-500" />
            <span>Daily Audit Report</span>
          </button>

          <button
            onClick={() => navigateTo('pos')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <ShoppingBag size={14} />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* 2. Quick-Action Command Strip */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 p-4 rounded-2xl border border-gray-800 text-white shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Quick Actions</h3>
            <p className="text-[11px] text-gray-400">Instant shortcuts for daily dispensary workflows</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigateTo('pos')}
            className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ShoppingBag size={13} />
            <span>New Sale (POS)</span>
          </button>

          <button
            onClick={() => navigateTo('inventory')}
            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <PlusCircle size={13} />
            <span>Add Medicine</span>
          </button>

          <button
            onClick={() => navigateTo('customers')}
            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <UserPlus size={13} />
            <span>Register Patient</span>
          </button>

          <button
            onClick={() => navigateTo('consultation')}
            className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Stethoscope size={13} />
            <span>Clinical Advisor</span>
          </button>
        </div>
      </div>

      {/* 3. Core 7 KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 💰 Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={22} />
            </div>
            <div className={cn(
              "flex items-center text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
              metrics.salesGrowthVsYesterday >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-red-700 bg-red-50 border border-red-100"
            )}>
              {metrics.salesGrowthVsYesterday >= 0 ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
              {metrics.salesGrowthVsYesterday >= 0 ? `+${metrics.salesGrowthVsYesterday}%` : `${metrics.salesGrowthVsYesterday}%`}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Sales</p>
            <p className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
              {canSeeFinancials ? `SLE ${metrics.todaySalesTotal.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Yesterday: SLE {metrics.yesterdaySalesTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 2. 🧾 Today's Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt size={22} />
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {metrics.totalItemsDispensedToday} Items
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Transactions</p>
            <p className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
              {metrics.todayTxCount} <span className="text-xs font-normal text-gray-400">receipts</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Avg Basket: SLE {metrics.avgBasketSize.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 3. 💵 Profit / Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp size={22} />
            </div>
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              ~{metrics.todayMarginPercent}% Margin
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Estimated Profit (Today)</p>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight mt-0.5">
              {canSeeFinancials ? `SLE ${metrics.todayProfit.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Week Revenue: SLE {metrics.weekSalesTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 4. 👥 Customers / Patients */}
        <div 
          onClick={() => navigateTo('customers')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Users size={22} />
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-600 transition-colors" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Patients &amp; Customers</p>
            <p className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
              {metrics.totalCustomers} <span className="text-xs font-normal text-gray-400">profiles</span>
            </p>
            <p className="text-[11px] text-teal-600 font-semibold mt-1 flex items-center gap-1">
              <span>View Customer Directory</span>
            </p>
          </div>
        </div>

        {/* 5. 📦 Total Stock Items */}
        <div 
          onClick={() => navigateTo('inventory')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
              <Package size={22} />
            </div>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {metrics.totalDistinctMedications} Types
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Stock Units</p>
            <p className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
              {metrics.totalStockUnits.toLocaleString()} <span className="text-xs font-normal text-gray-400">units</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Retail Value: SLE {metrics.inventoryRetailValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 6. ⚠️ Low-Stock Medicines */}
        <div 
          onClick={() => {
            setStockFilterView('low');
            navigateTo('inventory');
          }}
          className={cn(
            "p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer",
            metrics.lowStockItems.length > 0 ? "bg-amber-50/40 border-amber-200" : "bg-white border-gray-100"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={22} />
            </div>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
              metrics.lowStockItems.length > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"
            )}>
              {metrics.lowStockItems.length > 0 ? 'Needs Refill' : 'Optimal'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Low-Stock Medicines</p>
            <p className="text-2xl font-black text-amber-600 font-mono tracking-tight mt-0.5">
              {metrics.lowStockItems.length} <span className="text-xs font-normal text-gray-400">items</span>
            </p>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              {metrics.lowStockItems.length > 0 ? 'Stock ≤ 20 units (Click to restock)' : 'All drugs above safety threshold'}
            </p>
          </div>
        </div>

        {/* 7. ⛔ Expired Medicines */}
        <div 
          onClick={() => {
            setStockFilterView('expired');
            navigateTo('inventory');
          }}
          className={cn(
            "p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer",
            metrics.expiredItems.length > 0 ? "bg-red-50/40 border-red-200" : "bg-white border-gray-100"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <AlertOctagon size={22} />
            </div>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
              metrics.expiredItems.length > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-500"
            )}>
              {metrics.expiredItems.length > 0 ? 'Quarantine' : 'Zero Expired'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Expired Medicines</p>
            <p className="text-2xl font-black text-red-600 font-mono tracking-tight mt-0.5">
              {metrics.expiredItems.length} <span className="text-xs font-normal text-gray-400">batches</span>
            </p>
            <p className="text-[11px] text-red-700 font-semibold mt-1">
              {metrics.expiringSoonItems.length} expiring in next 30 days
            </p>
          </div>
        </div>

        {/* 8. 🛡️ Staff & Verification Status */}
        <div 
          onClick={() => navigateTo('staff')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Shield size={22} />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {staff?.role || 'Staff'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Staff Session</p>
            <p className="text-base font-bold text-gray-900 truncate mt-0.5">
              {staff?.name || user?.email || 'Active User'}
            </p>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              View Personnel &amp; Audit Logs →
            </p>
          </div>
        </div>
      </div>

      {/* 4. Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-lg">Sales &amp; Revenue Trend</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Continuous dispensing volume and estimated profit performance</p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
              {(['7d', '14d', '30d'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    chartTimeframe === tf ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  {tf === '7d' ? 'Last 7 Days' : tf === '14d' ? '14 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="dashboardRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashboardProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  tickFormatter={(val) => `SLE ${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`}
                />
                <Tooltip 
                  formatter={(val: any, name: string) => [
                    `SLE ${Number(val).toLocaleString()}`, 
                    name === 'revenue' ? 'Gross Revenue' : 'Est. Profit'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) return payload[0].payload.fullDate;
                    return label;
                  }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', 
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="revenue"
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#dashboardRevenueGrad)" 
                />
                {canSeeFinancials && (
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="profit"
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#dashboardProfitGrad)" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-gray-700">Gross Sales Revenue</span>
              </div>
              {canSeeFinancials && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border border-dashed border-blue-600" />
                  <span className="font-bold text-gray-700">Estimated Net Profit (~32%)</span>
                </div>
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Total Recorded Range: SLE {salesTrendData.reduce((a, b) => a + b.revenue, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Inventory Category Distribution Chart (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Inventory by Category</h3>
              <button 
                onClick={() => navigateTo('inventory')}
                className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wider"
              >
                Inventory →
              </button>
            </div>
            <p className="text-xs text-gray-400">Stock distribution across therapeutic drug classes</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.name] || PIE_PALETTE[index % PIE_PALETTE.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: string) => [`${Number(val).toLocaleString()} units`, name]}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400 text-xs">No inventory data available.</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-gray-900 font-mono">{metrics.totalDistinctMedications}</span>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Medicines</span>
            </div>
          </div>

          {/* Category Legend & Mini Values */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100 max-h-36 overflow-y-auto pr-1">
            {categoryDistribution.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: CATEGORY_COLORS[cat.name] || PIE_PALETTE[idx % PIE_PALETTE.length] }} 
                  />
                  <span className="text-gray-700 font-medium truncate">{cat.name}</span>
                </div>
                <span className="font-mono text-gray-500 text-[11px] font-bold shrink-0">{cat.value} u</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Payment Methods & Inventory Alerts Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Payment Methods Breakdown</h3>
          <div className="space-y-3">
            {paymentBreakdown.map((pm) => (
              <div key={pm.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700">{pm.name}</span>
                  <span className="font-mono text-gray-500 font-bold">
                    SLE {pm.amount.toLocaleString()} ({pm.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${pm.percentage}%`, backgroundColor: pm.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={16} />
              <span>Low-Stock Alerts ({metrics.lowStockItems.length})</span>
            </h3>
            <button 
              onClick={() => navigateTo('inventory')} 
              className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wider"
            >
              Restock →
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.lowStockItems.length > 0 ? (
              metrics.lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{item.category}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 font-mono font-black text-[11px] rounded-lg shrink-0">
                    {item.stockLevel} {item.unit}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <span>All items are comfortably stocked.</span>
              </div>
            )}
          </div>
        </div>

        {/* Expiry Risk Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 text-red-600">
              <AlertOctagon size={16} />
              <span>Expiry Risk Monitor</span>
            </h3>
            <button 
              onClick={() => navigateTo('inventory')} 
              className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-wider"
            >
              Audit →
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.expiredItems.length > 0 ? (
              metrics.expiredItems.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-red-50/70 border border-red-200 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-red-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-red-600 font-mono">Expired: {item.expiryDate}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[9px] rounded uppercase tracking-wider shrink-0">
                    EXPIRED
                  </span>
                </div>
              ))
            ) : metrics.expiringSoonItems.length > 0 ? (
              metrics.expiringSoonItems.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-amber-700 font-mono">Exp: {item.expiryDate}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold text-[9px] rounded uppercase tracking-wider shrink-0">
                    &lt;30 Days
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <span>No medications expiring in next 30 days.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent Transactions Table & Filter Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-0">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-lg">Recent Transactions</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Live audit log of all sales and dispensed medications</p>
          </div>

          {/* Table Search & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search invoice or medication..."
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-52 sm:w-64"
              />
            </div>

            <button 
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={cn(
                "px-3 py-2 border rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold",
                isFilterVisible ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
              )}
            >
              <Filter size={14} />
              <span>Filters</span>
            </button>

            <button
              onClick={() => navigateTo('pos')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle size={14} />
              <span>New POS Sale</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        <AnimatePresence>
          {isFilterVisible && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 py-4 bg-gray-50/40 border-b border-gray-100 flex flex-wrap gap-4 items-end"
            >
              {/* Range quick selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date Period</label>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
                  {(['today', '7d', '30d', 'custom'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setReportRange(r)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all uppercase tracking-wider",
                        reportRange === r ? "bg-emerald-50 text-emerald-700 font-black" : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {reportRange === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Custom Range</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                    />
                    <span className="text-gray-400 text-xs font-bold">to</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payment Method</label>
                <select 
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash Only</option>
                  <option value="card">Bank Card</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Dispensing Staff</label>
                <select 
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Staff</option>
                  {uniqueAgents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => {
                  setPaymentFilter('all');
                  setStaffFilter('all');
                  setTableSearch('');
                  setReportRange('today');
                }}
                className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider"
              >
                Reset Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date &amp; Time</th>
                <th className="px-6 py-4">Dispensed Items</th>
                <th className="px-6 py-4">Staff Agent</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredSales.slice(0, 15).map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-gray-700 uppercase">
                    #{sale.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">
                      {format(parseFirestoreDate(sale.timestamp), 'dd MMM yyyy')}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {format(parseFirestoreDate(sale.timestamp), 'HH:mm:ss')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-800">
                        {sale.items[0]?.name || 'Dispensed Medication'}
                        {sale.items.length > 1 && (
                          <span className="text-[10px] font-normal text-gray-400 ml-1">
                            +{sale.items.length - 1} more
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Total {sale.items.reduce((s, i) => s + (i.quantity || 1), 0)} unit(s)
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-700">
                      {sale.soldBy || 'Staff'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border",
                      sale.paymentMethod === 'cash' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      sale.paymentMethod === 'card' ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-purple-50 text-purple-700 border-purple-200"
                    )}>
                      {sale.paymentMethod ? sale.paymentMethod.replace('_', ' ') : 'Cash'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-sm text-gray-900">
                    {canSeeFinancials ? `SLE ${(sale.totalAmount || 0).toLocaleString()}` : "••••••"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(sale)}
                      className="p-1.5 bg-gray-100 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded-lg transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                      title="View & Print Receipt"
                    >
                      <Eye size={13} />
                      <span className="hidden sm:inline">Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-xs">No transactions match your current filters</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try changing the date period or clearing search queries.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {Math.min(filteredSales.length, 15)} of {filteredSales.length} matching transactions</span>
          <button 
            onClick={() => navigateTo('pos')}
            className="font-bold text-emerald-600 hover:underline uppercase tracking-wider text-[11px]"
          >
            Launch POS Terminal →
          </button>
        </div>
      </section>

      {/* 7. Structured Receipt View Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Receipt Header */}
              <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Transaction Receipt</span>
                  <h3 className="text-lg font-black text-white">{PHARMACY_CONFIG.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedReceipt(null)} 
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
                    <span>INV: #{selectedReceipt.id.slice(-8).toUpperCase()}</span>
                    <span>{format(parseFirestoreDate(selectedReceipt.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                </div>

                <div className="space-y-2 py-2 border-b border-dashed border-gray-200">
                  <div className="flex justify-between font-bold text-gray-600 text-[11px]">
                    <span>Item &amp; Qty</span>
                    <span>Amount</span>
                  </div>
                  {selectedReceipt.items.map((item, idx) => (
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
                    <span>SLE {selectedReceipt.totalAmount.toLocaleString()}</span>
                  </div>
                  {selectedReceipt.discountAmount && selectedReceipt.discountAmount > 0 ? (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({selectedReceipt.discountCode || 'Promo'}):</span>
                      <span>- SLE {selectedReceipt.discountAmount.toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300 font-sans">
                    <span>TOTAL DUE:</span>
                    <span className="text-emerald-600">SLE {selectedReceipt.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                    <span>Payment Method:</span>
                    <span className="uppercase font-bold text-gray-700">{selectedReceipt.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Dispensed by:</span>
                    <span className="font-semibold text-gray-700">{selectedReceipt.soldBy || 'Staff'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-600 font-bold pt-1">
                    <span>Status:</span>
                    <span>PAID IN FULL</span>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-sans space-y-0.5">
                  <p className="font-bold text-gray-600">Thank you for choosing {PHARMACY_CONFIG.name}!</p>
                  <p>Quality Healthcare &amp; Pharmaceuticals &bull; {PHARMACY_CONFIG.address}</p>
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
                  onClick={() => setSelectedReceipt(null)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Daily Audit Summary Report Modal */}
      <AnimatePresence>
        {isDailyReportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Daily Operations Audit</span>
                  <h3 className="text-lg font-black text-white">Daily Pharmacy Reconciliation Report</h3>
                  <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
                </div>
                <button 
                  onClick={() => setIsDailyReportOpen(false)} 
                  className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div id="printable-receipt" className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700 bg-white">
                {/* Pharmacy Banner */}
                <div className="text-center pb-4 border-b border-gray-200 space-y-1">
                  <h2 className="text-xl font-black text-gray-900">{PHARMACY_CONFIG.name}</h2>
                  <p className="text-xs text-gray-500">{PHARMACY_CONFIG.address}, {PHARMACY_CONFIG.country} • Tel: {PHARMACY_CONFIG.phoneDisplay}</p>
                  <p className="text-[11px] font-mono text-gray-400">Generated on {format(new Date(), 'dd MMM yyyy, HH:mm:ss')} by {staff?.name || 'Administrator'}</p>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Today's Revenue</p>
                    <p className="text-base font-black text-emerald-600 font-mono mt-0.5">SLE {metrics.todaySalesTotal.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Transactions</p>
                    <p className="text-base font-black text-gray-900 font-mono mt-0.5">{metrics.todayTxCount} sales</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Items Dispensed</p>
                    <p className="text-base font-black text-gray-900 font-mono mt-0.5">{metrics.totalItemsDispensedToday} units</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Est. Net Profit</p>
                    <p className="text-base font-black text-blue-600 font-mono mt-0.5">SLE {metrics.todayProfit.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider">Payment Method Reconciliation</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {paymentBreakdown.map(p => (
                      <div key={p.name} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                        <p className="font-bold text-gray-700">{p.name}</p>
                        <p className="text-sm font-black font-mono text-gray-900 mt-1">SLE {p.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{p.count} transactions</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventory Health Alert Note */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <AlertTriangle size={14} />
                    <span>Inventory Warnings:</span>
                  </p>
                  <p className="text-[11px]">
                    {metrics.lowStockItems.length} item(s) below reorder threshold (≤20 units). {metrics.expiredItems.length} expired batches detected.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={15} />
                  <span>Print Daily Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDailyReportOpen(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-2xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
