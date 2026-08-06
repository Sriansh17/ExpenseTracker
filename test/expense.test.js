const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost/expense_tracker_test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.GCS_BUCKET = 'expense-tracker-test';

const expenseSchemas = require('../src/validation/expenseSchemas');
const categorySchemas = require('../src/validation/categorySchemas');

test('expense creation rejects missing required fields and future dates', () => {
  assert.notEqual(expenseSchemas.create.validate({}).error, undefined);
  assert.notEqual(expenseSchemas.create.validate({ amount: 10, categoryId: '550e8400-e29b-41d4-a716-446655440000', date: '2999-01-01' }).error, undefined);
  assert.equal(expenseSchemas.create.validate({ amount: 10, categoryId: '550e8400-e29b-41d4-a716-446655440000', date: '2020-01-01' }).error, undefined);
});

test('expense list applies default and maximum page sizes', () => {
  const result = expenseSchemas.list.validate({});
  assert.equal(result.error, undefined);
  assert.equal(result.value.page, 1);
  assert.equal(result.value.pageSize, 20);
  assert.notEqual(expenseSchemas.list.validate({ pageSize: 101 }).error, undefined);
});

test('category update requires at least one field', () => {
  assert.notEqual(categorySchemas.update.validate({}).error, undefined);
  assert.equal(categorySchemas.update.validate({ name: 'Travel' }).error, undefined);
});
