#!/bin/bash

# NDU Tuition Payment Portal - Deployment Script

echo "🚀 Starting deployment of NDU Tuition Payment Portal..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
npx firebase-tools deploy

echo "✅ Deployment complete!"
echo "🌐 Your app is now live at: https://ndu-bill-payment.web.app"
