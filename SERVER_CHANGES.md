# EXACT SERVER.JS CHANGES

This file shows the EXACT code changes needed in `church-backend/server.js`.

Use Find & Replace (Ctrl+H) to make these changes.

---

## CHANGE 1: Filter Clause for Past Events

### In the `/api/events` GET endpoint (around line 290)

**FIND** (exact text):
```javascript
  const filter = String(_.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < date('now')`
    : filter === 'upcoming'
      ? `date >= date('now')`
      : '';
```

**REPLACE WITH**:
```javascript
  const filter = String(_.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < CAST(now() AS date)`
    : filter === 'upcoming'
      ? `date >= CAST(now() AS date)`
      : '';
```

**Lines affected**: ~290-295

---

## CHANGE 2: Filter Clause for Past Bookings

### In the `/api/bookings` GET endpoint (around line 290)

**FIND** (exact text):
```javascript
  const filter = String(req.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < date('now')`
    : filter === 'upcoming'
      ? `date >= date('now')`
      : '';
```

**REPLACE WITH**:
```javascript
  const filter = String(req.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < CAST(now() AS date)`
    : filter === 'upcoming'
      ? `date >= CAST(now() AS date)`
      : '';
```

**Lines affected**: ~285-290 (in GET /api/bookings)

---

## VERIFICATION CHECKS

After making the above changes, verify these SQL statements have `RETURNING id`:

### Check 1: Booking Request Insert (around line 515)

Look for:
```javascript
const insertResult = await dbRun(`
  INSERT INTO booking_requests (${cols.join(', ')})
  VALUES (${cols.map(() => '?').join(', ')})
  RETURNING id
`, ...vals);
```

✅ Should already have `RETURNING id` - no change needed

---

### Check 2: Booking Insert in Transaction (around line 665)

Look for:
```javascript
const insertResult = await conn.prepare(`
  INSERT INTO bookings (${cols.join(', ')})
  VALUES (${cols.map(() => '?').join(', ')})
  RETURNING id
`).run(...vals);
```

✅ Should already have `RETURNING id` - no change needed

---

## THAT'S IT!

Only 2 simple Find & Replace operations needed in server.js!

The rest:
- db.js handling is done by new db.supabase.js ✅
- RETURNING id is already in code ✅
- CURRENT_TIMESTAMP works in both ✅
- ON CONFLICT syntax is same ✅

---

## HOW TO DO FIND & REPLACE IN VS CODE

1. Press **Ctrl+H** to open Find & Replace
2. Under "Find", paste the "FIND" text
3. Under "Replace", paste the "REPLACE WITH" text
4. Click **"Replace All"** or **"Replace"** one by one
5. Verify changes look correct
6. Save file (Ctrl+S)

---

## TESTING AFTER CHANGES

Run these commands to test:

### Start backend locally
```bash
cd church-backend
npm install  # Install new pg package
npm start
```

Should see: `SQLite server running on port 4000`

### Test endpoints
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@church.com","password":"test123"}'

# Should return: {"token":"eyJ...", "user":{...}}

# Get bookings (will fail with 401 Unauthorized, that's OK)
curl http://localhost:4000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get calendar (no auth needed in your code)
curl http://localhost:4000/api/calendar
```

---

## WHAT IF I GET ERRORS?

### "ENOENT: no such file or directory, open 'db.js'"

You need to replace the entire `db.js` file with the Supabase version.

### "Cannot find module 'pg'"

Run: `npm install pg`

### Database connection errors

Make sure:
1. `.env` has `DATABASE_URL=postgresql://...`
2. Connection string is correct (from Supabase)
3. Tables were created (ran the SQL in Supabase)

### Still getting `date('now')` errors

Make sure you did both Find & Replace operations:
1. In `/api/events` endpoint
2. In `/api/bookings` endpoint

Check count shows "2 were replaced" in VS Code.

---

## SUMMARY

| File | Change | Why |
|------|--------|-----|
| `package.json` | Replace entire file | Add `pg` dependency |
| `db.js` | Replace entire file | Use Supabase Pool |
| `server.js` | 2 Find & Replace | Fix datetime functions |
| `.env` | Add DATABASE_URL | Configure database |

Done! Ready to deploy! 🚀

