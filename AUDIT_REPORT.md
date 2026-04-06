# ⚠️ CRITICAL ISSUES FOUND - Database Transition Audit Report

**Date**: April 6, 2026  
**Severity**: 🔴 CRITICAL - App will NOT work without fixes  

---

## 🔍 ISSUES IDENTIFIED

### 1. 🔴 **CRITICAL: Placeholder Syntax Mismatch**

**Problem**: All queries use `?` placeholders (SQLite), but PostgreSQL needs `$1, $2, $3` format

**Affected Code**: Every single query in server.js
```javascript
// ❌ WRONG - PostgreSQL doesn't understand ?
await dbGet('SELECT id FROM users WHERE email=?', ADMIN_EMAIL);

// ✅ SHOULD BE - PostgreSQL syntax
await dbGet('SELECT id FROM users WHERE email=$1', ADMIN_EMAIL);
```

**Impact**: Database queries WILL FAIL
**Files**: server.js (20+ locations), db.js

---

### 2. 🔴 **CRITICAL: db.js Not Converting Placeholders**

**Problem**: db.js passes parameters directly to PostgreSQL without converting `?` to `$1, $2, etc.`

**Current Code (db.js)**:
```javascript
const result = await client.query(sql, params);
// ❌ If sql has "WHERE email=?", PostgreSQL will fail
```

**Should Be**:
```javascript
// Convert ? to $1, $2, $3, etc.
const convertedSql = sql.replace(/\?/g, (m, offset) => {
  return '$' + (convertedParams.length + 1);
});
const result = await client.query(convertedSql, params);
```

---

### 3. 🔴 **CRITICAL: initDatabase() Uses SQLite Syntax**

**Problem**: CREATE TABLE statements use SQLite syntax, not PostgreSQL

**Location**: server.js, lines 44-150

**Issues**:
- ❌ `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite only)
- ❌ `datetime('now')` in DEFAULT clause (wrong for PostgreSQL)
- ✅ Tables already exist in Supabase (should skip)

**Example**:
```javascript
// ❌ WRONG - SQLite syntax
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  // ← SQLite only
  created_at TEXT DEFAULT (datetime('now'))  // ← SQLite syntax
);

// ✅ CORRECT - Already created in Supabase
// (no need to create, just skip)
```

---

### 4. 🟡 **MAJOR: buildSearchClause Uses LIKE ?**

**Problem**: Search queries use `LIKE ?` with placeholders

**Location**: server.js, line 37

**Code**:
```javascript
const parts = fields.map(f => `LOWER(COALESCE(${f}, '')) LIKE ?`);
// ❌ ? placeholders won't work in PostgreSQL
```

---

### 5. 🟡 **MAJOR: Console Message Says "SQLite"**

**Problem**: Server startup message still says "SQLite server"

**Location**: server.js, line 1334

**Current**:
```javascript
console.log(`SQLite server running on port ${PORT}`);
// ❌ Should say PostgreSQL
```

---

### 6. 🟡 **MAJOR: initDatabase Not Awaited Properly**

**Problem**: exec() is now async but initDatabase() doesn't await all calls

**Location**: server.js, line 44-150

**Issue**: exec() is called without await in ALTER TABLE statements

---

## 📊 AFFECTED QUERIES (Examples)

```javascript
// Line 184 - ensureAdminUser()
await dbGet('SELECT id FROM users WHERE email=?', ADMIN_EMAIL);
// ❌ Would become: email=$1

// Line 195 - ensureAdminUser()
await dbRun(`INSERT INTO users (...) VALUES (?, ?, ?, ?, ?)`, ...values);
// ❌ Would become: VALUES ($1, $2, $3, $4, $5)

// Line 414 - Password update
await dbRun(`UPDATE users SET password=? WHERE id=?`, hashed, user.id);
// ❌ Would become: password=$1 WHERE id=$2

// Line 488 - Calendar lookup
await dbGet('SELECT max_slots FROM calendar WHERE date=?', date);
// ❌ Would become: date=$1

// Line 562 - Count by status
await dbGet('SELECT COUNT(*) as count FROM booking_requests WHERE status=?', status);
// ❌ Would become: status=$1
```

---

## 🛠️ REQUIRED FIXES

### Fix #1: Update db.js to Convert Placeholders

The db.js wrapper MUST convert `?` to `$1, $2, $3` format.

### Fix #2: Remove/Skip initDatabase()

Either:
- Option A: Remove the function entirely (tables exist in Supabase)
- Option B: Modify to just verify tables exist (no CREATE)

### Fix #3: Update Console Message

Change "SQLite server" to "PostgreSQL server"

### Fix #4: Verify All Queries Use Correct Placeholder Format

After fixes, all queries should work with PostgreSQL.

---

## 📋 SUMMARY

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Placeholder syntax | 🔴 CRITICAL | Queries fail | ⚠️ Unfixed |
| db.js conversion | 🔴 CRITICAL | Database errors | ⚠️ Unfixed |
| initDatabase() syntax | 🔴 CRITICAL | Table creation fails | ⚠️ Unfixed |
| buildSearchClause | 🟡 MAJOR | Search fails | ⚠️ Unfixed |
| Console message | 🔵 MINOR | Misleading | ⚠️ Unfixed |

---

## ✅ FIX PRIORITY

1. **FIRST**: Fix db.js to convert `?` to `$1, $2, $3`
2. **SECOND**: Remove/skip initDatabase() 
3. **THIRD**: Update console message
4. **FOURTH**: Test all queries

---

**Status**: 🔴 **BLOCKING** - App will not work without these fixes
