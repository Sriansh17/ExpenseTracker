# Implementation Plan: Expense Tracker

## Overview

A full-stack personal expense tracking application with Node.js/Express backend, PostgreSQL database, and GCP Cloud Run deployment. Implementation follows clean layered architecture: routes → controllers → services → queries, with Joi validation middleware and JWT-based authentication.

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - [x] 1.1 Initialize project structure and entry point
    - Create `src/` directory structure: routes/, controllers/, services/, queries/, validation/, middlewares/, config/, constants/, utils/, jobs/
    - Create `app.js` entry point with Express 5.1.0 setup, JSON body parsing (10MB limit), helmet, CORS, request ID middleware, request logger, and global error handler
    - Create `package.json` with dependencies: express, pg, joi, bcrypt, jsonwebtoken, uuid, helmet, cors, multer, @google-cloud/storage, pdfkit, csv-stringify, node-cron, google-auth-library, winston
    - _Requirements: 28.1, 29.1, 29.5, 30.1_

  - [x] 1.2 Create shared configuration modules
    - Create `src/config/db.js` — PostgreSQL connection pool (max 20 connections per instance, 5s queue timeout)
    - Create `src/config/logger.js` — Winston structured JSON logger with correlation ID, timestamp, level, endpoint
    - Create `src/config/gcs.js` — Google Cloud Storage client initialization
    - Create `src/config/env.js` — Environment variable loading with validation (JWT_SECRET, DB_URL, GCS_BUCKET, etc.)
    - _Requirements: 30.3, 30.4, 32.4_

  - [x] 1.3 Create shared utilities and constants
    - Create `src/utils/appError.js` — AppError class with code, message, statusCode
    - Create `src/utils/hasher.js` — bcrypt hash/compare with cost factor 10
    - Create `src/utils/paginationBuilder.js` — Builds pagination metadata (totalCount, currentPage, pageSize, totalPages)
    - Create `src/utils/dateHelpers.js` — Date validation, current month range, date arithmetic
    - Create `src/constants/errorCodes.js` — All error code constants
    - Create `src/constants/currencies.js` — Supported ISO 4217 currency list (30+ currencies)
    - Create `src/constants/defaultCategories.js` — Default category names and icons
    - _Requirements: 24.1, 29.3_

  - [x] 1.4 Create middleware stack
    - Create `src/middlewares/authenticate.js` — JWT verification middleware, attaches userId to req
    - Create `src/middlewares/validateRequest.js` — Joi schema validation with ReqType (BODY, PARAMS, QUERY)
    - Create `src/middlewares/rateLimiter.js` — 100/min authenticated, 30/min unauthenticated per IP
    - Create `src/middlewares/errorHandler.js` — Global error handler mapping AppError/Joi errors to response format
    - Create `src/middlewares/requestId.js` — UUID correlation ID per request
    - Create `src/middlewares/requestLogger.js` — Structured request logging
    - Create `src/constants/reqTypes.js` — ReqType enum (BODY, PARAMS, QUERY)
    - _Requirements: 29.3, 29.4, 29.6, 29.7, 32.4_

  - [ ]* 1.5 Write unit tests for shared utilities
    - Test AppError construction and properties
    - Test paginationBuilder with various totalCount/pageSize combinations
    - Test dateHelpers for month ranges, date validation, ISO 8601 parsing
    - Test hasher hash/compare round-trip
    - _Requirements: 11.3, 29.2_

