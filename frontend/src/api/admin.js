import { apiFetch, API_BASE } from './config';

// Get admin reports with filters
export const getReports = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.department) queryParams.append('department', filters.department);
  if (filters.session) queryParams.append('session', filters.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/reports${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
};

// Get all users with pagination and filters
export const getUsers = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.user_type) queryParams.append('user_type', params.user_type);
  if (params.department) queryParams.append('department', params.department);
  if (params.session) queryParams.append('session', params.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/users${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
};

// Get all transactions with pagination and filters
export const getTransactions = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);
  
  const queryString = queryParams.toString();
  const url = `/admin/transactions${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
};

// Export transactions to Excel
export const exportToExcel = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.department) queryParams.append('department', filters.department);
  if (filters.session) queryParams.append('session', filters.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/export/excel${queryString ? `?${queryString}` : ''}`;
  
  // For file downloads, we need to handle the response differently
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'transactions.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// Export transactions to CSV
export const exportToCSV = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.department) queryParams.append('department', filters.department);
  if (filters.session) queryParams.append('session', filters.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/export/csv${queryString ? `?${queryString}` : ''}`;
  
  // For file downloads, we need to handle the response differently
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'transactions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// Search student payments by student ID and department
export const searchStudentPayments = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.student_id) queryParams.append('student_id', filters.student_id);
  if (filters.department) queryParams.append('department', filters.department);
  
  const queryString = queryParams.toString();
  const url = `/admin/search-student${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
};

// Download receipt for a transaction
export const downloadReceipt = async (transactionId) => {
  const response = await fetch(`${API_BASE}/admin/receipt/${transactionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download receipt');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `receipt-${transactionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// Export paid students list to Excel
export const exportPaidStudentsToExcel = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.department) queryParams.append('department', filters.department);
  if (filters.session) queryParams.append('session', filters.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/export/paid-students/excel${queryString ? `?${queryString}` : ''}`;
  
  // For file downloads, we need to handle the response differently
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'paid-students.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// Export paid students list to CSV
export const exportPaidStudentsToCSV = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.department) queryParams.append('department', filters.department);
  if (filters.session) queryParams.append('session', filters.session);
  
  const queryString = queryParams.toString();
  const url = `/admin/export/paid-students/csv${queryString ? `?${queryString}` : ''}`;
  
  // For file downloads, we need to handle the response differently
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'paid-students.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// Reconcile payments
export const reconcilePayments = async (data) => {
  return apiFetch('/admin/reconcile', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
