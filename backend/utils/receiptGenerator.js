const PDFDocument = require('pdfkit');

function generateReceiptBuffer(receiptData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Niger Delta University', { align: 'center' });
    doc.fontSize(16).text('Tuition Payment Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Receipt No: ${receiptData.receipt_number}`);
    doc.text(`Date: ${new Date(receiptData.created_at).toLocaleString()}`);
    doc.moveDown();

    doc.text(`Student: ${receiptData.student_name}`);
    doc.text(`Matric No: ${receiptData.matric_number}`);
    doc.text(`Department: ${receiptData.department}`);
    doc.text(`Level: ${receiptData.level}`);
    doc.moveDown();

    doc.text(`Amount: ${receiptData.currency} ${receiptData.amount}`);
    doc.text(`Transaction Ref: ${receiptData.tx_ref}`);
    doc.text(`Status: ${receiptData.status}`);
    doc.moveDown();

    doc.text('Thank you for your payment!', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateReceiptBuffer };
