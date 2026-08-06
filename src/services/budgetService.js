const queries = require('../queries/budgetQueries');
const categoryQueries = require('../queries/categoryQueries');
const notificationService = require('./notificationService');
const AppError = require('../utils/appError');
function current() { const d = new Date(); return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }; }
async function alertIfNeeded(userId, budget, spent, categoryName) {
  const percentage = Number((Number(spent) * 100 / Number(budget.amount)).toFixed(2));
  if (percentage >= 100 && !budget.alert_100_sent) { await notificationService.sendBudgetAlert(userId, { type: categoryName ? 'category_budget_exceeded_100' : 'budget_exceeded_100', budgetId: budget.id, spent: Number(spent), percentage, categoryName }); if (queries.updateAlertFlag) await queries.updateAlertFlag(budget.id, 'alert_100_sent'); }
  else if (percentage >= 80 && !budget.alert_80_sent) { await notificationService.sendBudgetAlert(userId, { type: categoryName ? 'category_budget_warning_80' : 'budget_warning_80', budgetId: budget.id, spent: Number(spent), percentage, categoryName }); if (queries.updateAlertFlag) await queries.updateAlertFlag(budget.id, 'alert_80_sent'); }
}
async function setMonthlyBudget(userId, amount) { const { month, year } = current(); const budget = await queries.upsertMonthlyBudget(userId, amount, month, year); if (queries.getMonthlySpending) await alertIfNeeded(userId, budget, await queries.getMonthlySpending(userId, month, year)); return budget; }
async function setCategoryBudget(userId, categoryId, amount) { const category = await categoryQueries.findById(categoryId); if (!category) throw new AppError('NOT_FOUND', 'Category not found', 404); if (category.user_id && category.user_id !== userId) throw new AppError('FORBIDDEN', 'Category does not belong to user', 403); const { month, year } = current(); const budget = await queries.upsertCategoryBudget(userId, categoryId, amount, month, year); if (queries.getCategorySpending) await alertIfNeeded(userId, budget, await queries.getCategorySpending(userId, categoryId, month, year), category.name); return budget; }
async function getStatus(userId) { const { month, year } = current(); return queries.getStatus(userId, month, year); }
async function checkBudgetAlerts(userId, _expenseAmount, categoryId) { const { month, year } = current(); const monthly = await queries.getMonthlyBudget(userId, month, year); if (monthly) await alertIfNeeded(userId, monthly, await queries.getMonthlySpending(userId, month, year)); const categories = await queries.getCategoryBudgets(userId, month, year); for (const budget of categories) { const spent = await queries.getCategorySpending(userId, budget.category_id, month, year); await alertIfNeeded(userId, budget, spent, budget.category_name); } }
module.exports = { setMonthlyBudget, setCategoryBudget, getStatus, checkBudgetAlerts };