- [x] 2. Database migrations
  - [x] 2.1 Create database migration files
    - Create `migrations/001_users.sql` — users table with UUID PK, email unique index (case-insensitive), password_hash, google_sub, display_name, avatar_url, currency, theme, email_notifications, deletion_scheduled_at
    - Create `migrations/002_categories.sql` — categories table with user_id FK (NULL for defaults), name, icon, type; seed 8 default categories
    - Create `migrations/003_expenses.sql` — expenses table with amount CHECK, expense_date, notes, receipt_url, deleted_at; expense_tags junction table; GIN trigram index on notes
    - Create `migrations/004_incomes.sql` — incomes table with amount CHECK, source, income_date, notes, deleted_at; income_tags junction table
    - Create `migrations/005_budgets.sql` — budgets table with budget_type, amount, month/year, alert flags; unique indexes for monthly and category budgets
    - Create `migrations/006_recurring_transactions.sql` — recurring_transactions table with frequency CHECK, status CHECK, next_occurrence
    - Create `migrations/007_notifications.sql` — notifications table with type, title, body JSONB metadata, is_read flag
    - Create `migrations/008_refresh_tokens.sql` — refresh_tokens table with token_hash, expires_at, is_invalidated
    - Create `migrations/009_login_attempts.sql` — login_attempts table with email, attempt_count, locked_until
    - _Requirements: 1.1, 2.4, 5.1, 8.1, 12.1, 17.1, 19.1, 22.4, 4.2_

- [ ] 3. Authentication module
  - [x] 3.1 Implement auth queries and validation schemas
    - Create `src/queries/userQueries.js` — findByEmail, findByGoogleSub, create, updatePassword, scheduleDelete, cancelDelete
    - Create `src/queries/refreshTokenQueries.js` — create, findByHash, invalidate, invalidateAllForUser
    - Create `src/queries/loginAttemptQueries.js` — findByEmail, upsert, reset, incrementAttempt
    - Create `src/validation/authSchemas.js` — Joi schemas for register, login, googleAuth, refresh, changePassword (password: 8-72 chars, uppercase, lowercase, digit, special char)
    - _Requirements: 1.1, 1.3, 2.1, 3.1, 4.2_

- [x] 3.2 Implement AuthService
    - Create `src/services/authService.js` with methods: register, login, googleAuth, refreshToken, logout, changePassword, generateAccessToken, verifyAccessToken
    - Register: validate email uniqueness (case-insensitive), hash password (bcrypt cost 10), create user, issue token pair
    - Login: check email exists, verify account not locked (5 attempts / 15 min), compare password, reset attempts on success, issue token pair
    - Google OAuth: verify token via google-auth-library (10s timeout), handle new user (201) vs existing (200) vs email conflict (409)
    - Refresh: validate token hash in DB, check not expired/invalidated, rotate (invalidate old, issue new pair)
    - JWT: access token 15-min expiry with userId claim; refresh token 7-day expiry stored as hash
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 3.3 Implement auth controller and routes
    - Create `src/controllers/authController.js` — register, login, googleAuth, refresh, logout, changePassword handlers
    - Create `src/routes/auth.js` — POST /register, /login, /google, /refresh (public); POST /logout, /change-password (authenticated)
    - Wire routes in app.js under `/api/auth`
    - _Requirements: 1.1, 2.1, 3.1, 4.3, 4.6, 26.4, 26.5_

  - [ ]* 3.4 Write property test for password validation
    - **Property 1: Password Validation Correctness**
    - Generate random strings; verify validator accepts iff length 8-72 AND has uppercase, lowercase, digit, special char
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 3.5 Write property test for JWT access token claims
    - **Property 2: JWT Access Token Claims**
    - For any user object, generated JWT decodes to contain userId and expiration exactly 15 minutes from issuance
    - **Validates: Requirements 4.1**

  - [ ]* 3.6 Write property test for refresh token rotation
    - **Property 3: Refresh Token Rotation Invalidates Previous**
    - For any valid refresh token, rotation invalidates original and produces new valid pair
    - **Validates: Requirements 4.3, 4.5**

