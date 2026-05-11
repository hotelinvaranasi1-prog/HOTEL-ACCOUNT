import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, AlertCircle, CalendarCheck2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { createBooking } from '../services/firebaseService';

// Declare global for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceAssistantProps {
  onNavigate: (page: 'dashboard' | 'room-grid' | 'bookings' | 'reports' | 'settings') => void;
}

interface BookingDraft {
  room_number?: string;
  guest_name?: string;
  booking_type?: 'Walk-in' | 'OTA';
  ota_source?: string;
  room_price?: number;
}

export default function VoiceAssistant({ onNavigate }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({});
  const recognitionRef = useRef<any>(null);
  
  const submitBooking = async (details: BookingDraft) => {
    setIsProcessing(true);
    try {
      if (!details.room_number || !details.guest_name || !details.booking_type || !details.room_price) {
        throw new Error("Incomplete booking details");
      }

      await createBooking({
        id: 'temp-' + Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        check_in: new Date().toISOString().split('T')[0],
        check_out: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        room_number: details.room_number,
        guest_name: details.guest_name,
        guest_phone: '',
        booking_type: details.booking_type,
        ota_source: details.ota_source || '',
        room_price: details.room_price,
        misc_charges: 0,
        discount: 0,
        total_amount: details.room_price,
        cash_paid: 0,
        online_paid: 0,
        payment_history: [],
        payment_status: 'Unpaid',
        balance_amount: details.room_price,
        commission_amount: 0,
        net_profit: details.room_price,
        booking_status: 'Active',
        gst_invoice_status: 'Pending',
        created_at: new Date().toISOString(),
      });

      setFeedback(`Successfully reserved Room ${details.room_number} for ${details.guest_name}!`);
      setBookingDraft({});
      onNavigate('bookings');
    } catch (err: any) {
      console.error(err);
      setError(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = useCallback(async (text: string) => {
    const cmd = text.toLowerCase();
    
    // Quick Navigation Check
    if (cmd.includes('dashboard') || cmd.includes('home')) {
      onNavigate('dashboard');
      setFeedback('Opening Dashboard');
      setBookingDraft({});
      return true;
    }
    if (cmd.includes('room') || cmd.includes('grid')) {
      onNavigate('room-grid');
      setFeedback('Opening Room Grid');
      setBookingDraft({});
      return true;
    }
    if (cmd.includes('booking') || cmd.includes('list')) {
      onNavigate('bookings');
      setFeedback('Opening Booking Records');
      setBookingDraft({});
      return true;
    }
    if (cmd.includes('report') || cmd.includes('financial')) {
      onNavigate('reports');
      setFeedback('Opening Reports');
      setBookingDraft({});
      return true;
    }
    if (cmd.includes('setting')) {
      onNavigate('settings');
      setFeedback('Opening Settings');
      setBookingDraft({});
      return true;
    }

    // AI Check for Reservations (Disabled)
    return false;
  }, [onNavigate, bookingDraft]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript('');
    // Don't clear feedback if we have an active draft, helps the "conversation"
    if (!bookingDraft.room_number) setFeedback(null);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);

      if (event.results[current].isFinal) {
        processCommand(result).then(recognized => {
          if (!recognized && !bookingDraft.room_number) {
            setFeedback(`Command not recognized: "${result}"`);
          }
          setTimeout(() => {
            setIsListening(false);
            setTranscript('');
          }, 2000);
        });
      }
    };

    recognition.onerror = (event: any) => {
      // "aborted" error is usually harmless (happens if we stop/abort manually or browser finishes session)
      if (event.error === 'aborted') {
        setIsListening(false);
        return;
      }

      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in browser settings.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Small delay
      setTimeout(() => setIsListening(false), 2000);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {(isListening || feedback || error || isProcessing || bookingDraft.room_number) && (
          <motion.div
            key="voice-assistant-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm transition-colors duration-500",
              error ? "bg-rose-50 border-rose-100 text-rose-600" : 
              feedback?.includes('not recognized') ? "bg-amber-50 border-amber-100 text-amber-600" :
              "bg-white/90 border-slate-100 text-slate-800"
            )}
          >
            <div className="flex items-start gap-3">
              {error ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : isProcessing ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
              ) : bookingDraft.room_number ? (
                <CalendarCheck2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              )}
              
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest opacity-50">
                    {isListening ? 'Listening...' : isProcessing ? 'AI Processing...' : error ? 'Error' : 'Voice Assistant'}
                  </p>
                  {bookingDraft.room_number && (
                    <button 
                      onClick={() => setBookingDraft({})}
                      className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full hover:bg-slate-200"
                    >
                      Reset Draft
                    </button>
                  )}
                </div>
                
                <p className="text-sm font-bold leading-tight">
                  {error || feedback || transcript || 'How can I help you today?'}
                </p>

                {bookingDraft.room_number && !error && !isProcessing && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Current Draft</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <DraftItem label="Room" value={bookingDraft.room_number} />
                      <DraftItem label="Guest" value={bookingDraft.guest_name} />
                      <DraftItem label="Type" value={bookingDraft.booking_type} />
                      <DraftItem label="Price" value={bookingDraft.room_price ? `₹${bookingDraft.room_price}` : null} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={isListening ? stopListening : startListening}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group",
          isListening 
            ? "bg-rose-500 hover:bg-rose-600 scale-110" 
            : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
        )}
      >
        {isListening && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-rose-500 rounded-full"
          />
        )}
        <div className="relative">
          {isListening ? (
            <Mic className="w-8 h-8 text-white" />
          ) : (
            <MicOff className="w-8 h-8 text-white/80 group-hover:text-white" />
          )}
        </div>
      </button>
    </div>
  );
}

function DraftItem({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-400">{label}:</span>
      <span className={cn("font-bold", value ? "text-slate-700" : "text-rose-400 italic font-medium")}>
        {value || "Missing"}
      </span>
    </div>
  );
}
