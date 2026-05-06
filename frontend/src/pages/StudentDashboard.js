import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiFetch } from '../api/config';
import { getApplicableFees, payFee, getFeeHistory } from '../api/fees';
import notificationService from '../services/notificationService';
import biometricService from '../services/biometricService';
import NotificationSettings from '../components/NotificationSettings';
import LoadingSpinner from '../components/LoadingSpinner';
import { FeeCardSkeleton } from '../components/LoadingSkeleton';
import FundWalletModal from '../components/FundWalletModal';

const useWallet = () => {
  return useQuery(['wallet-balance'], async () => {
    const data = await apiFetch('/wallet/balance');
    return data; // { balance: number }
  });
};

const useRecentTx = () => {
  return useQuery(['wallet-transactions'], async () => {
    const data = await apiFetch('/wallet/transactions?limit=5');
    return data; // [{reference, amount, status, date, receipt_id}]
  });
};

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'fees', label: 'Fees' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'transactions', label: 'Transactions' },
];

const useFees = () => {
  return useQuery(['applicable-fees'], async () => {
    const data = await getApplicableFees();
    return data.fees || [];
  });
};

const isOverdueFee = (fee) => {
  if (!fee?.due_date) return false;
  if (Number(fee.remaining_balance) <= 0) return false;

  const dueDate = new Date(fee.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  return dueDate < new Date();
};

const formatDueDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown due date' : date.toLocaleDateString();
};

