# 🔧 Firebase Configuration Guide

## Step 1: Get Firebase Web App Config

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/ndu-bill-payment
   - Click the gear icon (⚙️) → "Project settings"

2. **Add Web App (if not already added):**
   - Scroll to "Your apps" section
   - Click "Add app" → Web app (</>) icon
   - Register app name: `ndu-tuition-frontend`
   - Copy the `firebaseConfig` object

3. **Update Frontend Config:**
   - Open: `frontend/src/firebase/config.js`
   - Replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...", // Your actual API key from Firebase Console
  authDomain: "ndu-bill-payment.firebaseapp.com", // Your actual auth domain
  projectId: "ndu-bill-payment", // Your actual project ID
  storageBucket: "ndu-bill-payment.appspot.com", // Your actual storage bucket
  messagingSenderId: "123456789", // Your actual sender ID
  appId: "1:123456789:web:abcdef..." // Your actual app ID
};
```

## Step 2: Get Firebase Admin SDK (Backend)

1. **In Firebase Console:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Create Backend Environment File:**
   - Create: `backend/.env` (copy from `backend/.env.example`)
   - Extract values from the downloaded JSON file:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=ndu-bill-payment
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ndu-bill-payment.iam.gserviceaccount.com

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h

# Payment Gateway Configuration (Paystack)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# School Bank Account Details
SCHOOL_BANK_ACCOUNT=1234567890
SCHOOL_BANK_CODE=058

# Server Configuration
NODE_ENV=development
PORT=5000
```

## Step 3: Enable Firebase Services

### Authentication
1. Go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" provider
3. Configure authorized domains

### Firestore Database
1. Go to "Firestore Database"
2. Create database (if not already created)
3. Start in test mode (we have security rules configured)

### Functions
1. Go to "Functions"
2. Enable Cloud Functions API

### Hosting
1. Go to "Hosting"
2. Get started with hosting

## Step 4: Test Configuration

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   
   cd ../frontend
   npm install
   ```

2. **Test Firebase Connection:**
   ```bash
   cd frontend
   npm start
   ```

3. **Check Firebase Console:**
   - Go to Authentication → Users
   - Go to Firestore Database → Data
   - Verify your app can connect

## Step 5: Deploy to Firebase

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy:**
   ```bash
   npx firebase-tools deploy
   ```

3. **Access Your App:**
   - Production URL: https://ndu-bill-payment.web.app
   - API URL: https://us-central1-ndu-bill-payment.cloudfunctions.net/api

## 🔒 Security Notes

- **Never commit** `.env` files to version control
- **Keep API keys** secure and private
- **Use environment variables** for sensitive data
- **Enable security rules** before going to production

## 🚨 Troubleshooting

### Common Issues:

1. **"Firebase App not initialized":**
   - Check if config values are correct
   - Verify project ID matches

2. **"Permission denied":**
   - Check Firestore security rules
   - Verify authentication is working

3. **"Functions not found":**
   - Deploy functions: `npx firebase-tools deploy --only functions`
   - Check function logs in Firebase Console

4. **"Hosting not working":**
   - Build frontend: `npm run build`
   - Deploy hosting: `npx firebase-tools deploy --only hosting`

## 📞 Need Help?

- Check Firebase Console for error logs
- Verify all services are enabled
- Ensure config values are correct
- Test with Firebase emulators first
