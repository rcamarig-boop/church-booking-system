# Church Booking System Diagrams and Algorithms

This document presents the system analysis of the church reservation and management platform based on the current project source code. It is written in a formal style suitable for academic or documentation use.

## How to Use This Document

1. Copy the diagram sections into your report or thesis chapter.
2. If your word processor supports Mermaid, paste the diagram blocks directly.
3. If Mermaid is not supported, convert each diagram into an image using a Mermaid renderer and insert the images into `Diagrams.docx`.
4. Use the algorithm, pseudocode, and notes sections as the written explanation below the diagrams.
5. Keep the diagram titles in your final document so each figure is clearly labeled.

## 1) Use Case Diagram

```mermaid
flowchart LR
  Member((Member))
  Admin((Admin))
  SuperAdmin((Super Admin))

  UC1[Register / Login]
  UC2[View Calendar]
  UC3[Check Available Slots]
  UC4[Create Booking Request]
  UC5[Cancel Own Booking]
  UC6[Edit Confirmed Booking]
  UC7[Propose Booking Changes]
  UC8[Propose Request Changes]
  UC9[Submit Concern]
  UC10[View Concerns]
  UC11[View Notifications]

  UC12[Manage Calendar Slots]
  UC13[Approve / Reject Booking Request]
  UC14[Edit / Cancel Booking]
  UC15[Review Booking Edit Proposals]
  UC16[Review Request Edit Proposals]
  UC17[Manage Events]
  UC18[Manage Users]
  UC19[Submit Concerns]
  UC20[Reply / Resolve Concerns]
  UC21[View Reports]
  UC22[Delete Records]
  UC23[Manage Invite Codes]

  Member --> UC1
  Member --> UC2
  Member --> UC3
  Member --> UC4
  Member --> UC5
  Member --> UC6
  Member --> UC7
  Member --> UC8
  Member --> UC9
  Member --> UC10
  Member --> UC11

  Admin --> UC1
  Admin --> UC12
  Admin --> UC13
  Admin --> UC14
  Admin --> UC15
  Admin --> UC16
  Admin --> UC17
  Admin --> UC18
  Admin --> UC19
  Admin --> UC20
  Admin --> UC21
  Admin --> UC23

  SuperAdmin --> UC1
  SuperAdmin --> UC12
  SuperAdmin --> UC13
  SuperAdmin --> UC14
  SuperAdmin --> UC15
  SuperAdmin --> UC16
  SuperAdmin --> UC17
  SuperAdmin --> UC18
  SuperAdmin --> UC19
  SuperAdmin --> UC20
  SuperAdmin --> UC21
  SuperAdmin --> UC22
  SuperAdmin --> UC23
```

## 2) Activity Diagram

```mermaid
flowchart TD
  A([Start]) --> B[User logs in]
  B --> C{Mobile or Desktop?}
  C -->|Mobile| D[Tap hamburger menu]
  C -->|Desktop| E[View sidebar directly]
  D --> F[Sidebar drawer opens with overlay]
  E --> F
  F --> G[Click Calendar or Booking Modal]
  G --> H[Select date, chapel, service, time 8am-6pm]
  H --> I{Multi-step form?}
  I -->|Yes| J[Show scrollable service form modal]
  I -->|No| K[Skip to validation]
  J --> K
  K --> L{Need chairs/tables?}
  L -->|Yes| M[Enter chairs count and tables count]
  L -->|No| N[Fill service form details]
  M --> N
  N --> O[Validate required fields & time range]
  O --> P{Valid?}
  P -->|No| Q[Show error message]
  Q --> N
  P -->|Yes| R[Show preview of booking details]
  R --> S[User confirms booking]
  S --> T[Submit booking request]
  T --> U[Create booking_request record status pending]
  U --> V[Notify admin of new request]
  V --> W{Admin approves?}
  W -->|Yes| X[Create confirmed booking record]
  W -->|No| Y[Reject request]
  X --> Z[Notify member booking confirmed]
  Y --> ZA[Notify member request rejected]
  Z --> ZB([End - Booking Confirmed])
  ZA --> ZC([End - Request Rejected])
```

## 3) Gantt Chart - Project Timeline

