# Deployment Checklist

Use this before and after each deploy.

## Frontend

- Set `REACT_APP_API_BASE_URL` to the backend root URL.
- Set `REACT_APP_SOCKET_URL` to the backend root URL.
- Redeploy after changing any `REACT_APP_*` value.

## Backend

- Set `DATABASE_URL` to the hosted PostgreSQL connection string.
- Set `JWT_SECRET` to a unique secret.
- Set `AUTO_SEED_ADMIN=true` only if you want the default admin account created automatically.
- Confirm `ADMIN_PASSWORD` is not left at a weak default for production.

## Smoke Tests

- Open the backend URL directly and confirm `/api/booking-requests/count` returns JSON.
- Open the frontend and confirm login loads without console errors.
- Submit one booking request and confirm the preview modal appears before sending.
- Check that a new request reaches the admin dashboard.
