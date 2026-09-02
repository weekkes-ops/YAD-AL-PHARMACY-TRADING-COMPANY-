import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ServicesSection } from './ServicesSection';
import { MedicineCatalog } from './MedicineCatalog';
import { PrescriptionUpload } from './PrescriptionUpload';
import { PublicConsultation } from './PublicConsultation';
import { AppointmentBooking } from './AppointmentBooking';
import { LocationContact } from './LocationContact';
import { HealthArticles } from './HealthArticles';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { StaffLoginModal } from './StaffLoginModal';
import { Medication, PublicCartItem } from '../../types';
import { PHARMACY_CONFIG } from '../../config/pharmacy';
import { MessageCircle, Phone, ShoppingBag, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicWebsiteProps {
  onOpenPortal: () => void;
}

export function PublicWebsite({ onOpenPortal }: PublicWebsiteProps) {
  const [cart, setCart] = useState<PublicCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('yadal_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save cart to local storage
  const saveCart = (newCart: PublicCartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('yadal_cart', JSON.stringify(newCart));
    } catch (e) {
      console.warn(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (medication: Medication, quantity: number = 1) => {
    const existingIndex = cart.findIndex((item) => item.medication.id === medication.id);
    let updatedCart: PublicCartItem[];

    if (existingIndex >= 0) {
      updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantity;
    } else {
      updatedCart = [...cart, { medication, quantity }];
    }

    saveCart(updatedCart);
  };

  const handleUpdateCartQuantity = (medicationId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.medication.id === medicationId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as PublicCartItem[];

    saveCart(updated);
  };

  const handleRemoveCartItem = (medicationId: string) => {
    const updated = cart.filter((item) => item.medication.id !== medicationId);
    saveCart(updated);
  };

  const handleClearCart = () => {
    saveCart([]);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSearch = (query: string) => {
    setCatalogSearchQuery(query);
    scrollToSection('catalog');
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-emerald-500 selection:text-white font-sans">
      {/* Global Navbar */}
      <Navbar
        onNavigate={scrollToSection}
        onOpenPortal={() => setIsStaffLoginOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={totalCartCount}
        onOpenPrescription={() => scrollToSection('prescription')}
        onOpenAiConsultation={() => scrollToSection('ai-consultant')}
      />

      {/* Main Public Flow */}
      <main className="flex-1">
        {/* 1. Hero */}
        <section id="hero">
          <Hero
            onSearch={handleHeroSearch}
            onOpenPrescription={() => scrollToSection('prescription')}
            onOpenAiConsultant={() => scrollToSection('ai-consultant')}
            onNavigateToCatalog={() => scrollToSection('catalog')}
            onNavigateToBooking={() => scrollToSection('booking')}
          />
        </section>

        {/* 2. Clinical Services */}
        <ServicesSection
          onOpenBooking={(serviceName) => {
            setSelectedServiceForBooking(serviceName);
            scrollToSection('booking');
          }}
          onOpenPrescription={() => scrollToSection('prescription')}
        />

        {/* 3. Medicine Catalog & Drug Directory */}
        <MedicineCatalog
          initialSearch={catalogSearchQuery}
          onAddToCart={handleAddToCart}
          onOpenPrescriptionUpload={() => scrollToSection('prescription')}
          onOpenAiConsultant={() => scrollToSection('ai-consultant')}
        />

        {/* 4. Prescription Upload & Tracker */}
        <PrescriptionUpload onSuccessToast={showToast} />

        {/* 5. AI Health & Drug Assistant */}
        <PublicConsultation onOpenBooking={() => scrollToSection('booking')} />

        {/* 6. In-Person Appointment Booking */}
        <AppointmentBooking
          initialService={selectedServiceForBooking}
          onSuccessToast={showToast}
        />

        {/* 7. Bo Location, Hours & Directions */}
        <LocationContact />

        {/* 8. Health Articles & FAQ */}
        <HealthArticles onOpenAiConsultant={() => scrollToSection('ai-consultant')} />
      </main>

      {/* Global Footer */}
      <Footer
        onNavigate={scrollToSection}
        onOpenPortal={() => setIsStaffLoginOpen(true)}
        onOpenPrescription={() => scrollToSection('prescription')}
        onOpenAiConsultant={() => scrollToSection('ai-consultant')}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderSuccess={(orderId) => {
          showToast(`Order confirmed with Ref #${orderId}`);
        }}
      />

      {/* Staff Login Modal */}
      <StaffLoginModal
        isOpen={isStaffLoginOpen}
        onClose={() => setIsStaffLoginOpen(false)}
        onSuccess={() => {
          setIsStaffLoginOpen(false);
          onOpenPortal();
        }}
      />

      {/* Floating Action Buttons (WhatsApp & Quick Call) */}
      <aside aria-label="Quick contact actions" className="fixed bottom-6 left-6 z-40 flex flex-col gap-3">
        <a
          href={`https://wa.me/${PHARMACY_CONFIG.whatsappNumber}?text=Hello%20YAD-AL%20PHARMACY%20TRADING%20COMPANY%2C%20I%20have%20an%20inquiry.`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-emerald-900/30 transition-transform cursor-pointer group"
          title="Chat with Pharmacist on WhatsApp"
        >
          <MessageCircle size={24} />
          <span className="sr-only">WhatsApp Chat</span>
        </a>
      </aside>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed top-24 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold border border-gray-800 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
