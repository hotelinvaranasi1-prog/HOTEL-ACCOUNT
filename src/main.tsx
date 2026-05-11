import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase.ts';
import { AuthProvider } from './components/AuthProvider.tsx';
import { initOneSignal } from './lib/onesignal.ts';

// Initialize Firebase
initFirebase();

// Initialize OneSignal
initOneSignal();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
