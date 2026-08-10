# SpendSense Backend

REST API for the SpendSense expense tracker. Express + PostgreSQL.

## Self-Host (Docker)

```bash
git clone https://github.com/Sriansh17/ExpenseTracker.git
cd ExpenseTracker
docker compose up
```

That's it. Server runs on port 3000, PostgreSQL auto-configured.

## Self-Host (Manual)

1. Install Node.js 20+ and PostgreSQL
2. Create a database
3. Set environment variables:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/your_db
JWT_SECRET=any-random-string-minimum-32-characters
PORT=3000
```

4. Run:
```bash
npm install
node app.js
```

Migrations run automatically on first start.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ char secret for signing tokens |
| `PORT` | No | Default: 3000 |
| `CORS_ORIGIN` | No | Default: * (allow all) |
| `GCS_BUCKET` | No | Google Cloud Storage bucket (not needed for self-host) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (for Google Sign-In) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Email/password login |
| POST | /api/auth/google | Google Sign-In |
| GET | /api/expenses | List expenses (paginated, filterable by month) |
| POST | /api/expenses | Create expense |
| PATCH | /api/expenses/:id | Update expense |
| DELETE | /api/expenses/:id | Delete expense |
| GET | /api/dashboard/overview | Monthly summary + category breakdown |
| GET | /api/dashboard/charts | Daily spending time series |
| GET | /api/categories | List categories |
| GET | /api/merchants/lookup | Merchant → category lookup |
| GET | /api/budget | Get budget limit |
| PUT | /api/budget | Set budget limit |

## Tech Stack

- Node.js 20, Express 5
- PostgreSQL (raw queries via `pg`, no ORM)
- JWT authentication
- Joi validation
- Docker + Docker Compose
