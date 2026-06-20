// Simple script to create PWA icons
const fs = require('fs');

// Create a simple 192x192 icon as base64
const icon192 = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#grad)" rx="20"/>
  <text x="96" y="85" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">NDU</text>
  <text x="96" y="115" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">PAY</text>
  <circle cx="96" cy="140" r="8" fill="white" opacity="0.8"/>
</svg>
`).toString('base64')}`;

// Create a simple 512x512 icon as base64
const icon512 = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" rx="50"/>
  <text x="256" y="220" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="white">NDU</text>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="40" text-anchor="middle" fill="white">PAY</text>
  <circle cx="256" cy="380" r="20" fill="white" opacity="0.8"/>
</svg>
`).toString('base64')}`;

console.log('Icon data generated');
console.log('192x192:', icon192.substring(0, 100) + '...');
console.log('512x512:', icon512.substring(0, 100) + '...');
