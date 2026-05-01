const PDFDocument = require('pdfkit');
const { db } = require('./database');

async function getTransactionWithUser(transactionId) {
  const transaction = await db('transactions')
    .join('users', 'transactions.user_id', 'users.id')
    .select(
      'transactions.*',
      'users.first_name',
      'users.last_name',
      'users.matric_no',
      'users.department',
      'users.session'
    )
    .where('transactions.id', transactionId)
    .first();
  return transaction;
}

function buildReceiptPdf(doc, transaction) {
  doc.fontSize(20)
     .text('NIGER DELTA UNIVERSITY', 50, 50, { align: 'center' });

  doc.fontSize(16)
     .text('TUITION PAYMENT RECEIPT', 50, 80, { align: 'center' });

  doc.fontSize(12)
     .text(`Receipt No: ${transaction.reference}`, 50, 120)
     .text(`Date: ${new Date(transaction.created_at).toLocaleDateString()}`, 50, 140)
     .text(`Time: ${new Date(transaction.created_at).toLocaleTimeString()}`, 50, 160);

  doc.text('STUDENT DETAILS:', 50, 200)
     .text(`Name: ${transaction.first_name} ${transaction.last_name}`, 50, 220)
     .text(`Matric No: ${transaction.matric_no}`, 50, 240)
     .text(`Department: ${transaction.department}`, 50, 260)
     .text(`Session: ${transaction.session}`, 50, 280);

  doc.text('PAYMENT DETAILS:', 50, 320)
     .text(`Amount: ₦${transaction.amount}`, 50, 340)
     .text(`Type: ${transaction.type}`, 50, 360)
     .text(`Status: ${transaction.status}`, 50, 380)
     .text(`Reference: ${transaction.reference}`, 50, 400);

  doc.fontSize(10)
     .text('This is a computer generated receipt.', 50, 500, { align: 'center' })
     .text('Niger Delta University - Tuition Payment Portal', 50, 520, { align: 'center' });
}

// Generate receipt PDF and pipe to a writable stream (e.g., HTTP response)
const generateReceiptToStream = async (transactionId, outputStream) => {
  const transaction = await getTransactionWithUser(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const doc = new PDFDocument({ size: 'A4' });
  doc.pipe(outputStream);
  buildReceiptPdf(doc, transaction);
  doc.end();
  return transaction;
};

// Generate receipt PDF and return a Buffer
const generateReceiptBuffer = async (transactionId) => {
  const transaction = await getTransactionWithUser(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), transaction }));
    doc.on('error', reject);

    buildReceiptPdf(doc, transaction);
    doc.end();
  });
};

// Legacy wrapper for webhook usage (returns buffer object)
const generateReceipt = async (transactionId) => {
  const { buffer, transaction } = await generateReceiptBuffer(transactionId);
  return { buffer, transaction };
};

module.exports = {
  generateReceipt,
  generateReceiptBuffer,
  generateReceiptToStream
};
