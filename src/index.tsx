import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AnalysisProvider>
        <PlayerProvider>
          <BrowserRouter>
            <App />
            <Toaster position="top-center" theme="dark" richColors />
          </BrowserRouter>
        </PlayerProvider>
      </AnalysisProvider>
    </AuthProvider>
  </React.StrictMode>
);