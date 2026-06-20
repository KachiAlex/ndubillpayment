# Firebase Setup Guide for NDU Tuition Payment Portal

This guide will help you set up Firebase for the NDU Tuition Payment Portal.

## 🔥 Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `ndu-bill-payment`
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Firebase Services

#### Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll configure security rules later)
4. Select location: `nam5 (us-central)`

#### Authentication
1. Go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" provider
3. Enable "Anonymous" provider (optional)

#### Hosting
1. Go to "Hosting"
2. Click "Get started"
3. Follow the setup instructions

#### Functions
1. Go to "Functions"
2. Click "Get started"
3. Follow the setup instructions

### 3. Configure Firebase Config

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app
4. Register app with name: `ndu-tuition-frontend`
5. Copy the Firebase config object

Update `frontend/src/firebase/config.js` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "ndu-bill-payment.firebaseapp.com",
  projectId: "ndu-bill-payment",
  storageBucket: "ndu-bill-payment.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## 🚀 Deployment

### Local Development

1. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Start Firebase emulators:**
   ```bash
   npx firebase-tools emulators:start
   ```

3. **Start frontend development server:**
   ```bash
   cd frontend
   npm start
   ```

### Production Deployment

#### Option 1: Using Deployment Scripts

**Windows:**
```bash
scripts\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### Option 2: Manual Deployment

1. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Firebase:**
   ```bash
   npx firebase-tools deploy
   ```

3. **Deploy specific services:**
   ```bash
   # Deploy only hosting
   npx firebase-tools deploy --only hosting
   
   # Deploy only functions
   npx firebase-tools deploy --only functions
   
   # Deploy only firestore rules
   npx firebase-tools deploy --only firestore:rules
   ```

## 🔧 Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=ndu-bill-payment
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ndu-bill-payment.iam.gserviceaccount.com

# Database (if using external PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ndu_tuition
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Payment Gateway Configuration (Paystack)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# School Bank Account Details
SCHOOL_BANK_ACCOUNT=1234567890
SCHOOL_BANK_CODE=058

# Server Configuration
NODE_ENV=production
```

### Firebase Admin SDK Setup

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values for your `.env` file

## 🔒 Security Configuration

### Firestore Security Rules

The security rules are already configured in `firestore.rules`. Deploy them:

```bash
npx firebase-tools deploy --only firestore:rules
```

### Firestore Indexes

Deploy the indexes for optimal query performance:

```bash
npx firebase-tools deploy --only firestore:indexes
```

## 📊 Monitoring and Analytics

### Firebase Analytics

1. Go to "Analytics" in Firebase Console
2. Enable Google Analytics
3. Configure events for payment tracking

### Firebase Performance

1. Go to "Performance" in Firebase Console
2. Enable Performance Monitoring
3. Monitor app performance metrics

### Firebase Crashlytics

1. Go to "Crashlytics" in Firebase Console
2. Enable Crashlytics
3. Monitor app crashes and errors

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd frontend
        npm install
    - name: Build
      run: |
        cd frontend
        npm run build
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        channelId: live
        projectId: ndu-bill-payment
```

## 🚨 Troubleshooting

### Common Issues

1. **Firebase CLI not found:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Permission denied:**
   ```bash
   npx firebase-tools login
   ```

3. **Build errors:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Functions deployment failed:**
   ```bash
   cd backend
   npm install
   npx firebase-tools deploy --only functions
   ```

### Useful Commands

```bash
# View Firebase project info
npx firebase-tools projects:list

# Switch Firebase project
npx firebase-tools use ndu-bill-payment

# View deployment history
npx firebase-tools hosting:channel:list

# Rollback deployment
npx firebase-tools hosting:rollback

# View logs
npx firebase-tools functions:log
```

## 📱 Mobile App Integration (Future)

For future mobile app development:

1. Enable Firebase Authentication for mobile
2. Configure deep linking
3. Set up push notifications
4. Configure app distribution

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Note:** Make sure to keep your Firebase config and service account keys secure and never commit them to version control.