- [x] 4. Checkpoint - Ensure auth module tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Expense categories module
  - [x] 5.1 Implement category queries and validation
    - Create `src/queries/categoryQueries.js` — findAllForUser (defaults + custom), findById, create, update, delete, reassignExpensesToOther
    - Create `src/validation/categorySchemas.js` — Joi schemas for create (name: 1-50 chars, optional icon), update (name: 1-50 chars, optional icon)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.2 Implement CategoryService (within ExpenseService)
    - Implement category logic in `src/services/expenseService.js` or separate `src/services/categoryService.js`
    - List: return defaults first, then user custom categories
    - Create: case-insensitive uniqueness check against user's categories + defaults
    - Update: only custom categories, validate uniqueness
    - Delete: reassign expenses to "Other" category, then remove custom category
    - Reject delete/edit of default categories
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.3 Implement category controller and routes
    - Create `src/controllers/categoryController.js` — list, create, update, delete handlers
    - Create `src/routes/categories.js` — GET / (list), POST / (create), PATCH /:id (update), DELETE /:id (delete); all authenticated
    - Wire routes in app.js under `/api/categories`
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [ ]* 5.4 Write property test for category name uniqueness
    - **Property 8: Category Name Uniqueness (Case-Insensitive)**
    - For any user with category name N, creating category matching N case-insensitively is rejected
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 5.5 Write property test for category deletion reassignment
    - **Property 9: Category Deletion Reassigns Expenses to Other**
    - For any custom category with N expenses, deletion results in all N reassigned to "Other"
    - **Validates: Requirements 8.4**

  - [ ]* 5.6 Write property test for category list ordering
    - **Property 10: Category List Ordering Invariant**
    - For any user, category list always returns all defaults before custom categories
    - **Validates: Requirements 8.6**

- [x] 6. Expense management module
  - [x] 6.1 Implement expense queries
    - Create `src/queries/expenseQueries.js` — create, findById, list (paginated with filters), update, softDelete, attachReceipt
    - Include tag operations: insertTags, deleteTagsByExpenseId, findTagsByExpenseId
    - Filter support: category, date range, amount range, tags, search (notes ILIKE or tag name ILIKE)
    - Exclude soft-deleted records (WHERE deleted_at IS NULL)
    - _Requirements: 5.1, 6.1, 7.1, 10.1, 10.2, 10.5, 11.4_

  - [x] 6.2 Implement expense validation schemas
    - Create `src/validation/expenseSchemas.js` — Joi schemas for:
      - Create: amount (integer 1-999999999, required), categoryId (UUID, required), date (ISO 8601, not future, required), notes (max 500, optional), tags (array max 10, each max 50 chars, optional)
      - Update: at least one field required, same validations as create for provided fields
      - List/search: page (min 1), pageSize (1-100), category, startDate, endDate, minAmount, maxAmount, tags, search (1-200 chars)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 6.4, 6.5, 10.1, 10.6, 11.2, 11.5_

  - [x] 6.3 Implement ExpenseService
    - Create `src/services/expenseService.js` with methods: create, getById, list, update, delete, attachReceipt
    - Create: validate category belongs to user or is default, insert expense + tags, trigger budget check
    - List: apply filters with AND logic, paginate (default 20, max 100), sort by date DESC
    - Update: PATCH semantics — only update provided fields, verify ownership
    - Delete: soft-delete (set deleted_at), remove receipt from GCS if attached
    - Attach receipt: validate file type (JPEG/PNG/WebP), size (≤5MB), upload to GCS with user-prefixed path, reject if receipt already exists
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 6.4 Implement expense controller and routes
    - Create `src/controllers/expenseController.js` — create, getById, list, update, delete, attachReceipt handlers
    - Create `src/routes/expenses.js` — POST /, GET /, GET /:id, PATCH /:id, DELETE /:id, POST /:id/receipt; all authenticated
    - Use multer middleware for receipt upload (5MB limit, JPEG/PNG/WebP mimetype filter)
    - Wire routes in app.js under `/api/expenses`
    - _Requirements: 5.1, 6.1, 7.1, 9.1, 10.1, 11.1_

  - [ ]* 6.5 Write property test for transaction creation
    - **Property 4: Transaction Creation with Valid Data**
    - For any valid expense (amount 1-999999999, existing category, date not future), creation succeeds and returns retrievable ID
    - **Validates: Requirements 5.1, 12.1**

  - [ ]* 6.6 Write property test for missing required fields
    - **Property 5: Missing Required Fields Rejection**
    - For any expense creation missing amount, category, or date, system rejects with VALIDATION_ERROR naming missing fields
    - **Validates: Requirements 5.3, 12.3**

  - [ ]* 6.7 Write property test for PATCH preserving unspecified fields
    - **Property 6: PATCH Update Preserves Unspecified Fields**
    - For any existing expense and any non-empty subset of updatable fields, PATCH modifies only those fields
    - **Validates: Requirements 6.1, 13.1**

  - [ ]* 6.8 Write property test for soft-delete exclusion
    - **Property 7: Soft-Deleted Records Excluded from All Queries**
    - For any soft-deleted expense, it does not appear in list, search, balance, or dashboard queries
    - **Validates: Requirements 7.1, 14.1**

  - [ ]* 6.9 Write property test for search partial match
    - **Property 11: Search Returns Matching Records**
    - For any expense with notes/tags containing substring S, searching for S includes that expense
    - **Validates: Requirements 10.1**

  - [ ]* 6.10 Write property test for filter AND logic
    - **Property 12: Filter AND Logic**
    - For any combination of filters, every result satisfies ALL provided filter conditions simultaneously
    - **Validates: Requirements 10.2**

  - [ ]* 6.11 Write property test for pagination consistency
    - **Property 13: Pagination Metadata Consistency**
    - For total count N and page size P, totalPages = ceil(N/P); iterating all pages yields exactly N distinct records
    - **Validates: Requirements 10.4, 11.1, 11.2, 11.3, 11.6**

  - [ ]* 6.12 Write property test for user data isolation
    - **Property 14: User Data Isolation**
    - For any query by user A, results never contain expenses belonging to user B
    - **Validates: Requirements 10.5**