```mermaid
gantt
  title Church Booking System - Development Timeline (Aug 2025 - Mar 2026)
  dateFormat YYYY-MM-DD
  
  section Planning & Design
  Requirements Analysis :a1, 2025-08-01, 2025-08-15
  System Architecture Design :a2, 2025-08-10, 2025-08-30
  Database Schema Design :a3, 2025-08-18, 2025-09-05
  
  section Frontend Development
  React Setup & Project Structure :b1, 2025-09-01, 2025-09-12
  Dashboard & Calendar Components :b2, 2025-09-08, 2025-10-10
  Booking Modal & Forms :b3, 2025-09-25, 2025-11-15
  Responsive Design - 7 Breakpoints :b4, 2025-10-15, 2025-11-15
  Password Toggle & Form Validation :b5, 2025-11-10, 2025-12-05
  Admin Dashboard Components :b6, 2025-11-20, 2026-01-20
  
  section Backend Development
  Node/Express Setup :c1, 2025-09-01, 2025-09-15
  Authentication & JWT :c2, 2025-09-10, 2025-09-25
  Booking API Endpoints :c3, 2025-09-20, 2025-11-10
  Admin Approval Workflow :c4, 2025-10-15, 2025-11-20
  Conflict Detection (30-min) :c5, 2025-11-05, 2025-12-10
  Calendar Management API :c6, 2025-11-15, 2025-12-20
  User & Invite Code Management :c7, 2025-11-25, 2026-01-15
  Real-time Notifications (Socket.IO) :c8, 2025-12-01, 2026-01-25
  
  section Testing & QA
  Unit Testing :d1, 2026-01-15, 2026-02-01
  Integration Testing :d2, 2026-01-20, 2026-02-10
  User Acceptance Testing :d3, 2026-02-01, 2026-02-20
  Bug Fixes & Optimization :d4, 2026-02-10, 2026-03-05
  
  section Documentation & Deployment
  System Documentation :e1, 2026-01-20, 2026-02-28
  API Documentation :e2, 2026-02-01, 2026-03-10
  Project Diagrams & Algorithms :e3, 2026-02-15, 2026-03-15
  Production Deployment :crit, e4, 2026-03-22, 2026-03-28
  Post-Deployment Monitoring :e5, 2026-03-28, 2026-04-10
```

## 4) Booking Process Flowchart

```mermaid
flowchart TD
  Start([Member Opens Booking])-->SelectService[Select Service Type]
  SelectService-->SelectDate[Select Date<br/>Within 6-Month Window]
  SelectDate-->ValidateDate{Date Valid?}
  ValidateDate-->|No| DateError[Show Error<br/>Must be Tomorrow+]
  DateError-->SelectDate
  SelectDate-->SelectTime[Select Time 8am-6pm]
  SelectTime-->ValidateTime{Time Valid?}
  ValidateTime-->|No| TimeError[Show Error<br/>Outside Working Hours]
  TimeError-->SelectTime
  ValidateTime-->|Yes| CheckBookingLimit{Active Bookings<br/>< 2?}
  CheckBookingLimit-->|No| LimitError[Show Error<br/>Cancel One First]
  LimitError-->End1([Cannot Proceed])
  CheckBookingLimit-->|Yes| FillForm[Fill Service-Specific Form]
  FillForm-->ValidateForm{Form Valid?}
  ValidateForm-->|No| FormError[Show Error]
  FormError-->FillForm
  ValidateForm-->|Yes| ChairsNeeded{Chairs/Tables?}
  ChairsNeeded-->|Yes| EnterQuantity[Enter Quantities]
  ChairsNeeded-->|No| Preview[Show Preview]
  EnterQuantity-->Preview
  Preview-->Confirm{Confirm?}
  Confirm-->|No| Cancel([Cancelled])
  Confirm-->|Yes| Submit[Submit Request]
  Submit-->CreateRequest[Create booking_request<br/>Status: pending]
  CreateRequest-->NotifyAdmin[Notify Admins]
  NotifyAdmin-->Success([Request Submitted<br/>Awaiting Approval])
```

## 5) System Architecture Diagram

