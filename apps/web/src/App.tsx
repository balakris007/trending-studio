import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Invoices } from './pages/Invoices';
import { StudioOrders } from './pages/StudioOrders';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { PhotoPrintPricing } from './pages/PhotoPrintPricing';
import { Reports } from './pages/Reports';
import { SyncCenter } from './pages/SyncCenter';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading Trending Studio POS...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Trending Studio] UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-base font-bold text-white">Trending Studio POS</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'A display glitch occurred.'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
            >
              Reset Session & Open Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const base = import.meta.env.BASE_URL;
  const cleanBase = base ? base.replace(/\/$/, '') : '';
  const basename = cleanBase && cleanBase !== '' ? cleanBase : undefined;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="orders" element={<StudioOrders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="products" element={<Products />} />
              <Route path="photo-prints" element={<PhotoPrintPricing />} />
              <Route path="reports" element={<Reports />} />
              <Route path="sync" element={<SyncCenter />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
