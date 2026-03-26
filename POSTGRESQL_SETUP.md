# PostgreSQL Setup Guide

You need to set up a PostgreSQL database before the migration can run. Choose one option:

## Option 1: Docker (Recommended - Easiest)

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop
2. **Start PostgreSQL:**
   ```bash
   cd c:\church_project
   docker-compose up -d
   ```
3. **Wait for PostgreSQL to be ready** (about 10-15 seconds)
4. **Run the migration:**
   ```bash
   cd church-backend
   npm run migrate
   ```

## Option 2: Install PostgreSQL Locally

1. **Download PostgreSQL** from https://www.postgresql.org/download/windows/
2. **Install** with default settings (port 5432, user: postgres, password: postgres)
3. **Create the database:**
   ```bash
   createdb -U postgres church
   ```
4. **Run the migration:**
   ```bash
   cd church-backend
   npm run migrate
   ```

## Option 3: Use Cloud PostgreSQL (No Installation)

1. **Pick a provider:**
   - **Supabase** (easiest): https://app.supabase.com - Free tier, instant PostgreSQL
   - **Render**: https://render.com - Free tier available
   - **Railway**: https://railway.app - Free tier
   
2. **Get your connection string** (looks like: `postgresql://user:password@host:5432/database`)

3. **Update `.env` file:**
   ```
   USE_PG=true
   DATABASE_URL=your_connection_string_here
   PGHOST=your_host
   PGPORT=5432
   PGDATABASE=your_database
   PGUSER=your_user
   PGPASSWORD=your_password
   PGSSLMODE=require
   ```

4. **Run the migration:**
   ```bash
   cd church-backend
   npm run migrate
   ```

---

## After Setup

Once PostgreSQL is running with your credentials in `.env`:

1. The backend will auto-create tables on startup
2. Run the migration to transfer SQLite data: `npm run migrate`
3. Restart the backend: `npm start`
4. Your data will now be in PostgreSQL!
