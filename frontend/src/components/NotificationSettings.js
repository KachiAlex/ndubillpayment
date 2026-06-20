import React, { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';

const NotificationSettings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    paymentAlerts: true,
    lowBalance: true,
    paymentReminders: true,
    systemUpdates: false,
    marketing: false
  });
  const [permissionStatus, setPermissionStatus] = useState('default');

  useEffect(() => {
    if (isOpen) {
      checkPermissionStatus();
      loadSettings();
    }
  }, [isOpen]);

  const checkPermissionStatus = async () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
  };

  const handleSettingChange = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const requestPermission = async () => {
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setPermissionStatus('granted');
        notificationService.showNotification('Notifications Enabled! 🔔', {
          body: 'You will now receive payment alerts and updates'
        });
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const testNotification = () => {
    notificationService.showNotification('Test Notification ✅', {
      body: 'This is a test notification to verify your settings are working correctly'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Permission Status */}
          <div className="mb-6 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Browser Permission</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                permissionStatus === 'granted' 
                  ? 'bg-green-100 text-green-800' 
                  : permissionStatus === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {permissionStatus === 'granted' ? 'Granted' : 
                 permissionStatus === 'denied' ? 'Denied' : 'Not Set'}
              </span>
            </div>
            
            {permissionStatus !== 'granted' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Enable notifications to receive payment alerts and updates on your device.
                </p>
                <button
                  onClick={requestPermission}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Enable Notifications
                </button>
              </div>
            )}

            {permissionStatus === 'granted' && (
              <div className="space-y-3">
                <p className="text-sm text-green-600">
                  ✓ Notifications are enabled. You can customize what notifications you receive below.
                </p>
                <button
                  onClick={testNotification}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  Send Test Notification
                </button>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Notification Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Payment Alerts</p>
                  <p className="text-xs text-gray-500">Notify when payments are successful or failed</p>
                </div>
                <button
                  onClick={() => handleSettingChange('paymentAlerts')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.paymentAlerts ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.paymentAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Low Balance Warnings</p>
                  <p className="text-xs text-gray-500">Alert when wallet balance is low</p>
                </div>
                <button
                  onClick={() => handleSettingChange('lowBalance')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.lowBalance ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.lowBalance ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Payment Reminders</p>
                  <p className="text-xs text-gray-500">Remind about upcoming payment deadlines</p>
                </div>
                <button
                  onClick={() => handleSettingChange('paymentReminders')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.paymentReminders ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.paymentReminders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">System Updates</p>
                  <p className="text-xs text-gray-500">Important system announcements</p>
                </div>
                <button
                  onClick={() => handleSettingChange('systemUpdates')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.systemUpdates ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.systemUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-500">Promotional offers and tips</p>
                </div>
                <button
                  onClick={() => handleSettingChange('marketing')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.marketing ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">About Notifications</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Notifications work even when the app is closed</li>
              <li>• You can change these settings anytime</li>
              <li>• Critical payment alerts cannot be disabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
