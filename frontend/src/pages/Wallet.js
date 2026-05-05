import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/config';
import LoadingSpinner from '../components/LoadingSpinner';
import FundWalletModal from '../components/FundWalletModal';

const Wallet = () => {
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const refreshToken = searchParams.get('refresh');

  const { data: wallet, isLoading } = useQuery(['wallet-balance', refreshToken], async () => {
    const data = await apiFetch('/wallet/balance');
    return data;
  }, {
    refetchOnMount: 'always'
  });

  const handleFundSuccess = () => {
    // Balance will be refreshed automatically via query invalidation in modal
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your tuition payment wallet balance</p>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Wallet Balance</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Fund Wallet
          </button>
        </div>
        {isLoading ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <LoadingSpinner
              compact
              title="Loading wallet balance"
              message="Fetching your latest balance."
            />
          </div>
        ) : (
          <p className="text-3xl sm:text-4xl font-bold text-blue-600">₦{wallet?.balance?.toLocaleString() || 0}</p>
        )}
      </div>

      <FundWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleFundSuccess}
      />
    </div>
  );
};

export default Wallet;
