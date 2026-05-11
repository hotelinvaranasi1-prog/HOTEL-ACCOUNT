import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Wrench,
  RefreshCw,
  Plus, 
  Edit2, 
  X,
  Trash2,
  PlusCircle,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, RoomStatus, Booking, DailySummary } from '../types';
import { cn } from '../lib/utils';
import { HOTELS } from '../constants';
import { getRooms, getBookings, updateRoomStatus, updateBooking } from '../services/firebaseService';
import BookingModal from '../components/BookingModal';

export default function RoomGrid() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [miscChargeBooking, setMiscChargeBooking] = useState<Booking | null>(null);
  const [miscAmount, setMiscAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsData, bookingsData] = await Promise.all([
        getRooms(),
        getBookings()
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (roomNumber: string, newStatus: RoomStatus) => {
    try {
      await updateRoomStatus(roomNumber, newStatus);
      fetchData();
      setSelectedRoom(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMisc = async () => {
    if (!miscChargeBooking || !miscAmount || isNaN(Number(miscAmount))) return;
    
    setIsProcessing(true);
    try {
      const currentMisc = Number(miscChargeBooking.misc_charges) || 0;
      await updateBooking(String(miscChargeBooking.id), {
        ...miscChargeBooking,
        misc_charges: currentMisc + Number(miscAmount)
      });
      
      setMiscChargeBooking(null);
      setMiscAmount('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error adding miscellaneous charge');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoomBooking = (roomNumber: string) => {
    return bookings.find(b => b.room_number === roomNumber && b.booking_status === 'Active');
  };
  
  const dailySummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today);
    return todayBookings.reduce((acc, b) => ({
      today_collection_cash: acc.today_collection_cash + b.advance_paid,
      today_collection_online: acc.today_collection_online + (b.total_amount - b.advance_paid),
      total_commission: acc.total_commission + b.commission_amount,
      total_pending: acc.total_pending + b.balance_amount,
    }), { today_collection_cash: 0, today_collection_online: 0, total_commission: 0, total_pending: 0 } as DailySummary);
  }, [bookings]);

  const statusConfig: Record<RoomStatus, { color: string, icon: any, label: string, light: string, border: string, textColor: string }> = {
    Available: { color: "bg-emerald-500", icon: CheckCircle, label: "Available", light: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-700" },
    Occupied: { color: "bg-rose-500", icon: AlertCircle, label: "Occupied", light: "bg-rose-50", border: "border-rose-200", textColor: "text-rose-700" },
    Cleaning: { color: "bg-amber-500", icon: Clock, label: "Cleaning", light: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-700" },
    Maintenance: { color: "bg-slate-500", icon: Wrench, label: "Maintenance", light: "bg-slate-50", border: "border-slate-200", textColor: "text-slate-700" },
  };

  return (
    <div className="space-y-8 p-6">
      {/* Daily Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Cash Today", value: `₹${dailySummary.today_collection_cash}` },
          { label: "Online Today", value: `₹${dailySummary.today_collection_online}` },
          { label: "Commission", value: `₹${dailySummary.total_commission}` },
          { label: "Pending", value: `₹${dailySummary.total_pending}` },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Status Grid</h1>
          <p className="text-slate-500">Real-time overview of all rooms.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['All', 'Occupied', 'Vacant', 'Due Payment', 'Online Paid', 'Agent Booking'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                filter === f ? "bg-slate-800 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 text-xs font-bold ml-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
        <span className="text-xs font-bold text-slate-400 mr-2 self-center">LEGEND:</span>
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={`legend-${status}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-slate-600">
            <div className={cn("w-2 h-2 rounded-full", config.color)} />
            {config.label}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          {Object.entries(HOTELS).map(([key, hotel]) => {
            // Apply filtering logic
            let filteredRooms = hotel.rooms;
            if (filter !== 'All') {
              filteredRooms = hotel.rooms.filter(roomNumber => {
                const room = rooms.find(r => String(r.number) === roomNumber);
                const status = room?.status || 'Available';
                const booking = getRoomBooking(roomNumber);
                
                switch (filter) {
                  case 'Occupied': return status === 'Occupied';
                  case 'Vacant': return status === 'Available';
                  case 'Due Payment': return booking && booking.balance_amount > 0;
                  case 'Online Paid': return booking && booking.payment_history?.some(p => p.mode === 'Online');
                  case 'Agent Booking': return booking && booking.booking_type === 'Agent';
                  default: return true;
                }
              });
            }

            if (filteredRooms.length === 0) return null;

            return (
              <div key={key} className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">{hotel.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredRooms.map((roomNumber) => {
                    const room = rooms.find(r => String(r.number) === roomNumber);
                    const status = room?.status || 'Available';
                    const config = statusConfig[status];
                    const booking = getRoomBooking(roomNumber);
                    
                    return (
                      <motion.button
                        key={`${key}-${roomNumber}`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedRoom(room || { id: 0, number: roomNumber, status: 'Available', type: 'Standard', floor: 'Ground', capacity: 2 })}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-3 h-full",
                          config.light,
                          config.border,
                          !room && "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="flex flex-col">
                            <span className={cn("font-black text-xl leading-none", config.textColor)}>{roomNumber}</span>
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-1", config.textColor)}>{status}</span>
                          </div>
                          
                          <div className="flex gap-1 flex-col items-end">
                            <config.icon className={cn("w-5 h-5", config.color.replace('bg-', 'text-'))} />
                            {booking && booking.balance_amount > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 mt-1">DUE</span>}
                            {booking && booking.balance_amount <= 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-600 mt-1">PAID</span>}
                          </div>
                        </div>

                        {booking && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {booking.is_early_checkin && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">EARLY IN</span>}
                            {booking.is_late_checkout && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-700">LATE OUT</span>}
                            {booking.is_local_guest && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">LOCAL</span>}
                          </div>
                        )}

                        {booking ? (
                          <div className="w-full text-xs space-y-2 mt-2">
                            <div className="pb-2 border-b border-black/10">
                              <p className="font-bold text-slate-800 text-sm">{booking.guest_name || 'Guest'}</p>
                              <div className="flex justify-between text-slate-600 mt-1">
                                <span>{new Date(booking.check_in).toLocaleDateString()}</span>
                                <span>→</span>
                                <span>{new Date(booking.check_out).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 pb-2 border-b border-black/10">
                              <span className="text-slate-500">Total:</span>
                              <span className="font-bold text-right text-slate-800">₹{booking.total_amount}</span>
                              <span className="text-slate-500">Paid:</span>
                              <span className="font-bold text-right text-green-700">₹{booking.advance_paid}</span>
                              <span className="text-slate-500">Due:</span>
                              <span className={cn("font-bold text-right", booking.balance_amount > 0 ? "text-red-600" : "text-slate-800")}>
                                ₹{booking.balance_amount}
                              </span>
                            </div>

                            <div className="pb-2 border-b border-black/10">
                              <p className="text-slate-500 mb-1">Payments:</p>
                              {booking.payment_history?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {booking.payment_history.map((p, i) => (
                                    <span key={`${p.timestamp}-${i}`} className="px-1.5 py-0.5 rounded bg-white border text-[10px] font-bold text-slate-600">
                                      {p.mode} ₹{p.amount}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400">No payments</p>
                              )}
                            </div>

                            <div className="pt-1 flex flex-col gap-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Source:</span>
                                <span className="font-bold text-slate-800">{booking.booking_type === 'Walk-in' ? 'Direct' : booking.ota_source || booking.agent_name || booking.booking_type}</span>
                              </div>
                              {booking.commission_amount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Comm ({booking.commission_percentage || 0}%):</span>
                                  <span className="font-bold text-rose-600">-₹{booking.commission_amount}</span>
                                </div>
                              )}
                              <div className="flex justify-between mt-1 pt-1 border-t border-black/10">
                                <span className="font-bold text-slate-600">Net:</span>
                                <span className="font-black text-indigo-700">₹{booking.net_profit}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto pt-4 flex opacity-50 justify-center">
                            <span className="text-xs font-bold text-slate-400">NO ACTIVE BOOKING</span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Action Modal */}
      <AnimatePresence>
        {selectedRoom && (
          <div key="room-action-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedRoom(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Room {selectedRoom.number}</h2>
                <button onClick={() => setSelectedRoom(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status Selection */}
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Change Status</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(statusConfig) as RoomStatus[]).map((status) => {
                      const config = statusConfig[status];
                      const isActive = selectedRoom.status === status;
                      return (
                        <button
                          key={`status-btn-${status}`}
                          onClick={() => handleStatusChange(selectedRoom.number, status)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                            isActive 
                              ? cn(config.border, config.light, config.textColor)
                              : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <div className={cn("w-2.5 h-2.5 rounded-full", config.color)} />
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEditingBooking(null);
                      setIsBookingModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Booking
                  </button>

                  {getRoomBooking(selectedRoom.number) && (
                    <>
                      <button
                        onClick={() => {
                          setEditingBooking(getRoomBooking(selectedRoom.number)!);
                          setIsBookingModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                        Edit Booking
                      </button>
                      <button
                        onClick={() => setMiscChargeBooking(getRoomBooking(selectedRoom.number)!)}
                        className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-4 rounded-2xl font-bold hover:bg-amber-100 transition-all"
                      >
                        <PlusCircle className="w-5 h-5" />
                        Add Misc Charge
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to cancel this booking? This will also make the room available.')) {
                            const booking = getRoomBooking(selectedRoom.number)!;
                            await updateBooking(String(booking.id), {
                              ...booking,
                              booking_status: 'Cancelled'
                            });
                            await updateRoomStatus(selectedRoom.number, 'Available');
                            fetchData();
                            setSelectedRoom(null);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-4 rounded-2xl font-bold hover:bg-rose-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                        Cancel Booking
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedRoom(null);
          fetchData();
        }}
        roomNumber={selectedRoom?.number || ''}
        booking={editingBooking}
      />

      {/* Miscellaneous Modal */}
      <AnimatePresence>
        {miscChargeBooking && (
          <div key="misc-charge-modal" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              key="misc-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setMiscChargeBooking(null)}
            />
            <motion.div
              key="misc-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add Misc Charge</h3>
                  <p className="text-slate-500 text-sm">Room {miscChargeBooking.room_number}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={miscAmount}
                    onChange={e => setMiscAmount(e.target.value)}
                    placeholder="Enter amount..."
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-lg"
                  />
                </div>

                <button
                  onClick={handleAddMisc}
                  disabled={isProcessing || !miscAmount}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      Add Charge
                    </>
                  )}
                </button>

                <button
                  onClick={() => setMiscChargeBooking(null)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
