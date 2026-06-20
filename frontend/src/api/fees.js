import { apiFetch } from './config';

export const getApplicableFees = () => apiFetch('/fees');
export const payFee = (feeId, data = {}) => apiFetch(`/fees/${feeId}/pay`, {
  method: 'POST',
  body: JSON.stringify(data),
});
export const getFeePayments = () => apiFetch('/fees/payments');
export const getFeeHistory = (feeId) => apiFetch(`/fees/${feeId}/history`);
export const downloadFeeReceipt = async (paymentId) => {
  const response = await fetch(`/api/fees/payments/${paymentId}/receipt`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download receipt');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `receipt-${paymentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
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

export const bulkUploadFees = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/fees/bulk-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload fees');
  }

  return response.json();
};
