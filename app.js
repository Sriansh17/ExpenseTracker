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
const dashboardRoutes = require('./src/routes/dashboard');
const incomeRoutes = require('./src/routes/incomes');
const budgetRoutes = require('./src/routes/budgets');
const recurringRoutes = require('./src/routes/recurring');
const notificationRoutes = require('./src/routes/notifications');
const reportRoutes = require('./src/routes/reports');
const settingsRoutes = require('./src/routes/settings');
const healthRoutes = require('./src/routes/health');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(requestLogger);
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (_req, res) => res.json({ code: 'OK', message: 'Expense Tracker API' }));

app.use(errorHandler);

if (require.main === module) {
  const { env } = require('./src/config/env');
  app.listen(env.port, () => console.log(`Expense Tracker API listening on ${env.port}`));
}

module.exports = app;
