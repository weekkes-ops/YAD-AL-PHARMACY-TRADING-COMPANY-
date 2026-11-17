import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  ShieldCheck, 
  MessageSquare, 
  Phone, 
  RotateCcw,
  Stethoscope,
  Info,
  ChevronRight
} from 'lucide-react';
import { getConsultationResponse } from '../../services/gemini';
import { Message } from '../../types';
import ReactMarkdown from 'react-markdown';
import { PHARMACY_CONFIG } from '../../config/pharmacy';

interface PublicConsultationProps {
  onOpenBooking?: () => void;
}

export function PublicConsultation({ onOpenBooking }: PublicConsultationProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your **${PHARMACY_CONFIG.name} AI Clinical Assistant** here at 29 Wilberforce Street, Freetown, Sierra Leone.\n\nI can help you understand your symptoms, explain medication dosages and over-the-counter options, or check drug interactions. How may I assist your health today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiReply = await getConsultationResponse(chatHistory);

      const botMessage: Message = {
        role: 'assistant',
        content: aiReply || `I could not process that request. Please speak directly with our pharmacist at ${PHARMACY_CONFIG.address} or call ${PHARMACY_CONFIG.phoneDisplay}.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('AI consultation failed:', err);
      const fallbackMsg: Message = {
        role: 'assistant',
        content: `I'm having trouble connecting right now. For urgent health concerns, please call our dispensary directly at **${PHARMACY_CONFIG.phoneDisplay}** or visit us at **${PHARMACY_CONFIG.address}**.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'How do I treat suspected malaria with Coartem?',
    'What should I do for high blood pressure symptoms?',
    'Safe pain relief for children with fever',
    'Are there side effects taking Augmentin on an empty stomach?'
  ];

  return (
    <section id="ai-consultant" className="py-20 bg-gradient-to-b from-gray-50 to-teal-50/40 border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-bold border border-teal-200 shadow-xs">
            <Sparkles size={13} className="text-teal-600" />
            <span>AI Clinical Health Advisor</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            24/7 AI Health &amp; Drug Assistant
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Ask any questions about medication dosages, side effects, tropical symptoms, or when to visit our dispensary at {PHARMACY_CONFIG.address}.
          </p>
        </div>

        {/* Chat Card */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden flex flex-col h-[560px]">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-teal-300">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>SUSSEX PHARMCY AI Health Advisor</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-teal-200">Freetown &amp; Sierra Leone Health Context Aware &bull; Free &amp; Confidential</p>
              </div>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    role: 'assistant',
                    content: `Hello! I am your **${PHARMACY_CONFIG.name} AI Clinical Assistant** here at ${PHARMACY_CONFIG.address}.\n\nI can help you understand your symptoms, explain medication dosages and over-the-counter options, or check drug interactions. How may I assist your health today?`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Reset Conversation"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/40">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200 text-xs font-bold mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                  }`}
                >
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-gray-500">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl py-3 px-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-gray-400 font-semibold ml-1">Analyzing medical knowledge...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-gray-100/70 border-t border-gray-200 overflow-x-auto flex items-center gap-2 scrollbar-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Suggestions:</span>
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 text-gray-600 text-[11px] font-medium border border-gray-200 shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about medications, dosages, symptoms, or health advice in Freetown..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold transition-all shadow-md shrink-0 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Clinical Disclaimer & Pharmacist Escalate Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Clinical Notice:</strong> This AI assistant provides preliminary health information and does not substitute a licensed physician's diagnosis. For severe symptoms or emergency care, visit a hospital emergency department or consult our on-duty pharmacist at {PHARMACY_CONFIG.address}.
            </p>
          </div>

          <a
            href={`tel:${PHARMACY_CONFIG.primaryPhone}`}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-900 font-bold text-[11px] rounded-xl border border-amber-200 hover:bg-amber-50 shrink-0 shadow-xs"
          >
            <Phone size={12} className="text-amber-600" />
            <span>Call Pharmacist</span>
          </a>
        </div>
      </div>
    </section>
  );
}
