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
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createBooking = async (bookingData: Booking) => {
  const path = 'bookings';
  try {
    const { id, ...data } = bookingData;
    const docRef = await addDoc(collection(db, path), {
      ...data,
      created_at: new Date().toISOString()
    });
    // Update room status
    await updateRoomStatus(bookingData.room_number, 'Occupied');
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateBooking = async (id: string, bookingData: Partial<Booking>) => {
  const path = `bookings/${id}`;
  try {
    const { id: _, ...data } = bookingData;
    await updateDoc(doc(db, 'bookings', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteBooking = async (id: string) => {
  if (!id) {
    console.error('Attempted to delete booking with invalid id');
    return;
  }
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
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createInvoice = async (invoiceData: any) => {
  const path = 'invoices';
  try {
    const { id, ...data } = invoiceData;
    const docRef = await addDoc(collection(db, path), {
      ...data,
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
    const { id: _, ...data } = invoiceData;
    await updateDoc(doc(db, 'invoices', id), {
      ...data,
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
