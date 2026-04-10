# API Reference

Church Ministry Appointment Scheduling System - Complete API Documentation

---

## BASE URL

**Local Development:** `http://localhost:5000/api`  
**Production:** `https://church-api.render.com/api`

---

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Register

```
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "member"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "member",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "member",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Bookings

### List All Bookings

```
GET /bookings
```

**Query Parameters:**
- `limit` (optional): Number of records per page (default: 10)
- `offset` (optional): Number of records to skip (default: 0)
- `date` (optional): Filter by date (YYYY-MM-DD)
- `service` (optional): Filter by service type

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2026-04-20",
      "slot": "10:00",
      "service": "baptism",
      "chapel": "Main Chapel",
      "details": {
        "childName": "Mary",
        "birthDate": "2024-01-15",
        "parentNames": "John & Jane Doe"
      },
      "status": "confirmed",
      "createdAt": "2026-04-11T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Create Booking

```
POST /bookings
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "date": "2026-04-20",
  "slot": "10:00",
  "service": "baptism",
  "chapel": "Main Chapel",
  "details": {
    "childName": "Mary",
    "birthDate": "2024-01-15",
    "parentNames": "John & Jane Doe"
  }
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "John Doe",
  "date": "2026-04-20",
  "slot": "10:00",
  "service": "baptism",
  "status": "confirmed",
  "createdAt": "2026-04-11T10:30:00Z"
}
```

### Get Booking by ID

```
GET /bookings/:id
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "date": "2026-04-20",
  "slot": "10:00",
  "service": "baptism",
  "details": { ... }
}
```

### Delete Booking

```
DELETE /bookings/:id
```

**Response (200):**
```json
{
  "message": "Booking deleted successfully"
}
```

---

## Booking Requests

### List Booking Requests

```
GET /booking-requests
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, rejected)
- `service` (optional): Filter by service type
- `limit` (optional): Records per page

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2026-04-20",
      "slot": "10:00",
      "service": "baptism",
      "details": { ... },
      "status": "pending",
      "createdAt": "2026-04-11T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Submit Booking Request

```
POST /booking-requests
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "date": "2026-04-20",
  "slot": "10:00",
  "service": "baptism",
  "details": {
    "childName": "Mary",
    "birthDate": "2024-01-15",
    "parentNames": "John & Jane Doe"
  }
}
```

**Response (201):**
```json
{
  "id": 1,
  "status": "pending",
  "message": "Request submitted successfully"
}
```

### Get Request by ID

```
GET /booking-requests/:id
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "date": "2026-04-20",
  "status": "pending",
  ...
}
```

### Check for Booking Conflicts

```
GET /booking-requests/:id/conflicts
```

**Response (200):**
```json
{
  "hasConflicts": true,
  "conflictingBookings": [
    {
      "id": 5,
      "name": "Jane Smith",
      "date": "2026-04-20",
      "slot": "10:00",
      "service": "wedding"
    }
  ]
}
```

### Approve Booking Request

```
PATCH /booking-requests/:id/approve
```

**Request Body:**
```json
{
  "approvalNote": "Approved by admin"
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "approved",
  "message": "Request approved successfully"
}
```

### Reject Booking Request

```
PATCH /booking-requests/:id/reject
```

**Request Body:**
```json
{
  "rejectionReason": "Date no longer available"
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "rejected",
  "message": "Request rejected successfully"
}
```

---

## Mass Services

### List Mass Services

```
GET /mass-services
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Collective Baptism",
      "date": "2026-05-01",
      "description": "Baptism for multiple families",
      "status": "active",
      "maxParticipants": 20,
      "currentParticipants": 5
    }
  ],
  "total": 1
}
```

### Create Mass Service

```
POST /mass-services
```

**Request Body:**
```json
{
  "name": "Collective Baptism",
  "date": "2026-05-01",
  "description": "Baptism for multiple families",
  "maxParticipants": 20,
  "serviceType": "baptism"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "Collective Baptism",
  "status": "active"
}
```

### Apply for Mass Service

```
POST /mass-services/:id/apply
```

**Request Body:**
```json
{
  "userId": 1,
  "details": {
    "childName": "Mary",
    "birthDate": "2024-01-15",
    "parentNames": "John & Jane Doe"
  }
}
```

**Response (201):**
```json
{
  "applicationId": 1,
  "status": "pending",
  "message": "Application submitted successfully"
}
```

### Get Mass Service by ID

```
GET /mass-services/:id
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Collective Baptism",
  "date": "2026-05-01",
  "applications": [
    {
      "id": 1,
      "userId": 1,
      "userName": "John Doe",
      "status": "approved"
    }
  ]
}
```

### Approve Mass Service Application

```
PATCH /mass-services/:id/applications/:appId/approve
```

**Response (200):**
```json
{
  "applicationId": 1,
  "status": "approved"
}
```

### Reject Mass Service Application

```
PATCH /mass-services/:id/applications/:appId/reject
```

**Request Body:**
```json
{
  "reason": "Incomplete application"
}
```

**Response (200):**
```json
{
  "applicationId": 1,
  "status": "rejected"
}
```

---

## Calendar Management

### Get Calendar Configuration

```
GET /calendar
```

**Response (200):**
```json
{
  "data": [
    {
      "date": "2026-04-20",
      "maxSlots": 5,
      "status": "open",
      "bookedSlots": 2
    }
  ]
}
```

### Update Calendar Configuration

```
PUT /calendar
```

**Request Body:**
```json
{
  "date": "2026-04-20",
  "maxSlots": 5,
  "status": "open"
}
```

**Response (200):**
```json
{
  "date": "2026-04-20",
  "maxSlots": 5,
  "message": "Calendar updated successfully"
}
```

---

## Activity Log

### Get Activity Log

```
GET /activity-log
```

**Query Parameters:**
- `type` (optional): Filter by action type (approve, reject, create, edit, delete, cancel)
- `userId` (optional): Filter by user
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `limit` (optional): Records per page

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "userName": "Admin User",
      "action": "approve",
      "resourceType": "booking_request",
      "resourceId": 5,
      "details": "Approved baptism booking",
      "timestamp": "2026-04-11T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## Users

### Get User Profile

```
GET /users/profile
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "member",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Update User Profile

```
PATCH /users/profile
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Smith",
  "message": "Profile updated successfully"
}
```

### List Users (Admin Only)

```
GET /users
```

**Query Parameters:**
- `role` (optional): Filter by role
- `limit` (optional): Records per page

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    }
  ],
  "total": 1
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "Email is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "resource": "booking_request"
}
```

### 409 Conflict
```json
{
  "error": "Booking conflict detected",
  "conflictDate": "2026-04-20",
  "conflictTime": "10:00"
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred",
  "message": "Please try again later"
}
```

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Header:** `X-RateLimit-Remaining`

---

## WebSocket Events (Real-time)

### Connection
```javascript
socket.connect()
```

### Subscribe to Updates
```javascript
socket.on('booking_updated', (data) => {
  // Handle booking update
})

socket.on('request_status_changed', (data) => {
  // Handle request status change
})

socket.on('notification', (data) => {
  // Handle push notification
})
```

### Emit Events
```javascript
socket.emit('request_approval', {
  requestId: 1,
  action: 'approve'
})
```

---

**API Version:** 1.0  
**Last Updated:** April 11, 2026
