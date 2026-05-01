import React, { useState } from 'react';

const Wallet = () => {
  const [amount, setAmount] = useState('');

  const handleFundWallet = () => {
    // This would integrate with Flutterwave
    console.log('Funding wallet with amount:', amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-600">Manage your tuition payment wallet</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>
        <p className="text-3xl font-bold text-blue-600">₦0.00</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fund Wallet</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (₦)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount"
            />
          </div>
          <button
            onClick={handleFundWallet}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Fund Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
