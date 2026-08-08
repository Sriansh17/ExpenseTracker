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

app.get('/', (_req, res) => res.json({ code: 'OK', message: 'Expense Tracker API' }));

app.use(errorHandler);

if (require.main === module) {
  const { env } = require('./src/config/env');
  app.listen(env.port, () => console.log(`Expense Tracker API listening on ${env.port}`));
}

module.exports = app;
