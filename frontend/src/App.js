import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import OfflineBanner from './components/OfflineBanner';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Wallet from './pages/Wallet';
import WalletPayment from './pages/WalletPayment';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import PaymentCallback from './pages/PaymentCallback';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Create a client with caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingSpinner
        title="Restoring your session"
        message="Please wait while we verify your account and load your dashboard."
      />
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <Landing />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
      />
      <Route 
        path="/forgot-password" 
        element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} 
      />
      <Route 
        path="/reset-password" 
        element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} 
      />
      <Route 
        path="/payment/callback" 
        element={<PaymentCallback />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={user ? (
          <Layout>
            {(user?.user_type === 'bursar' || user?.user_type === 'admin') ? <AdminDashboard /> : <StudentDashboard />}
          </Layout>
        ) : <Navigate to="/login" replace />} 
      />
      
      {/* Student routes */}
      <Route 
        path="/wallet" 
        element={user?.user_type === 'student' ? (
          <Layout>
            <Wallet />
          </Layout>
        ) : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/wallet/payment" 
        element={<WalletPayment />} 
      />
      <Route 
        path="/transactions" 
        element={user?.user_type === 'student' ? (
          <Layout>
            <Transactions />
          </Layout>
        ) : <Navigate to="/dashboard" replace />} 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={user?.user_type === 'bursar' || user?.user_type === 'admin' ? (
          <Layout>
            <AdminDashboard />
          </Layout>
        ) : <Navigate to="/dashboard" replace />} 
      />
      
      {/* Common routes */}
      <Route 
        path="/profile" 
        element={user ? (
          <Layout>
            <Profile />
          </Layout>
        ) : <Navigate to="/login" replace />} 
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="App">
              <OfflineBanner />
              <AppRoutes />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
