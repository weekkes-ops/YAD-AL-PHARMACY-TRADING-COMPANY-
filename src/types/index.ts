export enum StaffRole {
  ADMIN = 'admin',
  PHARMACIST = 'pharmacist',
  CASHIER = 'cashier',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer'
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isVerified: boolean;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  description?: string;
  category: string;
  price: number;
  stockLevel: number;
  unit: 'tablets' | 'capsules' | 'bottles' | 'tubes' | 'vials';
  expiryDate?: string;
  manufacturer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  medicationId: string;
  name: string;
  genericName?: string;
  quantity: number;
  price: number;
  manufacturer?: string;
  isRefill?: boolean;
  notes?: string;
  prescriptionNumber?: string;
  prescribingDoctor?: string;
  prescriptionDate?: string;
}

export interface Sale {
  id: string;
  customerId?: string;
  items: SaleItem[];
  totalAmount: number;
  discountAmount?: number;
  discountCode?: string;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
  soldBy: string;
  timestamp: string | any;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  medicalHistory?: string;
  allergies?: string[];
  createdAt: string | any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | any;
}

export interface Consultation {
  id: string;
  userId: string;
  messages: Message[];
  summary?: string;
  createdAt: string | any;
}

export interface StockLog {
  id: string;
  medicationId: string;
  medicationName: string;
  change: number;
  reason: string;
  performedBy: string;
  timestamp: string | any;
}

export type ActivityAction = 
  | 'login'
  | 'sale'
  | 'stock_update'
  | 'medication_add'
  | 'medication_update'
  | 'medication_delete'
  | 'customer_add'
  | 'staff_verify'
  | 'staff_role_update'
  | 'consultation';

export interface StaffActivity {
  id: string;
  staffId: string;
  staffName: string;
  action: ActivityAction;
  title: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string | any;
}

export interface PrescriptionSubmission {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAge?: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  doctorName?: string;
  notes?: string;
  fileName?: string;
  fileData?: string; // base64 or description
  status: 'pending' | 'reviewed' | 'ready' | 'dispensed' | 'cancelled';
  createdAt: string | any;
}

export interface PublicCartItem {
  medication: Medication;
  quantity: number;
}

export interface OnlineOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: 'pickup' | 'delivery';
  paymentMethod: 'orange_money' | 'africell_money' | 'cash';
  items: {
    medicationId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'ready' | 'completed';
  notes?: string;
  createdAt: string | any;
}

export interface ClinicAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string | any;
}

