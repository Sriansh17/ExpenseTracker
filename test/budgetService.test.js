const assert = require('node:assert');
const { describe, it, beforeEach } = require('node:test');

// Mock dependencies
const mockBudgetQueries = {
  upsertMonthlyBudget: null,
  upsertCategoryBudget: null,
  getMonthlyBudget: null,
  getCategoryBudgets: null,
  getMonthlySpending: null,
  getCategorySpending: null,
  getStatus: null,
  updateAlertFlag: null
};

const mockCategoryQueries = {
  findById: null
};

const mockNotificationService = {
  sendBudgetAlert: null
};

// Intercept require calls
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.includes('budgetQueries')) {
    return 'mocked-budgetQueries';
  }
  if (request.includes('categoryQueries')) {
    return 'mocked-categoryQueries-budget';
  }
  if (request.includes('notificationService')) {
    return 'mocked-notificationService';
  }
  return originalResolveFilename.call(this, request, parent, ...rest);
};

require.cache['mocked-budgetQueries'] = {
  id: 'mocked-budgetQueries',
  filename: 'mocked-budgetQueries',
  loaded: true,
  exports: mockBudgetQueries
};

require.cache['mocked-categoryQueries-budget'] = {
  id: 'mocked-categoryQueries-budget',
  filename: 'mocked-categoryQueries-budget',
  loaded: true,
  exports: mockCategoryQueries
};

require.cache['mocked-notificationService'] = {
  id: 'mocked-notificationService',
  filename: 'mocked-notificationService',
  loaded: true,
  exports: mockNotificationService
};

const budgetService = require('../src/services/budgetService');
const AppError = require('../src/utils/appError');