- [x] 7. Checkpoint - Ensure expense module tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Income management module
  - [x] 8.1 Implement income queries and validation
    - Create `src/queries/incomeQueries.js` — create, findById, list (paginated), update, softDelete
    - Include tag operations: insertTags, deleteTagsByIncomeId, findTagsByIncomeId
    - Exclude soft-deleted records (WHERE deleted_at IS NULL)
    - Create `src/validation/incomeSchemas.js` — Joi schemas for create (amount: integer 1-99999999999, source: 1-200 chars, date: YYYY-MM-DD not future, notes: max 500, tags: max 10 items each max 30 chars), update (at least one field required), list (page, pageSize)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.2, 13.3, 13.4_

  - [x] 8.2 Implement IncomeService
    - Create `src/services/incomeService.js` with methods: create, getById, list, update, delete
    - Create: validate required fields, insert income + tags, return income object
    - List: paginate (default 20, max 100), sort by date DESC
    - Update: PATCH semantics, verify ownership, validate provided fields
    - Delete: soft-delete (set deleted_at), verify ownership, reject if already deleted
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 8.3 Implement income controller and routes
    - Create `src/controllers/incomeController.js` — create, getById, list, update, delete handlers
    - Create `src/routes/incomes.js` — POST /, GET /, GET /:id, PATCH /:id, DELETE /:id; all authenticated
    - Wire routes in app.js under `/api/incomes`
    - _Requirements: 12.1, 13.1, 14.1_

  - [ ]* 8.4 Write unit tests for income service
    - Test create with valid/invalid data
    - Test PATCH semantics (only specified fields updated)
    - Test soft-delete and re-delete rejection
    - Test ownership verification (FORBIDDEN for wrong user)
    - _Requirements: 12.1, 13.1, 14.1, 14.2, 14.3_

