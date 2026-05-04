import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiFetch } from '../api/config';

const loadFlutterwaveScript = () => {
  if (window.FlutterwaveCheckout) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://checkout.flutterwave.com/v3.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Flutterwave checkout')); 
    document.body.appendChild(script);
  });
};

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

  const matricNumber = useMemo(() => searchParams.get('matric_number'), [searchParams]);
  const amountParam = useMemo(() => searchParams.get('amount'), [searchParams]);
  const flutterwavePublicKey = process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY;

  useEffect(() => {
    const fetchStudent = async () => {
      if (!matricNumber) {
        setError('Invalid QR code: Missing matric number');
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/public/student/${encodeURIComponent(matricNumber)}`);
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
  }, [matricNumber, amountParam]);

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

    if (!student) {
      setError('Student information could not be loaded');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!flutterwavePublicKey) {
      setError('Payment gateway is not configured. Please contact support.');
      return;
    }

    if (!student.email) {
      setError('Student email is required to continue with payment');
      return;
    }

    setError('');
    setInitiatingPayment(true);

    try {
      const intent = await apiFetch('/public/payment-intents', {
        method: 'POST',
        body: JSON.stringify({
          matric_number: student.matric_number,
          amount: numericAmount
        })
      });

      await loadFlutterwaveScript();

      if (typeof window.FlutterwaveCheckout !== 'function') {
        throw new Error('Flutterwave checkout could not be loaded');
      }

      const txRef = intent?.payment?.tx_ref || `QR-${Date.now()}-${String(student.matric_number || matricNumber).replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;

      window.FlutterwaveCheckout({
        public_key: flutterwavePublicKey,
        tx_ref: txRef,
        amount: numericAmount,
        currency: 'NGN',
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: student.email,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          phonenumber: ''
        },
        customizations: {
          title: 'NDU Tuition Payment',
          description: `Payment for ${student.first_name || ''} ${student.last_name || ''} (${student.matric_number})`
        },
        meta: {
          matric_number: student.matric_number,
          payment_source: 'qr_code'
        },
        callback: function (response) {
          console.log('[Public Payment] Flutterwave response:', response);
          if (response?.status === 'successful' || response?.status === 'completed') {
            setPaymentRef(response.tx_ref || txRef);
            setPaymentSuccess(true);
          } else {
            setError('Payment was not completed');
          }
          setInitiatingPayment(false);
        },
        onclose: function () {
          setInitiatingPayment(false);
        }
      });
    } catch (err) {
      console.error('[Public Payment] Failed to start checkout:', err);
      setError(err.message || 'Failed to open payment gateway');
      setInitiatingPayment(false);
    }
  }, [amount, flutterwavePublicKey, matricNumber, student]);

  useEffect(() => {
    if (!loading && student && amountParam && !autoStartAttempted.current && !error) {
      autoStartAttempted.current = true;
      handleProceedToPayment();
    }
  }, [loading, student, amountParam, error, handleProceedToPayment]);

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
            <p className="text-gray-600 mt-2">Public QR payment page for tuition or wallet funding</p>
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
              <p className="text-gray-600">
                The payment gateway reported a successful transaction.
              </p>
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
                  placeholder="Enter amount to pay"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={initiatingPayment}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initiatingPayment ? 'Opening Payment Gateway…' : 'Proceed to Payment Gateway'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                This public payment page uses Flutterwave. After successful payment, the transaction will be confirmed through the payment gateway.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPayment;
