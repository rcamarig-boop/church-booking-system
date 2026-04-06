# SQL Migration Guide: SQLite → PostgreSQL

This document shows exactly which SQL queries need to be changed in `server.js`.

> **Quick Rule**: Find and replace these patterns in your server.js

---

## Pattern 1: DateTime Functions

### Find:
```javascript
`date('now')`
```

### Replace with:
```javascript
`CAST(now() AS date)`
```

**Locations in server.js:**
- Line ~290: `date < date('now')` → `date < CAST(now() AS date)`
- Line ~293: `date >= date('now')` → `date >= CAST(now() AS date)`
- Line ~927: `date < date('now')` → `date < CAST(now() AS date)`
- Line ~930: `date >= date('now')` → `date >= CAST(now() AS date)`

---

## Pattern 2: Current DateTime

### Find:
```javascript
`datetime('now')`
```

### Replace with:
```javascript
`NOW()`
```

**Locations in server.js:**
- Line ~1156: `resolved_at=?, resolved_by=?, resolution_note=?, reply_message=?, replied_at=?, replied_by=?` (where you set `new Date().toISOString()`) - Keep as-is, this uses JavaScript dates
- Line ~1200: `resolved_at=?, resolved_at=?` - Keep as-is

Actually, **you don't need to change the JavaScript `new Date().toISOString()` calls** - those are application-level and work fine.

---

## Pattern 3: CURRENT_TIMESTAMP

### Already Compatible ✅
```javascript
`CURRENT_TIMESTAMP`
```
This works the same in both SQLite and PostgreSQL. No changes needed.

---

## Pattern 4: Getting Inserted IDs (Most Important!)

### OLD (SQLite):
```javascript
const insertResult = await dbRun(`
  INSERT INTO booking_requests (...)
  VALUES (...)
  RETURNING id
`, ...vals);

const requestId = insertResult.lastInsertRowid || insertResult?.id || insertResult?.rows?.[0]?.id;
```

### NEW (PostgreSQL):
The updated `db.js` now returns inserted ID automatically:

```javascript
const insertResult = await dbRun(`
  INSERT INTO booking_requests (...)
  VALUES (...)
  RETURNING id
`, ...vals);

// For Supabase/PostgreSQL, the ID is in insertResult.lastInsertRowid
const requestId = insertResult.lastInsertRowid;
```

**This is already handled in the new db.js!** You just need to verify RETURNING clause is there.

---

## Pattern 5: ON CONFLICT (Upsert)

### OLD (SQLite):
```sql
INSERT INTO calendar (date, max_slots, booked)
VALUES (?, ?, 1)
ON CONFLICT(date) DO UPDATE SET booked = calendar.booked + 1
```

### NEW (PostgreSQL):  
**No change needed!** PostgreSQL uses the same `ON CONFLICT` syntax. ✅

---

## Pattern 6: LIMIT with Offset

### OLD (SQLite):
```sql
SELECT * FROM events LIMIT 10 OFFSET 20
```

### NEW (PostgreSQL):
**No change needed!** Same syntax. ✅

---

## Summary of Changes Needed in server.js

Edit `church-backend/server.js` and make these replacements:

### Find & Replace #1
**Find:**
```javascript
date < date('now')
```
**Replace:**
```javascript
date < CAST(now() AS date)
```
**Count:** 2 occurrences (around lines 290, 927)

---

### Find & Replace #2
**Find:**
```javascript
date >= date('now')
```
**Replace:**  
```javascript
date >= CAST(now() AS date)
```
**Count:** 2 occurrences (around lines 293, 930)

---

### Verify RETURNING Clauses

Check these INSERT statements all have `RETURNING id`:

1. **Line ~515**: Booking request insert
   ```sql
   INSERT INTO booking_requests (${cols.join(', ')})
   VALUES (${cols.map(() => '?').join(', ')})
   RETURNING id
   ```
   ✅ Already has it? Good!

2. **Line ~665**: Booking insert (in transaction)
   ```sql
   INSERT INTO bookings (${cols.join(', ')})
   VALUES (${cols.map(() => '?').join(', ')})
   RETURNING id
   ```
   ✅ Already has it? Good!

If any INSERT is missing `RETURNING id`, add it!

---

## Quick Script to Test Changes

Run this after deploying to verify all queries work:

```bash
# Test register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"test123"}'

# Should return JWT token
```

---

## Files to Modify

1. ✅ `church-backend/package.json` - Replace with new version (already provided)
2. ✅ `church-backend/db.js` - Already using the PostgreSQL version
3. ⚠️ `church-backend/server.js` - Make the 2 find & replace operations above
4. ✅ `church-backend/.env` - Add DATABASE_URL (during deployment)

---

## Why These Changes?

| Change | Reason |
|--------|--------|
| `date('now')` → `CAST(now() AS date)` | SQLite function vs PostgreSQL function |
| `datetime('now')` → `NOW()` | Different datetime syntax |
| `RETURNING id` in INSERTs | Both support this, ensures we get inserted ID |
| `lastInsertRowid` handling | Updated db.js handles this now |

---

## Testing Checklist

After making changes, test these endpoints:

- [ ] **POST /api/auth/register** - Creates new user
- [ ] **GET /api/users** (admin) - Returns user list  
- [ ] **POST /api/bookings** - Creates booking request
- [ ] **GET /api/bookings** - Returns bookings with pagination
- [ ] **POST /api/events** (admin) - Creates event with date
- [ ] **POST /api/calendar** (admin) - Upserts calendar config
- [ ] **GET /api/calendar** - Returns calendar as JSON map

All should work without errors!
