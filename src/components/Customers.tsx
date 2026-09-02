import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  AlertCircle, 
  History, 
  Edit2, 
  X,
  ChevronRight,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { logStaffActivity } from '../lib/activityLogger';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  allergies: string[];
  medicalHistory: string;
  createdAt: any;
  updatedAt: any;
}

export function Customers() {
  const { user, staff } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'contact' | 'allergies'; direction: 'asc' | 'desc' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    allergies: '',
    medicalHistory: ''
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a !== ''),
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), payload);
        if (staff) {
          logStaffActivity({
            staffId: staff.id,
            staffName: staff.name,
            action: 'customer_add',
            title: 'Updated Patient Info',
            description: `Updated record for patient ${payload.name}`
          });
        }
      } else {
        await addDoc(collection(db, 'customers'), {
          ...payload,
          createdAt: Timestamp.now()
        });
        if (staff) {
          logStaffActivity({
            staffId: staff.id,
            staffName: staff.name,
            action: 'customer_add',
            title: 'Registered Patient',
            description: `Created new patient profile for ${payload.name}`
          });
        }
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', allergies: '', medicalHistory: '' });
      fetchCustomers();
    } catch (error) {
      handleFirestoreError(error, editingCustomer ? OperationType.UPDATE : OperationType.CREATE, 'customers');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      allergies: customer.allergies.join(', '),
      medicalHistory: customer.medicalHistory
    });
    setIsModalOpen(true);
  };

  const handleSort = (key: 'name' | 'contact' | 'allergies') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCustomers = React.useMemo(() => {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortConfig.key === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortConfig.key === 'contact') {
        valA = a.email.toLowerCase() || a.phone;
        valB = b.email.toLowerCase() || b.phone;
      } else if (sortConfig.key === 'allergies') {
        valA = a.allergies.join(',').toLowerCase();
        valB = b.allergies.join(',').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchTerm, sortConfig]);

  const SortIcon = ({ column }: { column: 'name' | 'contact' | 'allergies' }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Directory</h2>
          <p className="text-sm text-gray-500 font-medium">Manage pharmacy patients and medical profiles</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', allergies: '', medicalHistory: '' });
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, phone or email..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 border border-gray-200 rounded-xl hover:bg-white text-gray-500 transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Customer Info
                    <SortIcon column="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => handleSort('contact')}
                >
                  <div className="flex items-center gap-2">
                    Contact Details
                    <SortIcon column="contact" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => handleSort('allergies')}
                >
                  <div className="flex items-center gap-2">
                    Allergies
                    <SortIcon column="allergies" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">Loading customers...</td></tr>
              ) : sortedCustomers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">No customers found</td></tr>
              ) : sortedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-lg">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-tight">{customer.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                          <History size={10} />
                          Member since {customer.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Phone size={12} className="text-gray-400" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Mail size={12} className="text-gray-400" />
                        {customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.allergies.length > 0 ? (
                        customer.allergies.map((allergy, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-md border border-red-100 flex items-center gap-1">
                            <AlertCircle size={8} />
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No allergies recorded</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(customer)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {editingCustomer ? 'Edit Customer Profile' : 'New Customer Registration'}
                  </h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Patient Management System</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="+232..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-2">
                      Allergies <span className="text-[10px] text-gray-400 font-normal normal-case">(Separate with commas)</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.allergies}
                      onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="e.g. Penicillin, Peanuts"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Medical History / Notes</label>
                    <textarea 
                      value={formData.medicalHistory}
                      onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium h-32 resize-none"
                      placeholder="Relevant medical information, chronic conditions, etc."
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-gray-600 font-bold uppercase tracking-widest text-[10px] border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {editingCustomer ? 'Update Profile' : 'Register Customer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// export default Customers; (Already handled by named export)