- [ ] 9. Dashboard module
  - [x] 9.1 Implement dashboard queries
    - Create `src/queries/dashboardQueries.js` — getTotalBalance (SUM incomes - SUM expenses), getMonthlySpend, getCategoryBreakdown, getRecentTransactions (UNION expenses + incomes, LIMIT 10, ORDER BY date DESC, created_at DESC)
    - All queries filter by user_id and exclude soft-deleted records
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 16.1, 16.2_

  - [x] 9.2 Implement DashboardService
    - Create `src/services/dashboardService.js` with methods: getOverview, getChartData
    - Overview: balance (incomes - expenses, default 0), monthly spend (current month), category breakdown (percentage rounded to 2 decimals), recent 10 transactions
    - Charts: time-series daily aggregation (default last 30 days, max 365), category distribution percentages summing to 100%, fill zero for days with no transactions
    - Validate date range (start ≤ end, max 365 days)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 9.3 Implement dashboard controller and routes
    - Create `src/controllers/dashboardController.js` — overview, charts handlers
    - Create `src/routes/dashboard.js` — GET /overview, GET /charts; both authenticated
    - Create `src/validation/dashboardSchemas.js` — Joi schema for charts query params (startDate, endDate, max 365 day range)
    - Wire routes in app.js under `/api/dashboard`
    - _Requirements: 15.1, 16.1, 16.3, 16.4_

  - [ ]* 9.4 Write property test for dashboard balance invariant
    - **Property 15: Dashboard Balance Invariant**
    - For any user with incomes totaling I and non-deleted expenses totaling E, balance equals I − E
    - **Validates: Requirements 15.1**

  - [ ]* 9.5 Write property test for category percentage sum
    - **Property 16: Category Percentage Sum**
    - For any non-empty expense set, category breakdown percentages sum to 100% (±0.01% tolerance)
    - **Validates: Requirements 15.3, 16.2**

  - [ ]* 9.6 Write property test for recent transactions sorting
    - **Property 17: Recent Transactions Sorted Descending**
    - Dashboard recent list has at most 10 items sorted by date descending, containing only the 10 most recent
    - **Validates: Requirements 15.4**

  - [ ]* 9.7 Write property test for time-series daily completeness
    - **Property 18: Time-Series Daily Completeness**
    - For date range of D days, time-series has exactly D entries; each entry's amount equals sum of expenses that day (or zero)
    - **Validates: Requirements 16.1**

- [x] 10. Checkpoint - Ensure dashboard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Budget module
  - [x] 11.1 Implement budget queries and validation
    - Create `src/queries/budgetQueries.js` — upsertMonthlyBudget, upsertCategoryBudget, getMonthlyBudget, getCategoryBudgets, getStatus, updateAlertFlag, getMonthlySpending, getCategorySpending
    - Create `src/validation/budgetSchemas.js` — Joi schemas for setMonthly (amount: integer 1-999999999), setCategory (categoryId: UUID, amount: integer 1-999999999)
    - _Requirements: 17.1, 17.5, 18.1, 18.6_

  - [x] 11.2 Implement BudgetService
    - Create `src/services/budgetService.js` with methods: setMonthlyBudget, setCategoryBudget, getStatus, checkBudgetAlerts
    - SetMonthly: upsert budget for current month/year, recalculate spending percentage
    - SetCategory: upsert category budget for current month, validate category exists
    - GetStatus: return monthly + all category budgets with current spending, limit, percentage (2 decimals)
    - CheckAlerts: called after expense creation — compare spending vs 80% and 100% thresholds, fire notification exactly once per threshold per month (check alert_80_sent/alert_100_sent flags)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 11.3 Implement budget controller and routes
    - Create `src/controllers/budgetController.js` — list, setMonthly, setCategory, getStatus handlers
    - Create `src/routes/budgets.js` — GET /, POST /monthly, POST /category, GET /status; all authenticated
    - Wire routes in app.js under `/api/budgets`
    - _Requirements: 17.1, 18.1, 18.5_

  - [ ]* 11.4 Write property test for budget threshold alerts
    - **Property 19: Budget Threshold Alerts Fire Exactly Once**
    - For any budget in a month, crossing 80% generates exactly one warning; crossing 100% generates exactly one exceeded notification
    - **Validates: Requirements 17.2, 17.3, 18.3, 18.4**

  - [ ]* 11.5 Write property test for category budget upsert idempotence
    - **Property 20: Category Budget Upsert Idempotence**
    - For any category and month, setting budget multiple times results in exactly one record with the most recent amount
    - **Validates: Requirements 18.2**

