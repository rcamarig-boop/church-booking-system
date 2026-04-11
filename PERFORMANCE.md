# Performance Optimization

## Database Index Improvements

### Problem

Multiple API endpoints were performing full table scans instead of using indexes
when filtering by `user_id` and sorting by `id` or `created_at`. This caused
response times of 300-800ms for user-specific queries.

### Affected Endpoints

| Endpoint | Before | Root Cause |
|----------|--------|------------|
| `GET /api/booking-edit-proposals/my` | 801ms | Index on `created_at` but query sorts by `id DESC` |
| `GET /api/booking-request-edit-proposals/my` | 700ms | Index on `created_at` but query sorts by `id DESC` |
| `GET /api/booking-requests/my` | 550ms | No index on `(user_id, id DESC)` |
| `GET /api/bookings` (user) | 450ms | No covering index for user queries |
| `GET /api/concerns/my` | 350ms | No index covering `(user_id, created_at DESC)` |
| `GET /api/mass-services/my-applications` | 300ms | Index missing `applied_at DESC` sort column |
| `GET /api/booking-records` (admin) | 650ms | No index for sorting |

### Solution

Added the following indexes in `church-backend/server.js` (applied automatically
on server startup) and documented in `church-backend/migrations/001_add_performance_indexes.sql`:

```sql
-- booking_edit_proposals: queries sort by id DESC
CREATE INDEX IF NOT EXISTS booking_edit_proposals_user_id_idx
ON booking_edit_proposals (user_id, id DESC);

-- booking_request_edit_proposals: queries sort by id DESC
CREATE INDEX IF NOT EXISTS booking_request_edit_proposals_user_id_idx
ON booking_request_edit_proposals (user_id, id DESC);

-- booking_requests: missing user_id + id index
CREATE INDEX IF NOT EXISTS booking_requests_user_id_idx
ON booking_requests (user_id, id DESC);

-- bookings: covering index for user queries
CREATE INDEX IF NOT EXISTS bookings_user_id_idx
ON bookings (user_id, created_at DESC, id DESC);

-- concerns: covering index for user queries
CREATE INDEX IF NOT EXISTS concerns_user_id_created_idx
ON concerns (user_id, created_at DESC, id DESC);

-- mass_service_applications: cover applied_at DESC sort
CREATE INDEX IF NOT EXISTS mass_service_applications_user_applied_idx
ON mass_service_applications (user_id, applied_at DESC);

-- booking_records: index for admin sort
CREATE INDEX IF NOT EXISTS booking_records_action_idx
ON booking_records (action_at DESC, id DESC);
```

### Expected Results

- Response time improvement: 94-98% faster (550ms average → ~30ms)
- Queries use index scans instead of full table scans
- Database load reduced by approximately 16×
- All user-specific endpoints optimized

### Applying Migrations

Indexes are created automatically when the server starts. They can also be
applied manually:

```bash
# Using the migration script
node church-backend/apply-migrations.js

# Using psql directly
psql "$DATABASE_URL" -f church-backend/migrations/001_add_performance_indexes.sql
```

All indexes use `CREATE INDEX IF NOT EXISTS` and are idempotent.
