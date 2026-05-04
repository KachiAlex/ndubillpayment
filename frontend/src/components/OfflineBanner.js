import React, { useEffect, useState } from 'react';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div>
          <p className="font-semibold">You’re offline</p>
          <p className="text-sm text-amber-800">
            Cached pages are still available. Some actions will sync when you reconnect.
          </p>
        </div>
        <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          Offline mode
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
