import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  MessageCircle,
  Truck,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Medication, PublicCartItem, OnlineOrder } from '../../types';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PublicCartItem[];
  onUpdateQuantity: (medicationId: string, delta: number) => void;
  onRemoveItem: (medicationId: string) => void;
  onClearCart: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'africell_money' | 'cash'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OnlineOrder | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + item.medication.price * item.quantity, 0);
  const deliveryFee = deliveryType === 'delivery' ? 15 : 0;
  const totalAmount = subtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || cart.length === 0) return;

    setIsSubmitting(true);
    const orderId = `ORD-YAD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: OnlineOrder = {
      id: orderId,
      customerName,
      customerPhone,
      customerAddress: deliveryType === 'delivery' ? deliveryAddress : PHARMACY_CONFIG.address,
      deliveryType,
      paymentMethod,
      items: cart.map((c) => ({
        medicationId: c.medication.id,
        name: c.medication.name,
        quantity: c.quantity,
        price: c.medication.price,
      })),
      totalAmount,
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'orders'), {
        ...newOrder,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore order write error (using local storage):', err);
    }

    try {
      const stored = JSON.parse(localStorage.getItem('yadal_orders') || '[]');
      localStorage.setItem('yadal_orders', JSON.stringify([newOrder, ...stored]));
    } catch (e) {
      console.warn(e);
    }

    setIsSubmitting(false);
    setConfirmedOrder(newOrder);
    onClearCart();
    onOrderSuccess(orderId);
  };

  const generateWhatsAppOrderText = (order: OnlineOrder) => {
    const itemsText = order.items.map((i) => `• ${i.quantity}x ${i.name} (NLe ${(i.price * i.quantity).toFixed(2)})`).join('%0A');
    return `Hello%20YAD-AL%20PHARMACY%20TRADING%20COMPANY%2C%0A%0AI%20have%20placed%20order%20Ref%3A%20${order.id}%0A%0A*Customer%20Name%3A*%20${encodeURIComponent(order.customerName)}%0A*Phone%3A*%20${order.customerPhone}%0A*Delivery%3A*%20${order.deliveryType === 'delivery' ? `Delivery%20to%20${encodeURIComponent(order.customerAddress)}` : 'In-Store%20Pickup%20(29%20Wilberforce%20St)'}%0A*Payment%3A*%20${order.paymentMethod}%0A%0A*Items%3A*%0A${itemsText}%0A%0A*Total%3A*%20NLe%20${order.totalAmount.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Your Medicine Cart</h3>
              <p className="text-[11px] text-gray-500">{cart.length} item(s) selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {confirmedOrder ? (
            /* Order Confirmed Screen */
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-gray-900">Order Placed Successfully!</h4>
                <p className="text-xs text-gray-600">
                  Thank you, <strong className="text-gray-900">{confirmedOrder.customerName}</strong>. Your order is registered with {PHARMACY_CONFIG.name}.
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Order Reference:</span>
                  <span className="font-mono font-black text-emerald-800 text-sm">{confirmedOrder.id}</span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-100 pt-1.5">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-mono font-black text-gray-900 text-sm">NLe {confirmedOrder.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-100 pt-1.5">
                  <span className="text-gray-500">Collection / Delivery:</span>
                  <span className="font-bold text-gray-800 capitalize">{confirmedOrder.deliveryType}</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=${generateWhatsAppOrderText(confirmedOrder)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageCircle size={16} />
                  <span>Send Order to Pharmacist via WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    setConfirmedOrder(null);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            /* Empty Cart */
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <ShoppingBag size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-gray-800">Your cart is empty</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Browse our catalog to add authentic certified medications, vitamins, and healthcare essentials.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Browse Medicines
              </button>
            </div>
          ) : (
            /* Cart Items List + Checkout Form */
            <div className="space-y-6">
              {/* Item Rows */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.medication.id}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-900 truncate">{item.medication.name}</h4>
                      <p className="text-[11px] font-mono text-emerald-700 font-bold">
                        NLe {item.medication.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(item.medication.id, -1)}
                          className="p-1 text-gray-500 hover:text-gray-900"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.medication.id, 1)}
                          className="p-1 text-gray-500 hover:text-gray-900"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.medication.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Patient &amp; Delivery Details
                </h4>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sahr Mattia"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number (Call/SMS) *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 078386123 or 033327227"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Delivery Option */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Fulfillment Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        deliveryType === 'pickup'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <div>In-Store Pickup</div>
                      <div className="text-[10px] text-gray-400 font-normal">29 Wilberforce St (Free)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        deliveryType === 'delivery'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <div>Freetown Delivery</div>
                      <div className="text-[10px] text-gray-400 font-normal">+NLe 15 delivery fee</div>
                    </button>
                  </div>
                </div>

                {deliveryType === 'delivery' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Delivery Address in Freetown *</label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Near Cotton Tree, Siaka Stevens St, Freetown"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="cash">Cash on Delivery / Pickup</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="africell_money">Africell Money</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Special Notes (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Please call before arriving"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Order Summary Pricing */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Medicines Subtotal:</span>
                    <span className="font-mono font-bold text-gray-900">NLe {subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryType === 'delivery' && (
                    <div className="flex items-center justify-between">
                      <span>Delivery Fee (Bo):</span>
                      <span className="font-mono font-bold text-gray-900">NLe {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-black text-gray-900">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-700">NLe {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Confirming Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm Order (NLe {totalAmount.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