describe('BudgetService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const categoryId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    Object.keys(mockBudgetQueries).forEach(key => { mockBudgetQueries[key] = null; });
    Object.keys(mockCategoryQueries).forEach(key => { mockCategoryQueries[key] = null; });
    mockNotificationService.sendBudgetAlert = async () => null;
  });

  describe('setMonthlyBudget', () => {
    it('should upsert a monthly budget and return the budget record', async () => {
      const budgetRecord = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: false, alert_100_sent: false
      };
      mockBudgetQueries.upsertMonthlyBudget = async (uid, amt, month, year) => {
        assert.strictEqual(uid, userId);
        assert.strictEqual(amt, 100000);
        return budgetRecord;
      };
      mockBudgetQueries.getMonthlySpending = async () => 50000;

      const result = await budgetService.setMonthlyBudget(userId, 100000);
      assert.deepStrictEqual(result, budgetRecord);
    });

    it('should fire 80% alert when spending already exceeds threshold', async () => {
      const budgetRecord = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: false, alert_100_sent: false
      };
      mockBudgetQueries.upsertMonthlyBudget = async () => budgetRecord;
      mockBudgetQueries.getMonthlySpending = async () => 85000; // 85% of 100000

      let alertCalled = false;
      mockNotificationService.sendBudgetAlert = async (uid, info) => {
        if (info.type === 'budget_warning_80') {
          alertCalled = true;
          assert.strictEqual(uid, userId);
          assert.strictEqual(info.budgetId, 'b1');
          assert.strictEqual(info.spent, 85000);
        }
        return { id: 'notif1' };
      };

      await budgetService.setMonthlyBudget(userId, 100000);
      assert.strictEqual(alertCalled, true);
    });

    it('should fire 100% alert when spending already exceeds budget', async () => {
      const budgetRecord = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: true, alert_100_sent: false
      };
      mockBudgetQueries.upsertMonthlyBudget = async () => budgetRecord;
      mockBudgetQueries.getMonthlySpending = async () => 110000; // 110%

      let alertCalled = false;
      mockNotificationService.sendBudgetAlert = async (uid, info) => {
        if (info.type === 'budget_exceeded_100') {
          alertCalled = true;
          assert.strictEqual(info.percentage, 110);
        }
        return { id: 'notif1' };
      };

      await budgetService.setMonthlyBudget(userId, 100000);
      assert.strictEqual(alertCalled, true);
    });

    it('should not fire alerts when spending is below 80%', async () => {
      const budgetRecord = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: false, alert_100_sent: false
      };
      mockBudgetQueries.upsertMonthlyBudget = async () => budgetRecord;
      mockBudgetQueries.getMonthlySpending = async () => 50000; // 50%

      let alertCalled = false;
      mockNotificationService.sendBudgetAlert = async () => {
        alertCalled = true;
        return null;
      };

      await budgetService.setMonthlyBudget(userId, 100000);
      assert.strictEqual(alertCalled, false);
    });
  });

  describe('setCategoryBudget', () => {
    it('should validate category exists and upsert budget', async () => {
      const category = { id: categoryId, name: 'Food', user_id: null };
      const budgetRecord = {
        id: 'b2', user_id: userId, category_id: categoryId,
        budget_type: 'category', amount: 50000,
        alert_80_sent: false, alert_100_sent: false
      };
      mockCategoryQueries.findById = async (id) => {
        assert.strictEqual(id, categoryId);
        return category;
      };
      mockBudgetQueries.upsertCategoryBudget = async () => budgetRecord;
      mockBudgetQueries.getCategorySpending = async () => 20000;

      const result = await budgetService.setCategoryBudget(userId, categoryId, 50000);
      assert.deepStrictEqual(result, budgetRecord);
    });

    it('should throw NOT_FOUND for non-existent category', async () => {
      mockCategoryQueries.findById = async () => null;

      await assert.rejects(
        () => budgetService.setCategoryBudget(userId, 'bad-id', 50000),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'NOT_FOUND');
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    it('should fire category 80% alert when threshold crossed', async () => {
      const category = { id: categoryId, name: 'Food', user_id: null };
      const budgetRecord = {
        id: 'b2', user_id: userId, category_id: categoryId,
        budget_type: 'category', amount: 50000,
        alert_80_sent: false, alert_100_sent: false
      };
      mockCategoryQueries.findById = async () => category;
      mockBudgetQueries.upsertCategoryBudget = async () => budgetRecord;
      mockBudgetQueries.getCategorySpending = async () => 42000; // 84%

      let alertType = null;
      mockNotificationService.sendBudgetAlert = async (uid, info) => {
        alertType = info.type;
        assert.strictEqual(info.categoryName, 'Food');
        return { id: 'notif1' };
      };

      await budgetService.setCategoryBudget(userId, categoryId, 50000);
      assert.strictEqual(alertType, 'category_budget_warning_80');
    });
  });

  describe('getStatus', () => {
    it('should delegate to budgetQueries.getStatus for current month/year', async () => {
      const expected = {
        monthly: { id: 'b1', amount: 100000, spent: 60000, percentage: 60 },
        categories: [{ id: 'b2', amount: 50000, spent: 30000, percentage: 60 }]
      };
      mockBudgetQueries.getStatus = async (uid, month, year) => {
        assert.strictEqual(uid, userId);
        assert(month >= 1 && month <= 12);
        assert(year >= 2024);
        return expected;
      };

      const result = await budgetService.getStatus(userId);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('checkBudgetAlerts', () => {
    it('should check monthly and category budgets after expense creation', async () => {
      const monthlyBudget = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: false, alert_100_sent: false
      };
      const categoryBudget = {
        id: 'b2', user_id: userId, category_id: categoryId,
        budget_type: 'category', amount: 50000,
        alert_80_sent: false, alert_100_sent: false,
        category_name: 'Food'
      };

      mockBudgetQueries.getMonthlyBudget = async () => monthlyBudget;
      mockBudgetQueries.getMonthlySpending = async () => 90000; // 90%
      mockBudgetQueries.getCategoryBudgets = async () => [categoryBudget];
      mockBudgetQueries.getCategorySpending = async () => 45000; // 90%

      const alerts = [];
      mockNotificationService.sendBudgetAlert = async (uid, info) => {
        alerts.push(info.type);
        return { id: 'notif' };
      };

      await budgetService.checkBudgetAlerts(userId, 5000, categoryId);

      assert(alerts.includes('budget_warning_80'));
      assert(alerts.includes('category_budget_warning_80'));
    });

    it('should not fire alerts when no budget is set', async () => {
      mockBudgetQueries.getMonthlyBudget = async () => null;
      mockBudgetQueries.getCategoryBudgets = async () => [];

      let alertCalled = false;
      mockNotificationService.sendBudgetAlert = async () => {
        alertCalled = true;
        return null;
      };

      await budgetService.checkBudgetAlerts(userId, 5000, categoryId);
      assert.strictEqual(alertCalled, false);
    });

    it('should not fire 80% alert if already sent', async () => {
      const monthlyBudget = {
        id: 'b1', user_id: userId, budget_type: 'monthly',
        amount: 100000, alert_80_sent: true, alert_100_sent: false
      };

      mockBudgetQueries.getMonthlyBudget = async () => monthlyBudget;
      mockBudgetQueries.getMonthlySpending = async () => 85000;
      mockBudgetQueries.getCategoryBudgets = async () => [];

      let alertType = null;
      mockNotificationService.sendBudgetAlert = async (uid, info) => {
        alertType = info.type;
        return null;
      };

      await budgetService.checkBudgetAlerts(userId, 5000, categoryId);
      // 80% alert should NOT be sent since already sent, but no 100% either (below 100%)
      assert.strictEqual(alertType, null);
    });
  });
});
