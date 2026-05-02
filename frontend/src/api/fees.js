import { apiFetch } from './config';

export const getApplicableFees = () => apiFetch('/fees');
export const payFee = (feeId, data = {}) => apiFetch(`/fees/${feeId}/pay`, {
  method: 'POST',
  body: JSON.stringify(data),
});
export const getFeePayments = () => apiFetch('/fees/payments');
export const getFeeHistory = (feeId) => apiFetch(`/fees/${feeId}/history`);
export const downloadFeeReceipt = (paymentId) => {
  const url = `/api/fees/payments/${paymentId}/receipt`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `receipt-${paymentId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

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
