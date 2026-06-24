import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Grid3X3, 
  ListOrdered, 
  BarChart3, 
  Settings as SettingsIcon,
  Menu,
  X,
  Hotel,
  FileText,
  Calendar
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import RoomGrid from './pages/RoomGrid';
import BookingList from './pages/BookingList';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import InvoiceList from './pages/InvoiceList';
import Schedule from './pages/Schedule';
import VoiceAssistant from './components/VoiceAssistant';

type Page = 'dashboard' | 'room-grid' | 'schedule' | 'bookings' | 'reports' | 'settings' | 'invoices';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'room-grid', label: 'Room Grid', icon: Grid3X3 },
    { id: 'schedule', label: 'Calendar', icon: Calendar },
    { id: 'bookings', label: 'Bookings', icon: ListOrdered },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div style={{ height: '36.6667px' }} className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Hotel className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg text-slate-800">Hotel Master</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1528] border-r border-[#152238] transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="hidden md:flex items-center gap-3 px-6 py-8 border-b border-[#152238]">
            <div className="bg-indigo-600 p-2.5 rounded-xl">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">Hotel Master</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={`nav-${item.id}`}
                onClick={() => {
                  setCurrentPage(item.id as Page);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left",
                  currentPage === item.id 
                    ? "bg-[#1A2E4C] text-indigo-400 font-bold shadow-md shadow-black/10" 
                    : "text-slate-400 hover:bg-[#111F36] hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  currentPage === item.id ? "bg-indigo-600/20 text-indigo-400" : "bg-[#14233C] text-slate-400 group-hover:text-slate-200"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {currentPage === 'dashboard' && <Dashboard key="dashboard-page" onNavigate={setCurrentPage} />}
          {currentPage === 'room-grid' && <RoomGrid key="room-grid-page" />}
          {currentPage === 'schedule' && <Schedule key="schedule-page" />}
          {currentPage === 'bookings' && <BookingList key="bookings-page" />}
          {currentPage === 'invoices' && <InvoiceList key="invoices-page" />}
          {currentPage === 'reports' && <Reports key="reports-page" />}
          {currentPage === 'settings' && <Settings key="settings-page" />}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <VoiceAssistant onNavigate={setCurrentPage} />
    </div>
  );
}
