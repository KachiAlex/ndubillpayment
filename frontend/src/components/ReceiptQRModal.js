import React, { useState, useEffect } from 'react';
import qrCodeService from '../services/qrCodeService';

const ReceiptQRModal = ({ isOpen, onClose, transaction }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && transaction) {
      generateQRCode();
    }
  }, [isOpen, transaction]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const qrCode = await qrCodeService.generatePaymentQR(transaction);
      setQrCodeDataURL(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrCodeDataURL) {
      qrCodeService.downloadQRCode(qrCodeDataURL, `receipt-${transaction.tx_ref}.png`);
    }
  };

  const handlePrint = () => {
    if (qrCodeDataURL) {
      qrCodeService.printQRCode(qrCodeDataURL, `Receipt - ${transaction.tx_ref}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Receipt QR Code</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Transaction Details */}
          {transaction && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Reference:</span>
                  <p className="font-medium text-gray-900">{transaction.tx_ref}</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="font-medium text-gray-900">₦{parseFloat(transaction.amount).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium text-green-600 capitalize">{transaction.status}</p>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="text-center">
            {loading ? (
              <div className="w-64 h-64 mx-auto flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : qrCodeDataURL ? (
              <div>
                <img 
                  src={qrCodeDataURL} 
                  alt="Receipt QR Code" 
                  className="mx-auto w-64 h-64 border border-gray-200 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-3">
                  Scan this QR code to verify payment details
                </p>
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto flex items-center justify-center text-gray-500">
                Failed to generate QR code
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownload}
              disabled={!qrCodeDataURL || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrCodeDataURL || loading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Save this QR code for your records</li>
              <li>• Share with bursar for quick verification</li>
              <li>• Print and keep with your payment receipt</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptQRModal;
