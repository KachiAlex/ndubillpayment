import React, { useState } from 'react';
import { useQueryClient } from 'react-query';
import { apiFetch } from '../api/config';

const FundWalletModal = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const formatNumberWithCommas = (value) => {
    const numericValue = value.replace(/,/g, '');
    if (!numericValue) return '';
    const parsed = Number(numericValue);
    return isNaN(parsed) ? '' : parsed.toLocaleString('en-US');
  };

  const handleAmountChange = (e) => {
    const formatted = formatNumberWithCommas(e.target.value);
    setAmountDisplay(formatted);
    setAmount(formatted.replace(/,/g, ''));
    setError('');
  };

  const handleFund = async (e) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch('/wallet/fund', {
        method: 'POST',
        body: JSON.stringify({ amount: numericAmount, description: 'Wallet funding' })
      });

      // Complete the payment immediately (test flow)
      await apiFetch(`/payments/transactions/${data.tx_ref}/complete`, {
        method: 'POST',
        body: JSON.stringify({ amount: numericAmount, mode: 'wallet' })
      });

      // Refresh wallet balance
      queryClient.invalidateQueries(['wallet-balance']);

      setAmount('');
      setAmountDisplay('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to fund wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setAmountDisplay('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Fund Wallet</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleFund} className="space-y-4">
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
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || isLoading}
              className="flex-1 px-4 py-3 text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Processing...' : 'Fund Wallet'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            This is a test-only checkout that completes instantly. Your wallet balance will be updated immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FundWalletModal;
