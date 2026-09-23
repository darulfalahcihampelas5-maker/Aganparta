/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';

// Helper to retry dynamic imports with exponential backoff & page reload fallback
const retryImport = <T,>(
  fn: () => Promise<T>,
  retriesLeft = 3,
  interval = 600
): Promise<T> => {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        if (retriesLeft <= 1) {
          const isChunkError =
            error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.message?.includes('Importing a module script failed') ||
            error?.name === 'ChunkLoadError';

          if (isChunkError && !sessionStorage.getItem('chunk_reload_triggered')) {
            sessionStorage.setItem('chunk_reload_triggered', 'true');
            window.location.reload();
            return;
          }
          reject(error);
          return;
        }
        setTimeout(() => {
          retryImport(fn, retriesLeft - 1, interval * 1.5).then(resolve, reject);
        }, interval);
      });
  });
};

const DashboardTeacher = lazy(() => retryImport(() => import('./pages/DashboardTeacher')));
const DashboardStudent = lazy(() => retryImport(() => import('./pages/DashboardStudent')));

// Komponen loading fallback untuk UX pada jaringan lambat
const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Memuat aplikasi...</p>
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    const handlePreloadError = () => {
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', handlePreloadError);
    return () => window.removeEventListener('vite:preloadError', handlePreloadError);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/dashboard/teacher" element={<DashboardTeacher />} />
              <Route path="/dashboard/student" element={<DashboardStudent />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
