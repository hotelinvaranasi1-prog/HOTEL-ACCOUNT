import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Globe, 
  User, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Search,
  Mic,
  ChevronDown,
  Monitor,
  Sparkles,
  Layers,
  Eye,
  Edit2,
  CheckCircle,
  Laptop,
  Maximize,
  HelpCircle,
  ChevronRight,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Summary, Booking } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { HOTELS, getHotelByRoom } from '../constants';
import { getBookings, updateBooking, updateRoomStatus } from '../services/firebaseService';
import BookingModal from '../components/BookingModal';

interface DashboardProps {
  onNavigate?: (page: string) => void;
  key?: string;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hotelBookings, setHotelBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const [kashiStats, setKashiStats] = useState({
    revenue: 0,
    bookingsCount: 0,
    cashPaid: 0,
    onlinePaid: 0
  });

  const [varanasiStats, setVaranasiStats] = useState({
    revenue: 0,
    bookingsCount: 0,
    cashPaid: 0,
    onlinePaid: 0
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const allBookings = await getBookings();
      const today = new Date().toISOString().split('T')[0];
      
      const activeToday = allBookings.filter(b => 
        b.booking_status !== 'Cancelled' && (
          b.booking_status === 'Active' ||
          b.date === today || 
          (b.check_in && b.check_out && b.check_in <= today && b.check_out >= today)
        )
      );

      setHotelBookings(activeToday);

      // Filter non-cancelled bookings
      const activeBookings = allBookings.filter(b => b.booking_status !== 'Cancelled');

      // Calculate Kashi stats dynamically
      const kashiBooks = activeBookings.filter(b => getHotelByRoom(b.room_number) === 'KASHI');
      const kashiRev = kashiBooks.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const kashiCash = kashiBooks.reduce((sum, b) => sum + (b.cash_paid || 0), 0);
      const kashiOnline = kashiBooks.reduce((sum, b) => sum + (b.online_paid || 0), 0);

      setKashiStats({
        revenue: kashiRev,
        bookingsCount: kashiBooks.length,
        cashPaid: kashiCash,
        onlinePaid: kashiOnline
      });

      // Calculate Varanasi stats dynamically
      const varanasiBooks = activeBookings.filter(b => getHotelByRoom(b.room_number) === 'VARANASI');
      const varanasiRev = varanasiBooks.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const varanasiCash = varanasiBooks.reduce((sum, b) => sum + (b.cash_paid || 0), 0);
      const varanasiOnline = varanasiBooks.reduce((sum, b) => sum + (b.online_paid || 0), 0);

      setVaranasiStats({
        revenue: varanasiRev,
        bookingsCount: varanasiBooks.length,
        cashPaid: varanasiCash,
        onlinePaid: varanasiOnline
      });

      // Calculate summary from today's active bookings
      const summaryData: Summary = {
        total_revenue: activeToday.reduce((acc, curr) => acc + curr.total_amount, 0),
        total_cash: activeToday.reduce((acc, curr) => {
          const cash = curr.payment_history?.filter(p => p.mode === 'Cash').reduce((a, c) => a + c.amount, 0) || 0;
          return acc + cash;
        }, 0),
        total_online: activeToday.reduce((acc, curr) => {
          const online = curr.payment_history?.filter(p => p.mode === 'Online').reduce((a, c) => a + c.amount, 0) || 0;
          return acc + online;
        }, 0),
        ota_count: activeToday.filter(b => b.booking_type === 'OTA').length,
        walkin_count: activeToday.filter(b => b.booking_type === 'Walk-in').length,
        pending_payments: activeToday.reduce((acc, curr) => acc + curr.balance_amount, 0)
      };
      
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmCheckout = async () => {
    if (!checkoutBooking) return;
    setIsProcessingCheckout(true);
    try {
      await updateBooking(checkoutBooking.id, {
        ...checkoutBooking,
        booking_status: 'Completed'
      });
      await updateRoomStatus(checkoutBooking.room_number, 'Available');
      setCheckoutBooking(null);
      await fetchData();
    } catch (err) {
      console.error('Error during check-out:', err);
      alert('Failed to process checkout. Please try again.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Show only real database bookings that are active (checked in)
  const displayedCheckins = hotelBookings
    .filter(b => b.booking_status === 'Active')
    .map((b, idx) => ({
      id: b.id || `db-${idx}`,
      room_number: b.room_number,
      guest_name: b.guest_name || "Guest",
      avatar: (b.guest_name || "G").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      avatarBg: "bg-indigo-500/10 text-indigo-600",
      stay: `${b.check_in ? format(parseISO(b.check_in), 'dd MMM') : ''} - ${b.check_out ? format(parseISO(b.check_out), 'dd MMM') : ''}`,
      status: 'Checked-In' as const,
      statusColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      balance: b.balance_amount || 0,
      booking: b
    }));

  return (
    <div className="relative min-h-screen -m-4 md:-m-8 p-4 md:p-8 bg-gradient-to-br from-[#ECE7FE] via-[#FDF5F2] to-[#FFF4E6] text-slate-800 antialiased overflow-hidden">
      
      {/* Decorative backdrop glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-300/20 blur-[100px] pointer-events-none" />

      {/* Top Header Section */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white/40 backdrop-blur-md border border-white/50 p-4 rounded-3xl shadow-sm">
        
        {/* Left Search Bar with Microphone */}
        <div className="relative w-full md:w-[320px] lg:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookings, rooms, guests..."
            className="w-full pl-11 pr-11 py-2.5 bg-white/60 focus:bg-white border border-slate-200/50 focus:border-indigo-500 rounded-2xl outline-none text-sm transition-all shadow-inner text-slate-700 font-medium"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 rounded-xl transition-all" title="Voice Search">
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Right Buttons: Device, Remix, Select Device Preview, Profile Picture */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <button className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-600 hover:text-indigo-600 shadow-sm transition-all">
            <Laptop className="w-3.5 h-3.5 text-indigo-500" />
            <span>Device</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Remix</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/60 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-500">
            <Maximize className="w-3.5 h-3.5 text-orange-500" />
            <span>Select device preview</span>
          </div>

          <button 
            onClick={fetchData}
            className="p-2 bg-white/60 hover:bg-white rounded-2xl border border-slate-200/50 hover:text-indigo-600 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 bg-white/80 hover:bg-white rounded-2xl border border-slate-200/50 shadow-sm transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-orange-500 text-white flex items-center justify-center text-xs font-black shadow-inner">
                H
              </div>
              <span className="hidden md:inline text-xs font-bold text-slate-700 px-1">hotelinvaranasi1</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-20">
                <div className="px-3 py-2 border-b border-slate-50">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Logged in as</p>
                  <p className="text-xs font-semibold text-slate-700 truncate">hotelinvaranasi1@gmail.com</p>
                </div>
                <button className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-xl mt-1 transition-all">
                  Switch Account
                </button>
                <button className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                  Support Help
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Larger Lower Card: Today's Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 bg-white/50 backdrop-blur-lg p-6 lg:p-8 rounded-[2.5rem] border border-white/60 shadow-xl mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2.5 rounded-xl">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Today's Check-ins</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Real-time room occupancy and balances</p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-200/50">
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCheckins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <span>No active check-ins today</span>
                      <p className="text-[10px] font-medium text-slate-400/80 uppercase tracking-wider">All rooms are vacant or bookings are checked out</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedCheckins.map((row, idx) => (
                  <tr key={`checkin-${row.id}-${idx}`} className="group hover:bg-white/40 transition-colors">
                    
                    {/* ROOM */}
                    <td className="py-4">
                      <span className="inline-block px-3.5 py-2 bg-[#0B1528] text-white rounded-xl font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {row.room_number}
                      </span>
                    </td>

                    {/* GUEST WITH AVATAR */}
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner border border-white", row.avatarBg)}>
                          {row.avatar}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{row.guest_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room Guest</p>
                        </div>
                      </div>
                    </td>

                    {/* STAY */}
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold">{row.stay}</span>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner",
                        row.status === 'Checked-In' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                        row.status === 'Due Out' && "bg-amber-50 text-amber-700 border-amber-100",
                        row.status === 'Confirmed' && "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {row.status}
                      </span>
                    </td>

                    {/* BALANCE */}
                    <td className="py-4 font-black text-slate-800 text-sm">
                      {row.balance === 0 ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/60 text-xs font-bold">Paid</span>
                      ) : (
                        <span className="text-rose-600">₹{row.balance.toLocaleString('en-IN')}</span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        
                        <button 
                          onClick={() => onNavigate && onNavigate('room-grid')}
                          className="p-2 bg-white/70 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/40 rounded-xl transition-all shadow-sm"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => {
                            setSelectedRoomNumber(row.room_number);
                            setSelectedBooking(row.booking);
                            setIsBookingModalOpen(true);
                          }}
                          className="p-2 bg-white/70 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/40 rounded-xl transition-all shadow-sm"
                          title="Edit entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => setCheckoutBooking(row.booking)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
                          title="Proceed checkout"
                        >
                          Check-out
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Main Grid: Property Summary Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8">
        
        {/* Left Property Card: Kashi Property */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-lg rounded-[2.5rem] border border-white/60 p-6 lg:p-8 shadow-xl shadow-indigo-100/30 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#4169E1] p-3 rounded-2xl text-white shadow-md shadow-blue-100">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Kashi Property</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Kashi, Varanasi
                  </p>
                </div>
              </div>
              <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-100">
                Active View
              </span>
            </div>

            <div className="mb-6">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800 tracking-tight">₹{kashiStats.revenue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-6 bg-white/70 p-3.5 rounded-2xl border border-white/50 shadow-sm">
              <TrendingUp className="w-4 h-4 text-[#4169E1]" />
              <p className="text-sm font-bold text-slate-700">
                {kashiStats.bookingsCount} {kashiStats.bookingsCount === 1 ? 'Booking' : 'Bookings'} <span className="text-xs text-slate-400 font-normal ml-1">registered</span>
              </p>
            </div>
          </div>

          {/* Small Blue Subsections */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-[#E6F0FF] p-3.5 rounded-2xl border border-[#D0E3FF]/60 hover:bg-[#D9E9FF] transition-all cursor-pointer">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cash Paid</p>
              <p className="text-lg font-black text-[#4169E1]">₹{kashiStats.cashPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#EAF3FF] p-3.5 rounded-2xl border border-[#D4E6FF]/60 hover:bg-[#DEEEFF] transition-all cursor-pointer">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Online Paid</p>
              <p className="text-lg font-black text-[#4169E1]">₹{kashiStats.onlinePaid.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </motion.div>

        {/* Right Property Card: Varanasi Property */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/50 backdrop-blur-lg rounded-[2.5rem] border border-white/60 p-6 lg:p-8 shadow-xl shadow-orange-100/30 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF7F50] p-3 rounded-2xl text-white shadow-md shadow-orange-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Varanasi Property</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Cantt Area
                  </p>
                </div>
              </div>
              <span className="text-xs font-black bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl border border-orange-100">
                Primary View
              </span>
            </div>

            <div className="mb-6">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800 tracking-tight">₹{varanasiStats.revenue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-6 bg-white/70 p-3.5 rounded-2xl border border-white/50 shadow-sm">
              <TrendingUp className="w-4 h-4 text-[#FF7F50]" />
              <p className="text-sm font-bold text-slate-700">
                {varanasiStats.bookingsCount} {varanasiStats.bookingsCount === 1 ? 'Booking' : 'Bookings'} <span className="text-xs text-slate-400 font-normal ml-1">registered</span>
              </p>
            </div>
          </div>

          {/* Small Orange Subsections */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-[#FFF0E6] p-3.5 rounded-2xl border border-[#FFDFC9]/60 hover:bg-[#FFE5D3] transition-all cursor-pointer">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cash Paid</p>
              <p className="text-lg font-black text-[#FF7F50]">₹{varanasiStats.cashPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#FFF4ED] p-3.5 rounded-2xl border border-[#FFE4D3]/60 hover:bg-[#FFEADA] transition-all cursor-pointer">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Online Paid</p>
              <p className="text-lg font-black text-[#FF7F50]">₹{varanasiStats.onlinePaid.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
          setSelectedRoomNumber('');
          fetchData();
        }}
        roomNumber={selectedRoomNumber}
        booking={selectedBooking}
      />

      {/* Checkout Confirmation Modal */}
      <AnimatePresence>
        {checkoutBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setCheckoutBooking(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm Check-out</h3>
              <p className="text-slate-500 font-medium mb-6">
                Are you sure you want to check-out <span className="text-indigo-600 font-bold">{checkoutBooking.guest_name}</span> from Room <span className="text-slate-800 font-bold">{checkoutBooking.room_number}</span>?
              </p>
              
              {checkoutBooking.balance_amount > 0 && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm">
                  Warning: Outstanding balance of ₹{checkoutBooking.balance_amount.toLocaleString('en-IN')}!
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmCheckout}
                  disabled={isProcessingCheckout}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
                >
                  {isProcessingCheckout ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Confirm Check-out'}
                </button>
                <button
                  onClick={() => setCheckoutBooking(null)}
                  disabled={isProcessingCheckout}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
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
