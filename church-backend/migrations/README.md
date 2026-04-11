# Database Migrations

This directory contains SQL migration scripts for the church booking system.

## How to Apply

### Automatic (recommended)

Migrations are applied automatically on server startup via `apply-migrations.js`.
No manual action is required.

### Manual

Run the migration script directly against your PostgreSQL/Supabase database:

```bash
# Using psql
psql "$DATABASE_URL" -f migrations/001_add_performance_indexes.sql

# Using the apply-migrations script
node apply-migrations.js
```

## Migration Files

| File | Description |
|------|-------------|
| `001_add_performance_indexes.sql` | Adds 7 missing indexes to fix 300-800ms slow endpoints |

## Migration 001: Performance Indexes

Adds indexes to fix slow user-specific queries:

| Table | Index | Fixes Endpoint |
|-------|-------|---------------|
| `booking_edit_proposals` | `(user_id, id DESC)` | `GET /api/booking-edit-proposals/my` (801ms) |
| `booking_request_edit_proposals` | `(user_id, id DESC)` | `GET /api/booking-request-edit-proposals/my` (700ms) |
| `booking_requests` | `(user_id, id DESC)` | `GET /api/booking-requests/my` (550ms) |
| `bookings` | `(user_id, created_at DESC, id DESC)` | `GET /api/bookings` user (450ms) |
| `concerns` | `(user_id, created_at DESC, id DESC)` | `GET /api/concerns/my` (350ms) |
| `mass_service_applications` | `(user_id, applied_at DESC)` | `GET /api/mass-services/my-applications` (300ms) |
| `booking_records` | `(action_at DESC, id DESC)` | `GET /api/booking-records` admin (650ms) |

All indexes use `CREATE INDEX IF NOT EXISTS` and are idempotent.
