const assert = require('node:assert');
const { describe, it, beforeEach } = require('node:test');

// Mock categoryQueries
const mockQueries = {
  findAllForUser: null,
  findById: null,
  findByNameForUser: null,
  create: null,
  update: null,
  deleteById: null,
  reassignExpensesToOther: null,
  findOtherDefault: null
};

// Intercept require for categoryQueries
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.includes('categoryQueries')) {
    return 'mocked-categoryQueries';
  }
  if (request.includes('appError')) {
    return originalResolveFilename.call(this, request, parent, ...rest);
  }
  return originalResolveFilename.call(this, request, parent, ...rest);
};

// Register the mock
require.cache['mocked-categoryQueries'] = {
  id: 'mocked-categoryQueries',
  filename: 'mocked-categoryQueries',
  loaded: true,
  exports: mockQueries
};

const categoryService = require('../src/services/categoryService');
const AppError = require('../src/utils/appError');

describe('CategoryService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    // Reset mocks
    Object.keys(mockQueries).forEach(key => { mockQueries[key] = null; });
  });

  describe('list', () => {
    it('should return categories from queries (defaults first, then custom)', async () => {
      const expected = [
        { id: '1', user_id: null, name: 'Food', type: 'default' },
        { id: '2', user_id: null, name: 'Other', type: 'default' },
        { id: '3', user_id: userId, name: 'Coffee', type: 'custom' }
      ];
      mockQueries.findAllForUser = async (uid) => {
        assert.strictEqual(uid, userId);
        return expected;
      };

      const result = await categoryService.list(userId);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('create', () => {
    it('should create a category when name is unique', async () => {
      const newCategory = { id: '10', user_id: userId, name: 'Coffee', icon: null, type: 'custom' };
      mockQueries.findByNameForUser = async () => null;
      mockQueries.create = async (data) => {
        assert.strictEqual(data.userId, userId);
        assert.strictEqual(data.name, 'Coffee');
        assert.strictEqual(data.type, 'custom');
        return newCategory;
      };

      const result = await categoryService.create(userId, { name: 'Coffee' });
      assert.deepStrictEqual(result, newCategory);
    });

    it('should reject duplicate name (case-insensitive)', async () => {
      mockQueries.findByNameForUser = async () => ({ id: '1', name: 'Food', type: 'default' });

      await assert.rejects(
        () => categoryService.create(userId, { name: 'food' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'VALIDATION_ERROR');
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('should reject empty name', async () => {
      await assert.rejects(
        () => categoryService.create(userId, { name: '   ' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });

    it('should reject name exceeding 50 characters', async () => {
      await assert.rejects(
        () => categoryService.create(userId, { name: 'A'.repeat(51) }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });
  });

  describe('update', () => {
    it('should update a custom category', async () => {
      const existing = { id: '10', user_id: userId, name: 'Coffee', type: 'custom' };
      const updated = { ...existing, name: 'Espresso' };
      mockQueries.findById = async () => existing;
      mockQueries.findByNameForUser = async () => null;
      mockQueries.update = async () => updated;

      const result = await categoryService.update(userId, '10', { name: 'Espresso' });
      assert.deepStrictEqual(result, updated);
    });

    it('should reject updating a default category', async () => {
      mockQueries.findById = async () => ({ id: '1', user_id: null, name: 'Food', type: 'default' });

      await assert.rejects(
        () => categoryService.update(userId, '1', { name: 'NewFood' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'FORBIDDEN');
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it('should reject updating a category belonging to another user', async () => {
      mockQueries.findById = async () => ({ id: '10', user_id: 'other-user-id', name: 'Coffee', type: 'custom' });

      await assert.rejects(
        () => categoryService.update(userId, '10', { name: 'NewName' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'FORBIDDEN');
          return true;
        }
      );
    });

    it('should reject duplicate name on update', async () => {
      const existing = { id: '10', user_id: userId, name: 'Coffee', type: 'custom' };
      mockQueries.findById = async () => existing;
      mockQueries.findByNameForUser = async () => ({ id: '99', name: 'Food', type: 'default' });

      await assert.rejects(
        () => categoryService.update(userId, '10', { name: 'Food' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'VALIDATION_ERROR');
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('should allow updating to same name (same category id)', async () => {
      const existing = { id: '10', user_id: userId, name: 'Coffee', type: 'custom' };
      mockQueries.findById = async () => existing;
      mockQueries.findByNameForUser = async () => ({ id: '10', name: 'Coffee', type: 'custom' });
      mockQueries.update = async () => existing;

      const result = await categoryService.update(userId, '10', { name: 'Coffee' });
      assert.deepStrictEqual(result, existing);
    });

    it('should return NOT_FOUND for non-existent category', async () => {
      mockQueries.findById = async () => null;

      await assert.rejects(
        () => categoryService.update(userId, 'non-existent', { name: 'Test' }),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'NOT_FOUND');
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });
  });

  describe('delete', () => {
    it('should delete a custom category and reassign expenses to Other', async () => {
      const existing = { id: '10', user_id: userId, name: 'Coffee', type: 'custom' };
      const otherCat = { id: '99', user_id: null, name: 'Other', type: 'default' };
      mockQueries.findById = async () => existing;
      mockQueries.findOtherDefault = async () => otherCat;
      mockQueries.reassignExpensesToOther = async (uid, fromId, toId) => {
        assert.strictEqual(uid, userId);
        assert.strictEqual(fromId, '10');
        assert.strictEqual(toId, '99');
        return 3;
      };
      mockQueries.deleteById = async (id) => {
        assert.strictEqual(id, '10');
        return true;
      };

      const result = await categoryService.delete(userId, '10');
      assert.deepStrictEqual(result, { id: '10' });
    });

    it('should reject deleting a default category', async () => {
      mockQueries.findById = async () => ({ id: '1', user_id: null, name: 'Food', type: 'default' });

      await assert.rejects(
        () => categoryService.delete(userId, '1'),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'FORBIDDEN');
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it('should reject deleting a category belonging to another user', async () => {
      mockQueries.findById = async () => ({ id: '10', user_id: 'other-user-id', name: 'Xyz', type: 'custom' });

      await assert.rejects(
        () => categoryService.delete(userId, '10'),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'FORBIDDEN');
          return true;
        }
      );
    });

    it('should return NOT_FOUND for non-existent category', async () => {
      mockQueries.findById = async () => null;

      await assert.rejects(
        () => categoryService.delete(userId, 'non-existent'),
        (err) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });
});
