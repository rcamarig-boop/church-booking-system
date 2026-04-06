# Server Change Notes

This file is an archived reference from the PostgreSQL migration.
The current backend already includes the migration fixes:

- PostgreSQL via `church-backend/db.js`
- `RETURNING id` support in inserts
- Quoted mixed-case columns like `"userId"`
- PostgreSQL date handling with `CAST(now() AS date)`

If you are debugging the current app, treat `church-backend/server.js` as the source of truth.
