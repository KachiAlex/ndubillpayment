import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { getReports, getUsers, getTransactions, exportToExcel, exportToCSV, reconcilePayments, searchStudentPayments, downloadReceipt, exportPaidStudentsToExcel, exportPaidStudentsToCSV } from '../api/admin';
import { getAllFees, createFee, updateFee, deleteFee } from '../api/fees';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department: '',
    session: '',
    status: '',
    type: ''
  });
  const [reconcileData, setReconcileData] = useState({
    start_date: '',
    end_date: ''
  });
  const [searchFilters, setSearchFilters] = useState({
    student_id: '',
    department: ''
  });
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [feesData, setFeesData] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feeForm, setFeeForm] = useState({ name: '', amount: '', department: '', level: '', academic_session: '' });
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [showNewDeptInput, setShowNewDeptInput] = useState(false);
  const [showNewLevelInput, setShowNewLevelInput] = useState(false);
  const [showNewSessionInput, setShowNewSessionInput] = useState(false);
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [showLevelManager, setShowLevelManager] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  };

  // Fetch departments
  const { data: departmentsData, refetch: refetchDepartments } = useQuery(
    ['admin-departments'],
    async () => {
      return fetchJson('/api/admin/departments');
    },
    { enabled: activeTab === 'fees' }
  );

  // Fetch levels
  const { data: levelsData, refetch: refetchLevels } = useQuery(
    ['admin-levels'],
    async () => {
      return fetchJson('/api/admin/levels');
    },
    { enabled: activeTab === 'fees' }
  );

  // Fetch academic sessions
  const { data: sessionsData, refetch: refetchSessions } = useQuery(
    ['admin-academic-sessions'],
    async () => {
      return fetchJson('/api/admin/academic-sessions');
    },
    { enabled: activeTab === 'fees' }
  );

  const departments = departmentsData?.departments || [];
  const levels = levelsData?.levels || [];
  const academicSessions = sessionsData?.sessions || [];

  const refreshFeeMetadata = async () => {
    await Promise.all([
      refetchDepartments(),
      refetchLevels(),
      refetchSessions()
    ]);
  };

  const handleSaveNewDepartment = async () => {
    if (!feeForm.department) {
      toast.error('Please enter a department name');
      return;
    }
    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ department: feeForm.department })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Department saved successfully');
        setFeeForm(p => ({ ...p, department: '' }));
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to save department');
      }
    } catch (error) {
      toast.error('Failed to save department');
    }
  };

  const handleSaveNewLevel = async () => {
    if (!feeForm.level) {
      toast.error('Please enter a level');
      return;
    }
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ level: feeForm.level })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Level saved successfully');
        setFeeForm(p => ({ ...p, level: '' }));
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to save level');
      }
    } catch (error) {
      toast.error('Failed to save level');
    }
  };

  const handleSaveNewSession = async () => {
    if (!feeForm.academic_session) {
      toast.error('Please enter an academic session');
      return;
    }
    try {
      const response = await fetch('/api/admin/academic-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ academic_session: feeForm.academic_session })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Academic session saved successfully');
        setFeeForm(p => ({ ...p, academic_session: '' }));
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to save academic session');
      }
    } catch (error) {
      toast.error('Failed to save academic session');
    }
  };

  const handleDeleteDepartment = async (department) => {
    if (!window.confirm(`Delete department "${department.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/departments/${department.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Department removed successfully');
        if (feeForm.department === department.name) {
          setFeeForm(p => ({ ...p, department: '' }));
        }
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to delete department');
      }
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  const handleDeleteLevel = async (level) => {
    if (!window.confirm(`Delete level "${level.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/levels/${level.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Level removed successfully');
        if (feeForm.level === level.name) {
          setFeeForm(p => ({ ...p, level: '' }));
        }
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to delete level');
      }
    } catch (error) {
      toast.error('Failed to delete level');
    }
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Delete academic session "${session.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/academic-sessions/${session.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Academic session removed successfully');
        if (feeForm.academic_session === session.name) {
          setFeeForm(p => ({ ...p, academic_session: '' }));
        }
        await refreshFeeMetadata();
      } else {
        toast.error(data.error || 'Failed to delete academic session');
      }
    } catch (error) {
      toast.error('Failed to delete academic session');
    }
  };

  // Auto-load fees when fees tab is active
  useEffect(() => {
    if (activeTab === 'fees' && feesData.length === 0 && !feesLoading) {
      setFeesLoading(true);
      getAllFees()
        .then(d => setFeesData(d.fees || []))
        .catch(() => toast.error('Failed to load fees'))
        .finally(() => setFeesLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch reports data
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery(
    ['admin-reports', filters],
    () => getReports(filters),
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch users data
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['admin-users', { page: 1, limit: 10 }],
    () => getUsers({ page: 1, limit: 10 }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch transactions data
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    ['admin-transactions', { page: 1, limit: 10 }],
    () => getTransactions({ page: 1, limit: 10 }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format) => {
    try {
      if (format === 'excel') {
        await exportToExcel(filters);
        toast.success('Excel file downloaded successfully');
      } else if (format === 'csv') {
        await exportToCSV(filters);
        toast.success('CSV file downloaded successfully');
      }
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleReconcile = async () => {
    if (!reconcileData.start_date || !reconcileData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    try {
      const result = await reconcilePayments(reconcileData);
      toast.success(`Reconciliation completed: ₦${result.total_amount} from ${result.transaction_count} transactions`);
    } catch (error) {
      toast.error('Reconciliation failed. Please try again.');
    }
  };

  const handleSearch = async () => {
    if (!searchFilters.student_id && !searchFilters.department) {
      toast.error('Please enter either Student ID or Department');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchStudentPayments(searchFilters);
      setSearchResults(results);
      toast.success(`Found ${results.transactions.length} payment(s)`);
    } catch (error) {
      toast.error(error.message || 'Failed to search student payments');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadReceipt = async (transactionId) => {
    try {
      await downloadReceipt(transactionId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to download receipt');
    }
  };

  const handleExportPaidStudents = async (format) => {
    try {
      if (format === 'excel') {
        await exportPaidStudentsToExcel(filters);
        toast.success('Paid students list exported to Excel successfully');
      } else if (format === 'csv') {
        await exportPaidStudentsToCSV(filters);
        toast.success('Paid students list exported to CSV successfully');
      }
    } catch (error) {
      toast.error(error.message || 'Export failed. Please try again.');
    }
  };

  const summary = reportsData?.summary || {
    total_amount: 0,
    total_transactions: 0,
    unique_students: 0
  };

  const transactions = reportsData?.transactions || [];
  const users = usersData?.users || [];
  const allTransactions = transactionsData?.transactions || [];

  return (
    <div className="space-y-8">
      {/* MGX Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-500">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 35%)'}} />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-widest">Niger Delta University</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="mt-2 text-blue-50/90">Manage tuition payments, view reports, and reconcile transactions.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleExport('excel')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 text-white font-semibold ring-1 ring-white/20 hover:bg-white/25 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'reports', label: 'Reports' },
            { key: 'users', label: 'Users' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'fees', label: 'Fees' },
            { key: 'search', label: 'Search' },
            { key: 'reconcile', label: 'Reconcile' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                activeTab === tab.key 
                  ? 'bg-blue-600 text-white border-blue-600 shadow' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-600">Total Payments</h3>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-blue-700">
                {reportsLoading ? '...' : `₦${summary.total_amount?.toLocaleString() || 0}`}
              </p>
              <p className="mt-1 text-sm text-gray-500">All time payments</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-600">Students</h3>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-green-700">
                {usersLoading ? '...' : users.length}
              </p>
              <p className="mt-1 text-sm text-gray-500">Registered students</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-600">Transactions</h3>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-purple-700">
                {transactionsLoading ? '...' : summary.total_transactions || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">Completed transactions</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-600">Success Rate</h3>
                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-orange-700">
                {reportsLoading ? '...' : '95%'}
              </p>
              <p className="mt-1 text-sm text-gray-500">Payment success rate</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </div>
                    <span className="text-gray-900 font-medium">View Reports</span>
                  </div>
                  <span className="text-blue-600">→</span>
                </button>

                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <span className="text-gray-900 font-medium">Export Data</span>
                  </div>
                  <span className="text-green-600">→</span>
                </button>

                <button 
                  onClick={() => setActiveTab('reconcile')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </div>
                    <span className="text-gray-900 font-medium">Reconcile</span>
                  </div>
                  <span className="text-purple-600">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <input
                  type="text"
                  placeholder="e.g., 2023/2024"
                  value={filters.session}
                  onChange={(e) => handleFilterChange('session', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => refetchReports()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Apply Filters
              </button>
              <button
                onClick={() => setFilters({ start_date: '', end_date: '', department: '', session: '', status: '', type: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Reports</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction Reports</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Export Transactions to Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Export Transactions to CSV
                  </button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Paid Students List</h4>
                <p className="text-xs text-gray-500 mb-2">Export list of students who have made payments with total amounts</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExportPaidStudents('excel')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                    Export Paid Students to Excel
                  </button>
                  <button
                    onClick={() => handleExportPaidStudents('csv')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                    Export Paid Students to CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Reports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No transactions found</td>
                    </tr>
                  ) : (
                    transactions.slice(0, 10).map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.first_name} {transaction.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.matric_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₦{Number(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Registered Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.matric_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.user_type === 'student' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {user.user_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactionsLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : allTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No transactions found</td>
                  </tr>
                ) : (
                  allTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.first_name} {transaction.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₦{Number(transaction.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.tx_ref}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search Student Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Student Payments</h3>
            <p className="text-gray-600 mb-6">Search for student payments by Student ID (Matriculation Number) or Department.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID (Matric No)</label>
                <input
                  type="text"
                  placeholder="e.g., NDU/2021/001"
                  value={searchFilters.student_id}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={searchFilters.department}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Law">Law</option>
                  <option value="Business">Business</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search Payments'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
                <div className="text-sm text-gray-600">
                  Found {searchResults.transactions.length} payment(s) - Total: ₦{searchResults.summary.total_amount?.toLocaleString()}
                </div>
              </div>

              {searchResults.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Student</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Matric No</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Department</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Reference</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-gray-600">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-gray-900 font-medium">
                            {transaction.first_name} {transaction.last_name}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {transaction.matric_number}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {transaction.department}
                          </td>
                          <td className="py-3 px-2 text-gray-900 font-semibold">
                            ₦{transaction.amount?.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-gray-600 font-mono text-xs">
                            {transaction.tx_ref}
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleDownloadReceipt(transaction.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition font-medium"
                            >
                              Print Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <p>No payments found for the specified criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fees Tab */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingFeeId ? 'Edit Fee' : 'Create Fee'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Fee name" value={feeForm.name} onChange={e => setFeeForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <input placeholder="Amount (₦)" type="number" value={feeForm.amount} onChange={e => setFeeForm(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              
              {/* Department field with dropdown and manage options */}
              {showNewDeptInput ? (
                <div className="flex gap-2">
                  <input 
                    placeholder="New department (e.g., Computer Science)" 
                    value={feeForm.department} 
                    onChange={e => setFeeForm(p => ({ ...p, department: e.target.value }))} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveNewDepartment}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowNewDeptInput(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={feeForm.department}
                    onChange={e => setFeeForm(p => ({ ...p, department: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select department</option>
                    <option value="ALL">All departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewDeptInput(true)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    title="Create new department"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowDeptManager(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    title="Manage departments"
                  >
                    ⚙
                  </button>
                </div>
              )}

              {/* Level field with dropdown and manage options */}
              {showNewLevelInput ? (
                <div className="flex gap-2">
                  <input 
                    placeholder="New level (e.g., 500)" 
                    value={feeForm.level} 
                    onChange={e => setFeeForm(p => ({ ...p, level: e.target.value }))} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveNewLevel}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowNewLevelInput(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={feeForm.level}
                    onChange={e => setFeeForm(p => ({ ...p, level: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select level</option>
                    {levels.map(lvl => (
                      <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewLevelInput(true)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    title="Create new level"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowLevelManager(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    title="Manage levels"
                  >
                    ⚙
                  </button>
                </div>
              )}

              {/* Academic session field with dropdown and manage options */}
              {showNewSessionInput ? (
                <div className="flex gap-2">
                  <input 
                    placeholder="New academic session (e.g., 2025/2026)" 
                    value={feeForm.academic_session} 
                    onChange={e => setFeeForm(p => ({ ...p, academic_session: e.target.value }))} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveNewSession}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowNewSessionInput(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={feeForm.academic_session}
                    onChange={e => setFeeForm(p => ({ ...p, academic_session: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select academic session</option>
                    {academicSessions.map(session => (
                      <option key={session.id} value={session.name}>{session.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewSessionInput(true)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    title="Create new academic session"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowSessionManager(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    title="Manage academic sessions"
                  >
                    ⚙
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                try {
                  if (editingFeeId) {
                    await updateFee(editingFeeId, feeForm);
                    toast.success('Fee updated');
                  } else {
                    await createFee(feeForm);
                    toast.success('Fee created');
                  }
                  setFeeForm({ name: '', amount: '', department: '', level: '', academic_session: '' });
                  setEditingFeeId(null);
                  setShowNewDeptInput(false);
                  setShowNewLevelInput(false);
                  setShowNewSessionInput(false);
                  const d = await getAllFees();
                  setFeesData(d.fees || []);
                } catch (err) {
                  toast.error(err.message || 'Failed to save fee');
                }
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              {editingFeeId ? 'Update Fee' : 'Create Fee'}
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Configured Fees</h3>
              <button onClick={async () => { setFeesLoading(true); try { const d = await getAllFees(); setFeesData(d.fees || []); } finally { setFeesLoading(false); } }} className="text-sm text-blue-600 hover:text-blue-700">Refresh</button>
            </div>
            {feesLoading ? (
              <div className="px-6 py-10 text-center text-gray-500">Loading…</div>
            ) : feesData.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500">No fees configured yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {feesData.map(fee => (
                  <div key={fee.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fee.name}</p>
                      <p className="text-xs text-gray-500">₦{Number(fee.amount).toLocaleString()} · {fee.academic_session} {fee.department ? `· ${fee.department}` : ''} {fee.level ? `· ${fee.level}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setFeeForm({ name: fee.name, amount: fee.amount, department: fee.department || 'ALL', level: fee.level || '', academic_session: fee.academic_session }); setEditingFeeId(fee.id); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Edit</button>
                      <button onClick={async () => { if (window.confirm('Delete this fee?')) { try { await deleteFee(fee.id); const d = await getAllFees(); setFeesData(d.fees || []); toast.success('Fee deleted'); } catch (err) { toast.error('Failed to delete'); } } }} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reconcile' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Reconciliation</h3>
          <p className="text-gray-600 mb-6">Reconcile payments for a specific date range to verify transaction accuracy.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={reconcileData.start_date}
                onChange={(e) => setReconcileData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={reconcileData.end_date}
                onChange={(e) => setReconcileData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={handleReconcile}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            Run Reconciliation
          </button>
        </div>
      )}

      {/* Department Manager Modal */}
      {showDeptManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Departments</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {departments.length > 0 ? departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{dept.name}</span>
                  <button
                    onClick={() => handleDeleteDepartment(dept)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No departments saved yet.</p>
              )}
            </div>
            <button
              onClick={() => setShowDeptManager(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Level Manager Modal */}
      {showLevelManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Levels</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {levels.length > 0 ? levels.map(level => (
                <div key={level.id} className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{level.name}</span>
                  <button
                    onClick={() => handleDeleteLevel(level)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No levels saved yet.</p>
              )}
            </div>
            <button
              onClick={() => setShowLevelManager(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Academic Session Manager Modal */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Academic Sessions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {academicSessions.length > 0 ? academicSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{session.name}</span>
                  <button
                    onClick={() => handleDeleteSession(session)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No academic sessions saved yet.</p>
              )}
            </div>
            <button
              onClick={() => setShowSessionManager(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
