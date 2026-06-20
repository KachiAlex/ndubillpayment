# NDU Tuition Payment Portal

A comprehensive tuition payment system for Niger Delta University, built with modern web technologies and secure payment processing.

## 🚀 Features

### Student Features
- **Secure Registration/Login** with matriculation number and email
- **Wallet System** for tuition payments (read-only for students)
- **Multiple Payment Methods** via Paystack integration
- **Transaction History** with detailed records
- **Receipt Generation** and download
- **Real-time Payment Status** updates

### Admin/Bursar Features
- **Secure Admin Login** with 2FA authentication
- **Comprehensive Dashboard** with analytics and statistics
- **Transaction Reports** with filtering and export options
- **Receipt Management** and printing
- **Audit Logs** for system monitoring
- **Export Capabilities** (Excel, CSV, PDF)

### System Features
- **PCI DSS Compliant** payment processing
- **Immutable Audit Trail** for all transactions
- **Automatic Fund Transfer** to school bank account
- **Real-time Webhooks** for payment status updates
- **Responsive Design** for all devices
- **Secure Data Storage** with encryption

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with Knex.js ORM
- **JWT** authentication with 2FA support
- **Paystack** payment gateway integration
- **Winston** logging system
- **Joi** validation
- **PDFKit** for receipt generation

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **React Query** for state management
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **React Hook Form** for form handling

## 📁 Project Structure

```
ndu-bill-payment/
├── backend/
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Custom middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── utils/               # Utility functions
│   ├── database/
│   │   ├── migrations/      # Database migrations
│   │   └── seeds/          # Database seeds
│   ├── config/             # Configuration files
│   ├── logs/               # Log files
│   ├── server.js           # Main server file
│   └── package.json
├── frontend/
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       ├── contexts/       # React contexts
│       ├── api/            # API integration
│       ├── utils/          # Utility functions
│       ├── hooks/          # Custom hooks
│       ├── assets/         # Images, icons, etc.
│       ├── App.js          # Main app component
│       └── index.js        # Entry point
├── docs/                   # Documentation
├── scripts/                # Deployment scripts
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KachiAlex/ndubillpayment.git
   cd ndubillpayment
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Configure your environment variables in .env
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb ndu_tuition
   
   # Run migrations
   npm run migrate
   
   # Seed initial data (optional)
   npm run seed
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
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
PORT=5000
NODE_ENV=development
```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/setup-2fa` - Setup 2FA for admin
- `POST /api/auth/verify-2fa` - Verify 2FA token

### Wallet
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `POST /api/wallet/fund` - Initiate wallet funding
- `GET /api/wallet/verify/:reference` - Verify payment status
- `GET /api/wallet/receipt/:id` - Download receipt

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/reports` - Get transaction reports
- `GET /api/admin/reports/export/excel` - Export to Excel
- `GET /api/admin/reports/export/csv` - Export to CSV
- `GET /api/admin/audit-logs` - Get audit logs

### Webhooks
- `POST /api/webhooks/paystack` - Paystack webhook handler

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Two-Factor Authentication** for admin users
- **Rate Limiting** to prevent abuse
- **Input Validation** with Joi schemas
- **SQL Injection Protection** with parameterized queries
- **CORS Configuration** for secure cross-origin requests
- **Helmet.js** for security headers
- **Audit Logging** for all system activities

## 💳 Payment Integration

The system integrates with Paystack for secure payment processing:

- **Card Payments** (Visa, Mastercard, Verve)
- **Bank Transfers** (Direct bank debit)
- **USSD Payments** (Mobile banking)
- **Webhook Handling** for real-time status updates
- **Automatic Reconciliation** with school bank account

## 📊 Database Schema

### Users Table
- User authentication and profile information
- Role-based access control (student, bursar, admin)
- 2FA configuration for admin users

### Wallets Table
- Student wallet balances
- Currency support (NGN)
- Read-only access for students

### Transactions Table
- Payment transaction records
- Status tracking (pending, successful, failed)
- Payment gateway integration data

### Receipts Table
- Generated receipt information
- PDF file paths and metadata
- Print status tracking

### Audit Logs Table
- System activity logging
- User action tracking
- Security monitoring

## 🚀 Deployment

### Production Deployment

1. **Backend Deployment**
   ```bash
   cd backend
   npm install --production
   npm run build
   npm start
   ```

2. **Frontend Deployment**
   ```bash
   cd frontend
   npm run build
   # Deploy the build folder to your hosting service
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **KachiAlex** - *Initial work* - [KachiAlex](https://github.com/KachiAlex)

## 🙏 Acknowledgments

- Niger Delta University for the project requirements
- Paystack for payment gateway integration
- The open-source community for the amazing tools and libraries

## 📞 Support

For support, email bursary@ndu.edu.ng or create an issue in the repository.

---

**Niger Delta University Tuition Payment Portal** - Secure, Fast, and Reliable
