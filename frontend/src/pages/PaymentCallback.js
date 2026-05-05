import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/config';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const pollRef = useRef(null);

  useEffect(() => {
    const txRef = searchParams.get('tx_ref');
    const flutterwaveStatus = searchParams.get('status');
    const transactionId = searchParams.get('transaction_id');

    const clearPolling = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const redirectToWallet = (delay = 2500) => {
      setTimeout(() => navigate(`/wallet?refresh=${Date.now()}`, { replace: true }), delay);
    };

    const confirmPaymentWithBackend = async () => {
      if (!txRef || !transactionId) {
        return false;
      }

      try {
        const data = await apiFetch(`/public/transactions/${encodeURIComponent(txRef)}/confirm`, {
          method: 'POST',
          body: JSON.stringify({ transaction_id: transactionId })
        });

        if (data?.success && data?.transaction?.status === 'completed') {
          clearPolling();
          setStatus('success');
          redirectToWallet(1500);
          return true;
        }
      } catch (err) {
        console.warn('[PaymentCallback] Backend confirmation failed:', err);
      }

      return false;
    };

    const finalizePayment = async () => {
      if (!txRef) {
        if (flutterwaveStatus === 'successful') {
          setStatus('success');
          redirectToWallet();
        } else {
          setStatus('failed');
          redirectToWallet();
        }
        return;
      }

      if (await confirmPaymentWithBackend()) {
        return;
      }

      try {
        const data = await apiFetch(`/public/transactions/${encodeURIComponent(txRef)}`);
        if (data?.transaction?.status === 'completed') {
          clearPolling();
          setStatus('success');
          redirectToWallet();
          return;
        }

        if (flutterwaveStatus && flutterwaveStatus !== 'successful') {
          clearPolling();
          setStatus('failed');
          redirectToWallet();
        }
      } catch (err) {
        console.warn('[PaymentCallback] Status check failed:', err);
      }
    };

    finalizePayment();

    if (txRef) {
      pollRef.current = window.setInterval(finalizePayment, 2500);
    }

    return () => {
      clearPolling();
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        {status === 'processing' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing Payment...</h2>
            <p className="mt-2 text-gray-600">Please wait while we verify your payment and update your wallet.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment Successful!</h2>
            <p className="mt-2 text-gray-600">Your wallet has been funded successfully.</p>
            <p className="mt-1 text-sm text-gray-500">Redirecting to wallet...</p>
          </div>
        )}
        
        {status === 'failed' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment Failed</h2>
            <p className="mt-2 text-gray-600">There was an issue processing your payment.</p>
            <p className="mt-1 text-sm text-gray-500">Redirecting to wallet...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