```mermaid
flowchart TB
  subgraph Client["Client Layer"]
    Web["Web Browser<br/>React App"]
    Mobile["Mobile Browser<br/>Responsive UI"]
  end
  
  subgraph Presentation["Presentation Layer"]
    Dashboard["Dashboard Component"]
    AdminDash["Admin Dashboard"]
    BookingModal["Booking Modal"]
    Calendar["Calendar View"]
  end
  
  subgraph Business["Business Logic Layer"]
    AuthService["Authentication Service<br/>JWT Tokens"]
    BookingService["Booking Service<br/>FCFS Algorithm"]
    ConflictService["Conflict Checker<br/>30-min Proximity"]
    NotificationService["Notification Service<br/>Socket.IO"]
  end
  
  subgraph API["API Layer"]
    AuthAPI["/auth/register<br/>/auth/login"]
    BookingAPI["/bookings<br/>/booking-requests<br/>/booking-records"]
    CalendarAPI["/calendar<br/>/events"]
    UserAPI["/users<br/>/invite-codes"]
  end
  
  subgraph Database["Data Layer"]
    DB[("PostgreSQL<br/>SQLite")]
  end
  
  subgraph External["External Services"]
    Email["Email Service<br/>Nodemailer"]
    Socket["Socket.IO<br/>Real-time"]
  end
  
  Web-->Dashboard
  Mobile-->Dashboard
  Web-->AdminDash
  Mobile-->AdminDash
  Dashboard-->BookingModal
  Dashboard-->Calendar
  AdminDash-->BookingModal
  
  Dashboard-->AuthService
  BookingModal-->BookingService
  BookingService-->ConflictService
  AdminDash-->NotificationService
  
  AuthService-->AuthAPI
  BookingService-->BookingAPI
  ConflictService-->BookingAPI
  Calendar-->CalendarAPI
  AdminDash-->UserAPI
  
  AuthAPI-->DB
  BookingAPI-->DB
  CalendarAPI-->DB
  UserAPI-->DB
  
  NotificationService-->Email
  NotificationService-->Socket
  Socket-->Web
  Socket-->Mobile
```

## 6) Control Structure Diagram

```mermaid
flowchart LR
  subgraph RoleControl["Role-Based Access Control"]
    Member["Member"]
    Admin["Admin"]
    SuperAdmin["Super Admin"]
  end
  
  subgraph MemberActions["Member Permissions"]
    MB1["View Calendar"]
    MB2["Create Booking"]
    MB3["Cancel Own Booking"]
    MB4["View Notifications"]
    MB5["Submit Concerns"]
  end
  
  subgraph AdminActions["Admin Permissions"]
    AB1["All Member Actions"]
    AB2["Approve/Reject Bookings"]
    AB3["Manage Calendar"]
    AB4["Edit/Cancel Any Booking"]
    AB5["View Reports"]
    AB6["Manage Events"]
    AB7["Manage Invite Codes"]
  end
  
  subgraph SuperAdminActions["Super Admin Permissions"]
    SA1["All Admin Actions"]
    SA2["Delete Records"]
    SA3["Delete Invite Codes"]
    SA4["User Management"]
    SA5["System Settings"]
  end
  
  Member-->MB1
  Member-->MB2
  Member-->MB3
  Member-->MB4
  Member-->MB5
  
  Admin-->AB1
  Admin-->AB2
  Admin-->AB3
  Admin-->AB4
  Admin-->AB5
  Admin-->AB6
  Admin-->AB7
  
  SuperAdmin-->SA1
  SuperAdmin-->SA2
  SuperAdmin-->SA3
  SuperAdmin-->SA4
  SuperAdmin-->SA5
```

## 7) Sequence Diagram

```mermaid
sequenceDiagram
  actor Member
  participant UI as Frontend UI
  participant API as Backend API
  participant DB as Database
  participant N as Notification Service
  participant Admin as Admin Dashboard

  Member->>UI: Fill booking form with time 8am-6pm
  UI->>UI: Client-side validation (time range, required fields)
  UI->>API: POST /api/bookings (create booking request)
  API->>API: Validate date in 6-month window, service, time range
  API->>DB: Insert booking_request (status: pending)
  API->>DB: Add booking_record (action: submitted)
  API->>N: Notify admins of new request
  N-->>Admin: New booking request notification
  API-->>UI: Success response
  UI-->>Member: Booking request submitted for approval
  Admin->>UI: Reviews pending requests in admin dashboard
  Admin->>API: PUT /api/booking-requests/:id/accept
  API->>DB: Update booking_request (status: accepted)
  API->>DB: Create booking record (confirmed)
  API->>DB: Add booking_record (action: accepted)
  API->>N: Notify member of approval
  N-->>Member: Booking confirmed notification
  UI->>UI: Update calendar to display confirmed booking
```

