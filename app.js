const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { requestId } = require('./src/middlewares/requestId');
const { requestLogger } = require('./src/middlewares/requestLogger');
const { rateLimiter } = require('./src/middlewares/rateLimiter');
const { errorHandler } = require('./src/middlewares/errorHandler');
const authRoutes = require('./src/routes/auth');
const categoryRoutes = require('./src/routes/categories');
const expenseRoutes = require('./src/routes/expenses');
const incomeRoutes = require('./src/routes/incomes');
const dashboardRoutes = require('./src/routes/dashboard');
const merchantRoutes = require('./src/routes/merchants');
const budgetRoutes = require('./src/routes/budget');
const healthRoutes = require('./src/routes/health');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (_req, res) => res.json({ code: 'OK', message: 'Scout API' }));

// Version check endpoint for in-app updates
app.get('/api/version', (_req, res) => res.json({
  code: 'OK',
  latest: '1.0.0',
  url: 'https://github.com/Sriansh17/ExpenseTrackerApp/releases/latest/download/scout.apk',
  notes: 'First release'
}));

app.use(errorHandler);

if (require.main === module) {
  const { env } = require('./src/config/env');
  const db = require('./src/config/db');
  const fs = require('fs');
  const path = require('path');

  // Auto-run migrations on startup (idempotent)
  async function runMigrations() {
    try {
      const migDir = path.join(__dirname, 'migrations');
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        if (file === 'all_migrations.sql') continue;
        const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
        await db.query(sql).catch(() => {}); // ignore "already exists" errors
      }
      // Add merchant column if missing
      await db.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS merchant VARCHAR(200)').catch(() => {});
      console.log('Migrations complete');
    } catch (e) {
      console.error('Migration error (non-fatal):', e.message);
    }
  }

  runMigrations().then(() => {
    app.listen(env.port, () => console.log(`Expense Tracker API listening on ${env.port}`));
  });
}

module.exports = app;
