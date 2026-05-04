import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiFetch } from '../api/config';
import LoadingSpinner from '../components/LoadingSpinner';

const Wallet = () => {
  const [amount, setAmount] = useState('');

  const { data: wallet, isLoading } = useQuery(['wallet-balance'], async () => {
    const data = await apiFetch('/wallet/balance');
    return data;
  });

  const handleFundWallet = () => {
    // This would integrate with Flutterwave
    console.log('Funding wallet with amount:', amount);
    if (amount && amount > 0) {
      const flutterwaveUrl = `https://checkout.flutterwave.com/v3/hosted/pay?amount=${amount}&currency=NGN&tx_ref=${Date.now()}`;
      window.location.href = flutterwaveUrl;
    }
  };

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
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
