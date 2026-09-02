import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  HeartPulse,
  Sun,
  Pill
} from 'lucide-react';
import { PHARMACY_CONFIG } from '../../config/pharmacy';

interface HealthArticlesProps {
  onOpenAiConsultant: () => void;
}

export function HealthArticles({ onOpenAiConsultant }: HealthArticlesProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const articles = [
    {
      id: 'malaria',
      title: 'Malaria Prevention & Rapid ACT Treatment in Sierra Leone',
      category: 'Infectious Disease',
      icon: ShieldCheck,
      iconColor: 'text-amber-600 bg-amber-50',
      summary: 'Prompt diagnosis using Rapid Diagnostic Tests (RDT) and taking the complete 3-day course of Artemisinin-based Combination Therapy (Coartem) prevents severe complications.'
    },
    {
      id: 'hypertension',
      title: 'Controlling High Blood Pressure (Hypertension) in Daily Life',
      category: 'Chronic Care',
      icon: HeartPulse,
      iconColor: 'text-rose-600 bg-rose-50',
      summary: 'Regular monthly blood pressure monitoring at our dispensary, adherence to prescribed Amlodipine or ACE inhibitors, and reducing sodium intake protect your heart.'
    },
    {
      id: 'storage',
      title: 'Proper Medication Storage in Sierra Leone\'s Tropical Climate',
      category: 'Pharmacology Safety',
      icon: Sun,
      iconColor: 'text-emerald-600 bg-emerald-50',
      summary: 'Keep oral suspensions, antibiotics, and insulin away from direct sunlight and excessive humidity to preserve chemical potency.'
    }
  ];

  const faqs = [
    {
      question: `Where is ${PHARMACY_CONFIG.name} located?`,
      answer: `We are centrally located at ${PHARMACY_CONFIG.address}, central Freetown, Sierra Leone. Our dispensary and trading premises are easily accessible for walk-in patients, commercial clients, and hospital referrals.`
    },
    {
      question: 'Can I upload a prescription and have medicines delivered in Freetown?',
      answer: 'Yes! You can upload a photo or document of your prescription on our website. Our clinical pharmacists will verify the items, prepare the exact dosage, and arrange delivery or in-store pickup.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Orange Money, Africell Money, Cash (NLe / SLL), and direct commercial bank transfers for wholesale medical supplies.'
    },
    {
      question: 'Do you offer emergency pharmacy dispensary during the night?',
      answer: `Yes, we have 24/7 on-call emergency dispensary service. For night-time emergency medications or critical clinical supplies, please call our telephone hotlines at ${PHARMACY_CONFIG.phoneDisplay}.`
    },
    {
      question: `Are all medications at ${PHARMACY_CONFIG.name} genuine and certified?`,
      answer: '100% yes. All our pharmaceutical stock and medical supplies are sourced strictly from licensed, certified manufacturers and stored according to rigorous clinical temperature guidelines.'
    }
  ];

  return (
    <section id="health-tips" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <BookOpen size={13} className="text-emerald-600" />
            <span>Health Guidance &amp; FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Patient Education &amp; Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Practical healthcare knowledge and clinical guidance tailored to Freetown and Sierra Leone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Health Guidance Cards */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-600" />
              <span>Clinical Health Highlights</span>
            </h3>

            {articles.map((art) => {
              const Icon = art.icon;
              return (
                <div
                  key={art.id}
                  className="bg-gray-50/70 hover:bg-white rounded-3xl p-6 border border-gray-200/80 hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200 ${art.iconColor}`}>
                      <Icon size={22} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded">
                        {art.category}
                      </span>
                      <h4 className="font-bold text-base text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">
                        {art.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {art.summary}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-6 rounded-3xl bg-teal-50 border border-teal-200 text-teal-950 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div>
                <h4 className="font-bold text-sm">Have a specific medical question?</h4>
                <p className="text-xs text-teal-800 mt-0.5">Consult with our AI assistant or talk directly with our pharmacist.</p>
              </div>
              <button
                onClick={onOpenAiConsultant}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
              >
                Ask Question
              </button>
            </div>
          </div>

          {/* Right Column: FAQ Accordion */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-emerald-600" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-gray-50/80 rounded-2xl border border-gray-200/80 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <span className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 shrink-0">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-200/60 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
