import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Loader2, 
  Trash2, 
  Eye, 
  Download, 
  Printer,
  Calendar,
  User,
  Hash,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import InvoiceModal from '../components/InvoiceModal';
import { getInvoices, deleteInvoice } from '../services/firebaseService';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const fetchInvoicesData = async () => {
    setIsLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(String(id));
      fetchInvoicesData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = invoices.filter(i => {
    // Search Query (Number or Name)
    const matchesSearch = 
      i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.guest_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status Filter
    const paymentData = typeof i.payment_data === 'string' ? JSON.parse(i.payment_data) : i.payment_data;
    const isPaid = paymentData.dueAmount <= 0;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'paid' && isPaid) || 
      (statusFilter === 'pending' && !isPaid);

    // Date Range
    const invDate = new Date(i.invoice_date);
    const matchesStart = dateRange.start ? invDate >= new Date(dateRange.start) : true;
    const matchesEnd = dateRange.end ? invDate <= new Date(dateRange.end) : true;

    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    setStatusFilter('all');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tax Invoices</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and generate professional hotel bills.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedInvoice(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Generate New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by invoice number or guest name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center justify-center gap-3 border p-5 rounded-[2rem] shadow-sm font-bold transition-all",
            showFilters ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
          )}
        >
          <Filter className="w-5 h-5" />
          {showFilters ? 'Hide Filters' : 'Filters'}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            key="invoice-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Invoice Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input 
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Payment Status
                </label>
                <div className="flex gap-2">
                  {(['all', 'paid', 'pending'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                        statusFilter === s 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "bg-white border-slate-50 text-slate-400 hover:border-indigo-100"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-3">
                 <button 
                  onClick={clearFilters}
                  className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                 >
                   Clear All
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-slate-100">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Loading Invoices...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((invoice, idx) => {
             const paymentData = typeof invoice.payment_data === 'string' ? JSON.parse(invoice.payment_data) : invoice.payment_data;
             const isPaid = paymentData.dueAmount <= 0;

             return (
              <motion.div
                key={`invoice-card-${invoice.id || 'new'}-${invoice.invoice_number || 'draft'}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 hover:border-indigo-100 transition-all content-center"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "p-5 rounded-[1.5rem] transition-colors",
                      isPaid ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{invoice.invoice_number}</span>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {invoice.invoice_date}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                        {invoice.guest_name}
                        {isPaid ? (
                          <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            <Clock className="w-3 h-3" /> Pending
                          </div>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                           <User className="w-3.5 h-3.5" />
                           {invoice.guest_phone || 'No Phone'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                           <Clock className="w-3.5 h-3.5" />
                           Stay: {invoice.check_in} — {invoice.check_out || '??'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="text-center lg:text-right px-6 border-r border-slate-100 hidden sm:block">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Amount</p>
                      <p className="text-xl font-black text-slate-900">₹{(typeof invoice.summary_data === 'string' ? JSON.parse(invoice.summary_data).netTotal : invoice.summary_data.netTotal).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsModalOpen(true);
                        }}
                        className="p-4 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm"
                        title="Edit / View"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(invoice.id)}
                        className="p-4 bg-slate-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
             );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="bg-slate-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No Invoices Found</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">Try searching with a different keyword or create a new invoice.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-8 flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black mx-auto hover:bg-indigo-700 transition-all shadow-lg"
          >
            Create Your First Invoice
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <InvoiceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onSave={fetchInvoicesData}
      />
    </div>
  );
}
