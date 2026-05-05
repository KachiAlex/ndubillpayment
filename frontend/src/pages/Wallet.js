import React from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/config';
import LoadingSpinner from '../components/LoadingSpinner';

const Wallet = () => {
  const [searchParams] = useSearchParams();
  const refreshToken = searchParams.get('refresh');

  const { data: wallet, isLoading } = useQuery(['wallet-balance', refreshToken], async () => {
    const data = await apiFetch('/wallet/balance');
    return data;
  }, {
    refetchOnMount: 'always'
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm sm:text-base text-gray-600">View your tuition payment wallet balance</p>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>
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
    </div>
  );
};

export default Wallet;
