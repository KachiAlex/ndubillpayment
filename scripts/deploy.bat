@echo off
echo 🚀 Starting deployment of NDU Tuition Payment Portal...

REM Build frontend
echo 📦 Building frontend...
cd frontend
call npm install
call npm run build
cd ..

REM Deploy to Firebase
echo 🔥 Deploying to Firebase...
call npx firebase-tools deploy

echo ✅ Deployment complete!
echo 🌐 Your app is now live at: https://ndu-bill-payment.web.app
pause
