# Requirements Document

## Introduction

A comprehensive, production-ready personal expense tracking application that empowers individuals to take control of their finances through intuitive expense/income management, intelligent budgeting, and insightful reporting. Built on a modern TypeScript frontend with a Node.js/Express/PostgreSQL backend, the system follows clean architecture and SOLID principles for maintainability and scalability.

**Problem Statement:** Individuals lack a unified, easy-to-use tool to track daily expenses, manage income sources, set budgets, and gain meaningful insights into their spending habits. Existing solutions are either too complex, lack key features like receipt attachment and recurring transaction management, or do not provide actionable alerts when budgets are exceeded.

**Target Users:**
- **Primary**: Working professionals managing personal finances
- **Secondary**: Freelancers and small business owners tracking business and personal expenses
- **Tertiary**: Students and young adults building financial habits

**User Personas:**
- **Priya** (28, Software Engineer): Tracks daily coffee, dining, and subscription expenses. Wants monthly category breakdowns and budget alerts. Uses the app on mobile and desktop.
- **Rahul** (34, Graphic Designer): Multiple income sources, irregular income patterns. Needs receipt storage for tax purposes. Exports reports monthly for accounting.
- **Ananya** (21, Engineering Student): Limited budget, needs strict spending limits. Wants simple categorization and recurring rent/subscription tracking. Prefers dark theme and quick entry.

## Glossary

- **System**: The Expense Tracker application as a whole (frontend and backend combined)
- **Auth_Service**: The authentication and authorization subsystem handling user identity
- **Expense_Service**: The subsystem responsible for creating, reading, updating, and deleting expense records
- **Income_Service**: The subsystem responsible for managing income records
- **Dashboard_Service**: The subsystem that aggregates and presents financial summaries
- **Budget_Service**: The subsystem managing budget creation, tracking, and alert generation
- **Recurrence_Engine**: The subsystem that processes and generates recurring transactions
- **Report_Service**: The subsystem that generates exportable reports in various formats
- **Notification_Service**: The subsystem responsible for delivering alerts and reminders to users
- **Settings_Service**: The subsystem managing user preferences and account configuration
- **User**: An authenticated individual using the application
- **Expense**: A financial outflow record with amount, category, date, and optional metadata
- **Income**: A financial inflow record with amount, source, date, and optional metadata
- **Category**: A classification label for grouping expenses (e.g., Food, Transport, Entertainment)
- **Tag**: A user-defined label for flexible cross-category grouping of transactions
- **Budget**: A spending limit set for a time period, either overall or per category
- **Recurring_Transaction**: An expense or income that repeats at a defined interval
- **Receipt**: A digital image attached to an expense as proof of purchase
- **JWT**: JSON Web Token used for stateless authentication
- **Pagination**: The division of query results into discrete pages for performance

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account with my email and password, so that I can securely access the application.

#### Acceptance Criteria

1. WHEN a registration request with a valid email (RFC 5322 format, maximum 254 characters, case-insensitive uniqueness check) and password is received, THE Auth_Service SHALL create a new user account, hash the password using bcrypt with cost factor 10, and return a JWT access token (15-minute expiry) and a refresh token (7-day expiry)
2. WHEN a registration request contains an email already associated with an existing account (compared case-insensitively), THE Auth_Service SHALL reject the request with an EMAIL_IN_USE error
3. THE Auth_Service SHALL enforce password requirements of minimum 8 characters, maximum 72 characters (bcrypt limit), at least one uppercase letter, one lowercase letter, one digit, and one special character from the set !@#$%^&*()_+-=[]{}|;:,.<>?
4. WHEN a registration request contains a password that does not meet the password requirements, THE Auth_Service SHALL reject the request with a VALIDATION_ERROR and specify which requirements are unmet

### Requirement 2: User Login via Email and Password

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my financial data.

#### Acceptance Criteria

1. WHEN a login request with a valid email and correct password is received, THE Auth_Service SHALL return a JWT access token with a 15-minute expiry and a refresh token with a 7-day expiry, along with the user's identifier
2. WHEN a login request contains an unregistered email, THE Auth_Service SHALL reject the request with a USER_NOT_FOUND error within the same response time range as a password mismatch rejection to prevent user enumeration
3. WHEN a login request contains an incorrect password, THE Auth_Service SHALL reject the request with a PASSWORD_MISMATCH error and increment the failed login attempt counter for that email
4. WHEN five consecutive failed login attempts occur for the same email within a 15-minute window, THE Auth_Service SHALL lock the account for 15 minutes and return a RATE_LIMIT_EXCEEDED error
5. IF a login request is received for an account that is currently locked, THEN THE Auth_Service SHALL reject the request with a RATE_LIMIT_EXCEEDED error indicating the remaining lockout duration in seconds without incrementing the failed attempt counter
6. WHEN a successful login occurs before reaching the failed attempt threshold, THE Auth_Service SHALL reset the failed login attempt counter for that email to zero

