import api from './config';

export const getWalletBalance = async () => {
  return api.get('/wallet/balance');
};

export const fundWallet = async (amount, description) => {
  return api.post('/wallet/fund', { amount, description });
};

export const getTransactions = async () => {
  return api.get('/wallet/transactions');
};
