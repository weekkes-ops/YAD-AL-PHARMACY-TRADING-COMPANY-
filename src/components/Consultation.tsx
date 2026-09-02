import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles,
  RefreshCcw,
  AlertCircle,
  FileText,
  Check,
  ClipboardList
} from 'lucide-react';
import { getConsultationResponse, summarizeConsultation } from '../services/gemini';
import { Message, Customer } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import { parseFirestoreDate } from '../lib/dateUtils';
import { PHARMACY_CONFIG } from '../config/pharmacy';

export function Consultation() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your health assistant from ${PHARMACY_CONFIG.name} (${PHARMACY_CONFIG.address}). How can I help you today? Please remember I provide general advice and am not a replacement for a medical professional.`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Customer | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientListOpen, setIsPatientListOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getConsultationResponse([...messages, userMessage]);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save or Update Firebase
      if (user) {
        try {
          if (!currentConsultationId) {
            const docRef = await addDoc(collection(db, 'consultations'), {
              userId: user.uid,
              patientId: selectedPatient?.id || null,
              messages: [...messages, userMessage, assistantMessage],
              createdAt: serverTimestamp()
            });
            setCurrentConsultationId(docRef.id);
          } else {
            await updateDoc(doc(db, 'consultations', currentConsultationId), {
              messages: [...messages, userMessage, assistantMessage],
              patientId: selectedPatient?.id || null,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'consultations');
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (messages.length < 3 || isSummarizing) return;
    
    setIsSummarizing(true);
    try {
      const result = await summarizeConsultation(messages.map(m => ({ role: m.role as any, content: m.content })));
      setSummary(result);
      
      if (currentConsultationId) {
        await updateDoc(doc(db, 'consultations', currentConsultationId), {
          summary: result,
          concludedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Summary error:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm your health assistant from ${PHARMACY_CONFIG.name} (${PHARMACY_CONFIG.address}). How can I help you today? Please remember I provide general advice and am not a replacement for a medical professional.`,
      timestamp: new Date().toISOString()
    }]);
    setSummary(null);
    setCurrentConsultationId(null);
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const filteredPatients = customers.filter(c => 
    c.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    c.phone?.includes(patientSearch)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-bold">AI Health Consultant</h2>
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Assistant Online</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center bg-emerald-700/50 rounded-lg border border-emerald-500/30 px-3 py-1.5 relative w-64">
          <UserIcon size={14} className="text-emerald-200 mr-2" />
          <input 
            type="text" 
            placeholder="Link a patient..." 
            value={selectedPatient ? selectedPatient.name : patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              if (selectedPatient) setSelectedPatient(null);
            }}
            onFocus={() => setIsPatientListOpen(true)}
            onBlur={() => setTimeout(() => setIsPatientListOpen(false), 200)}
            className="bg-transparent border-none outline-none text-xs text-white placeholder:text-emerald-200/50 w-full"
          />
          <AnimatePresence>
            {isPatientListOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto"
              >
                <div className="p-1">
                  {filteredPatients.length > 0 ? filteredPatients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setIsPatientListOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg transition-colors group"
                    >
                      <p className="text-[11px] font-bold text-gray-900 group-hover:text-emerald-600">{p.name}</p>
                      <p className="text-[9px] text-gray-500">{p.phone || 'No phone'}</p>
                    </button>
                  )) : (
                    <p className="p-2 text-[10px] text-gray-400 text-center italic">No patients found</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center space-x-2">
          {messages.length > 2 && !summary && (
            <button 
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
              title="Click to generate a clinical summary"
            >
              {isSummarizing ? (
                <Sparkles size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
            </button>
          )}
          <button 
            onClick={resetChat}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 p-3 px-4 flex items-start space-x-3 border-b border-amber-100">
        <AlertCircle size={18} className="text-amber-600 mt-0.5" />
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          This AI provides general information for educational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
        {messages.map((message, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn(
              "flex items-start space-x-3 max-w-[80%]",
              message.role === 'user' ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              message.role === 'user' ? "bg-emerald-600 text-white" : "bg-white border border-gray-100 shadow-sm text-gray-500"
            )}>
              {message.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl shadow-sm",
              message.role === 'user' 
                ? "bg-emerald-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-100 rounded-tl-none text-gray-800"
            )}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p className={cn(
                "text-[10px] mt-2 font-medium opacity-60",
                message.role === 'user' ? "text-right" : ""
              )}>
                {parseFirestoreDate(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-start space-x-3 max-w-[80%]">
            <div className="p-2 bg-white border border-gray-100 shadow-sm text-gray-500 rounded-lg">
              <Bot size={18} />
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-800 relative z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-500 rounded-lg">
                    <ClipboardList size={18} />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-widest">Consultation Summary</h3>
                </div>
                <div className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                  Generated by AI
                </div>
              </div>
              <div className="markdown-body text-xs leading-relaxed text-emerald-50 font-medium">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={resetChat}
                  className="px-4 py-2 bg-white text-emerald-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors flex items-center"
                >
                  <Check size={14} className="mr-2" />
                  Close & New Patient
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about symptoms, medications, or health tips..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale"
          >
            {isLoading ? <Sparkles size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
