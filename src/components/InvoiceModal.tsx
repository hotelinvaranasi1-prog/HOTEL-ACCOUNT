import React, { useState, useEffect, useMemo } from 'react';
import emailjs from '@emailjs/browser';
import { X, Loader2, Save, Printer, Download, Plus, Trash2, Send, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice, InvoiceRoomRow, InvoiceSummaryData, InvoicePaymentData, Booking } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettings, createInvoice, updateInvoice, updateBooking } from '../services/firebaseService';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice; // If editing
  booking?: Booking; // If creating from booking
  onSave: () => void;
}

const DEFAULT_TERMS = `The establishment shall not be liable to any guest or invitee of a guest for any loss damage or destruction to any personal property brought onto these premises.
Personal property shall include any personal effects and motor vehicles parked on the premises.
I/we agree to pay all changes incurred by me/us during our stay at This establishment.`;

export default function InvoiceModal({ isOpen, onClose, invoice, booking, onSave }: InvoiceModalProps) {
  const [formData, setFormData] = useState<any>({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    booking_source: 'Walk In',
    check_in: '',
    check_out: '',
    adults: 1,
    children: 0,
    room_data: [
      { type: 'Bedroom Deluxe', date: new Date().toISOString().split('T')[0], price: 1550, nights: 1, amount: 1550 }
    ],
    summary_data: {
      subtotal: 0,
      gstPercent: 5.00,
      gstAmount: 0,
      extraCharges: 0,
      discount: 0,
      netTotal: 0
    },
    payment_data: {
      cash: 0,
      upi: 0,
      card: 0,
      totalPaid: 0,
      dueAmount: 0
    },
    comments: DEFAULT_TERMS
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [hotelDetails, setHotelDetails] = useState<any>({
    name: 'HOTEL IN VARANASI',
    address: 'andharapull varanasi, Varanasi, 221002, Uttar Pradesh, India',
    phone: '+91 96966 62679',
    email: 'hotelinvaranasil@gmail.com',
    logo: ''
  });

  useEffect(() => {
    // Fetch hotel details from settings
    const fetchSettingsData = async () => {
      try {
        const settings = await getSettings();
        if (settings.hotel_name) {
          setHotelDetails({
            name: settings.hotel_name || 'HOTEL IN VARANASI',
            address: settings.hotel_address || 'andharapull varanasi, Varanasi, 221002, Uttar Pradesh, India',
            phone: settings.hotel_phone || '+91 96966 62679',
            email: settings.hotel_email || 'hotelinvaranasil@gmail.com',
            logo: settings.hotel_logo || ''
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettingsData();
  }, []);

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        room_data: typeof invoice.room_data === 'string' ? JSON.parse(invoice.room_data) : invoice.room_data,
        summary_data: typeof invoice.summary_data === 'string' ? JSON.parse(invoice.summary_data) : invoice.summary_data,
        payment_data: typeof invoice.payment_data === 'string' ? JSON.parse(invoice.payment_data) : invoice.payment_data,
      });
    } else if (booking) {
      const b_check_in = booking.check_in || booking.date;
      const b_check_out = booking.check_out || new Date(new Date(b_check_in).getTime() + 86400000).toISOString().split('T')[0];
      const stay_nights = Math.max(1, Math.ceil((new Date(b_check_out).getTime() - new Date(b_check_in).getTime()) / (1000 * 60 * 60 * 24)));

      setFormData({
        ...formData,
        booking_id: booking.id,
        guest_name: booking.guest_name || '',
        guest_phone: '', // Not in booking currently
        check_in: b_check_in,
        check_out: b_check_out,
        room_data: [
          { 
            type: `Room ${booking.room_number}`, 
            date: b_check_in, 
            price: booking.room_price, 
            nights: stay_nights, 
            amount: booking.room_price * stay_nights
          }
        ],
        payment_data: {
          cash: 0, 
          upi: 0,
          card: 0,
          totalPaid: (booking.cash_paid || 0) + (booking.online_paid || 0),
          dueAmount: booking.balance_amount || 0
        },
        summary_data: {
          ...formData.summary_data,
          extraCharges: booking.misc_charges || 0,
          discount: booking.discount || 0
        }
      });
    }
  }, [invoice, booking, isOpen]);

  // Calculations
  useEffect(() => {
    const subtotal = formData.room_data.reduce((acc: number, curr: any) => acc + (curr.price * curr.nights), 0);
    const gstAmount = (subtotal * formData.summary_data.gstPercent) / 100;
    const netTotal = subtotal + gstAmount + (Number(formData.summary_data.extraCharges) || 0) - (Number(formData.summary_data.discount) || 0);
    
    const totalPaid = (Number(formData.payment_data.cash) || 0) + (Number(formData.payment_data.upi) || 0) + (Number(formData.payment_data.card) || 0);
    const dueAmount = netTotal - totalPaid;

    setFormData((prev: any) => ({
      ...prev,
      summary_data: {
        ...prev.summary_data,
        subtotal,
        gstAmount,
        netTotal
      },
      payment_data: {
        ...prev.payment_data,
        totalPaid,
        dueAmount
      }
    }));
  }, [formData.room_data, formData.summary_data.gstPercent, formData.summary_data.extraCharges, formData.summary_data.discount, formData.payment_data.cash, formData.payment_data.upi, formData.payment_data.card]);

  const handleRoomDataChange = (index: number, field: string, value: any) => {
    const updated = [...formData.room_data];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'price' || field === 'nights') {
      updated[index].amount = updated[index].price * updated[index].nights;
    }
    setFormData({ ...formData, room_data: updated });
  };

  const addRoomRow = () => {
    setFormData({
      ...formData,
      room_data: [...formData.room_data, { type: 'Extra Item', date: new Date().toISOString().split('T')[0], price: 0, nights: 1, amount: 0 }]
    });
  };

  const removeRoomRow = (index: number) => {
    if (formData.room_data.length === 1) return;
    const updated = formData.room_data.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, room_data: updated });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const isUpdate = !!invoice?.id;
      if (isUpdate) {
        await updateInvoice(String(invoice.id), formData);
      } else {
        await createInvoice(formData);
      }

      if (formData.booking_id) {
        // Find existing booking to get other fields
        // Since we don't have the full booking object easily, just update the fields we know
        await updateBooking(formData.booking_id, {
          misc_charges: formData.summary_data.extraCharges,
          discount: formData.summary_data.discount,
          total_amount: formData.summary_data.netTotal
        });
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

    const createInvoicePDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Color Palette
    const colors = {
      primary: [15, 23, 42] as [number, number, number], // Slate 900
      indigo: [79, 70, 229] as [number, number, number], // Indigo 600
      text: [71, 85, 105] as [number, number, number], // Slate 600
      light: [241, 245, 249] as [number, number, number], // Slate 100
      white: [255, 255, 255] as [number, number, number],
    };

    // Helper for currency in PDF to avoid font issues with ₹
    const formatPDFCurrency = (amount: number) => {
        return `INR ${amount.toFixed(2)}`;
    };

    // 1. Header
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(hotelDetails?.name?.toUpperCase() || 'HOTEL IN VARANASI', margin, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(hotelDetails?.address || '', margin, 28);
    doc.text(`${hotelDetails?.phone} | ${hotelDetails?.email}`, margin, 33);

    // Invoice Meta
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 15, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${formData.invoice_number || '---'}`, pageWidth - margin, 22, { align: 'right' });
    doc.text(`Date: ${formData.invoice_date || ''}`, pageWidth - margin, 27, { align: 'right' });

    let currentY = 50;

    // 2. Billing Info
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO:', margin, currentY);
    doc.text('BOOKING DETAILS:', pageWidth / 2 + margin, currentY);
    
    currentY += 6;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.guest_name || 'Guest', margin, currentY);
    doc.text(`Source: ${formData.booking_source || '---'}`, pageWidth / 2 + margin, currentY);
    
    currentY += 5;
    doc.text(formData.guest_phone || '', margin, currentY);
    doc.text(`${formData.check_in || '---'} to ${formData.check_out || '---'}`, pageWidth / 2 + margin, currentY);

    currentY += 10;

    // 3. Room & Charges Table
    autoTable(doc, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: margin, right: margin },
      head: [['Description', 'Date', 'Price', 'Nights', 'Amount']],
      body: formData.room_data.map((r: any) => [
        r.type, 
        r.date, 
        formatPDFCurrency(r.price), 
        r.nights.toString(), 
        formatPDFCurrency(r.amount)
      ]),
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', halign: 'left' },
      columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 4. Financial Summary
    autoTable(doc, {
      startY: currentY,
      tableWidth: 80,
      margin: { left: pageWidth - margin - 80 },
      body: [
        ['Subtotal', formatPDFCurrency(formData.summary_data.subtotal)],
        [`GST (${formData.summary_data.gstPercent}%)`, formatPDFCurrency(formData.summary_data.gstAmount)],
        ['Extra Charges', formatPDFCurrency(formData.summary_data.extraCharges)],
        ['Discount', formatPDFCurrency(formData.summary_data.discount)],
        ['NET TOTAL', formatPDFCurrency(formData.summary_data.netTotal)],
        ['Total Paid', formatPDFCurrency(formData.payment_data.totalPaid)],
        ['BALANCE DUE', formatPDFCurrency(formData.payment_data.dueAmount)]
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1, halign: 'right' },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left' }, 1: { fontStyle: 'bold', halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === 4 || data.row.index === 6) { 
          data.cell.styles.fillColor = colors.light;
        }
      }
    });

    // 5. Terms
    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(8);
    doc.text('TERMS & CONDITIONS:', margin, currentY);
    currentY += 4;
    const splitTerms = doc.splitTextToSize(formData.comments || DEFAULT_TERMS, contentWidth);
    doc.text(splitTerms, margin, currentY);

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = createInvoicePDF();
    doc.save(`Invoice_${formData.invoice_number || 'Draft'}.pdf`);
  };

  const handleSendEmail = async () => {
    if (!formData.guest_email) {
      alert("Please provide a guest email address.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const doc = createInvoicePDF();
      const pdfBase64 = doc.output('datauristring');

      const templateParams = {
        email: formData.guest_email,
        customer_name: formData.guest_name || 'Guest',
        invoice_id: formData.invoice_number || 'Draft',
        invoice_date: formData.invoice_date || '',
        booking_source: formData.booking_source || '',
        checkin_date: formData.check_in || '',
        checkout_date: formData.check_out || '',
        room_number: formData.room_data.map((r: any) => r.type).join(', ') || '',
        room_price: formData.summary_data.subtotal.toFixed(2),
        gst: formData.summary_data.gstAmount.toFixed(2),
        extra_charges: formData.summary_data.extraCharges.toFixed(2),
        discount: formData.summary_data.discount.toFixed(2),
        net_total: formData.summary_data.netTotal.toFixed(2),
        balance_due: formData.payment_data.dueAmount.toFixed(2),
        invoice_link: pdfBase64,
      };

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      alert("Email Sent Successfully");
    } catch (err: any) {
      console.error("EmailJS Error details:", err);
      const errorMessage = err?.text || err?.message || JSON.stringify(err) || "An unknown error occurred";
      console.error("EmailJS full error:", errorMessage);
      alert("Email Failed: " + errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Tax Invoice Generation</h2>
              <p className="text-slate-500 font-medium text-sm">Create and customize hotel bills.</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-8 overflow-y-auto max-h-[calc(100vh-200px)] space-y-12">
            {/* 1. Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Info</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Auto-generated Invoice No"
                    value={formData.invoice_number || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                  <input
                    type="date"
                    value={formData.invoice_date || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hotel Details</label>
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-indigo-900">{hotelDetails?.name}</h4>
                    <p className="text-xs text-indigo-600 font-medium">{hotelDetails?.address}</p>
                    <p className="text-xs text-indigo-500 mt-1">{hotelDetails?.phone} | {hotelDetails?.email}</p>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 bg-white px-3 py-1 rounded-full border border-indigo-100">
                    Staff Panel
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Guest Details */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guest Information</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={formData.guest_name || ''}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <input
                  type="text"
                  placeholder="Guest Phone"
                  value={formData.guest_phone || ''}
                  onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <select
                  value={formData.booking_source || 'Walk In'}
                  onChange={(e) => setFormData({ ...formData, booking_source: e.target.value })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                >
                  <option value="Walk In">Walk In</option>
                  <option value="OTA">OTA</option>
                  <option value="Direct">Direct</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="email"
                  placeholder="Guest Email"
                  value={formData.guest_email || ''}
                  onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <div className="flex gap-4 col-span-2">
                   <div className="flex-1">
                     <p className="text-[10px] text-slate-400 font-bold mb-1 ml-1 px-2">Check-in</p>
                     <div className="flex gap-2">
                        <input
                            type="date"
                            value={formData.check_in || ''}
                            onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        />
                     </div>
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] text-slate-400 font-bold mb-1 ml-1 px-2">Check-out</p>
                     <div className="flex gap-2">
                        <input
                            type="date"
                            value={formData.check_out || ''}
                            onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        />
                     </div>
                   </div>
                </div>
                <input
                  type="number"
                  placeholder="Adults"
                  value={formData.adults ?? 0}
                  onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <input
                  type="number"
                  placeholder="Children"
                  value={formData.children ?? 0}
                  onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                  className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            {/* 3. Room Rate Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Room & Charge Breakdown</label>
                <button onClick={addRoomRow} className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="bg-slate-50 p-2 rounded-[2rem] border border-slate-100">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Nights</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    {formData.room_data.map((room: any, index: number) => (
                      <tr key={`invoice-room-row-${index}-${room.type}-${room.date}`} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <td className="px-4 py-2">
                          <select
                            value={room.type || 'Bedroom Deluxe'}
                            onChange={(e) => handleRoomDataChange(index, 'type', e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none"
                          >
                            <option value="Bedroom Deluxe">Bedroom Deluxe</option>
                            <option value="Standard Room">Standard Room</option>
                            <option value="Quadruple Room">Quadruple Room</option>
                            <option value="Family Room">Family Room</option>
                            <option value="Extra Item">Extra Item</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={room.price ?? 0}
                            onChange={(e) => handleRoomDataChange(index, 'price', parseFloat(e.target.value))}
                            className="w-24 bg-transparent border-none text-sm font-bold focus:ring-0 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={room.nights ?? 0}
                            onChange={(e) => handleRoomDataChange(index, 'nights', parseInt(e.target.value))}
                            className="w-16 bg-transparent border-none text-sm font-bold focus:ring-0 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 font-black text-slate-900 text-sm">
                          ₹{room.amount}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => removeRoomRow(index)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Financial Summary & Payments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Summary Table */}
               <div className="space-y-6">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Summary</label>
                 <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{formData.summary_data.subtotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">GST (%)</span>
                        <input
                          type="number"
                          value={formData.summary_data.gstPercent ?? 0}
                          onChange={(e) => setFormData({ ...formData, summary_data: { ...formData.summary_data, gstPercent: parseFloat(e.target.value) } })}
                          className="w-12 px-2 py-0.5 bg-slate-50 rounded-md text-center text-xs font-black text-indigo-600 border-none outline-none"
                        />
                      </div>
                      <span className="text-slate-900">₹{formData.summary_data.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">Extra Charges</span>
                      <input
                        type="number"
                        value={formData.summary_data.extraCharges ?? 0}
                        onChange={(e) => setFormData({ ...formData, summary_data: { ...formData.summary_data, extraCharges: parseFloat(e.target.value) } })}
                        className="w-24 px-3 py-1.5 bg-slate-50 rounded-xl text-right text-sm font-black text-slate-900 border-none outline-none"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">Discount</span>
                      <input
                        type="number"
                        value={formData.summary_data.discount ?? 0}
                        onChange={(e) => setFormData({ ...formData, summary_data: { ...formData.summary_data, discount: parseFloat(e.target.value) } })}
                        className="w-24 px-3 py-1.5 bg-rose-50 rounded-xl text-right text-sm font-black text-rose-600 border-none outline-none"
                      />
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-lg font-black text-slate-900">NET TOTAL</span>
                      <span className="text-2xl font-black text-indigo-600">₹{formData.summary_data.netTotal.toFixed(2)}</span>
                    </div>
                 </div>
               </div>

               {/* Payment Details */}
               <div className="space-y-6">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Breakdown</label>
                 <div className="space-y-4 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                    <div className="flex items-center justify-between gap-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cash</span>
                       <input
                        type="number"
                        value={formData.payment_data.cash ?? 0}
                        onChange={(e) => setFormData({ ...formData, payment_data: { ...formData.payment_data, cash: e.target.value === '' ? 0 : parseFloat(e.target.value) } })}
                        className="bg-white/10 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-black w-32"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">UPI / Online</span>
                       <input
                        type="number"
                        value={formData.payment_data.upi ?? 0}
                        onChange={(e) => setFormData({ ...formData, payment_data: { ...formData.payment_data, upi: e.target.value === '' ? 0 : parseFloat(e.target.value) } })}
                        className="bg-white/10 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-black w-32"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Card</span>
                       <input
                        type="number"
                        value={formData.payment_data.card ?? 0}
                        onChange={(e) => setFormData({ ...formData, payment_data: { ...formData.payment_data, card: e.target.value === '' ? 0 : parseFloat(e.target.value) } })}
                        className="bg-white/10 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-black w-32"
                      />
                    </div>
                    <div className="pt-6 mt-4 border-t border-white/10 grid grid-cols-2 gap-8">
                       <div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Paid</p>
                         <p className="text-xl font-black text-emerald-400 mt-1">₹{formData.payment_data.totalPaid.toFixed(2)}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining Due</p>
                         <p className={cn("text-xl font-black mt-1", formData.payment_data.dueAmount > 0 ? "text-rose-400" : "text-emerald-400")}>
                           ₹{formData.payment_data.dueAmount.toFixed(2)}
                         </p>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <p className="text-xs text-emerald-700 font-bold leading-tight">Payments are auto-calculated against the net total and balance is tracked in real-time.</p>
                 </div>
               </div>
            </div>

            {/* 5. Policy Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comments / Terms & Conditions</label>
              <textarea
                value={formData.comments || ''}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={8}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                placeholder="Add special requests or edit terms..."
              />
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <button 
                  onClick={handleDownloadPDF}
                  className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
                  title="Download PDF"
               >
                  <Download className="w-5 h-5" />
               </button>
               <button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50"
                  title="Email PDF to Guest"
               >
                  {isSendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               </button>
               <button 
                  onClick={() => window.print()}
                  className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
                  title="Print Invoice"
               >
                  <Printer className="w-5 h-5" />
               </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button 
                 onClick={onClose}
                 className="flex-1 sm:flex-none px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSave}
                 disabled={isLoading}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
               >
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 {invoice ? 'Update Invoice' : 'Save & Close'}
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
