import React from 'react';

const Transactions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600">View your payment history</p>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction History</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All your tuition payment transactions
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <p className="text-gray-500">No transactions yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
