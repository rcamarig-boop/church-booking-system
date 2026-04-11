-- Migration 001: Add performance indexes for slow endpoints
-- Fixes response times of 300-800ms for user-specific queries

-- Index 1: booking_edit_proposals - queries sort by id DESC (not created_at)
CREATE INDEX IF NOT EXISTS booking_edit_proposals_user_id_idx
ON booking_edit_proposals (user_id, id DESC);

-- Index 2: booking_request_edit_proposals - queries sort by id DESC (not created_at)
CREATE INDEX IF NOT EXISTS booking_request_edit_proposals_user_id_idx
ON booking_request_edit_proposals (user_id, id DESC);

-- Index 3: booking_requests - no index on (user_id, id DESC)
CREATE INDEX IF NOT EXISTS booking_requests_user_id_idx
ON booking_requests (user_id, id DESC);

-- Index 4: bookings - covering index for user queries
CREATE INDEX IF NOT EXISTS bookings_user_id_idx
ON bookings (user_id, created_at DESC, id DESC);

-- Index 5: concerns - covering index for (user_id, created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS concerns_user_id_created_idx
ON concerns (user_id, created_at DESC, id DESC);

-- Index 6: mass_service_applications - cover applied_at DESC sort
CREATE INDEX IF NOT EXISTS mass_service_applications_user_applied_idx
ON mass_service_applications (user_id, applied_at DESC);

-- Index 7: booking_records - index for id DESC sort used by admin endpoint
CREATE INDEX IF NOT EXISTS booking_records_action_idx
ON booking_records (action_at DESC, id DESC);
