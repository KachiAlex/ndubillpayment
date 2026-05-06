-- Clear payment data to start afresh

-- Delete fee payments
DELETE FROM fee_payments;

-- Delete transactions
DELETE FROM transactions;

-- Reset wallet balances to 0
UPDATE wallets SET balance = 0;

-- Verify the data is cleared
SELECT 'fee_payments' as table_name, COUNT(*) as count FROM fee_payments
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions
UNION ALL
SELECT 'wallets' as table_name, COUNT(*) as count FROM wallets WHERE balance > 0;
