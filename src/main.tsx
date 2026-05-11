import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './lib/firebase.ts';
import { AuthProvider } from './components/AuthProvider.tsx';

// Initialize Firebase
initFirebase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
