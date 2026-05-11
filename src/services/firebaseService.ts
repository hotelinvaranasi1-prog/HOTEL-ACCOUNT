import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Booking, Room, Invoice, Summary } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Rooms
export const getRooms = async (): Promise<Room[]> => {
  const path = 'rooms';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: Number(doc.id), ...doc.data() } as Room));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateRoomStatus = async (roomNumber: string, status: string) => {
  const path = `rooms/${roomNumber}`;
  try {
    await setDoc(doc(db, 'rooms', roomNumber), { number: roomNumber, status }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Bookings
export const getBookings = async (): Promise<Booking[]> => {
  const path = 'bookings';
  try {
    const q = query(collection(db, path), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createBooking = async (bookingData: any) => {
  const path = 'bookings';
  try {
    // Add server timestamp and calculated fields
    const total_amount = (Number(bookingData.room_price) || 0) + (Number(bookingData.misc_charges) || 0);
    const balance_amount = total_amount - (Number(bookingData.cash_paid) || 0) - (Number(bookingData.online_paid) || 0);
    const payment_status = balance_amount <= 0 ? 'Paid' : 'Unpaid';
    
    let commission_amount = 0;
    let gst_amount = 0;
    let net_income = total_amount;

    if (bookingData.booking_type === 'OTA') {
      commission_amount = Number(bookingData.commission_amount) || 0;
      gst_amount = 0;
      net_income = total_amount - commission_amount;
    }

    const docRef = await addDoc(collection(db, path), {
      ...bookingData,
      total_amount,
      balance_amount,
      payment_status,
      commission_amount,
      gst_amount,
      net_income,
      booking_status: 'Active',
      created_at: new Date().toISOString() // Or serverTimestamp() if rules allow
    });

    // Update room status
    await updateRoomStatus(bookingData.room_number, 'Occupied');

    // Notify server for Telegram (optional, if we want to keep server-side logic)
    fetch('/api/notify-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bookingData, total_amount, payment_status, id: docRef.id })
    }).catch(console.error);

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateBooking = async (id: string, bookingData: any) => {
  const path = `bookings/${id}`;
  try {
    const total_amount = (Number(bookingData.room_price) || 0) + (Number(bookingData.misc_charges) || 0);
    const balance_amount = total_amount - (Number(bookingData.cash_paid) || 0) - (Number(bookingData.online_paid) || 0);
    const payment_status = balance_amount <= 0 ? 'Paid' : 'Unpaid';
    
    let net_income = total_amount;
    if (bookingData.booking_type === 'OTA') {
      net_income = total_amount - (Number(bookingData.commission_amount) || 0);
    }

    await updateDoc(doc(db, 'bookings', id), {
      ...bookingData,
      total_amount,
      balance_amount,
      payment_status,
      net_income
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteBooking = async (id: string) => {
  const path = `bookings/${id}`;
  try {
    await deleteDoc(doc(db, 'bookings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Invoices
export const getInvoices = async (): Promise<Invoice[]> => {
  const path = 'invoices';
  try {
    const q = query(collection(db, path), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createInvoice = async (invoiceData: any) => {
  const path = 'invoices';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...invoiceData,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateInvoice = async (id: string, invoiceData: any) => {
  const path = `invoices/${id}`;
  try {
    await updateDoc(doc(db, 'invoices', id), {
      ...invoiceData,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteInvoice = async (id: string) => {
  const path = `invoices/${id}`;
  try {
    await deleteDoc(doc(db, 'invoices', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Settings
export const getSettings = async () => {
  const path = 'settings';
  try {
    const snapshot = await getDocs(collection(db, path));
    const settings: any = {};
    snapshot.docs.forEach(doc => {
      settings[doc.id] = doc.data().value;
    });
    return settings;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {};
  }
};

export const saveSettings = async (settings: any) => {
  try {
    for (const [key, value] of Object.entries(settings)) {
      await setDoc(doc(db, 'settings', key), { key, value: String(value) }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings');
  }
};