### Requirement 3: User Login via Google OAuth

**User Story:** As a user, I want to log in using my Google account, so that I can access the application without managing a separate password.

#### Acceptance Criteria

1. WHEN a valid Google OAuth token is received for a registered user, THE Auth_Service SHALL verify the token server-side (signature, expiry, and audience match), authenticate the user, and return a JWT access token with a 15-minute expiry and an HTTP 200 response
2. WHEN a valid Google OAuth token is received for an email not yet registered, THE Auth_Service SHALL create a new account storing the user's Google subject ID, email, and display name extracted from the token, link it to the Google identity, and return a JWT access token with a 15-minute expiry and an HTTP 201 response
3. IF an invalid or expired Google OAuth token is received, THEN THE Auth_Service SHALL reject the request with a TOKEN_INVALID_EXPIRED error code and an HTTP 401 response
4. IF the Google OAuth token contains an email that already exists as a non-Google (email/password) account, THEN THE Auth_Service SHALL reject the request with an EMAIL_IN_USE error code and an HTTP 409 response, without creating a duplicate account
5. IF the Google token verification service is unreachable or returns a server error, THEN THE Auth_Service SHALL reject the request with a SERVER_ERROR error code and an HTTP 502 response within 10 seconds

### Requirement 4: JWT Token Management

**User Story:** As an authenticated user, I want my session managed via tokens, so that I can maintain access without re-entering credentials.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Auth_Service SHALL issue a JWT access token containing the user's identifier and an expiration claim set to 15 minutes from the time of issue
2. WHEN a user successfully authenticates, THE Auth_Service SHALL issue a refresh token with a 7-day expiration period and store it in the database associated with the user's session
3. WHEN a valid refresh token is presented that exists in the database and has not expired or been invalidated, THE Auth_Service SHALL issue a new access token and rotate the refresh token by invalidating the previous one and issuing a new refresh token
4. WHEN an expired or invalid token is presented for any authenticated endpoint, THE System SHALL reject the request with HTTP status 401 and a TOKEN_INVALID_EXPIRED error code
5. IF an expired, invalidated, or non-existent refresh token is presented for token refresh, THEN THE Auth_Service SHALL reject the request with HTTP status 401 and a TOKEN_INVALID_EXPIRED error code
6. WHEN a user logs out, THE Auth_Service SHALL invalidate the refresh token associated with the session so that it cannot be used to obtain new access tokens

### Requirement 5: Create Expense

**User Story:** As a user, I want to add a new expense, so that I can track my spending.

#### Acceptance Criteria

1. WHEN a valid expense creation request is received with amount (integer between 1 and 999999999 paise inclusive), category, and date (ISO 8601 format, not in the future beyond the current date), THE Expense_Service SHALL create a new expense record and return the expense identifier
2. THE Expense_Service SHALL accept optional fields including notes (up to 500 characters), tags (up to 10 per expense, each tag up to 50 characters), and a receipt image attachment (maximum 5 MB)
3. IF an expense creation request is missing amount, category, or date, THEN THE Expense_Service SHALL reject the request with a VALIDATION_ERROR specifying the missing fields
4. IF an expense amount is zero or negative or exceeds 999999999, THEN THE Expense_Service SHALL reject the request with an INVALID_INPUT error indicating the amount is out of range
5. IF the specified category does not exist or does not belong to the user, THEN THE Expense_Service SHALL reject the request with a NOT_FOUND error indicating an invalid category
6. IF the date value is not in valid ISO 8601 format or is a future date, THEN THE Expense_Service SHALL reject the request with an INVALID_INPUT error indicating the date is invalid

### Requirement 6: Edit Expense

**User Story:** As a user, I want to edit an existing expense, so that I can correct mistakes or update details.

#### Acceptance Criteria

1. WHEN an expense update request containing at least one updatable field (amount, category, date, notes, tags, or receipt) is received for an expense owned by the authenticated user, THE Expense_Service SHALL update only the specified fields, leave unspecified fields unchanged, and return the full updated expense record
2. WHEN an expense update request targets an expense not owned by the authenticated user, THE Expense_Service SHALL reject the request with a FORBIDDEN error
3. WHEN an expense update request targets a non-existent expense, THE Expense_Service SHALL reject the request with a NOT_FOUND error
4. WHEN an expense update request contains field values that violate validation rules (amount is zero or negative, notes exceed 500 characters, or tags exceed 10 per expense), THE Expense_Service SHALL reject the request with a VALIDATION_ERROR specifying the invalid fields
5. WHEN an expense update request is received with an empty payload containing no updatable fields, THE Expense_Service SHALL reject the request with a VALIDATION_ERROR indicating that at least one field to update is required

### Requirement 7: Delete Expense

**User Story:** As a user, I want to delete an expense, so that I can remove incorrect or duplicate entries.

#### Acceptance Criteria