- [x] 12. Recurring transactions module
  - [x] 12.1 Implement recurring transaction queries and validation
    - Create `src/queries/recurringQueries.js` — create, findById, list, update, updateStatus, updateNextOccurrence, findDueTransactions, findMissedTransactions
    - Create `src/validation/recurringSchemas.js` — Joi schemas for create (type: expense|income, amount: 1-999999999, categoryId/source, startDate: today or future, endDate: optional ≥ startDate, frequency: daily|weekly|monthly|yearly), update, pause, resume
    - _Requirements: 19.1, 19.7, 19.8_

  - [x] 12.2 Implement RecurrenceService
    - Create `src/services/recurrenceService.js` with methods: create, list, update, pause, resume, delete, processScheduledTransactions, processMissedOccurrences
    - Create: validate dates (start not past, end ≥ start), set next_occurrence = start_date, status = active
    - Pause: set status to "paused", skip occurrences during paused period
    - Resume: set status to "active", recalculate next_occurrence (skip past dates)
    - Delete: stop future generation, retain previously generated records
    - ProcessScheduled: find active records where next_occurrence ≤ today, create expense/income, advance next_occurrence by frequency interval
    - ProcessMissed: on cron run, generate records for all missed dates since last successful run
    - Handle end_date: mark completed when next_occurrence > end_date
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [x] 12.3 Implement recurring transaction controller, routes, and cron job
    - Create `src/controllers/recurringController.js` — create, list, update, pause, resume, delete, processCron handlers
    - Create `src/routes/recurring.js` — POST /, GET /, PATCH /:id, PATCH /:id/pause, PATCH /:id/resume, DELETE /:id; all authenticated
    - Create `src/jobs/recurrenceJob.js` — Cron handler that calls processScheduledTransactions and processMissedOccurrences
    - Add POST /api/recurring/process endpoint (for Cloud Scheduler trigger, secured with auth header)
    - Wire routes in app.js under `/api/recurring`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 12.4 Write property test for recurring next occurrence calculation
    - **Property 21: Recurring Transaction Next Occurrence Calculation**
    - For any recurring transaction with start date and frequency, next_occurrence after processing is exactly one frequency interval later
    - **Validates: Requirements 19.2**

- [x] 13. Notifications module
  - [x] 13.1 Implement notification queries and service
    - Create `src/queries/notificationQueries.js` — create, findByUser (paginated), markRead, markAllRead, findByTypeAndMonth (for deduplication)
    - Create `src/services/notificationService.js` with methods: create, list, markRead, markAllRead, sendBudgetAlert, sendRecurringReminder, processReminderJob
    - Budget alerts: create in-app notification with budget metadata, optional email if user enabled email_notifications
    - Reminders: daily cron creates reminder for recurring transactions due within 24 hours (if reminders_enabled and no existing reminder for that occurrence)
    - Dedup: check alert_80_sent/alert_100_sent flags before creating budget notifications
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 13.2 Implement notification controller and routes
    - Create `src/controllers/notificationController.js` — list, markRead, markAllRead handlers
    - Create `src/routes/notifications.js` — GET / (paginated), PATCH /:id/read, PATCH /read-all; all authenticated
    - Create `src/validation/notificationSchemas.js` — Joi schemas for list query params (page, pageSize)
    - Create `src/jobs/reminderJob.js` — Daily cron handler for recurring transaction reminders
    - Wire routes in app.js under `/api/notifications`
    - _Requirements: 22.1, 22.3, 23.1, 23.2_

