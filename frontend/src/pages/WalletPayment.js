import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const WalletPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const matricNumber = searchParams.get('matric_number');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const processPayment = async () => {
      if (!matricNumber) {
        setError('Invalid QR code: Missing matric number');
        setLoading(false);
        return;
      }

      // If user is not logged in, redirect to login with the payment info
      if (!user) {
        navigate(`/login?redirect=/wallet/payment&matric_number=${encodeURIComponent(matricNumber)}&amount=${amount || ''}`);
        return;
      }

      // If user is logged in but matric number doesn't match
      if (user?.matric_number !== matricNumber) {
        setError('This QR code is for a different student');
        setLoading(false);
        return;
      }

      // Redirect to wallet with the amount pre-filled
      if (amount) {
        navigate(`/wallet?amount=${amount}`);
      } else {
        navigate('/wallet');
      }
    };

    processPayment();
  }, [matricNumber, amount, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner
          compact
          title="Processing Payment"
          message="Verifying QR code and preparing payment flow..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/wallet')}
            className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition font-semibold"
          >
            Go to Wallet
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default WalletPayment;
