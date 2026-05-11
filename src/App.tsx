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
  Calendar,
  LogOut,
  User as UserIcon
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
import { useAuth } from './components/AuthProvider';

type Page = 'dashboard' | 'room-grid' | 'schedule' | 'bookings' | 'reports' | 'settings' | 'invoices';

export default function App() {
  const { user, logout } = useAuth();
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
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
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
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="hidden md:flex items-center gap-3 px-6 py-8 border-b">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Hotel Master</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={`nav-${item.id}`}
                onClick={() => {
                  setCurrentPage(item.id as Page);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  currentPage === item.id 
                    ? "bg-indigo-50 text-indigo-600 font-semibold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 px-2 py-2 mb-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.displayName || 'Staff'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {currentPage === 'dashboard' && <Dashboard key="dashboard-page" />}
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