const StudentDashboard = () => {
  const { data: wallet } = useWallet();
  const { data: txs, isLoading: loadingTx } = useRecentTx();
  const { data: fees, isLoading: loadingFees } = useFees();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, fee: null, amount: '' });
  const [amountDisplay, setAmountDisplay] = useState('');
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  const formatNumberWithCommas = (value) => {
    const numericValue = value.replace(/,/g, '');
    if (!numericValue) return '';
    const parsed = Number(numericValue);
    return isNaN(parsed) ? '' : parsed.toLocaleString('en-US');
  };

  const handlePaymentAmountChange = (e) => {
    const formatted = formatNumberWithCommas(e.target.value);
    setAmountDisplay(formatted);
    setPaymentDialog(p => ({ ...p, amount: formatted.replace(/,/g, '') }));
  };
  const [expandedFeeId, setExpandedFeeId] = useState(null);

  // Optimistic mutation for fee payments
  const payFeeMutation = useMutation(
    ({ feeId, amount }) => payFee(feeId, { amount }),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries(['applicable-fees']);
        const previousFees = queryClient.getQueryData(['applicable-fees']);
        
        queryClient.setQueryData(['applicable-fees'], (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(fee => {
            if (fee.id === variables.feeId) {
              const newAmountPaid = Number(fee.amount_paid) + Number(variables.amount);
              const newRemaining = Number(fee.total_amount) - newAmountPaid;
              return {
                ...fee,
                amount_paid: newAmountPaid,
                remaining_balance: Math.max(0, newRemaining),
                status: newRemaining <= 0 ? 'completed' : 'partial',
                is_paid: newRemaining <= 0
              };
            }
            return fee;
          });
        });
        
        return { previousFees };
      },
      onError: (err, variables, context) => {
        queryClient.setQueryData(['applicable-fees'], context.previousFees);
        notificationService.showNotification('Payment Failed ❌', {
          body: err.message || 'Could not pay fee from wallet'
        });
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['applicable-fees']);
        queryClient.invalidateQueries(['wallet-balance']);
        notificationService.showNotification('Payment Successful ✅', {
          body: `Paid ₦${Number(data.amount_paid).toLocaleString()}`
        });
      }
    }
  );

  const walletBalanceNgn = Number(wallet?.balance) ?? 0;
  const recentTx = Array.isArray(txs) ? txs : [];
  const overdueFees = useMemo(() => {
    return Array.isArray(fees) ? fees.filter(isOverdueFee) : [];
  }, [fees]);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      // Check biometric availability
      const biometricInfo = await biometricService.getDeviceInfo();
      setBiometricAvailable(biometricInfo.available);
      setBiometricRegistered(biometricInfo.registered);

      // Request notification permission
      await notificationService.requestPermission();
    };

    initializeServices();
  }, []);

  // Notify once per overdue fee
  useEffect(() => {
    if (!Array.isArray(overdueFees) || overdueFees.length === 0) return;

    const notifiedKey = `overdue_notifications_${JSON.parse(localStorage.getItem('user') || '{}')?.id || 'guest'}`;
    const previouslyNotified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || '[]'));
    const newlyNotified = [...previouslyNotified];
    let updated = false;

    overdueFees.forEach((fee) => {
      const notificationKey = `${fee.id}:${fee.remaining_balance}:${fee.due_date}`;
      if (!previouslyNotified.has(notificationKey)) {
        notificationService.showOverduePayment(
          fee.name,
          fee.remaining_balance,
          formatDueDate(fee.due_date)
        );
        newlyNotified.push(notificationKey);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(notifiedKey, JSON.stringify(newlyNotified));
    }
  }, [overdueFees]);

  const handleRegisterBiometric = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await biometricService.register(user.id, user.email);
      setBiometricRegistered(true);
      notificationService.showNotification('Biometric Setup Complete! 🔐', {
        body: 'You can now use biometric authentication for quick login'
      });
    } catch (error) {
      notificationService.showNotification('Biometric Setup Failed ❌', {
        body: biometricService.getErrorMessage(error)
      });
    }
  };

  const handlePayFee = async (feeId, feeName, amount) => {
    try {
      await payFeeMutation.mutateAsync({ feeId, amount });
      setPaymentDialog({ open: false, fee: null, amount: '' });
      setAmountDisplay('');
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const openPaymentDialog = (fee) => {
    if (isOverdueFee(fee)) {
      return;
    }
    const amount = fee.remaining_balance || fee.amount;
    setPaymentDialog({
      open: true,
      fee,
      amount
    });
    setAmountDisplay(amount ? Number(amount).toLocaleString('en-US') : '');
  };

  const toggleFeeHistory = async (feeId) => {
    if (expandedFeeId === feeId) {
      setExpandedFeeId(null);
    } else {
      setExpandedFeeId(feeId);
    }
  };

  const { data: feeHistory, isLoading: loadingHistory } = useQuery(
    ['fee-history', expandedFeeId],
    () => getFeeHistory(expandedFeeId),
    {
      enabled: !!expandedFeeId,
    }
  );

  return (
    <div className="space-y-8">
      {/* MGX Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 35%)'}} />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-cyan-100 text-xs uppercase tracking-widest">Niger Delta University</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">Student Dashboard</h1>
              <p className="mt-2 text-cyan-50/90">Manage your tuition wallet and download receipts.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFundModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 font-semibold shadow-md hover:shadow-lg transition"
              >
                <span>Fund Wallet</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Indicator */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Payment Status</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${walletBalanceNgn > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              {walletBalanceNgn > 0 ? 'Up to Date' : 'Payment Required'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Current Balance</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">₦{walletBalanceNgn?.toLocaleString() || 0}</div>
          </div>
          
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Payment Status</div>
            <div className={`text-base sm:text-lg font-semibold ${walletBalanceNgn > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              {walletBalanceNgn > 0 ? '✅ Paid' : '⚠️ Outstanding'}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Action Required</div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {walletBalanceNgn > 0 ? 'None' : 'Contact Admin'}
            </div>
          </div>
        </div>
        
        {walletBalanceNgn === 0 && (
          <div className="mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Payment Required</h4>
                <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                  You have an outstanding balance. Please contact the bursar for payment instructions.
                </p>
              </div>
            </div>
          </div>
        )}

        {overdueFees.length > 0 && (
          <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800">Overdue payment alert</h4>
                <p className="text-xs sm:text-sm text-red-700 mt-1">
                  You have {overdueFees.length} overdue fee{overdueFees.length > 1 ? 's' : ''}. Please review the Fees tab to pay them as soon as possible.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition border ${activeTab === t.key ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Wallet Card (MGX style) */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-600 text-white p-4 sm:p-6 lg:p-8">
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Wallet Balance</p>
                    <p className="text-2xl sm:text-4xl font-bold mt-1">₦{walletBalanceNgn?.toLocaleString() || 0}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-sm uppercase tracking-widest text-cyan-200">Student Wallet</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 border border-white/20">NGN</span>
                </div>
                <p className="mt-2 text-cyan-100/90 text-xs sm:text-sm">Balance updates after payment confirmation</p>
              </div>
            </div>
          </div>

          {/* Mobile Features */}
          <div className="space-y-4 sm:space-y-6">
            {/* Biometric Section */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Biometric Authentication</h4>
              {biometricAvailable ? (
                <div>
                  {biometricRegistered ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>Biometric enabled</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterBiometric}
                      className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Register Biometric
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Biometric not available on this device</p>
              )}
            </div>

            {/* Notification Settings */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Notifications</h4>
              <button
                onClick={() => setShowNotificationSettings(true)}
                className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Manage Notification Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Applicable Fees</h3>
                <p className="text-xs sm:text-sm text-gray-500">Fees for your department &amp; level</p>
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Wallet: ₦{walletBalanceNgn.toLocaleString()}</div>
            </div>
            {loadingFees ? (
              <div className="space-y-4">
                <FeeCardSkeleton />
                <FeeCardSkeleton />
                <FeeCardSkeleton />
              </div>
            ) : !Array.isArray(fees) || fees.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No fees available for your department/level</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {fees.map(fee => {
                  const progressPercent = fee.total_amount > 0 ? (fee.amount_paid / fee.total_amount) * 100 : 0;
                  const overdue = isOverdueFee(fee);
                  return (
                    <div key={fee.id} className={`py-4 ${overdue ? 'rounded-xl bg-red-50 px-3 sm:px-4 border border-red-100' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{fee.name}</p>
                          <p className="text-xs text-gray-500">
                            {fee.academic_session}
                            {fee.department && ` · ${fee.department}`}
                            {fee.level && ` · ${fee.level}`}
                          </p>
                          {fee.due_date && !overdue && (
                            <p className="mt-1 text-xs text-gray-500">
                              Deadline: {formatDueDate(fee.due_date)}
                            </p>
                          )}
                          {overdue && (
                            <p className="mt-1 text-xs font-medium text-red-700">
                              Overdue since {formatDueDate(fee.due_date)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">₦{Number(fee.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            Paid: ₦{Number(fee.amount_paid).toLocaleString()} / ₦{Number(fee.total_amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">{progressPercent.toFixed(0)}% paid</span>
                          <span className="text-xs text-gray-500">Remaining: ₦{Number(fee.remaining_balance).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          fee.status === 'completed' ? 'bg-green-100 text-green-700' :
                          fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {fee.status === 'completed' ? 'Paid' : fee.status === 'partial' ? 'Partial' : 'Pending'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleFeeHistory(fee.id)}
                            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                          >
                            {expandedFeeId === fee.id ? 'Hide' : 'History'}
                          </button>
                          {!fee.is_paid && fee.remaining_balance > 0 && (
                            <button
                              onClick={() => openPaymentDialog(fee)}
                              disabled={overdue}
                              className={`px-3 py-1.5 text-xs text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${overdue ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                              {overdue ? 'Payment closed' : 'Pay'}
                            </button>
                          )}
                        </div>
                      </div>
                      {expandedFeeId === fee.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-700 mb-2">Payment History</p>
                          {loadingHistory ? (
                            <LoadingSpinner
                              compact
                              title="Loading payment history"
                              message="Retrieving previous payments for this fee."
                            />
                          ) : !feeHistory || !feeHistory.transactions || feeHistory.transactions.length === 0 ? (
                            <div className="text-xs text-gray-500">No payment history</div>
                          ) : (
                            <div className="space-y-2">
                              {feeHistory.transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</span>
                                  <span className="font-medium">₦{Number(tx.amount).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <p className="text-xs sm:text-sm text-gray-500">Your wallet transaction history</p>
            </div>
          </div>
          {loadingTx ? (
            <LoadingSpinner
              compact
              title="Loading transactions"
              message="Retrieving your most recent wallet activity."
            />
          ) : !Array.isArray(recentTx) || recentTx.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTx.map(tx => (
                <div key={tx.id} className="px-4 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Dialog */}
      {paymentDialog.open && paymentDialog.fee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Pay Fee</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{paymentDialog.fee.name}</p>
              <p className="text-xs text-gray-500">{paymentDialog.fee.academic_session}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Pay (₦)</label>
              <input
                type="text"
                min="1"
                max={paymentDialog.fee.remaining_balance}
                value={amountDisplay}
                onChange={handlePaymentAmountChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Remaining balance: ₦{Number(paymentDialog.fee.remaining_balance).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPaymentDialog({ open: false, fee: null, amount: '' }); setAmountDisplay(''); }}
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayFee(paymentDialog.fee.id, paymentDialog.fee.name, paymentDialog.amount)}
                disabled={
                  payFeeMutation.isLoading ||
                  !paymentDialog.amount ||
                  Number(paymentDialog.amount) <= 0 ||
                  Number(paymentDialog.amount) > Number(paymentDialog.fee.remaining_balance)
                }
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {payFeeMutation.isLoading ? 'Processing…' : 'Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
              <p className="text-sm text-gray-500">Latest wallet funding attempts</p>
            </div>
            <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {loadingTx ? (
              <div className="px-6 py-10 text-center text-gray-500">Loading…</div>
            ) : recentTx.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500">No transactions yet</div>
            ) : (
              recentTx.map(tx => (
                <div key={tx.id || tx.tx_ref} className="px-6 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Ref: {tx.tx_ref}</p>
                    <p className="text-xs text-gray-500">{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-semibold ${tx.status === 'completed' ? 'text-green-600' : tx.status === 'failed' ? 'text-red-600' : 'text-gray-600'}`}>
                      {tx.status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">₦{Number(tx.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettings 
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['wallet-balance'])}
      />
    </div>
  );
};

export default StudentDashboard;
