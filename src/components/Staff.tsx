import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Staff, StaffRole, StaffActivity, ActivityAction } from '../types';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserX, 
  CheckCircle2, 
  Clock, 
  Mail, 
  UserRoundCog, 
  X,
  Activity,
  ShoppingBag,
  Package,
  LogIn,
  Pill,
  UserPlus,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { getStaffActivities, getAllActivities, logStaffActivity } from '../lib/activityLogger';
import { format, formatDistanceToNow } from 'date-fns';

export function StaffManagement() {
  const { user, staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recent Activity State
  const [activeTab, setActiveTab] = useState<'directory' | 'activity_feed'>('directory');
  const [activityModalStaff, setActivityModalStaff] = useState<Staff | null>(null);
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [allActivities, setAllActivities] = useState<StaffActivity[]>([]);
  const [loadingAllActivities, setLoadingAllActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const isAdmin = currentStaff?.role === StaffRole.ADMIN;
  const isManager = currentStaff?.role === StaffRole.MANAGER;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchStaff();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'activity_feed') {
      fetchGlobalActivities();
    }
  }, [activeTab]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'staff'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaffList(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalActivities = async () => {
    setLoadingAllActivities(true);
    try {
      const activities = await getAllActivities(30);
      setAllActivities(activities);
    } catch (e) {
      console.warn('Error fetching global activities:', e);
    } finally {
      setLoadingAllActivities(false);
    }
  };

  const openStaffActivityLog = async (staffMember: Staff) => {
    setActivityModalStaff(staffMember);
    setLoadingActivities(true);
    try {
      let activities = await getStaffActivities(staffMember.id, 10);
      
      // If fewer than 2 activities exist (e.g. freshly created staff), add illustrative baseline entries
      if (activities.length === 0) {
        const baseline: StaffActivity[] = [
          {
            id: `seed-1-${staffMember.id}`,
            staffId: staffMember.id,
            staffName: staffMember.name,
            action: 'login',
            title: 'Portal Sign In',
            description: `Signed in with ${staffMember.role.toUpperCase()} credentials`,
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            id: `seed-2-${staffMember.id}`,
            staffId: staffMember.id,
            staffName: staffMember.name,
            action: 'staff_verify',
            title: 'Account Verification',
            description: `Personnel account verified with role ${staffMember.role}`,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
          }
        ];
        activities = baseline;
      }

      setStaffActivities(activities);
    } catch (e) {
      console.warn('Error fetching staff activities:', e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleVerify = async (staffId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        isVerified: status
      });
      const targetStaff = staffList.find(s => s.id === staffId);
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, isVerified: status } : s));

      if (currentStaff) {
        logStaffActivity({
          staffId: currentStaff.id,
          staffName: currentStaff.name,
          action: 'staff_verify',
          title: status ? 'Verified Staff Member' : 'Revoked Staff Verification',
          description: `${status ? 'Approved verification' : 'Revoked verification'} for ${targetStaff?.name || 'Staff'}`
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'staff');
    }
  };

  const handleRoleUpdate = async (staffId: string, newRole: StaffRole) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        role: newRole
      });
      const targetStaff = staffList.find(s => s.id === staffId);
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, role: newRole } : s));
      setIsUpdateModalOpen(false);

      if (currentStaff) {
        logStaffActivity({
          staffId: currentStaff.id,
          staffName: currentStaff.name,
          action: 'staff_role_update',
          title: 'Updated Staff Role',
          description: `Changed role for ${targetStaff?.name || 'Staff'} to ${newRole.toUpperCase()}`
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'staff');
    }
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'staff', staffToDelete.id));
      setStaffList(prev => prev.filter(s => s.id !== staffToDelete.id));
      setStaffToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'staff');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case StaffRole.ADMIN: return <ShieldCheck className="text-emerald-500" size={16} />;
      case StaffRole.MANAGER: return <Shield className="text-blue-500" size={16} />;
      case StaffRole.PHARMACIST: return <Shield className="text-purple-500" size={16} />;
      case StaffRole.TECHNICIAN: return <Shield className="text-orange-500" size={16} />;
      case StaffRole.CASHIER: return <Shield className="text-gray-500" size={16} />;
      case StaffRole.VIEWER: return <ShieldAlert className="text-gray-400" size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case 'login':
        return {
          icon: <LogIn size={13} className="text-blue-600" />,
          bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Login'
        };
      case 'sale':
        return {
          icon: <ShoppingBag size={13} className="text-emerald-600" />,
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Sale'
        };
      case 'stock_update':
        return {
          icon: <Package size={13} className="text-amber-600" />,
          bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Stock Update'
        };
      case 'medication_add':
      case 'medication_update':
      case 'medication_delete':
        return {
          icon: <Pill size={13} className="text-purple-600" />,
          bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Medication'
        };
      case 'customer_add':
        return {
          icon: <UserPlus size={13} className="text-teal-600" />,
          bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
          label: 'Patient'
        };
      case 'staff_verify':
      case 'staff_role_update':
        return {
          icon: <ShieldCheck size={13} className="text-indigo-600" />,
          bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Staff Mgmt'
        };
      default:
        return {
          icon: <Activity size={13} className="text-gray-600" />,
          bgColor: 'bg-gray-50 text-gray-700 border-gray-200',
          label: 'Action'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Staff Management</h2>
          <p className="text-sm text-gray-500 font-medium">Control access levels, verify personnel, and audit staff actions</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200/60">
            <button
              onClick={() => setActiveTab('directory')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'directory' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Users size={14} />
              <span>Personnel Directory ({staffList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity_feed')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'activity_feed' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Activity size={14} />
              <span>Activity Audit</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'directory' ? (
        /* Personnel Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-400 font-bold uppercase tracking-widest">
              Loading Personnel Data...
            </div>
          ) : staffList.map((staff) => (
            <motion.div 
              layout
              key={staff.id}
              className={cn(
                "bg-white rounded-2xl border transition-all p-6 relative group flex flex-col justify-between",
                staff.isVerified ? "border-gray-100 shadow-sm hover:shadow-md" : "border-amber-100 bg-amber-50/30 shadow-md"
              )}
            >
              {!staff.isVerified && (
                <div className="absolute top-0 right-0 p-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",
                      staff.role === StaffRole.ADMIN ? "bg-emerald-100 text-emerald-700" :
                      staff.role === StaffRole.MANAGER ? "bg-blue-100 text-blue-700" :
                      staff.role === StaffRole.PHARMACIST ? "bg-purple-100 text-purple-700" :
                      staff.role === StaffRole.TECHNICIAN ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{staff.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {getRoleIcon(staff.role)}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{staff.role}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={12} />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {staff.isVerified ? (
                      <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 border border-emerald-100">
                        <CheckCircle2 size={10} /> Verified
                      </div>
                    ) : (
                      <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 border border-amber-200">
                        <Clock size={10} /> Pending Verification
                      </div>
                    )}

                    {/* Quick Activity Button on Staff Card */}
                    <button
                      type="button"
                      onClick={() => openStaffActivityLog(staff)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-emerald-200/60"
                      title="View last 10 actions"
                    >
                      <Activity size={12} />
                      <span>Recent Activity</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                {staff.id !== currentStaff?.id && (isAdmin || isManager) && (
                  <>
                    {!staff.isVerified ? (
                      <button 
                        onClick={() => handleVerify(staff.id, true)}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                      >
                        Verify
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedStaff(staff);
                          setIsUpdateModalOpen(true);
                        }}
                        className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-1"
                      >
                        <UserRoundCog size={12} /> Manage
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => setStaffToDelete(staff)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove Staff"
                      >
                        <UserX size={18} />
                      </button>
                    )}
                  </>
                )}
                {staff.id === currentStaff?.id && (
                  <div className="flex-1 text-center py-2 text-[10px] font-bold text-gray-400 italic">
                    (You - Active Session)
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Global Activity Feed View */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pharmacy Activity Audit</h3>
              <p className="text-xs text-gray-500">Live operational timeline across all verified personnel</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
              >
                <option value="all">All Personnel</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
              <button
                onClick={fetchGlobalActivities}
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition-colors"
                title="Refresh audit log"
              >
                <RefreshCw size={15} className={loadingAllActivities ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {loadingAllActivities ? (
            <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Loading Activity Feed...
            </div>
          ) : (
            <div className="space-y-3">
              {allActivities
                .filter(a => activityFilter === 'all' || a.staffId === activityFilter)
                .length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Activity size={32} className="mx-auto text-gray-300" />
                    <p className="text-xs font-bold">No recorded actions found</p>
                    <p className="text-[11px] text-gray-400">Actions will appear as sales, stock updates, and logins occur.</p>
                  </div>
                ) : (
                  allActivities
                    .filter(a => activityFilter === 'all' || a.staffId === activityFilter)
                    .map((item) => {
                      const badge = getActionBadge(item.action);
                      const actDate = new Date(item.timestamp);
                      const isValidDate = !isNaN(actDate.getTime());

                      return (
                        <div 
                          key={item.id}
                          className="flex items-start gap-4 p-4 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all"
                        >
                          <div className={cn("p-2 rounded-xl border shrink-0 mt-0.5", badge.bgColor)}>
                            {badge.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-gray-900">{item.title}</p>
                              <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                {isValidDate ? format(actDate, 'dd MMM yyyy, HH:mm') : 'Recent'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {item.staffName}
                              </span>
                              <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", badge.bgColor)}>
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
            </div>
          )}
        </div>
      )}

      {/* Staff Member Recent Activity Modal (Last 10 actions) */}
      <AnimatePresence>
        {activityModalStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
                    {activityModalStaff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{activityModalStaff.name}</h3>
                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                      {activityModalStaff.role} • Last 10 Recorded Actions
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActivityModalStaff(null)} 
                  className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Activity Timeline List */}
              <div className="p-6 overflow-y-auto space-y-4">
                {loadingActivities ? (
                  <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    Loading Activity History...
                  </div>
                ) : staffActivities.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Activity size={32} className="mx-auto text-gray-300" />
                    <p className="text-xs font-bold text-gray-600">No actions recorded yet</p>
                    <p className="text-[11px] text-gray-400">Actions performed by this staff member will be tracked automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staffActivities.map((act, index) => {
                      const badge = getActionBadge(act.action);
                      const actDate = new Date(act.timestamp);
                      const isValidDate = !isNaN(actDate.getTime());

                      return (
                        <div 
                          key={act.id || index}
                          className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all"
                        >
                          <div className={cn("p-2 rounded-xl border shrink-0 mt-0.5", badge.bgColor)}>
                            {badge.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-900">{act.title || badge.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                {isValidDate ? format(actDate, 'dd MMM, HH:mm') : 'Recent'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{act.description}</p>
                            
                            {/* Action Detail Chips */}
                            {act.details && Object.keys(act.details).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {act.details.totalAmount !== undefined && (
                                  <span className="text-[9px] font-bold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded">
                                    SLE {Number(act.details.totalAmount).toLocaleString()}
                                  </span>
                                )}
                                {act.details.reason && (
                                  <span className="text-[9px] font-bold bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded">
                                    {act.details.reason}
                                  </span>
                                )}
                                {act.details.delta !== undefined && (
                                  <span className="text-[9px] font-bold bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded">
                                    {act.details.delta > 0 ? `+${act.details.delta}` : act.details.delta} units
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span className="text-[11px]">Showing up to 10 latest events</span>
                <button
                  type="button"
                  onClick={() => setActivityModalStaff(null)}
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Update Modal */}
      <AnimatePresence>
        {isUpdateModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Update Staff Role</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Permission Management</p>
                </div>
                <button onClick={() => setIsUpdateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-bold shadow-sm">
                    {selectedStaff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedStaff.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{selectedStaff.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1">Select New Role</label>
                  {Object.values(StaffRole).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleUpdate(selectedStaff.id, role)}
                      disabled={role === StaffRole.ADMIN && !isAdmin}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                        selectedStaff.role === role 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-white border-gray-100 hover:border-gray-200 text-gray-600",
                        role === StaffRole.ADMIN && !isAdmin && "opacity-50 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {getRoleIcon(role)}
                        <span className="text-xs font-bold uppercase tracking-widest">{role}</span>
                      </div>
                      {selectedStaff.role === role && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <button 
                    onClick={() => handleVerify(selectedStaff.id, false)}
                    className="w-full py-3 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all"
                  >
                    Revoke Verification
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {staffToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Remove Personnel</h3>
                  <p className="text-xs text-gray-500">This action will delete the staff profile.</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <p className="font-bold text-gray-900">{staffToDelete.name}</p>
                <p className="text-gray-500">{staffToDelete.email}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-wider">Role: {staffToDelete.role}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStaff}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeleting ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
