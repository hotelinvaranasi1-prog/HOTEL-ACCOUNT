import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Calculator, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, BookingType, PaymentStatus, BookingStatus, PaymentMode } from '../types';
import { cn } from '../lib/utils';
import { format, differenceInDays, parseISO, addDays, isSameDay } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { createBooking, updateBooking, deleteBooking } from '../services/firebaseService';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber: string;
  booking?: Booking | null;
}

export default function BookingModal({ isOpen, onClose, roomNumber, booking }: BookingModalProps) {
  const [formData, setFormData] = useState<Booking>({
    id: booking?.id || '',
    date: booking?.date || new Date().toISOString().split('T')[0],
    check_in: booking?.check_in || new Date().toISOString().split('T')[0],
    check_out: booking?.check_out || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    room_number: roomNumber,
    guest_name: booking?.guest_name || '',
    guest_phone: booking?.guest_phone || '',
    
    // New optional fields
    guest_alt_phone: booking?.guest_alt_phone || '',
    guest_email: booking?.guest_email || '',
    guest_address: booking?.guest_address || '',
    guest_city: booking?.guest_city || '',
    guest_state: booking?.guest_state || '',
    guest_country: booking?.guest_country || '',
    guest_pincode: booking?.guest_pincode || '',
    guest_nationality: booking?.guest_nationality || '',
    guest_id_type: booking?.guest_id_type || '',
    guest_id_number: booking?.guest_id_number || '',
    company_name: booking?.company_name || '',
    company_gst: booking?.company_gst || '',
    adults: booking?.adults || 1,
    children: booking?.children || 0,
    pets: booking?.pets || 0,
    purpose_of_visit: booking?.purpose_of_visit || '',
    vehicle_number: booking?.vehicle_number || '',
    special_requests: booking?.special_requests || '',
    notes: booking?.notes || '',

    booking_type: booking?.booking_type || 'Walk-in',
    ota_source: booking?.ota_source || '',
    room_price: booking?.room_price || 0,
    misc_charges: booking?.misc_charges || 0,
    discount: booking?.discount || 0,
    total_amount: booking?.total_amount || 0,
    cash_paid: booking?.cash_paid || 0,
    online_paid: booking?.online_paid || 0,
    payment_history: booking?.payment_history || [],
    payment_status: booking?.payment_status || 'Unpaid',
    balance_amount: booking?.balance_amount || 0,
    commission_amount: booking?.commission_amount || 0,
    net_profit: booking?.net_profit || 0,
    booking_status: booking?.booking_status || 'Active',
    gst_invoice_status: booking?.gst_invoice_status || 'Pending',
    created_at: booking?.created_at || new Date().toISOString(),
  });

  const [initialPaymentMode, setInitialPaymentMode] = useState<PaymentMode>('Cash');

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 1)
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({
        ...booking,
        id: booking.id || '',
        date: booking.date || new Date().toISOString().split('T')[0],
        check_in: booking.check_in || new Date().toISOString().split('T')[0],
        check_out: booking.check_out || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        room_number: booking.room_number || '',
        guest_name: booking.guest_name || '',
        guest_phone: booking.guest_phone || '',
        
        guest_alt_phone: booking.guest_alt_phone || '',
        guest_email: booking.guest_email || '',
        guest_address: booking.guest_address || '',
        guest_city: booking.guest_city || '',
        guest_state: booking.guest_state || '',
        guest_country: booking.guest_country || '',
        guest_pincode: booking.guest_pincode || '',
        guest_nationality: booking.guest_nationality || '',
        guest_id_type: booking.guest_id_type || '',
        guest_id_number: booking.guest_id_number || '',
        company_name: booking.company_name || '',
        company_gst: booking.company_gst || '',
        adults: booking.adults || 1,
        children: booking.children || 0,
        pets: booking.pets || 0,
        purpose_of_visit: booking.purpose_of_visit || '',
        vehicle_number: booking.vehicle_number || '',
        special_requests: booking.special_requests || '',
        notes: booking.notes || '',

        booking_type: booking.booking_type || 'Walk-in',
        ota_source: booking.ota_source || '',
        room_price: booking.room_price || 0,
        misc_charges: booking.misc_charges || 0,
        discount: booking.discount || 0,
        total_amount: booking.total_amount || 0,
        cash_paid: booking.cash_paid || 0,
        online_paid: booking.online_paid || 0,
        payment_history: booking.payment_history || [],
        payment_status: booking.payment_status || 'Unpaid',
        balance_amount: booking.balance_amount || 0,
        commission_amount: booking.commission_amount || 0,
        net_profit: booking.net_profit || 0,
        booking_status: booking.booking_status || 'Active',
        gst_invoice_status: booking.gst_invoice_status || 'Pending',
        created_at: booking.created_at || new Date().toISOString(),
      });
      setDateRange({
        from: parseISO(booking.check_in),
        to: parseISO(booking.check_out)
      });
    } else {
      setFormData({
        id: '',
        date: new Date().toISOString().split('T')[0],
        check_in: new Date().toISOString().split('T')[0],
        check_out: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        room_number: roomNumber,
        guest_name: '',
        guest_phone: '',
        guest_alt_phone: '',
        guest_email: '',
        guest_address: '',
        guest_city: '',
        guest_state: '',
        guest_country: '',
        guest_pincode: '',
        guest_nationality: '',
        guest_id_type: '',
        guest_id_number: '',
        company_name: '',
        company_gst: '',
        adults: 1,
        children: 0,
        pets: 0,
        purpose_of_visit: '',
        vehicle_number: '',
        special_requests: '',
        notes: '',
        booking_type: 'Walk-in',
        ota_source: '',
        room_price: 0,
        misc_charges: 0,
        discount: 0,
        total_amount: 0,
        cash_paid: 0,
        online_paid: 0,
        payment_history: [],
        payment_status: 'Unpaid',
        balance_amount: 0,
        commission_amount: 0,
        net_profit: 0,
        booking_status: 'Active',
        gst_invoice_status: 'Pending',
        created_at: new Date().toISOString(),
      });
      setDateRange({
        from: new Date(),
        to: addDays(new Date(), 1)
      });
    }
  }, [booking, roomNumber, isOpen]);

  useEffect(() => {
    if (dateRange?.from) {
      const checkInStr = format(dateRange.from, 'yyyy-MM-dd');
      const checkOutStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(addDays(dateRange.from, 1), 'yyyy-MM-dd');
      
      setFormData(prev => ({
        ...prev,
        check_in: checkInStr,
        check_out: checkOutStr,
        date: checkInStr
      }));
    }
  }, [dateRange]);

  const nights = differenceInDays(parseISO(formData.check_out), parseISO(formData.check_in)) || 1;
  const totalAmount = (Number(formData.room_price) || 0) + (Number(formData.misc_charges) || 0) - (Number(formData.discount) || 0);
  const totalPaid = (Number(formData.cash_paid) || 0) + (Number(formData.online_paid) || 0);
  const balanceAmount = totalAmount - totalPaid;
  
  // Auto Commission Calculator - Commission Amount is now input directly
  const commissionAmount = Number(formData.commission_amount) || 0;
  const netProfit = totalAmount - commissionAmount;

  const handleDelete = async () => {
    if (!booking) return;
    setIsLoading(true);
    try {
      await deleteBooking(String(booking.id));
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActualSubmit = async () => {
    setIsLoading(true);
    try {
      const finalData = {
        ...formData,
        total_amount: totalAmount,
        balance_amount: balanceAmount,
        commission_amount: commissionAmount,
        net_profit: netProfit,
        payment_status: balanceAmount <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Unpaid')
      };

      if (booking) {
        await updateBooking(String(booking.id), finalData as any);
      } else {
        if (totalPaid > 0) {
          finalData.payment_history = [{
            mode: 'Mixed', // Representing both cash/online
            amount: totalPaid,
            timestamp: new Date().toISOString()
          }];
        }
        await createBooking(finalData as any);
      }
      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const otaSources = ['Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia', 'Goibibo', 'Others'];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="booking-modal-root" className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
            key="booking-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="booking-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl my-8"
          >
            <form onSubmit={handleSubmit} className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    {booking ? 'Edit Booking' : 'New Booking'}
                  </h2>
                  <p className="text-slate-500 font-medium">Room {formData.room_number}</p>
                </div>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Check-in & Check-out Dates</label>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-bold text-slate-700">
                          {format(parseISO(formData.check_in), 'dd MMM')} — {format(parseISO(formData.check_out), 'dd MMM')}
                        </span>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-tight">
                        {nights} {nights === 1 ? 'Night' : 'Nights'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showCalendar && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-10"
                            onClick={() => setShowCalendar(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 z-20 bg-white p-4 rounded-3xl shadow-2xl border border-slate-100"
                          >
                            <DayPicker
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={1}
                              disabled={{ before: new Date() }}
                              className="rdp-custom"
                            />
                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setShowCalendar(false)}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                              >
                                Confirm Dates
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Guest Name</label>
                    <input
                      type="text"
                      value={formData.guest_name}
                      onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Guest Phone</label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={e => setFormData({ ...formData, guest_phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 hidden">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={false}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm font-bold text-slate-700">ID Uploaded</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Booking Source</label>
                    <div className="flex gap-2">
                       {['Walk-in', 'OTA'].map((type, idx) => (
                        <button
                          key={`booking-type-${type}-${idx}`}
                          type="button"
                          onClick={() => setFormData({ ...formData, booking_type: type as BookingType })}
                          className={cn(
                            "flex-1 py-3 rounded-2xl font-bold border-2 transition-all text-sm",
                            formData.booking_type === type 
                              ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                              : "bg-slate-50 border-slate-100 text-slate-400"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.booking_type === 'OTA' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-sm font-bold text-slate-700 mb-2">OTA Platform</label>
                      <select
                        value={formData.ota_source}
                        onChange={e => setFormData({ ...formData, ota_source: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      >
                        <option value="">Select Platform</option>
                        {otaSources.map((s, idx) => <option key={`ota-source-${s}-${idx}`} value={s}>{s}</option>)}
                      </select>
                    </motion.div>
                  )}

                  {/* Advanced Guest Details Toggle */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="text-sm font-bold text-indigo-600">Advanced Guest & Booking Details</span>
                      {showAdvanced ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-indigo-600" />}
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pt-4 pb-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Alt Phone</label>
                                <input type="text" value={formData.guest_alt_phone} onChange={e => setFormData({ ...formData, guest_alt_phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                <input type="email" value={formData.guest_email} onChange={e => setFormData({ ...formData, guest_email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                              <input type="text" value={formData.guest_address} onChange={e => setFormData({ ...formData, guest_address: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
                                <input type="text" value={formData.guest_city} onChange={e => setFormData({ ...formData, guest_city: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">State</label>
                                <input type="text" value={formData.guest_state} onChange={e => setFormData({ ...formData, guest_state: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Country</label>
                                <input type="text" value={formData.guest_country} onChange={e => setFormData({ ...formData, guest_country: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Pincode</label>
                                <input type="text" value={formData.guest_pincode} onChange={e => setFormData({ ...formData, guest_pincode: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ID Type</label>
                                <input type="text" value={formData.guest_id_type} onChange={e => setFormData({ ...formData, guest_id_type: e.target.value })} placeholder="Aadhaar/Passport" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ID Number</label>
                                <input type="text" value={formData.guest_id_number} onChange={e => setFormData({ ...formData, guest_id_number: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Company Name</label>
                                <input type="text" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Company GST</label>
                                <input type="text" value={formData.company_gst} onChange={e => setFormData({ ...formData, company_gst: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Adults</label>
                                <input type="number" min="1" value={formData.adults} onChange={e => setFormData({ ...formData, adults: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Children</label>
                                <input type="number" min="0" value={formData.children} onChange={e => setFormData({ ...formData, children: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Pets</label>
                                <input type="number" min="0" value={formData.pets} onChange={e => setFormData({ ...formData, pets: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Number</label>
                                <input type="text" value={formData.vehicle_number} onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Purpose of Visit</label>
                                <input type="text" value={formData.purpose_of_visit} onChange={e => setFormData({ ...formData, purpose_of_visit: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Special Requests</label>
                              <textarea value={formData.special_requests} onChange={e => setFormData({ ...formData, special_requests: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Internal Notes</label>
                              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

                {/* Right Column: Financials */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Room Price</label>
                      <input
                        type="number"
                        value={formData.room_price}
                        onChange={e => setFormData({ ...formData, room_price: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Misc Charges</label>
                      <input
                        type="number"
                        value={formData.misc_charges}
                        onChange={e => setFormData({ ...formData, misc_charges: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Discount</label>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Amount</span>
                      <span className="text-2xl font-black">₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Balance Due</span>
                      <span className={cn("text-lg font-bold", balanceAmount > 0 ? "text-rose-400" : "text-emerald-400")}>
                        ₹{balanceAmount}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cash Paid</label>
                      <input
                        type="number"
                        value={formData.cash_paid}
                        onChange={e => setFormData({ ...formData, cash_paid: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Online Paid</label>
                      <input
                        type="number"
                        value={formData.online_paid}
                        onChange={e => setFormData({ ...formData, online_paid: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600"
                      />
                    </div>
                  </div>
                  
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Commission Amount</label>
                      <input
                        type="number"
                        value={formData.commission_amount}
                        onChange={e => setFormData({ ...formData, commission_amount: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        placeholder="0"
                      />
                    </div>

                  {(commissionAmount > 0) && (
                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Comm Amount</p>
                        <p className="text-lg font-black text-rose-600">-₹{commissionAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Net Profit</p>
                        <p className="text-lg font-black text-indigo-700">₹{netProfit}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-w-[120px] px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                {booking && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 min-w-[120px] px-6 py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Terminate
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] min-w-[200px] px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Booking</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="bg-rose-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Terminate Booking?</h3>
              <p className="text-slate-500 font-medium mb-8">
                This will completely delete Room <span className="text-rose-600 font-bold">{formData.room_number}</span>'s booking and any associated data. This action cannot be undone.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Terminate & Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm Booking</h3>
              <p className="text-slate-500 font-medium mb-8">
                Are you sure you want to save this booking for Room <span className="text-indigo-600 font-bold">{formData.room_number}</span>?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleActualSubmit}
                  disabled={isLoading}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Save Booking'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isLoading}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No, Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