## 8) Entity Relationship Diagram

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : creates
  USERS ||--o{ BOOKING_REQUESTS : submits
  USERS ||--o{ BOOKING_RECORDS : owns
  USERS ||--o{ CONCERNS : submits
  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ BOOKING_EDITS : proposes
  USERS ||--o{ REQUEST_EDITS : proposes
  BOOKINGS ||--o{ BOOKING_RECORDS : logs
  BOOKINGS ||--o{ BOOKING_EDITS : referenced
  BOOKING_REQUESTS ||--o{ BOOKING_RECORDS : logs
  BOOKING_REQUESTS ||--o{ REQUEST_EDITS : referenced
  CALENDAR ||--o{ BOOKINGS : limits
  EVENTS ||--o{ BOOKING_RECORDS : references

  USERS {
    int id
    string name
    string email
    string password
    string role
  }

  BOOKINGS {
    int id
    int userId
    string name
    string email
    string service
    string date
    string slot
    string details
  }

  BOOKING_REQUESTS {
    int id
    int userId
    string name
    string email
    string service
    string date
    string slot
    string requestStatus
    string details
  }

  BOOKING_RECORDS {
    int id
    int requestId
    int bookingId
    int userId
    string service
    string date
    string slot
    string action
    string details
  }

  CONCERNS {
    int id
    int userId
    string subject
    string message
    string concernStatus
  }

  NOTIFICATIONS {
    int id
    int userId
    string type
    string text
    string read
  }

  CALENDAR {
    string date
    int max_slots
    int booked
  }

  EVENTS {
    int id
    string title
    string date
    string time
    string description
  }

  BOOKING_EDITS {
    int id
    int bookingId
    int userId
    int adminId
    string currentBookingDate
    string currentBookingSlot
    string currentBookingDetails
    string proposedBookingDate
    string proposedBookingSlot
    string proposedBookingDetails
    string adminNote
    string userReply
    string proposalStatus
    string createdAt
  }

  REQUEST_EDITS {
    int id
    int bookingRequestId
    int userId
    int adminId
    string currentRequestDate
    string currentRequestSlot
    string currentRequestDetails
    string proposedRequestDate
    string proposedRequestSlot
    string proposedRequestDetails
    string adminNote
    string userReply
    string proposalStatus
    string createdAt
  }
```

## 9) Class Diagram

```mermaid
classDiagram
  class App {
    +user
    +currentPage
    +notifications
    +handleLogout()
    +handleUserUpdate()
  }

  class BookingModal {
    +date
    +events
    +service
    +serviceFormData
    +windowWidth
    +submit()
    +validateServiceForm()
  }

  class Dashboard {
    +bookings
    +events
    +calendarBookings
    +myConcerns
    +bookingEditProposals
    +bookingRequestEditProposals
    +windowWidth
    +sidebarOpen
    +loadData()
    +editAcceptedBooking()
    +proposeBookingChange()
    +proposeRequestChange()
    +submitConcern()
  }

  class AdminDashboard {
    +bookings
    +records
    +users
    +events
    +concerns
    +bookingEditProposals
    +bookingRequestEditProposals
    +windowWidth
    +sidebarOpen
    +loadData()
    +editAcceptedBooking()
    +reportData
    +reviewEditProposals()
    +resolveConcerns()
  }

  class CalendarViewNew {
    +bookings
    +calendarConfig
    +handleDayClick()
    +refreshCalendar()
  }

  class NotificationCenter {
    +notifications
    +markRead()
    +deleteNotification()
    +displayProposalAlert()
  }

  class ConcernManager {
    +concerns
    +replyMessage
    +submitConcern()
    +replyConcern()
    +resolveConcern()
  }

  class api {
    +auth.login()
    +auth.register()
    +bookings.list()
    +bookings.create()
    +bookings.update()
    +bookingRequests.list()
    +calendar.get()
    +events.create()
    +concerns.create()
  }

  App --> Dashboard
  App --> AdminDashboard
  App --> BookingModal
  App --> CalendarViewNew
  App --> NotificationCenter
  App --> ConcernManager
  BookingModal --> api
  Dashboard --> api
  AdminDashboard --> api
  CalendarViewNew --> api
  NotificationCenter --> api
  ConcernManager --> api
```

## 10) Deployment Diagram

```mermaid
flowchart LR
  subgraph Client["Client Device"]
    Browser["Web Browser"]
    Mobile["Mobile/Tablet Responsive"]
  end

  subgraph Frontend["Frontend Server"]
    ReactApp["React App<br/>church-frontend"]
    Responsive["Responsive Components<br/>7 Breakpoints"]
    Modal["Booking Modals<br/>Scrollable Dialogs"]
  end

  subgraph Backend["Backend Server"]
    NodeAPI["Node.js/Express API<br/>church-backend"]
    SocketIO["Socket.IO"]
    Validation["Validation Layer<br/>8am-6pm, 6-month window"]
  end

  subgraph Database["Database Layer"]
    DB["SQLite / PostgreSQL<br/>bookings, calendar, users"]
  end

  Browser --> ReactApp
  Mobile --> ReactApp
  ReactApp --> Responsive
  ReactApp --> Modal
  ReactApp --> NodeAPI
  ReactApp --> SocketIO
  NodeAPI --> Validation
  NodeAPI --> DB
  SocketIO --> Browser
  SocketIO --> Mobile
```

## 11) Algorithmic Process

### A. FCFS Algorithm

1. Accept booking requests in the order they are submitted.
2. Validate the slot, service, and required details.
3. Store valid requests in the booking requests table.
4. Process the earliest pending request first.
5. Check whether the selected date still has available capacity.
6. For exclusive services, verify that the slot is still free.
7. Move approved requests into the confirmed bookings table.
8. Update the calendar booked count.
9. Record the action in booking records.
10. Notify the user and administrator.

### B. Conflict Checker Algorithm

1. When approving a booking request, check for conflicts with existing bookings.
2. Query bookings on the same date where the time difference is less than or equal to 30 minutes.
3. Also check other pending requests for the same date and time proximity.
4. If any conflicts are found, display them to the admin.
5. Admin can choose to approve anyway or reject the request.
6. If approved, create the booking and update records.
7. Notify the member of the approval or rejection.

### C. Date Availability Control Algorithm

1. Admin selects a date in the calendar control panel.
2. Admin sets the maximum booking count for that date.
3. If the maximum count is zero, close the date for bookings.
4. If the maximum count is greater than zero, open the date for bookings.
5. Save the value to the calendar table.
6. Refresh the calendar to show the new availability state.
7. Prevent booking submission when the date is closed or full.

## 12) Pseudocode

### A. FCFS Algorithm

```text
BEGIN
  RECEIVE booking requests in submission order
  FOR each pending request
    VALIDATE slot, service, and required details
    IF request is valid AND date has capacity THEN
      APPROVE request
      MOVE request to confirmed bookings
      UPDATE calendar booked count
      LOG action in booking records
      NOTIFY user and admin
      STOP processing if only one request is being approved
    ENDIF
  END FOR
END
```

### B. Conflict Checker Algorithm

```text
BEGIN
  INPUT: booking request with date and time
  
  FIND all existing bookings on same date
  FOR each booking on same date
    CALCULATE time difference in minutes
    IF ABS(time_difference) <= 30 THEN
      ADD to conflicts list
    ENDIF
  END FOR
  
  FIND all pending requests on same date
  FOR each pending request on same date
    CALCULATE time difference in minutes
    IF ABS(time_difference) <= 30 THEN
      ADD to conflicts list
    ENDIF
  END FOR
  
  IF conflicts list is not empty THEN
    DISPLAY conflicts to admin
    WAIT for admin decision (approve anyway or reject)
  ELSE
    PROCEED with booking approval
  ENDIF
END
```

### C. Date Availability Control Algorithm

```text
BEGIN
  ADMIN selects a date
  ADMIN enters max booking count
  IF max booking count = 0 THEN
    CLOSE date for bookings
  ELSE
    OPEN date for bookings
  ENDIF
  SAVE max booking count in calendar table
  REFRESH calendar display
END
```

## 13) Algorithms

### A. FCFS Algorithm

- Input: booking requests, request order, date capacity
- Output: approved request in first-come-first-served order

Steps:
1. Receive booking requests in the order they are submitted.
2. Validate each request before storage.
3. Queue valid requests as pending.
4. Select the earliest pending request first.
5. Approve it only if the date still has available capacity.
6. Record the approved booking and log the action.

### B. Conflict Checker Algorithm

- Input: booking request with date and time slot
- Output: list of conflicting bookings/requests within 30-minute proximity

Steps:
1. Query all existing bookings on the requested date.
2. For each booking, calculate the absolute time difference in minutes.
3. If any booking has a time difference of 30 minutes or less, add to conflicts.
4. Query all pending requests on the requested date.
5. For each pending request, calculate the absolute time difference in minutes.
6. If any request has a time difference of 30 minutes or less, add to conflicts.
7. If conflicts exist, display them to admin with options to approve anyway or reject.
8. If no conflicts, proceed with booking approval.

### C. Date Availability Control Algorithm

- Input: selected date, max booking count
- Output: open or closed availability state

Steps:
1. Admin selects a date in the calendar settings panel.
2. Admin enters the maximum allowed booking count.
3. If the count is zero, set the date to closed.
4. If the count is greater than zero, set the date to open.
5. Save the updated setting to the calendar table.
6. Re-render the calendar to reflect the new state.

## 14) Core Business Algorithms

### A. Booking Request Submission & Approval Flow

```text
BEGIN
  MEMBER inputs booking form (date, service, time, details)
  
  VALIDATE date in 6-month window AND time in 8am-6pm AND service details
  IF validation fails THEN
    REJECT with error message
    STOP
  ENDIF
  
  CHECK booking limit (active count <= BOOKING_LIMIT=2)
  IF user exceeds limit THEN
    REJECT with error "Limit reached, cancel one first"
    STOP
  ENDIF
  
  CHECK calendar max_slots for selected date
  IF max_slots <= 0 THEN
    REJECT with error "This date is closed for bookings"
    STOP
  ENDIF
  
  IF all validations pass THEN
    INSERT booking_request with status='pending'
    INSERT booking_record with action='submitted'
    NOTIFY all admins of new request
    RETURN success: "Booking request submitted for admin verification"
  ENDIF
  
  ADMIN reviews request in admin dashboard
  
  WHEN admin accepts request:
    UPDATE booking_request status='accepted'
    INSERT new booking record (confirmed)
    INSERT booking_record with action='accepted'
    NOTIFY member: "Your booking has been confirmed"
    CALENDAR updates to show confirmed booking
  
  WHEN admin rejects request:
    UPDATE booking_request status='rejected'
    INSERT booking_record with action='rejected'
    NOTIFY member: "Your booking request was declined"
END
```

### B. Time Validation (8:00 AM - 6:00 PM, Any Minute)

```text
BEGIN
  INPUT: user selected time as HH:MM format
  PARSE hours and minutes from time string
  MINIMUM_HOUR = 8 (8:00 AM)
  MAXIMUM_HOUR = 18 (6:00 PM, boundary)
  
  IF hours >= MINIMUM_HOUR AND hours < MAXIMUM_HOUR THEN
    ACCEPT time (any minute allowed: 8:15, 2:47, etc.)
  ELSE IF hours = 18 AND minutes = 0 THEN
    ACCEPT time (exactly 6:00 PM boundary case)
  ELSE
    REJECT time with error
    Display: "Time must be between 8:00 AM and 6:00 PM"
  ENDIF
END
```

### C. Calendar Navigation (6-Month Dynamic Window)

```text
BEGIN
  TODAY = current date
  EARLIEST_VALID_DATE = TODAY + 1 day (tomorrow)
  LATEST_VALID_DATE = TODAY + 6 months
  
  WHEN user clicks "Previous Month" button:
    CURRENT_MONTH = CURRENT_MONTH - 1 month
    IF CURRENT_MONTH < EARLIEST_VALID_DATE THEN
      DISABLE previous button (opacity: 0.5, pointer-events: none)
    ELSE
      ENABLE previous button
    ENDIF
  
  WHEN user clicks "Next Month" button:
    CURRENT_MONTH = CURRENT_MONTH + 1 month
    IF CURRENT_MONTH > LATEST_VALID_DATE THEN
      DISABLE next button (opacity: 0.5, pointer-events: none)
    ELSE
      ENABLE next button
    ENDIF
  
  WHEN user selects date:
    IF selected_date < EARLIEST_VALID_DATE THEN
      REJECT with error "Cannot book past or today's date"
    ELSE IF selected_date > LATEST_VALID_DATE THEN
      REJECT with error "Can only book up to 6 months in advance"
    ELSE
      ACCEPT date
    ENDIF
END
```

### D. Mobile Responsive Layout Algorithm

```text
BEGIN
  INITIALIZE windowWidth = window.innerWidth
  ADD resize event listener to window
  
  DEFINE BREAKPOINTS = [390, 420, 520, 600, 680, 900, 1920]
  
  ON window resize OR component mount:
    windowWidth = window.innerWidth
    
    IF windowWidth <= 900 THEN
      SET sidebar mode = "drawer"
      SET hamburger button = visible
      SET left column position = fixed, z-index: 990
      SET left column transform = translateX(-105%)
      
      WHEN user clicks hamburger:
        SET sidebar drawer state = open
        LEFT column transform = translateX(0)
        ADD overlay backdrop with z-index 980
        SET body overflow = hidden (prevent scroll)
        ADD body class "sidebar-drawer-open"
      
      WHEN user clicks overlay OR back button:
        SET sidebar drawer state = closed
        LEFT column transform = translateX(-105%)
        REMOVE body class "sidebar-drawer-open"
        SET body overflow = auto
    ELSE
      SET sidebar mode = "fixed" (always visible)
      SET hamburger button = hidden
      SET left column position = relative
    ENDIF
    
    IF windowWidth <= 600 THEN
      SET main grid = 1 column
      SET modal width = min(100vw - 16px, 480px)
      SET modal padding = 8-12px
      SET font size = 11-13px (scale down)
    ELSE IF windowWidth <= 900 THEN
      SET main grid = 1 column
      SET modal width = min(100vw - 20px, 500px)
      SET modal padding = 12-16px
      SET font size = 12-14px
    ELSE
      SET main grid = 2 columns (repeat(2, 1fr))
      SET modal width = 500px
      SET modal padding = 20-24px
      SET font size = 14-16px
    ENDIF
  END
END
```

## 15) Mobile Responsive Design Patterns

### Scrollable Container Pattern (Flexbox with Overflow)

The system uses a critical pattern for handling overflow in modals and scrollable areas:

```css
.scrollable-content {
  flex: 1;
  min-height: 0;  /* Critical: allows flex shrink below content height */
  overflow-y: auto;
  overflow-x: hidden;
}

.fixed-footer {
  flex-shrink: 0;  /* Prevents buttons from shrinking */
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
```

**Why This Works:** The `min-height: 0` is essential for flexbox overflow to work correctly. Without it, the flex child won't shrink below its content height, causing overflow problems.

**Applied To:**
- BookingModal service form (scrollable form with fixed buttons)
- Dashboard sidebar contact card (scrollable within sidebar)
- AdminDashboard report sections (scrollable content areas)

### Mobile Drawer Pattern (Fixed Overlay)

```css
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 980;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  z-index: 990;
  transform: translateX(-105%);
  transition: transform 0.3s ease;
}

.sidebar.open {
  transform: translateX(0);
}

body.sidebar-drawer-open {
  overflow: hidden;  /* Prevent background scroll when drawer open */
}

.right-column.drawer-open {
  pointer-events: none;  /* Disable interaction with right column */
}
```

### Unified Card Styling System

All card containers share consistent styling:

```css
.card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(214, 173, 96, 0.35);
  border-top: 3px solid #d6ad60;  /* Gold signature accent */
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(31, 42, 68, 0.08);
  padding: 20px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .card {
    border-radius: 16px;
    box-shadow: 0 8px 16px rgba(31, 42, 68, 0.06);
    padding: 14px;
  }
}

@media (max-width: 420px) {
  .card {
    border-radius: 14px;
    box-shadow: 0 4px 8px rgba(31, 42, 68, 0.04);
    padding: 12px;
  }
}
```

**Applied Classes:**
- `.church-card` (notification, concern cards)
- `.dashboard-dialog-card` (booking confirmation dialogs)
- `.dashboard-report-card` (admin report sections)
- `.dashboard-card-container` (generic card wrapper)

### 7 Responsive Breakpoints

| Breakpoint | Devices | Layout | Grid | Font | Purpose |
|-----------|---------|--------|------|------|---------|
| 390px | iPhone 12 mini | 1-col drawer | 1fr | 11px | Ultra-compact phones |
| 420px | iPhone 12/13 | 1-col drawer | 1fr | 12px | Standard phones |
| 520px | Larger phones | 1-col drawer | 1fr | 13px | Phablet devices |
| 600px | Tablets/Foldable | 1-col sidebar | 1fr | 14px | Tablet portrait |
| 680px | iPad mini | 2-col sidebar | repeat(1-2, 1fr) | 14px | Small tablet |
| 900px | iPad/Desktop | 2-col fixed | repeat(2, 1fr) | 16px | Tablet landscape / small desktop |
| 1920px+ | Desktop | 2-col fixed | repeat(2, 1fr) | 16px | Large desktop |

## 16) Booking Modal Multi-Step Flow

```mermaid
sequenceDiagram
  participant User as User<br/>
  participant Form as Booking Form
  participant Val as Validator
  participant API as Backend
  participant Store as Database

  User->>Form: Open booking modal
  Form->>Form: Step 1: Display service selection
  User->>Form: Select service (e.g., Baptism, Funeral)
  Form->>Val: Validate service choice
  Val-->>Form: Valid
  
  Form->>Form: Step 2: Calendar date picker
  User->>Form: Select date (within 6-month window)
  Form->>Val: Validate date (tomorrow to +6 months)
  Val-->>Form: Valid
  
  Form->>Form: Step 3: Select time slot
  User->>Form: Select time 8:00 AM - 6:00 PM
  Form->>Val: Validate time range
  Val-->>Form: Valid
  
  Form->>Form: Step 4: Service-specific form
  Note over Form: Service form is scrollable<br/>Baptism (2 fields), Funeral (4 fields),<br/>Wedding (3 fields), Other (1 field)
  User->>Form: Fill required fields
  Form->>Val: Validate all required fields
  Val-->>Form: Valid
  
  Form->>Form: Step 5: Optional chairs/tables
  User->>Form: Enter chairs (optional) and tables (optional)
  
  Form->>Form: Step 6: Preview and confirm
  Form->>User: Display booking summary
  User->>Form: Click "Submit Request"
  
  Form->>API: POST /api/bookings
  API->>Store: Create booking_request (status: pending)
  API->>Store: Create booking_record (action: submitted)
  API-->>Form: Success response
  Form->>User: Show "Request submitted for approval"
  User->>User: Redirect to dashboard
```

## 17) Admin Approval Workflow

After a member submits a booking request:

1. **Notification**: Admin receives notification of pending request
2. **Review**: Admin views request details in admin dashboard
3. **Decision Points**:
   - **Accept**: Booking becomes confirmed, member notified
   - **Reject**: Request marked rejected, member notified
   - **Edit & Accept**: Admin can modify details (date, time, service) before accepting
4. **Confirmation**: Once accepted, booking appears on member's calendar and in reports
5. **Cancellation**: Member or admin can cancel confirmed bookings anytime

## 18) Notes for the Report

- **Time Validation**: Bookings are restricted to 8:00 AM - 6:00 PM with no 30-minute interval restrictions. Any minute value is allowed within this range (e.g., 8:15 AM, 2:47 PM, 6:00 PM are all valid).
- **Calendar Navigation**: Past months are automatically disabled. Users can only view and book within a dynamic 6-month forward-looking window (tomorrow through 6 months ahead). Month navigation buttons disable gracefully at window boundaries.
- **Booking Request Workflow**: When a user submits a booking form, it creates a pending request that requires admin approval before becoming a confirmed booking. Admins can accept/reject/edit requests from the admin dashboard. Once accepted, the booking is confirmed and the member is notified.
- **Mobile Responsiveness**: The system implements a mobile-first responsive design with 7 key breakpoints (390px, 420px, 520px, 600px, 680px, 900px, 1920px+). Sidebar transforms into a full-screen drawer overlay on mobile with backdrop overlay and body scroll-lock.
- **Responsive Modals**: Booking modals are fully responsive with scrollable content areas and fixed action buttons. Service forms handle 2-4 fields without layout overflow using the flexbox `flex: 1, min-height: 0` pattern.
- **Sidebar Features**: Left sidebar is independently scrollable to ensure contact information (email, phone, Facebook) is always accessible. On mobile, hamburger menu opens drawer with fixed positioning and z-index layering. Right column interaction is disabled while drawer is open.
- **Consistent Card Design**: All white container cards use unified design system: semi-transparent white background, 1px outer border, **3px gold top accent border** (visual signature), rounded corners (responsive: 18px base, 16px @600px, 14px @420px, 12px @390px), and subtle shadows that scale down on mobile.
- **Responsive Grid System**: Dashboard uses conditional `gridTemplateColumns` React state. Desktop (900px+): `repeat(2, 1fr)` two columns. Tablet (600-900px): `1fr` single column (sidebar + main). Mobile (<600px): `1fr` single column with drawer sidebar.
- **Data Storage**: The booking `details` field is stored as JSON and includes chapel selection, service-specific data (couple names for weddings, deceased info for funerals), chairs/tables quantities, and setup notes.
- **Notification System**: Real-time notifications via Socket.IO for all booking actions (new bookings, confirmations, cancellations), proposal responses, and concern status updates.
- **Architecture**: React frontend with responsive hooks (useState, useEffect, useCallback, useMemo) and dynamic resize listeners. Node/Express backend with validation layer enforcing business rules. SQLite database with normalized schema. Components: Dashboard, AdminDashboard, BookingModal (scrollable service form), CalendarViewNew, NotificationCenter, PageWrapper, authenticated routing with role-based access control. Role-based access control includes three roles: member (basic users), admin (can manage bookings and users), superadmin (full access including deleting records and invite codes).
