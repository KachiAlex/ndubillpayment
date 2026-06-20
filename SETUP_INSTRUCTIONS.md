# 🚀 NDU Tuition Payment Portal - Setup Instructions

## ✅ What You Need to Do Next:

### 1. **Create Backend Environment File**

Create a file called `.env` in the `backend` folder with these contents:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=ndu-bill-payment
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCQggub6sXxL3Wy\nsbO1tj0xpOIGewBu+DXP46OY6AZnyIPwSPIKAuhjynggJ5mHqfy21pBfdDMttYRv\n0S4NS6C33Jt7bFHvpm3gROvggoak2XbyZGO5OmfUgQJMN0HT9SF3UjY65/UXj2Yb\nLdGWFQCrCqRSrraTiffg3SIpQ/Ao78F9QOCVjOJ6SCbLJEKxcVhWJ8vR1E9979e6\nGzcjT9TffRxwKdIzfGHoSElEVWnksl54mPEEKdSMb6c68hXSFhBjIBo9aEDTPvrJ\nhTPoYQgEK70Ar39nx9ypdgyn3sp3ZXD9x/EQSfQdO9VNCQ3zLHunGAU8yBWCyROH\nBMnNudPzAgMBAAECggEAB/9CZYsHuvINmT7Z+1I4rxDOYghtkjaR7SLOZhhfvl+W\nOaEiepOwSPwmoLTq+1suEppA3B93SO4fhFFMXfeo+ckvdj7yMTPXJyROn2/pw/a1\nl/LJTVy3lpwwbzJW+264lDy2++nj95KmgRY3NTniqGngL86JE798ucjTFVCJWmKG\nWZkvkrPtQgJDAjV1XZpBYd7/d787KIlH6sCJXO31ztf98YUDeYWdNWVsEctQj81y\nyLhQ492Fi7qT4J4LdgFSvRhSTNMmBcUHqsCPA/aetg9rCTQAPK2mKN4sXDVTpy9d\nVC6ZVmvmZUaSXK4VkVdUYpz63SlKicgXDxSlaDAiGQKBgQDFSz7KMhu6EKUjzk+D\nIRUReZtDy6fSk4lveQrX7mKspF2jPYOWNVWYe445+z2XMabu0dfwxu2Dob/1c0M4\nwdPnzRaEdNEuqYAZTsxfJ/oDjVUBeOgN9DLejTH/jSNDfzvTXcaMBV1pXwUdqUTp\nOYu4ZcDFVCvn+OdPIFyPCR7X6QKBgQC7gdxcBEIXmy+gpCq3Lvrb24WsJXbVF7tM\n/odz0eh7Vchr/2Va+iI3wpWO1D9ub9jYF/EPwU5taleh1mrTadKO56EjcvZfGD+k\n37+coowS8egH5RD5MoK7+5vItEPlPBxzXWbe+g+ZrtEWuTRMGuO7XZKT9CDE/D56\n5fFVPL//ewKBgBQRRT+3vQ495y4vK/NAiC4Q2nQY4OcQTqhh/XJdMvgwd73E4f+D\nSUOLPbo0Dd21FS+xdG9vLHV5HFdQ9ANv46fuOl4aq7Q9VWQ9mZgMLufxljXiIGha\n8FmmrvE5X97bsDAdl7ZiTVAMdC7CKto2GjoVT3hCyXx82ro3pnJ+EP8RAoGBAI4c\nP+yldYn6ncA8a/tl6c6Ts93ijwu17sjN588J+g7v1vSzHhgzl5d3LG6Rwnlq34f3\nrUXplg0rGbuYjGIqw+B3AROi38L219WXltuZ/lulZ9wD6jdT5u2eJlWY+hRU2KM+\n2OaJ0yUA74svVsmPX6Xzp1HnJqblHl16xMt7PXDdAoGAYoDQfwWwwlJVwEogQRVK\nst1nfQS3n1cwsxHrjUidXA6xCBav9w7oZUxWdwchDHTX/gIJQpJnXc1N/1G6F0k6\njm6ShviCzNJuCclt2M6t6SLTay0eiR9cRyA2RiQTcVW9Y3PAkJsiXhQAM4ySjTlo\nCYrK7hNHvGXz7SjUX6Z4vrQ=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ndu-bill-payment.iam.gserviceaccount.com

# JWT Configuration
JWT_SECRET=ndu_tuition_super_secret_jwt_key_2024_make_it_very_long_and_secure
JWT_EXPIRES_IN=24h

# Payment Gateway Configuration (Paystack) - UPDATE THESE WITH YOUR ACTUAL KEYS
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

### 2. **Get Frontend Firebase Config**

1. Go to [Firebase Console](https://console.firebase.google.com/project/ndu-bill-payment)
2. Click the gear icon (⚙️) → "Project settings"
3. Scroll down to "Your apps" section
4. If you don't see a web app, click "Add app" → Web app (</>) icon
5. Register with name: `ndu-tuition-frontend`
6. Copy the `firebaseConfig` object

### 3. **Update Frontend Config**

Open `frontend/src/firebase/config.js` and replace the placeholder values with your actual Firebase config from step 2.

### 4. **Install Dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. **Test Locally**

```bash
# Start frontend
cd frontend
npm start

# In another terminal, start backend
cd backend
npm run dev
```

### 6. **Deploy to Firebase**

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
npx firebase-tools deploy
```

## 🎯 **Your App URLs:**
- **Local Development**: http://localhost:3000
- **Production**: https://ndu-bill-payment.web.app
- **API**: https://us-central1-ndu-bill-payment.cloudfunctions.net/api

## 🔑 **Important Notes:**

1. **Keep the JSON file secure** - Don't commit it to version control
2. **Update Paystack keys** - Get your actual keys from Paystack dashboard
3. **Test locally first** - Make sure everything works before deploying
4. **Enable Firebase services** - Make sure Authentication, Firestore, and Functions are enabled

## 🚨 **Next Steps:**

1. Create the `.env` file in the backend folder
2. Get your Firebase web app config
3. Update the frontend config
4. Install dependencies
5. Test locally
6. Deploy to Firebase

Your NDU Tuition Payment Portal will be live! 🚀
