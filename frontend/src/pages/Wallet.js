import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/config';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const loadFlutterwaveScript = () => {
  if (window.FlutterwaveCheckout) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://checkout.flutterwave.com/v3.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Flutterwave checkout'));
    document.body.appendChild(script);
  });
};

const Wallet = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const flutterwavePublicKey = process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY;
  const refreshToken = searchParams.get('refresh');

  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam) {
      setAmount(amountParam);
      setAmountDisplay(Number(amountParam).toLocaleString('en-US'));
    }
  }, [searchParams]);

  const formatNumberWithCommas = (value) => {
    const numericValue = value.replace(/,/g, '').replace(/\D/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('en-US');
  };

  const handleAmountChange = (e) => {
    const formatted = formatNumberWithCommas(e.target.value);
    setAmountDisplay(formatted);
    setAmount(formatted.replace(/,/g, ''));
  };

  const { data: wallet, isLoading } = useQuery(['wallet-balance', refreshToken], async () => {
    const data = await apiFetch('/wallet/balance');
    return data;
  }, {
    refetchOnMount: 'always'
  });

  const handleFundWallet = useCallback(async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return;
    }

    if (!flutterwavePublicKey) {
      return;
    }

    const data = await apiFetch('/wallet/pay', {
      method: 'POST',
      body: JSON.stringify({ amount: numericAmount, description: 'Wallet funding' })
    });

    await loadFlutterwaveScript();

    if (typeof window.FlutterwaveCheckout !== 'function') {
      throw new Error('Flutterwave checkout could not be loaded');
    }

    const txRef = data?.tx_ref || `TXN-${Date.now()}`;
    const callbackUrl = `${window.location.origin}/payment/callback?tx_ref=${encodeURIComponent(txRef)}&amount=${encodeURIComponent(String(numericAmount))}`;

    window.FlutterwaveCheckout({
      public_key: flutterwavePublicKey,
      tx_ref: txRef,
      amount: numericAmount,
      currency: 'NGN',
      payment_options: 'card,banktransfer,ussd',
      redirect_url: callbackUrl,
      customer: {
        email: user?.email || '',
        id: `wallet_${String(user?.id || user?.email || 'customer').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Wallet Funding',
        phone_number: ''
      },
      customizations: {
        title: 'NDU Wallet Funding',
        description: 'Add money to your student wallet'
      },
      meta: {
        payment_source: 'wallet_topup'
      },
      callback: function (response) {
        if (response?.status === 'successful' || response?.status === 'completed') {
          navigate(`/payment/callback?tx_ref=${encodeURIComponent(response.tx_ref || txRef)}&amount=${encodeURIComponent(String(numericAmount))}`);
        }
      },
      onclose: function () {
        navigate(`/payment/callback?tx_ref=${encodeURIComponent(txRef)}&amount=${encodeURIComponent(String(numericAmount))}`);
      }
    });
  }, [amount, flutterwavePublicKey, navigate, user?.email, user?.first_name, user?.last_name]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your tuition payment wallet</p>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>
        {isLoading ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <LoadingSpinner
              compact
              title="Loading wallet balance"
              message="Fetching your latest balance and transaction status."
            />
          </div>
        ) : (
          <p className="text-3xl sm:text-4xl font-bold text-blue-600">₦{wallet?.balance?.toLocaleString() || 0}</p>
        )}
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Fund Wallet</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (₦)
            </label>
            <input
              type="text"
              id="amount"
              value={amountDisplay}
              onChange={handleAmountChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount"
              min="1"
            />
          </div>
          <button
            onClick={handleFundWallet}
            disabled={!amount || amount <= 0}
            className="w-full px-4 py-3 text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Continue to Payment
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Important Information</h2>
        <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
          <li>Minimum funding amount is ₦100</li>
          <li>Payments are processed via Flutterwave</li>
          <li>Balance updates automatically after successful payment</li>
          <li>Keep your transaction reference for support</li>
        </ul>
      </div>
    </div>
  );
};

export default Wallet;