1. WHEN a delete request is received for an expense owned by the authenticated user, THE Expense_Service SHALL set the deleted_at timestamp to the current server time, exclude the record from all subsequent queries, and return an HTTP 200 success confirmation with the deleted expense identifier
2. WHEN a delete request targets an expense not owned by the authenticated user, THE Expense_Service SHALL reject the request with a FORBIDDEN error
3. WHEN a delete request targets a non-existent expense or a previously soft-deleted expense, THE Expense_Service SHALL reject the request with a NOT_FOUND error
4. IF the expense has an attached receipt image, THEN THE Expense_Service SHALL remove the receipt from cloud storage as part of the delete operation

### Requirement 8: Expense Categories

**User Story:** As a user, I want to organize my expenses into categories, so that I can understand my spending patterns.

#### Acceptance Criteria

1. THE Expense_Service SHALL provide a set of default categories including Food, Transport, Entertainment, Shopping, Bills, Health, Education, and Other, available to all users and not deletable or editable by any user
2. WHEN a user creates a custom category with a unique name (1 to 50 characters, compared case-insensitively against that user's existing category names and default category names) and an optional icon, THE Expense_Service SHALL persist the category for that user
3. IF a user attempts to create a custom category with a name that is empty, exceeds 50 characters, or duplicates an existing category name (case-insensitive) for that user, THEN THE Expense_Service SHALL reject the request with an error indicating the validation failure or conflict
4. WHEN a user deletes a custom category that has associated expenses, THE Expense_Service SHALL reassign those expenses to the "Other" category before deleting the custom category
5. IF a user attempts to delete or edit a default category, THEN THE Expense_Service SHALL reject the request with an error indicating that default categories cannot be modified
6. WHEN a user requests their category list, THE Expense_Service SHALL return all default categories followed by that user's custom categories, with each entry including the category name, type (default or custom), and icon if present

### Requirement 9: Receipt Image Attachment

**User Story:** As a user, I want to attach a photo of my receipt to an expense, so that I can keep proof of purchase.

#### Acceptance Criteria

1. WHEN a receipt image in JPEG, PNG, or WebP format under 5 MB is attached to an expense that has no existing receipt, THE Expense_Service SHALL upload the image to cloud storage with the user-specific path prefix, associate the stored URL with the expense record, and return the receipt URL in the success response
2. WHEN a receipt image exceeds 5 MB, THE Expense_Service SHALL reject the upload with an INVALID_INPUT error specifying the size limit of 5 MB
3. WHEN a receipt image is in an unsupported format, THE Expense_Service SHALL reject the upload with an INVALID_INPUT error specifying supported formats (JPEG, PNG, WebP)
4. WHEN a user deletes an expense with an attached receipt, THE Expense_Service SHALL remove the receipt image from cloud storage and then delete the expense record
5. IF the cloud storage upload fails during receipt attachment, THEN THE Expense_Service SHALL return a SERVER_ERROR response and not associate any URL with the expense record
6. IF a user attempts to attach a receipt to an expense that does not exist or that they do not own, THEN THE Expense_Service SHALL reject the request with a NOT_FOUND error
7. IF a user attempts to attach a receipt to an expense that already has an attached receipt, THEN THE Expense_Service SHALL reject the request with an INVALID_INPUT error indicating that a receipt is already attached

### Requirement 10: Search and Filter Expenses

**User Story:** As a user, I want to search and filter my expenses, so that I can quickly find specific transactions.

#### Acceptance Criteria

1. WHEN a search query is provided, THE Expense_Service SHALL return expenses where the notes or tags contain the search term using case-insensitive partial match, limited to search queries between 1 and 200 characters in length
2. WHEN one or more filter parameters are provided, THE Expense_Service SHALL support filtering by category, date range (start date and end date), minimum amount (0.01 or greater), maximum amount (up to 999,999,999.99), and tags, applying all provided filters using AND logic
3. WHEN no expenses match the search or filter criteria, THE Expense_Service SHALL return an empty result set with a total count of zero
4. THE Expense_Service SHALL return results paginated with a default page size of 20 and a maximum page size of 100, including total count, current page number, and total pages in the response
5. THE Expense_Service SHALL return only expenses belonging to the authenticated user
6. IF the provided date range is invalid (start date is after end date) or the minimum amount exceeds the maximum amount, THEN THE Expense_Service SHALL reject the request with a validation error indicating the conflicting parameters

### Requirement 11: Expense Pagination

**User Story:** As a user, I want my expense list paginated, so that the application loads quickly even with large datasets.

#### Acceptance Criteria

1. THE Expense_Service SHALL paginate expense list responses with a default page size of 20 records when no page size parameter is provided
2. THE Expense_Service SHALL accept a page number parameter (minimum 1) and a page size parameter (minimum 1, maximum 100), defaulting to page 1 and page size 20 when not provided
3. THE Expense_Service SHALL include total count, current page, page size, and total pages in paginated responses
4. THE Expense_Service SHALL sort expenses by date descending (most recent first) as the default sort order
5. IF the page number or page size parameter is non-numeric, less than 1, or page size exceeds 100, THEN THE Expense_Service SHALL return a validation error indicating the invalid parameter
6. IF the requested page number exceeds the total number of available pages, THEN THE Expense_Service SHALL return an empty results array with correct pagination metadata (total count, current page, page size, and total pages)

### Requirement 12: Create Income

**User Story:** As a user, I want to add income entries, so that I can track my total financial picture.

#### Acceptance Criteria

1. WHEN a valid income creation request is received with amount (integer between 1 and 99999999999 in smallest currency unit), source (1-200 characters), and date (YYYY-MM-DD format, not a future date), THE Income_Service SHALL create a new income record and return the income identifier
2. THE Income_Service SHALL accept optional fields including notes (up to 500 characters) and tags (up to 10 tags per income, each tag up to 30 characters)
3. IF an income creation request is missing amount, source, or date, THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR specifying the missing fields
4. IF the income amount is less than 1 or greater than 99999999999 (in smallest currency unit), THEN THE Income_Service SHALL reject the request with an INVALID_INPUT error
5. IF the source field exceeds 200 characters, THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR indicating the source length limit
6. IF the income date is not a valid calendar date in YYYY-MM-DD format or is a future date beyond the current date, THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR indicating the invalid date

### Requirement 13: Edit Income

**User Story:** As a user, I want to edit an existing income entry, so that I can correct mistakes.

#### Acceptance Criteria

1. WHEN a valid income update request is received for an income record owned by the authenticated user, THE Income_Service SHALL update only the provided fields (PATCH semantics), persist the changes, and return the full updated income record including all fields (amount, source, date, notes, tags)
2. IF the income update request contains an amount value that is not a positive integer between 1 and 99999999999 (inclusive), THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR indicating the invalid field
3. IF the income update request contains a source value that is empty or exceeds 200 characters, or a notes value that exceeds 500 characters, or a tags array that exceeds 10 items or contains any tag exceeding 30 characters, THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR indicating the invalid field
4. IF the income update request body contains no updatable fields (amount, source, date, notes, tags), THEN THE Income_Service SHALL reject the request with a VALIDATION_ERROR indicating that at least one field must be provided
5. IF the income update request targets a record not owned by the authenticated user, THEN THE Income_Service SHALL reject the request with a FORBIDDEN error and SHALL NOT modify the record
6. IF the income update request targets a non-existent record, THEN THE Income_Service SHALL reject the request with a NOT_FOUND error

### Requirement 14: Delete Income

**User Story:** As a user, I want to delete an income entry, so that I can remove incorrect or duplicate entries.

#### Acceptance Criteria

1. WHEN a delete request is received for an income record owned by the authenticated user, THE Income_Service SHALL set the deleted_at timestamp to the current server time on that income record, exclude it from all subsequent queries and balance calculations, and return an HTTP 200 response with a success confirmation including the deleted record's identifier
2. WHEN a delete request targets an income record not owned by the authenticated user, THE Income_Service SHALL reject the request with an HTTP 403 response containing the code FORBIDDEN, without modifying any record
3. WHEN a delete request targets a non-existent income record or a previously soft-deleted income record, THE Income_Service SHALL reject the request with an HTTP 404 response containing the code NOT_FOUND
4. IF the income_id path parameter is not a valid identifier format, THEN THE Income_Service SHALL reject the request with an HTTP 400 response containing the code INVALID_INPUT before attempting any database lookup
5. IF a database error occurs during the soft-delete operation, THEN THE Income_Service SHALL return an HTTP 500 response containing the code SERVER_ERROR and SHALL NOT modify the deleted_at timestamp of the targeted record

### Requirement 15: Dashboard Overview

**User Story:** As a user, I want to see a dashboard with my financial summary, so that I can quickly understand my financial status.

#### Acceptance Criteria

1. WHEN the dashboard is requested, THE Dashboard_Service SHALL return the total balance calculated as sum of all incomes minus sum of all expenses for the authenticated user, returning 0 if the user has no transactions
2. WHEN the dashboard is requested, THE Dashboard_Service SHALL return the total spending for the current calendar month (1st of current month to today inclusive), returning 0 if no expenses exist for the current month
3. WHEN the dashboard is requested, THE Dashboard_Service SHALL return a category-wise breakdown of expenses for the current calendar month, where each entry includes the category name, total amount in paise, and percentage of monthly spending rounded to two decimal places, returning an empty list if no expenses exist for the current month
4. WHEN the dashboard is requested, THE Dashboard_Service SHALL return the 10 most recent transactions (both expenses and incomes) sorted by date descending then by creation time descending, where each transaction includes id, type (income or expense), amount, category/source, description, and date, returning an empty list if no transactions exist
5. IF the dashboard request fails due to a database error, THEN THE Dashboard_Service SHALL return an error response indicating a server error without exposing internal details

### Requirement 16: Dashboard Charts

**User Story:** As a user, I want to see visual charts of my spending, so that I can identify patterns at a glance.

#### Acceptance Criteria

1. WHEN chart data is requested, THE Dashboard_Service SHALL return time-series spending data aggregated by day for the selected period (default: last 30 days), with one entry per day in the range containing the date and the total spending amount for that day (zero if no transactions exist for that day)
2. WHEN chart data is requested, THE Dashboard_Service SHALL return category distribution data as percentages rounded to 2 decimal places for the selected period, where all category percentages sum to 100%
3. WHEN chart data is requested with a custom date range not exceeding 365 days, THE Dashboard_Service SHALL aggregate data within the specified start and end dates (inclusive)
4. IF chart data is requested with an invalid date range (start date after end date, or range exceeding 365 days), THEN THE Dashboard_Service SHALL return a validation error indicating the date range constraint that was violated
5. WHEN no transactions exist for the requested period, THE Dashboard_Service SHALL return a time-series array with one entry per day (all with zero amounts) and an empty category distribution array with a zero total

### Requirement 17: Monthly Budget

**User Story:** As a user, I want to set a monthly spending budget, so that I can control my overall spending.

#### Acceptance Criteria

1. WHEN a user sets a monthly budget with an amount between 1 and 999999999 (inclusive, in smallest currency unit), THE Budget_Service SHALL persist the budget and begin tracking the sum of the user's expenses within the current calendar month against that limit
2. WHEN a new expense causes total monthly spending to meet or exceed 80% of the monthly budget and no 80% warning alert has been generated for the current calendar month, THE Budget_Service SHALL generate exactly one warning alert as an in-app notification
3. WHEN a new expense causes total monthly spending to meet or exceed 100% of the monthly budget and no budget-exceeded alert has been generated for the current calendar month, THE Budget_Service SHALL generate exactly one budget-exceeded alert as an in-app notification
4. WHEN a user updates the monthly budget amount to a new valid value, THE Budget_Service SHALL recalculate the current spending percentage against the new limit within 2 seconds and, if a threshold (80% or 100%) is now met or exceeded and the corresponding alert has not yet been generated for the current calendar month, generate the appropriate alert
5. IF a user attempts to set or update a monthly budget with an amount that is zero, negative, or greater than 999999999, THEN THE Budget_Service SHALL reject the request with an error message indicating the valid budget range

### Requirement 18: Category Budgets

**User Story:** As a user, I want to set budgets per category, so that I can control spending in specific areas.

#### Acceptance Criteria

1. WHEN a user sets a budget for a specific category with an amount between 1 and 999999999 (in smallest currency unit), THE Budget_Service SHALL persist the category budget for the current calendar month and calculate spending as the sum of all expenses in that category for the current calendar month against the budget limit
2. WHEN a user sets a budget for a category that already has an active budget for the current month, THE Budget_Service SHALL update the existing budget limit to the new amount
3. WHEN a new expense causes total spending in a category to reach or exceed 80% of the category budget and no 80% warning alert has been generated for that category in the current budget period, THE Budget_Service SHALL generate exactly one category-specific warning notification for the user
4. WHEN a new expense causes total spending in a category to reach or exceed 100% of the category budget and no exceeded alert has been generated for that category in the current budget period, THE Budget_Service SHALL generate exactly one category-specific budget-exceeded notification for the user
5. WHEN a user requests budget status, THE Budget_Service SHALL return the current spending, budget limit, and percentage consumed rounded to 2 decimal places for each category with an active budget in the current month
6. IF a user attempts to set a category budget with an amount less than 1 or greater than 999999999 or for a non-existent category, THEN THE Budget_Service SHALL reject the request with a validation error message indicating the invalid field

### Requirement 19: Recurring Transactions

**User Story:** As a user, I want to set up recurring expenses and incomes, so that I do not need to manually enter repeated transactions.

#### Acceptance Criteria

1. WHEN a user creates a recurring transaction with amount (1 to 999999999 in smallest currency unit), category/source, start date (today or future), and frequency (daily, weekly, monthly, or yearly), THE Recurrence_Engine SHALL persist the recurrence rule with status "active"
2. WHEN the scheduled date for a recurring transaction arrives, THE Recurrence_Engine SHALL automatically create the corresponding expense or income record and advance the next scheduled date according to the configured frequency
3. WHEN the Recurrence_Engine detects that one or more scheduled dates were missed due to system downtime, THE Recurrence_Engine SHALL generate records for all missed dates upon the next successful cron execution
4. WHEN a user pauses a recurring transaction, THE Recurrence_Engine SHALL stop generating new records until the user resumes the recurrence, and SHALL permanently skip any occurrences whose scheduled dates fell within the paused period
5. WHEN a user sets an end date for a recurring transaction, THE Recurrence_Engine SHALL generate a record on the end date if it falls on a scheduled occurrence, and SHALL stop generating records after the specified end date
6. WHEN a user deletes a recurring transaction, THE Recurrence_Engine SHALL stop future generation but retain previously generated records
7. IF a user attempts to create a recurring transaction with a start date in the past or an end date earlier than the start date, THEN THE Recurrence_Engine SHALL reject the request with an error message indicating the invalid date range
8. IF a user attempts to create a recurring transaction with an amount outside the range 1 to 999999999, THEN THE Recurrence_Engine SHALL reject the request with an error message indicating the invalid amount

### Requirement 20: CSV Export

**User Story:** As a user, I want to export my transactions as CSV, so that I can use the data in spreadsheets or accounting software.

#### Acceptance Criteria

1. WHEN a CSV export is requested for a date range of up to 365 days, THE Report_Service SHALL generate a CSV file containing all expenses and incomes within the specified range, with amounts formatted to exactly 2 decimal places and dates formatted as ISO 8601 (YYYY-MM-DD)
2. THE Report_Service SHALL include columns in the following order: date, type (expense/income), amount, category/source, notes, and tags — where multiple tags are joined with semicolons in a single column
3. WHEN no transactions exist for the requested date range, THE Report_Service SHALL return an empty CSV file with headers only
4. THE Report_Service SHALL encode the CSV file in UTF-8 format and set the Content-Type header to text/csv and include a Content-Disposition header indicating attachment with a filename
5. IF the requested date range exceeds 365 days, THEN THE Report_Service SHALL reject the request with an error message indicating the maximum export range is 1 year

### Requirement 21: PDF Export

**User Story:** As a user, I want to export a formatted PDF report, so that I can share or archive my financial summary.

#### Acceptance Criteria

1. WHEN a PDF export is requested for a valid date range, THE Report_Service SHALL generate a PDF containing the user's name, the requested date range, a generation timestamp, a summary section, and a detailed transaction list showing each transaction's date, description, category, and amount
2. THE Report_Service SHALL include total income, total expenses, net balance, and a category breakdown listing each category with its total amount in the PDF summary section
3. THE Report_Service SHALL generate the PDF within 10 seconds for up to 1000 transactions
4. WHEN no transactions exist for the requested date range, THE Report_Service SHALL generate a PDF with the summary section showing zero values for total income, total expenses, and net balance, an empty category breakdown, and an empty transaction list
5. IF the requested date range is invalid because the start date is after the end date or the range exceeds 365 days, THEN THE Report_Service SHALL reject the request with an error message indicating the date range constraint that was violated

### Requirement 22: Budget Notifications

**User Story:** As a user, I want to receive notifications when my budget is exceeded, so that I can take corrective action.

#### Acceptance Criteria

1. WHEN total monthly spending exceeds the monthly budget, THE Notification_Service SHALL send a budget-exceeded notification to the user within 5 minutes of the triggering transaction, including the budget name, the budget limit amount, the current total spent, and the amount by which the budget was exceeded
2. WHEN category spending exceeds a category budget, THE Notification_Service SHALL send a category-specific budget-exceeded notification to the user within 5 minutes, including the category name, the category budget limit, the current category total spent, and the amount by which the category budget was exceeded
3. THE Notification_Service SHALL deliver notifications through the in-app notification center by default, and additionally via email only if the user has explicitly enabled email notifications in their preferences
4. IF a budget-exceeded notification has already been sent for the same budget (identified by budget ID) in the same calendar month, THEN THE Notification_Service SHALL suppress additional notifications for that budget until the next calendar month begins
5. IF the external email service is unavailable or returns an error, THEN THE Notification_Service SHALL retain the notification in the in-app notification center and retry email delivery up to 3 times with a 60-second interval between attempts before marking the email delivery as failed

### Requirement 23: Recurring Transaction Reminders

**User Story:** As a user, I want to receive reminders about upcoming recurring transactions, so that I can ensure sufficient funds.

#### Acceptance Criteria

1. WHEN the daily scheduled job runs, THE Notification_Service SHALL create a reminder notification in the notifications table for each recurring transaction scheduled within the next 24 hours where the user has reminders enabled and no reminder has already been created for that specific occurrence
2. THE Notification_Service SHALL include the transaction amount, category name, source name, and scheduled date in the reminder notification
3. WHEN a user disables reminders for a specific recurring transaction, THE Notification_Service SHALL stop sending reminders for that transaction and SHALL NOT remove previously created reminder notifications
4. WHEN a user re-enables reminders for a specific recurring transaction, THE Notification_Service SHALL resume sending reminders starting from the next scheduled job run
5. IF the daily scheduled job fails to process a recurring transaction reminder, THEN THE Notification_Service SHALL log the failure and continue processing remaining transactions without interruption

### Requirement 24: Currency Settings

**User Story:** As a user, I want to set my preferred currency, so that all amounts are displayed in my local currency.

#### Acceptance Criteria

1. THE Settings_Service SHALL support currency selection from a list of at least 30 ISO 4217 currencies including INR, USD, EUR, GBP, and JPY
2. WHEN a user selects a currency, THE System SHALL persist the selected currency code in the user's preferences and display all monetary amounts with the selected currency's symbol and the number of decimal places defined by ISO 4217 for that currency (e.g., 2 for USD, 0 for JPY)
3. THE Settings_Service SHALL set INR as the default currency for new accounts
4. IF a user submits a currency code that is not in the supported currency list, THEN THE Settings_Service SHALL reject the request and return an error response indicating the currency is not supported, without modifying the user's existing currency preference

### Requirement 25: Theme Settings

**User Story:** As a user, I want to switch between light and dark themes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Settings_Service SHALL provide three theme options for user selection: light theme, dark theme, and system-preference-following mode, with system-preference-following mode as the default for new users
2. WHEN a user selects a theme, THE System SHALL apply the selected theme's styles to all visible UI elements within 300 milliseconds without requiring a page reload
3. WHILE system-preference-following mode is active, THE System SHALL switch the applied theme to match the operating system's current light or dark preference whenever the OS preference changes
4. THE Settings_Service SHALL persist the user's theme preference to localStorage on selection and sync the preference to the backend settings endpoint, so that the preference is applied on subsequent page loads before React hydrates
5. IF the backend settings sync fails, THEN THE Settings_Service SHALL retain the theme preference in localStorage and continue operating with the locally stored preference without displaying an error to the user

### Requirement 26: Profile Management

**User Story:** As a user, I want to manage my profile information, so that my account reflects my current details.

#### Acceptance Criteria

1. WHEN a user updates their display name, THE Settings_Service SHALL validate that the display name is between 1 and 100 characters, persist the change, and reflect the updated name across the application within 2 seconds of successful persistence
2. WHEN a user uploads a new avatar, THE Settings_Service SHALL validate that the file is JPEG or PNG format and does not exceed 2 MB in size, persist the avatar to cloud storage, and reflect the updated avatar across the application within 2 seconds of successful persistence
3. IF a user uploads an avatar that is not JPEG or PNG format or exceeds 2 MB, THEN THE Settings_Service SHALL reject the upload with an INVALID_INPUT error indicating the validation failure
4. WHEN a user requests to change their password, THE Auth_Service SHALL require both the current password and a new password of at least 8 characters, verify the current password matches the stored password, and persist the new password
5. IF a user requests to change their password with an incorrect current password, THEN THE Auth_Service SHALL reject the request with a PASSWORD_MISMATCH error and not modify the existing password

### Requirement 27: Account Deletion

**User Story:** As a user, I want to delete my account, so that I can remove all my data from the platform.

#### Acceptance Criteria

1. WHEN a user requests account deletion and provides their current password matching the stored credential, THE System SHALL mark the account with a deletion scheduled timestamp and schedule the account for permanent deletion after a 30-day grace period
2. IF the password provided during account deletion request does not match the stored credential, THEN THE System SHALL reject the request with an error indicating invalid password and SHALL NOT schedule the account for deletion
3. WHILE the 30-day grace period is active, THE System SHALL allow the user to cancel the deletion by logging in and explicitly confirming cancellation, upon which THE System SHALL remove the deletion scheduled timestamp and restore the account to active status
4. WHEN the 30-day grace period expires, THE System SHALL permanently delete all user data including expenses, incomes, receipts, budgets, settings, and all associated cloud storage files such as receipt images and avatars
5. IF a user requests account deletion while the account is already scheduled for deletion, THEN THE System SHALL reject the request with an error indicating that deletion is already pending

---

## Non-Functional Requirements

### Requirement 28: Performance

**User Story:** As a user, I want the application to respond quickly, so that I can efficiently manage my finances without waiting.

#### Acceptance Criteria

1. WHILE the system is serving up to 100 concurrent users, THE System SHALL respond to API requests within 200 milliseconds at the 95th percentile
2. IF concurrent users exceed 100, THEN THE System SHALL continue to respond to API requests within 500 milliseconds at the 95th percentile for up to 250 concurrent users
3. WHEN a user navigates to the dashboard page on a 4G mobile connection, THE System SHALL achieve First Contentful Paint within 2 seconds including all chart data fully rendered
4. THE System SHALL support pagination on all list endpoints and return results within 300 milliseconds at the 95th percentile for datasets up to 100,000 records per user
5. WHEN a user loads the frontend application for the first time on a 4G connection, THE System SHALL achieve a Time to Interactive of 3 seconds or less as measured by Lighthouse

### Requirement 29: Security

**User Story:** As a user, I want my financial data protected, so that unauthorized parties cannot access my information.

#### Acceptance Criteria

1. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
2. THE Auth_Service SHALL hash all passwords using bcrypt with a minimum cost factor of 10
3. THE System SHALL validate all user inputs in request bodies, query parameters, and URL parameters against their expected type and format using parameterized queries for database access and output encoding for rendered content
4. IF a user input fails validation, THEN THE System SHALL reject the request with a 400 status code and an error message indicating the validation failure, without processing the input further
5. THE System SHALL enforce CORS policies restricting API access to origins defined in the allowed-origins configuration, and SHALL reject requests from non-allowed origins by omitting CORS headers from the response
6. THE System SHALL implement rate limiting of 100 requests per minute per authenticated user and 30 requests per minute per IP address for unauthenticated requests
7. IF a client exceeds the rate limit, THEN THE System SHALL reject subsequent requests with a 429 status code and an error message indicating the limit has been exceeded, until the current time window resets

### Requirement 30: Scalability

**User Story:** As a product owner, I want the system to scale with growing users, so that performance remains consistent.

#### Acceptance Criteria

1. THE System SHALL support horizontal scaling through stateless API design by storing no session data, cache, or user state in instance memory, enabling GCP Cloud Run auto-scaling from 0 to 10 instances
2. THE System SHALL support up to 10,000 registered users with up to 1,000 concurrent active users while maintaining a P95 API response time of 500 milliseconds or less and an error rate below 1%
3. THE System SHALL use database connection pooling with a maximum of 20 connections per instance
4. IF all database connection pool connections are in use, THEN THE System SHALL queue incoming requests for up to 5 seconds before returning an error response indicating service unavailability

### Requirement 31: Accessibility

**User Story:** As a user with disabilities, I want the application to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE System SHALL conform to WCAG 2.1 Level AA guidelines for all routes and views rendered in the application
2. THE System SHALL support full keyboard navigation without requiring a mouse for any feature, and SHALL display a visible focus indicator on the currently focused interactive element at all times during keyboard navigation
3. THE System SHALL provide ARIA labels that describe the purpose of each interactive element and ARIA roles that match the element's function for all interactive elements including buttons, links, form controls, modals, and custom widgets
4. THE System SHALL maintain a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text
5. WHEN a modal, dialog, or dynamically inserted content is displayed, THE System SHALL move keyboard focus to the first focusable element within that content, and WHEN that content is dismissed, THE System SHALL return focus to the element that triggered it
6. THE System SHALL provide a text alternative for all non-text content including charts and data visualizations, conveying the equivalent data in a format accessible to screen readers
7. THE System SHALL ensure all form inputs have a visible, programmatically associated label that remains visible when the input has focus and when the input contains a value

### Requirement 32: Reliability

**User Story:** As a user, I want the application to be available when I need it, so that I can track expenses at any time.

#### Acceptance Criteria

1. THE System SHALL maintain 99.5% uptime measured on a monthly basis excluding scheduled maintenance windows announced at least 24 hours in advance
2. IF a database connection failure occurs, THEN THE System SHALL retry the connection up to 3 times with exponential backoff starting at 200ms and doubling each attempt before returning a SERVER_ERROR response to the client
3. IF a cloud storage upload failure occurs, THEN THE Expense_Service SHALL retry the upload once after a 500ms delay and, if the retry fails, return an error response indicating the file upload failed and that the expense was not saved
4. THE System SHALL log all errors in structured JSON format including at minimum a timestamp, correlation ID, error type, and the originating endpoint
5. WHEN the health check endpoint is requested, THE System SHALL respond within 2 seconds with the current availability status of the database and cloud storage dependencies

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Registration Rate | 100+ new users in first month | Database user count |
| Daily Active Users | 30% of registered users | Auth token issuance logs |
| Expense Entry Time | < 10 seconds per entry | Frontend analytics |
| Budget Adoption | 50% of active users set at least one budget | Database budget records |
| Export Usage | 20% of active users export at least once per month | Report generation logs |
| API Response Time (p95) | < 200ms | Cloud Run metrics |
| Error Rate | < 1% of total requests | Application logs |

## MVP Scope

The Minimum Viable Product includes:

1. **Authentication**: Email/password registration and login, JWT token management
2. **Expense Management**: Create, edit, delete expenses with categories and notes
3. **Income Management**: Create, edit, delete income entries
4. **Dashboard**: Total balance, monthly spending, category breakdown, recent transactions
5. **Monthly Budget**: Set overall monthly budget with basic alert
6. **Settings**: Currency selection, theme toggle, profile basics

## Future Scope (Post-MVP)

1. **Google OAuth Login**: Social authentication integration
2. **Receipt Image Attachment**: Cloud storage integration for receipt photos
3. **Tags and Advanced Search**: Tag-based organization and full-text search
4. **Category Budgets**: Per-category budget limits and alerts
5. **Recurring Transactions**: Automated recurring expense/income generation
6. **Reports (CSV/PDF)**: Export functionality
7. **Notifications**: Email and in-app notifications for budgets and reminders
8. **Account Deletion**: Scheduled deletion with grace period
9. **Multi-currency Support**: Currency conversion and multi-currency tracking
10. **Mobile Application**: React Native or PWA mobile experience
11. **Shared Expenses**: Split expenses with other users
12. **AI Insights**: ML-powered spending pattern analysis and recommendations
