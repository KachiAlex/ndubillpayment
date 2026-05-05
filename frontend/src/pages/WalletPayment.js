import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiFetch } from '../api/config';

const WalletPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const autoStartAttempted = useRef(false);

  const mode = useMemo(() => searchParams.get('mode') || 'public', [searchParams]);
  const matricNumber = useMemo(() => searchParams.get('matric_number'), [searchParams]);
  const amountParam = useMemo(() => searchParams.get('amount'), [searchParams]);
  const txRefParam = useMemo(() => searchParams.get('tx_ref'), [searchParams]);

  useEffect(() => {
    if (mode === 'wallet') {
      if (!txRefParam) {
        setError('Invalid payment reference. Please start the wallet top-up again.');
      } else {
        setPaymentRef(txRefParam);
        if (amountParam) {
          setAmount(String(amountParam));
        }
      }
      setLoading(false);
      return;
    }

    const fetchStudent = async () => {
      if (!matricNumber) {
        setError('Invalid QR code: Missing matric number');
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/payments/students/${encodeURIComponent(matricNumber)}`);
        setStudent(data.student);
        if (amountParam) {
          setAmount(String(amountParam));
        }
      } catch (err) {
        setError(err.message || 'Student not found. Please verify the QR code.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [amountParam, matricNumber, mode, txRefParam]);

  const handleAmountChange = (e) => {
    const numericValue = e.target.value.replace(/,/g, '').replace(/\D/g, '');
    setAmount(numericValue);
  };

  const formattedAmount = useMemo(() => {
    if (!amount) return '';
    const numericAmount = Number(amount);
    return Number.isNaN(numericAmount) ? '' : numericAmount.toLocaleString('en-NG');
  }, [amount]);

  const handleProceedToPayment = useCallback(async () => {
    const numericAmount = Number(amount);
    let txRef = txRefParam || '';

    if (mode !== 'wallet' && !student) {
      setError('Student information could not be loaded');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setInitiatingPayment(true);

    try {
      if (mode !== 'wallet' && !txRef) {
        const intent = await apiFetch('/payments/checkout/public', {
          method: 'POST',
          body: JSON.stringify({
            matric_number: student.matric_number,
            amount: numericAmount
          })
        });

        txRef = intent?.payment?.tx_ref || intent?.tx_ref || intent?.transaction?.reference || '';
      }

      if (!txRef) {
        throw new Error('Payment reference could not be created');
      }

      const completion = await apiFetch(`/payments/transactions/${encodeURIComponent(txRef)}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          amount: numericAmount,
          mode,
          matric_number: student?.matric_number || null
        })
      });

      if (!completion?.success) {
        throw new Error('Unable to complete the test payment');
      }

      setPaymentRef(txRef);
      setPaymentSuccess(true);
      navigate(`/payment/callback?tx_ref=${encodeURIComponent(txRef)}&amount=${encodeURIComponent(String(numericAmount))}&status=successful`, { replace: true });
    } catch (err) {
      console.error('[Public Payment] Failed to complete test checkout:', err);
      setError(err.message || 'Failed to complete test payment');
      setInitiatingPayment(false);
    }
  }, [amount, mode, navigate, student, txRefParam]);

  useEffect(() => {
    const shouldAutoStart = mode === 'wallet'
      ? !loading && txRefParam && amountParam && !autoStartAttempted.current && !error
      : !loading && student && amountParam && !autoStartAttempted.current && !error;

    if (shouldAutoStart) {
      autoStartAttempted.current = true;
      handleProceedToPayment();
    }
  }, [amountParam, error, handleProceedToPayment, loading, mode, student, txRefParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner
          compact
          title="Loading payment details"
          message="Verifying the QR code and preparing the payment page."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.314 0-6 1.79-6 4v2c0 2.21 2.686 4 6 4s6-1.79 6-4v-2c0-2.21-2.686-4-6-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V6m0 2c3.314 0 6 1.79 6 4m-6-4c-3.314 0-6 1.79-6 4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Checkout</h1>
            <p className="text-gray-600 mt-2">Custom test-only payment page for tuition or wallet funding</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {paymentSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Payment Completed</h2>
              <p className="text-gray-600">The test checkout completed successfully and the wallet has been updated.</p>
              {paymentRef && (
                <p className="text-sm text-gray-500">Reference: {paymentRef}</p>
              )}
              <button
                onClick={() => navigate('/')}
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition font-semibold"
              >
                Go Home
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {mode === 'wallet' ? (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-900">
                  <p className="font-semibold">Wallet top-up test flow</p>
                  <p className="mt-1">This internal checkout simulates a successful payment and credits your wallet immediately.</p>
                </div>
              ) : null}

              {student && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Student Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Matric Number:</span>
                      <p className="font-medium text-gray-900">{student.matric_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <p className="font-medium text-gray-900">{student.department || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Level:</span>
                      <p className="font-medium text-gray-900">{student.level || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <input
                  id="amount"
                  type="text"
                  value={formattedAmount}
                  onChange={handleAmountChange}
                  readOnly={mode === 'wallet'}
                  placeholder="Enter amount to pay"
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${mode === 'wallet' ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                />
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={initiatingPayment}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initiatingPayment ? 'Completing Test Payment…' : 'Complete Test Payment'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                This is a local test checkout. No external payment gateway is used.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPayment;
