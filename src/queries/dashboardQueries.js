const db = require('../config/db');
const getTotalBalance = async (userId) => (await db.query(`SELECT COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1 AND deleted_at IS NULL), 0) - COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND deleted_at IS NULL), 0) AS balance`, [userId])).rows[0].balance;
const getMonthlySpend = async (userId, start, end) => (await db.query(`SELECT COALESCE(SUM(amount), 0) AS amount FROM expenses WHERE user_id = $1 AND deleted_at IS NULL AND expense_date BETWEEN $2 AND $3`, [userId, start, end])).rows[0].amount;
const getCategoryBreakdown = async (userId, start, end) => (await db.query(`SELECT c.name AS category, SUM(e.amount)::bigint AS amount FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.user_id = $1 AND e.deleted_at IS NULL AND e.expense_date BETWEEN $2 AND $3 GROUP BY c.name ORDER BY amount DESC`, [userId, start, end])).rows;
const getRecentTransactions = async (userId) => (await db.query(`SELECT * FROM (SELECT id, 'expense' AS type, amount, expense_date AS date, notes, created_at FROM expenses WHERE user_id = $1 AND deleted_at IS NULL UNION ALL SELECT id, 'income' AS type, amount, income_date AS date, notes, created_at FROM incomes WHERE user_id = $1 AND deleted_at IS NULL) t ORDER BY date DESC, created_at DESC LIMIT 10`, [userId])).rows;
const getDailySpend = async (userId, start, end) => (await db.query(`SELECT expense_date AS date, COALESCE(SUM(amount), 0)::bigint AS amount FROM expenses WHERE user_id = $1 AND deleted_at IS NULL AND expense_date BETWEEN $2 AND $3 GROUP BY expense_date ORDER BY expense_date`, [userId, start, end])).rows;
const getTopMerchants = async (userId, start, end) => (await db.query(
  `SELECT merchant, COUNT(*)::int as count, SUM(amount)::bigint as total 
   FROM expenses WHERE user_id = $1 AND deleted_at IS NULL 
   AND expense_date BETWEEN $2 AND $3 AND merchant IS NOT NULL AND merchant != ''
   GROUP BY merchant ORDER BY total DESC LIMIT 5`,
  [userId, start, end])).rows;

const getRecurringTransactions = async (userId) => (await db.query(
  `SELECT merchant, amount::int, COUNT(*)::int as occurrences,
   MIN(expense_date) as first_seen, MAX(expense_date) as last_seen
   FROM expenses 
   WHERE user_id = $1 AND deleted_at IS NULL 
   AND merchant IS NOT NULL AND merchant != ''
   GROUP BY merchant, amount 
   HAVING COUNT(*) >= 2
   ORDER BY occurrences DESC, amount DESC
   LIMIT 10`,
  [userId])).rows;

module.exports = { getTotalBalance, getMonthlySpend, getCategoryBreakdown, getRecentTransactions, getDailySpend, getTopMerchants, getRecurringTransactions };
