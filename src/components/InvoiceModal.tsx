import React, { useState, useEffect, useMemo } from 'react';
import emailjs from '@emailjs/browser';
import { X, Loader2, Save, Printer, Download, Plus, Trash2, Send, Share2, Sparkles, MessageCircle } from 'lucide-react';
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
    address1: 'andharapull varanasi',
    address2: '',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '221002',
    country: 'India',
    phone: '+91 96966 62679',
    whatsapp: '',
    email: 'hotelinvaranasil@gmail.com',
    website: '',
    gstin: '',
    pan: '',
    logo: '',
    instagram: '',
    facebook: '',
    twitter: '',
    invoice_terms: '',
    footer_message: '© Hotel Name',
    best_regards: 'Best Regards,\nHotel Name',
    signature: '',
    upi_id: '',
    qr: ''
  });

  useEffect(() => {
    // Fetch hotel details from settings
    const fetchSettingsData = async () => {
      try {
        const settings = await getSettings();
        setHotelDetails({
          name: settings.hotel_name || 'HOTEL IN VARANASI',
          address1: settings.hotel_address1 || settings.hotel_address || 'andharapull varanasi',
          address2: settings.hotel_address2 || '',
          city: settings.hotel_city || 'Varanasi',
          state: settings.hotel_state || 'Uttar Pradesh',
          pincode: settings.hotel_pincode || '221002',
          country: settings.hotel_country || 'India',
          phone: settings.hotel_phone || '+91 96966 62679',
          whatsapp: settings.hotel_whatsapp || '',
          email: settings.hotel_email || 'hotelinvaranasil@gmail.com',
          website: settings.hotel_website || '',
          gstin: settings.hotel_gstin || '',
          pan: settings.hotel_pan || '',
          logo: settings.hotel_logo || '',
          instagram: settings.hotel_instagram || '',
          facebook: settings.hotel_facebook || '',
          twitter: settings.hotel_twitter || '',
          invoice_terms: settings.hotel_invoice_terms || '',
          footer_message: settings.hotel_footer_message || '© Hotel Name',
          best_regards: settings.hotel_best_regards || 'Best Regards,\nHotel Name',
          signature: settings.hotel_signature || '',
          upi_id: settings.hotel_upi_id || '',
          qr: settings.hotel_qr || ''
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettingsData();
  }, []);

  useEffect(() => {
    const generateInvoiceNumber = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `INV-${year}${month}-${random}`;
    };

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
        invoice_number: formData.invoice_number || generateInvoiceNumber(),
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
    } else if (isOpen && !formData.invoice_number) {
      setFormData(prev => ({ ...prev, invoice_number: generateInvoiceNumber() }));
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
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    const contentWidth = pageWidth - (margin * 2);
    
    // Theme Colors
    const primaryColor = [77, 163, 217] as [number, number, number]; // #4DA3D9
    const borderColor = [191, 199, 207] as [number, number, number]; // #BFC7CF
    const textColor = [51, 51, 51] as [number, number, number];
    const lightGray = [245, 245, 245] as [number, number, number];

    const formatCurrency = (amount: number) => `INR ${amount.toFixed(2)}`;

    // 1. Header Background & Branding
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 85, 'F'); // 85pt header height
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    
    // Try to load logo if exists, else text
    if (hotelDetails?.logo) {
       try {
         // jsPDF addImage signature: addImage(imageData, format, x, y, width, height)
         doc.addImage(hotelDetails.logo, 'PNG', margin, 15, 140, 55);
       } catch(e) {
         doc.text(hotelDetails?.name?.toUpperCase() || 'HOTEL', margin, 50);
       }
    } else {
       doc.text(hotelDetails?.name?.toUpperCase() || 'HOTEL', margin, 50);
    }

    // Invoice Meta
    doc.setFontSize(14);
    doc.text('TAX INVOICE', pageWidth - margin, 35, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${formData.invoice_number}`, pageWidth - margin, 55, { align: 'right' });
    doc.text(`Date: ${formData.invoice_date}`, pageWidth - margin, 70, { align: 'right' });

    let currentY = 110;
    
    // 2. Hotel Details (Left)
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', margin, currentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    currentY += 15;
    doc.text(hotelDetails?.name || '', margin, currentY); currentY += 14;
    if(hotelDetails?.address1) { doc.text(hotelDetails.address1, margin, currentY); currentY += 14; }
    if(hotelDetails?.address2) { doc.text(hotelDetails.address2, margin, currentY); currentY += 14; }
    const cityState = [hotelDetails?.city, hotelDetails?.state, hotelDetails?.pincode].filter(Boolean).join(', ');
    if (cityState) { doc.text(cityState, margin, currentY); currentY += 14; }
    if (hotelDetails?.phone) { doc.text(`Phone: ${hotelDetails.phone}`, margin, currentY); currentY += 14; }
    if (hotelDetails?.email) { doc.text(`Email: ${hotelDetails.email}`, margin, currentY); currentY += 14; }
    if (hotelDetails?.gstin) { doc.text(`GSTIN: ${hotelDetails.gstin}`, margin, currentY); currentY += 14; }
    if (hotelDetails?.pan) { doc.text(`PAN: ${hotelDetails.pan}`, margin, currentY); currentY += 14; }

    const lastLeftY = currentY;

    // 3. Guest Details (Right)
    const rightColX = pageWidth / 2 + 20;
    let rightY = 110;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', rightColX, rightY);
    rightY += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.guest_name || 'Guest Name', rightColX, rightY); rightY += 14;
    if (formData.guest_address) { 
        const splitAddr = doc.splitTextToSize(formData.guest_address, contentWidth / 2 - 20);
        doc.text(splitAddr, rightColX, rightY); 
        rightY += (splitAddr.length * 14); 
    }
    if (formData.guest_phone) { doc.text(`Phone: ${formData.guest_phone}`, rightColX, rightY); rightY += 14; }
    if (formData.guest_email) { doc.text(`Email: ${formData.guest_email}`, rightColX, rightY); rightY += 14; }

    currentY = Math.max(lastLeftY, rightY) + 20;

    // 4. Stay Information section header
    doc.setFillColor(...primaryColor);
    doc.rect(margin, currentY, contentWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('STAY INFORMATION', margin + 10, currentY + 23);
    
    currentY += 55;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Check-In: ${formData.check_in || ''}`, margin, currentY);
    doc.text(`Check-Out: ${formData.check_out || ''}`, margin + 160, currentY);
    doc.text(`Adults/Children: ${formData.adults || 1} / ${formData.children || 0}`, margin + 320, currentY);
    currentY += 25;

    // 5. Charges Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Description', 'Date', 'Rate', 'Qty/Nights', 'Amount']],
      body: formData.room_data.map((r: any) => [
        r.type,
        r.date,
        formatCurrency(r.price),
        r.nights.toString(),
        formatCurrency(r.amount)
      ]),
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 13, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 8, textColor: textColor, lineColor: borderColor, lineWidth: 1 },
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // 6 & 7 & 8 & 9. Financial Summary
    autoTable(doc, {
      startY: currentY,
      margin: { left: pageWidth - margin - 220 },
      tableWidth: 220,
      body: [
        ['Subtotal:', formatCurrency(formData.summary_data.subtotal)],
        [`CGST (${formData.summary_data.gstPercent / 2}%):`, formatCurrency(formData.summary_data.gstAmount / 2)],
        [`SGST (${formData.summary_data.gstPercent / 2}%):`, formatCurrency(formData.summary_data.gstAmount / 2)],
        ['Extra Charges:', formatCurrency(formData.summary_data.extraCharges)],
        ['Discount:', formatCurrency(formData.summary_data.discount)],
        ['NET TOTAL:', formatCurrency(formData.summary_data.netTotal)],
        ['Paid Amount:', formatCurrency(formData.payment_data.totalPaid)],
        ['BALANCE OWING:', formatCurrency(formData.payment_data.dueAmount)]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6, textColor: textColor },
      columnStyles: {
        0: { halign: 'right', fontStyle: 'bold' },
        1: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.index === 5 || data.row.index === 7) {
          data.cell.styles.fillColor = lightGray;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 40;

    // 10. Terms and Conditions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms and Conditions', margin, currentY);
    currentY += 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const terms = hotelDetails?.invoice_terms || formData.comments || 'Standard terms apply.';
    const splitTerms = doc.splitTextToSize(terms, contentWidth);
    doc.text(splitTerms, margin, currentY);
    
    currentY += splitTerms.length * 14 + 30;

    // 11. Best Regards Section
    if (currentY > pageHeight - 120) {
       doc.addPage();
       currentY = 50;
    }
    
    const regards = hotelDetails?.best_regards || 'Best Regards,\nHotel Management';
    const splitRegards = doc.splitTextToSize(regards, contentWidth);
    doc.text(splitRegards, margin, currentY);
    
    if (hotelDetails?.signature) {
       try {
         doc.addImage(hotelDetails.signature, 'PNG', margin, currentY + (splitRegards.length * 14) + 10, 120, 40);
       } catch (e) {}
    }
    
    // 12. Footer
    const footerHeight = 40;
    const footerY = pageHeight - footerHeight;
    doc.setFillColor(...lightGray);
    doc.rect(0, footerY, pageWidth, footerHeight, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.text(hotelDetails?.footer_message || '© Hotel Name', margin, footerY + 24);
    
    // Footer social links
    const links = [hotelDetails?.website, hotelDetails?.instagram, hotelDetails?.facebook, hotelDetails?.twitter]
        .filter(Boolean).join('  |  ');
    if (links) {
        doc.text(links, pageWidth - margin, footerY + 24, { align: 'right' });
    }

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

  const handleShareWhatsApp = async () => {
    try {
      const doc = createInvoicePDF();
      const pdfBlob = doc.output('blob');
      const filename = `Invoice_${formData.invoice_number || 'Draft'}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      const phone = formData.guest_phone ? formData.guest_phone.replace(/\D/g, '') : '';
      const text = `Hello ${formData.guest_name || 'Guest'},\n\nPlease find your invoice (${formData.invoice_number || 'Draft'}) attached.\n\nBest regards,\n${hotelDetails?.name || 'Hotel Management'}`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${formData.invoice_number || 'Draft'}`,
          text: text,
          files: [file]
        });
      } else {
         // Fallback for unsupported browsers: download the PDF and open WhatsApp Web/App
         doc.save(filename);
         const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
         window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.error('Error sharing to WhatsApp:', err);
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
                  onClick={handleShareWhatsApp}
                  className="p-4 bg-white text-emerald-600 rounded-2xl border border-slate-200 hover:bg-emerald-50 transition-all shadow-sm"
                  title="Share via WhatsApp"
               >
                  <MessageCircle className="w-5 h-5" />
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