- [x] 14. Reports module (CSV and PDF export)
  - [x] 14.1 Implement report queries and service
    - Create `src/queries/reportQueries.js` — getTransactionsInRange (UNION expenses + incomes with category/source, notes, tags joined by semicolons)
    - Create `src/services/reportService.js` with methods: generateCsv, generatePdf
    - CSV: columns in order (date, type, amount formatted to 2 decimals, category/source, notes, tags semicolon-joined), UTF-8 encoding, headers-only if no data
    - PDF: user name, date range, timestamp, summary (total income, total expenses, net balance, category breakdown), detailed transaction list; generate within 10s for ≤1000 transactions
    - Validate date range: start ≤ end, max 365 days
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 14.2 Implement report controller and routes
    - Create `src/controllers/reportController.js` — exportCsv, exportPdf handlers
    - Create `src/routes/reports.js` — GET /csv, GET /pdf; both authenticated
    - Create `src/validation/reportSchemas.js` — Joi schema for query params (startDate, endDate required, max 365 days)
    - Set Content-Type (text/csv or application/pdf) and Content-Disposition headers
    - Wire routes in app.js under `/api/reports`
    - _Requirements: 20.1, 20.4, 21.1_

  - [ ]* 14.3 Write property test for CSV export round-trip
    - **Property 22: CSV Export Round-Trip**
    - For any set of transactions, exporting to CSV and parsing back yields same transactions with amounts to 2 decimals and dates as YYYY-MM-DD
    - **Validates: Requirements 20.1, 20.2**

- [x] 15. Checkpoint - Ensure recurring, notifications, and reports tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Settings module
  - [x] 16.1 Implement settings queries and validation
    - Create `src/queries/settingsQueries.js` — getSettings, updateCurrency, updateTheme, updateProfile, updateAvatarUrl, scheduleAccountDeletion, cancelAccountDeletion
    - Create `src/validation/settingsSchemas.js` — Joi schemas for currency (ISO 4217 from supported list), theme (light|dark|system), profile (displayName: 1-100 chars), avatar upload (JPEG/PNG, ≤2MB)
    - _Requirements: 24.1, 24.4, 25.1, 26.1, 26.2, 26.3_

  - [x] 16.2 Implement SettingsService
    - Create `src/services/settingsService.js` with methods: get, updateCurrency, updateTheme, updateProfile, uploadAvatar, requestDeletion, cancelDeletion
    - Currency: validate against supported list, reject unknown codes without modifying preference
    - Theme: accept light/dark/system, persist to DB
    - Profile: validate display name 1-100 chars
    - Avatar: validate JPEG/PNG ≤2MB, upload to GCS, store URL
    - Account deletion: verify password, set deletion_scheduled_at (30 days from now); cancel removes timestamp
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 25.1, 25.4, 26.1, 26.2, 26.3, 26.4, 26.5, 27.1, 27.2, 27.3, 27.5_

  - [x] 16.3 Implement settings controller and routes
    - Create `src/controllers/settingsController.js` — get, updateCurrency, updateTheme, updateProfile, uploadAvatar, requestDeletion, cancelDeletion handlers
    - Create `src/routes/settings.js` — GET /, PATCH /currency, PATCH /theme, PATCH /profile, POST /avatar, POST /delete-account, POST /cancel-deletion; all authenticated
    - Use multer for avatar upload (2MB limit, JPEG/PNG filter)
    - Wire routes in app.js under `/api/settings`
    - _Requirements: 24.1, 25.1, 26.1, 27.1, 27.3_

  - [ ]* 16.4 Write property test for currency validation
    - **Property 23: Currency Setting Acceptance and Persistence**
    - For any ISO 4217 code in supported list, setting succeeds and retrieval returns that code; for invalid codes, rejection without modification
    - **Validates: Requirements 24.1, 24.2, 24.4**

  - [ ]* 16.5 Write property test for display name validation
    - **Property 24: Display Name Length Validation**
    - For any string 1-100 chars, update succeeds; for empty or >100 chars, update is rejected
    - **Validates: Requirements 26.1**

