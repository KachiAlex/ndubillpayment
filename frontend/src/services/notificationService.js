class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = null;
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Notifications not available');
      return;
    }

    const defaultOptions = {
      body: '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icon-192x192.png'
        }
      ]
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, finalOptions);
      } else {
        new Notification(title, finalOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Payment-specific notifications
  showPaymentSuccess(amount, reference) {
    this.showNotification('Payment Successful! 💰', {
      body: `Your payment of ₦${amount.toLocaleString()} has been processed successfully. Reference: ${reference}`,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Receipt',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  showPaymentFailed(reason) {
    this.showNotification('Payment Failed ❌', {
      body: `Your payment could not be processed. Reason: ${reason}`,
      requireInteraction: true,
      actions: [
        {
          action: 'retry',
          title: 'Retry Payment',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  showPaymentReminder(amount, deadline) {
    this.showNotification('Payment Reminder ⏰', {
      body: `Don't forget! You have ₦${amount.toLocaleString()} due by ${deadline}`,
      requireInteraction: true,
      actions: [
        {
          action: 'pay',
          title: 'Pay Now',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Remind Later',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  showOverduePayment(feeName, amountDue, dueDate) {
    this.showNotification('Overdue Payment ⚠️', {
      body: `${feeName} is overdue. Amount due: ₦${Number(amountDue).toLocaleString()}. Due date: ${dueDate}`,
      requireInteraction: true,
      actions: [
        {
          action: 'pay',
          title: 'Pay Now',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Dismiss',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  showLowBalance(currentBalance, requiredAmount) {
    this.showNotification('Low Wallet Balance ⚠️', {
      body: `Current balance: ₦${currentBalance.toLocaleString()}. Required: ₦${requiredAmount.toLocaleString()}`,
      requireInteraction: true
    });
  }

  showReceiptReady(reference) {
    this.showNotification('Receipt Ready 📄', {
      body: `Your receipt for payment ${reference} is now available for download`,
      requireInteraction: false,
      actions: [
        {
          action: 'download',
          title: 'Download Receipt',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  // Admin notifications
  showNewPayment(studentName, amount) {
    this.showNotification('New Payment Received 💰', {
      body: `${studentName} made a payment of ₦${amount.toLocaleString()}`,
      requireInteraction: false
    });
  }

  showSystemAlert(message) {
    this.showNotification('System Alert 🚨', {
      body: message,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

