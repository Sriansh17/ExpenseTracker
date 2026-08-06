const queries = require('../queries/dashboardQueries');
const { currentMonthRange, addDays } = require('../utils/dateHelpers');
const AppError = require('../utils/appError');
async function getOverview(userId) {
  const range = currentMonthRange();
  const [balance, monthlySpend, breakdown, recent] = await Promise.all([queries.getTotalBalance(userId), queries.getMonthlySpend(userId, range.start, range.end), queries.getCategoryBreakdown(userId), queries.getRecentTransactions(userId)]);
  const total = breakdown.reduce((sum, item) => sum + Number(item.amount), 0);
  return { balance: Number(balance), monthlySpend: Number(monthlySpend), categoryBreakdown: breakdown.map((item) => ({ ...item, amount: Number(item.amount), percentage: total ? Number((Number(item.amount) * 100 / total).toFixed(2)) : 0 })), recentTransactions: recent };
}
async function getChartData(userId, { startDate, endDate }) {
  const end = endDate || new Date().toISOString().slice(0, 10); const start = startDate || addDays(new Date(`${end}T00:00:00Z`), -29).toISOString().slice(0, 10);
  if (start > end) throw new AppError('VALIDATION_ERROR', 'startDate must be before endDate', 400);
  const days = Math.floor((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000) + 1;
  if (days > 365) throw new AppError('VALIDATION_ERROR', 'Date range cannot exceed 365 days', 400);
  const rows = await queries.getDailySpend(userId, start, end); const byDate = new Map(rows.map((row) => [row.date.toISOString ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10), Number(row.amount)]));
  const timeSeries = []; for (let i = 0; i < days; i += 1) { const date = addDays(new Date(`${start}T00:00:00Z`), i).toISOString().slice(0, 10); timeSeries.push({ date, amount: byDate.get(date) || 0 }); }
  return { startDate: start, endDate: end, timeSeries };
}
module.exports = { getOverview, getChartData };
