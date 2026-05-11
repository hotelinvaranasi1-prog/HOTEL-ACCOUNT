export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';

export interface Room {
  id: number;
  number: string;
  status: RoomStatus;
}

export type BookingType = 'Walk-in' | 'OTA';
export type PaymentStatus = 'Paid' | 'Unpaid';
export type BookingStatus = 'Active' | 'Cancelled' | 'Completed';

export interface Booking {
  id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  room_number: string;
  guest_name: string;
  booking_type: BookingType;
  ota_source?: string;
  room_price: number;
  misc_charges: number;
  total_amount: number;
  cash_paid: number;
  online_paid: number;
  balance_amount: number;
  commission_amount: number;
  gst_amount: number;
  net_income: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  created_at: string;
}

export interface Summary {
  total_revenue: number;
  total_cash: number;
  total_online: number;
  ota_count: number;
  walkin_count: number;
  pending_payments: number;
}

export interface InvoiceRoomRow {
  number: string;
  type: string;
  pax: string;
  checkIn: string;
  checkOut: string;
  days: number;
  rate: number;
  amount: number;
}

export interface InvoiceSummaryData {
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  extraCharges: number;
  discount: number;
  netTotal: number;
}

export interface InvoicePaymentData {
  cash: number;
  upi: number;
  card: number;
  totalPaid: number;
  dueAmount: number;
}

export interface Invoice {
  id: number;
  booking_id?: number | null;
  invoice_number: string;
  invoice_date: string;
  guest_name: string;
  guest_address: string;
  guest_phone: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  booking_source?: string;
  room_data: InvoiceRoomRow[] | string;
  summary_data: InvoiceSummaryData | string;
  payment_data: InvoicePaymentData | string;
  comments: string;
  created_at: string;
}
