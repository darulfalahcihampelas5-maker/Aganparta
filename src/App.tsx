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
      .then((module) => {
        // Clear reload trigger once a module loads successfully
        try {
          sessionStorage.removeItem('chunk_reload_triggered');
        } catch (_) {}
        resolve(module);
      })
      .catch((error) => {
        const errorMsg = String(error?.message || error || '');
        const isChunkOrExportError =
          errorMsg.includes('Failed to fetch dynamically imported module') ||
          errorMsg.includes('Importing a module script failed') ||
          errorMsg.includes('does not provide an export named') ||
          error?.name === 'ChunkLoadError' ||
          error instanceof SyntaxError;

        if (retriesLeft <= 1) {
          if (isChunkOrExportError && !sessionStorage.getItem('chunk_reload_triggered')) {
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

import { preloadDashboardTeacher, preloadDashboardStudent } from './lib/routePreload';

const DashboardTeacher = lazy(() => retryImport(preloadDashboardTeacher));
const DashboardStudent = lazy(() => retryImport(preloadDashboardStudent));

import { CuteLoadingScreen } from './components/CuteLoadingScreen';

// Komponen loading fallback dengan tampilan screen splash kedua
const LoadingScreen = () => (
  <CuteLoadingScreen />
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
