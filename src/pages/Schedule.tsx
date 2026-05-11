import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Hotel } from 'lucide-react';
import { motion } from 'motion/react';
import { format, addDays, startOfToday, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Booking } from '../types';
import { cn } from '../lib/utils';
import { HOTELS, getHotelByRoom } from '../constants';
import { getBookings } from '../services/firebaseService';

export default function Schedule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(startOfToday());
  const [daysToShow] = useState(14);

  const fetchBookingsData = async () => {
    setIsLoading(true);
    try {
      const data = await getBookings();
      setBookings(data.filter((b: Booking) => b.booking_status !== 'Cancelled'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsData();
    const interval = setInterval(fetchBookingsData, 15000);
    return () => clearInterval(interval);
  }, []);

  const days = eachDayOfInterval({
    start: startDate,
    end: addDays(startDate, daysToShow - 1)
  });

  const rooms = [
    ...Object.values(HOTELS).flatMap(h => h.rooms.map(roomNumber => ({ number: roomNumber, hotel: h.name })))
  ];

  const getBookingsForRoomAndDate = (roomNumber: string, date: Date) => {
    return bookings.filter(b => {
      if (b.room_number !== roomNumber) return false;
      const checkIn = b.check_in ? parseISO(b.check_in) : parseISO(b.date);
      const checkOut = b.check_out ? parseISO(b.check_out) : addDays(checkIn, 1);
      
      // Use isSameDay to check inclusion
      return isSameDay(date, checkIn) || (date > checkIn && date < checkOut);
    });
  };

  const getBookingClass = (bookings: Booking[]) => {
    if (bookings.length === 0) return 'bg-white';
    const allPaid = bookings.every(b => (b.total_amount || 0) <= ((b.cash_paid || 0) + (b.online_paid || 0)));
    
    if (bookings.length === 1) {
      return allPaid ? 'bg-emerald-600' : 'bg-rose-600';
    } else {
      // If > 1, it's a conflict/same room, same day
      return allPaid ? 'bg-indigo-600' : 'bg-rose-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
          <p className="text-slate-500">Visual occupancy schedule for all rooms.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setStartDate(addDays(startDate, -7))}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, daysToShow - 1), 'MMM d, yyyy')}
            </span>
          </div>
          <button 
            onClick={() => setStartDate(addDays(startDate, 7))}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header: Dates */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <div className="w-40 flex-shrink-0 p-4 border-r border-slate-100 font-bold text-xs text-slate-400 uppercase tracking-widest">
                Room Number
              </div>
              {days.map((day, idx) => (
                <div 
                  key={`calendar-header-${idx}`} 
                  className={cn(
                    "flex-1 p-4 text-center border-r border-slate-100 min-w-[60px]",
                    isSameDay(day, new Date()) && "bg-indigo-50"
                  )}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-sm font-bold",
                    isSameDay(day, new Date()) ? "text-indigo-600" : "text-slate-700"
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <div key={`calendar-row-${room.hotel}-${room.number}`} className="flex group">
                  <div className="w-40 flex-shrink-0 p-4 border-r border-slate-100 flex flex-col justify-center bg-white group-hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-black text-slate-900 leading-none">Room {room.number}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {room.hotel === 'KASHI' ? 'Kashi' : 'Varanasi'}
                    </span>
                  </div>
                  {days.map((day, idx) => {
                    const dayBookings = getBookingsForRoomAndDate(room.number, day);
                    
                    return (
                      <div 
                        key={`calendar-cell-${room.hotel}-${room.number}-${idx}`}
                        className={cn(
                          "flex-1 min-h-[60px] border-r border-slate-100 p-1 relative flex flex-col gap-1",
                          isSameDay(day, new Date()) && "bg-indigo-50/30"
                        )}
                      >
                        {dayBookings.map((booking, bIdx) => {
                          const isStart = booking.check_in ? isSameDay(day, parseISO(booking.check_in)) : isSameDay(day, parseISO(booking.date));
                          return (
                            <div 
                              key={`cell-booking-${booking.id}-${format(day, 'yyyy-MM-dd')}`}
                              className={cn(
                                "flex-1 rounded-md text-[9px] font-bold p-1 overflow-hidden transition-all shadow-sm flex flex-col justify-center text-white",
                                getBookingClass(dayBookings),
                                !isStart && "opacity-90"
                              )}
                            >
                              {isStart && (
                                <span className="truncate leading-tight">{booking.guest_name || 'Guest'}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed bottom-8 right-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-600">Updating calendar...</span>
        </div>
      )}
    </div>
  );
}
