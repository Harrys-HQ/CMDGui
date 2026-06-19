import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './hooks/useToast';
import 'xterm/css/xterm.css';
import './index.css';
import { tauriBridge } from './tauriBridge';

// Inject Tauri bridge
window.electron = tauriBridge as any;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
