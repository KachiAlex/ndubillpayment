import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Navigation */}
      <nav className="relative px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <span className="text-white font-bold">N</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">NDU Portal</h1>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-3">
              <Link
                to="/login"
                className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors ring-1 ring-white/20"
              >
                Register
              </Link>
            </div>
          </div>
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden mt-3 px-3">
            <div className="space-y-2 bg-white/5 rounded-xl p-3 ring-1 ring-white/10">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-blue-100 hover:text-white px-3 py-2 rounded-md text-base font-medium"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="block bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-md text-base font-medium text-center"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/hero-bg.png)'}}>
        <div className="absolute inset-0 bg-blue-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-cyan-200/90 text-xs uppercase tracking-[0.2em]">Niger Delta University</p>
              <h1 className="mt-3 text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Secure Tuition Payments, Simplified
              </h1>
              <p className="mt-4 text-lg text-blue-100 max-w-xl">
                Pay fees with the built-in test checkout, track receipts, and view wallet balance in real-time.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
                >
                  <span>Student Login</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-xl font-semibold ring-1 ring-white/20 transition"
                >
                  <span>Register</span>
                </Link>
              </div>
              {/* trust row */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-2xl font-bold text-white">2FA</p>
                  <p className="text-blue-100 text-xs">Bursar security</p>
                </div>
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-2xl font-bold text-white">PCI</p>
                  <p className="text-blue-100 text-xs">Best practices</p>
                </div>
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-2xl font-bold text-white">NGN</p>
                  <p className="text-blue-100 text-xs">Test checkout</p>
                </div>
                <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-2xl font-bold text-white">PDF</p>
                  <p className="text-blue-100 text-xs">Receipts</p>
                </div>
              </div>
            </div>

            {/* showcase card */}
            <div className="relative">
              <div className="relative rounded-2xl bg-white shadow-2xl p-5 sm:p-6 lg:p-8 overflow-hidden">
                <div className="absolute -top-10 -right-10 h-40 w-40 bg-blue-600/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Student Wallet</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">NGN</span>
                  </div>
                  <p className="mt-4 text-4xl font-extrabold text-blue-700">₦0</p>
                  <p className="mt-1 text-gray-500 text-sm">Read-only balance</p>
                  <div className="mt-6">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
                      Live demo
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Choose Our Payment Portal?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Secure, fast and convenient tuition payments tailored for NDU students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition">
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-gray-600">Bank-level security, encryption in transit and at rest.</p>
            </div>

            <div className="text-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition">
              <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Processing</h3>
              <p className="text-gray-600">Instant confirmations and immediate receipt generation.</p>
            </div>

            <div className="text-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition">
              <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Receipts</h3>
              <p className="text-gray-600">Download PDF receipts and keep immutable records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Niger Delta University</h3>
            <p className="text-gray-400 mb-4">Official Tuition Payment Portal</p>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Niger Delta University. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