- [x] 17. Account deletion cleanup job
  - [x] 17.1 Implement account deletion cron job
    - Create `src/jobs/accountDeletionJob.js` — Find users where deletion_scheduled_at ≤ NOW(), permanently delete all user data (expenses, incomes, receipts from GCS, avatars from GCS, budgets, notifications, refresh tokens, categories, the user record)
    - Add POST /api/jobs/cleanup-accounts endpoint (secured, for Cloud Scheduler)
    - _Requirements: 27.4_

- [x] 18. Health check endpoint
  - [x] 18.1 Implement health check route
    - Create `src/routes/health.js` — GET /api/health (no auth)
    - Check database connectivity (pool.query SELECT 1) and GCS bucket accessibility
    - Return { code: 'HEALTHY', message: 'OK', dependencies: { database: 'up'|'down', storage: 'up'|'down' } }
    - Respond within 2 seconds
    - _Requirements: 32.5_

- [x] 19. Integration wiring and final route registration
  - [x] 19.1 Wire all routes and finalize app.js
    - Register all route modules in app.js in order: /api/health, /api/auth, /api/expenses, /api/incomes, /api/categories, /api/dashboard, /api/budgets, /api/recurring, /api/reports, /api/notifications, /api/settings
    - Register global error handler as last middleware
    - Ensure budget alert check is triggered after expense creation (wire ExpenseService → BudgetService.checkBudgetAlerts)
    - Ensure recurring transaction processing triggers budget alerts for generated expenses
    - _Requirements: 17.2, 17.3, 22.1, 22.2_

  - [ ]* 19.2 Write integration tests for critical flows
    - Test full auth flow: register → login → refresh → logout
    - Test expense CRUD with budget alert generation
    - Test category deletion with expense reassignment
    - Test recurring transaction cron processing
    - Test CSV/PDF export with real data
    - _Requirements: 1.1, 2.1, 5.1, 7.1, 8.4, 17.2, 19.2, 20.1, 21.1_

- [x] 20. Final checkpoint - Full test suite passes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check (100+ iterations)
- Unit tests validate specific examples and edge cases
- All code uses CommonJS (require/module.exports), Node.js 18.x, Express 5.1.0
- All amounts stored as integers in smallest currency unit (paise)
- All DB access via pg pool with parameterized queries — no ORM
- Response format: `{ code, message, ...data }` consistently
- Soft-delete pattern: set deleted_at, filter with WHERE deleted_at IS NULL
- File naming: camelCase for JS files, kebab-case for URLs
- Migrations are raw SQL in migrations/ directory numbered 001-009

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1"] },
    { "id": 2, "tasks": ["1.5", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["3.3", "5.2", "8.1"] },
    { "id": 5, "tasks": ["3.4", "3.5", "3.6", "5.3", "8.2"] },
    { "id": 6, "tasks": ["5.4", "5.5", "5.6", "6.1", "8.3"] },
    { "id": 7, "tasks": ["6.2", "6.3", "8.4"] },
    { "id": 8, "tasks": ["6.4", "9.1", "11.1"] },
    { "id": 9, "tasks": ["6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "9.2", "11.2"] },
    { "id": 10, "tasks": ["9.3", "11.3", "12.1"] },
    { "id": 11, "tasks": ["9.4", "9.5", "9.6", "9.7", "11.4", "11.5", "12.2"] },
    { "id": 12, "tasks": ["12.3", "13.1"] },
    { "id": 13, "tasks": ["12.4", "13.2", "14.1"] },
    { "id": 14, "tasks": ["14.2", "14.3", "16.1"] },
    { "id": 15, "tasks": ["16.2", "17.1", "18.1"] },
    { "id": 16, "tasks": ["16.3"] },
    { "id": 17, "tasks": ["16.4", "16.5", "19.1"] },
    { "id": 18, "tasks": ["19.2"] }
  ]
}
```
