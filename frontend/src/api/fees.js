import { apiFetch } from './config';

export const getApplicableFees = () => apiFetch('/fees');
export const payFee = (feeId) => apiFetch(`/fees/${feeId}/pay`, { method: 'POST' });
export const getFeePayments = () => apiFetch('/fees/payments');

// Bursar endpoints
export const getAllFees = () => apiFetch('/fees/all');
export const createFee = (data) => apiFetch('/fees', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateFee = (id, data) => apiFetch(`/fees/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteFee = (id) => apiFetch(`/fees/${id}`, { method: 'DELETE' });
