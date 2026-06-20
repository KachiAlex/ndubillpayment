import api from './config';

export const getApplicableFees = async () => {
  return api.get('/fees/applicable');
};

export const payFee = async (feeId, amount) => {
  return api.post(`/fees/${feeId}/pay`, { amount });
};

export const getFeeHistory = async (feeId) => {
  return api.get(`/fees/${feeId}/history`);
};
