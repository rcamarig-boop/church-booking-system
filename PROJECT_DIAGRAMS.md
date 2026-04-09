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

  UC1[Register / Login]
  UC2[View Calendar]
  UC3[Check Available Slots]
  UC4[Create Booking Request]
  UC5[Cancel Own Booking]
  UC6[Submit Concern]
  UC7[View Notifications]

  UC8[Manage Calendar Slots]
  UC9[Approve / Edit Booking Request]
  UC10[Edit / Cancel Booking]
  UC11[Manage Events]
  UC12[Manage Users]
  UC13[Resolve Concerns]
  UC14[View Reports]

  Member --> UC1
  Member --> UC2
  Member --> UC3
  Member --> UC4
  Member --> UC5
  Member --> UC6
  Member --> UC7

  Admin --> UC1
  Admin --> UC8
  Admin --> UC9
  Admin --> UC10
  Admin --> UC11
  Admin --> UC12
  Admin --> UC13
  Admin --> UC14
  Admin --> UC7
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
  T --> U[Auto-create booking record]
  U --> V[Notify admin of new booking]
  V --> W([End])
```

## 3) Sequence Diagram

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
  API->>DB: Auto-create booking record (no admin approval)
  API->>DB: Create corresponding booking (auto-confirmed)
  API->>N: Notify admin of new booking
  N-->>Admin: Booking confirmed notification
  API-->>UI: Success response with booking_id
  UI-->>Member: Booking confirmed successfully
  UI->>UI: Update calendar to display new booking
```

## 4) Entity Relationship Diagram

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : creates
  USERS ||--o{ BOOKING_REQUESTS : submits
  USERS ||--o{ BOOKING_RECORDS : owns
  USERS ||--o{ CONCERNS : submits
  USERS ||--o{ NOTIFICATIONS : receives
  BOOKINGS ||--o{ BOOKING_RECORDS : logs
  BOOKING_REQUESTS ||--o{ BOOKING_RECORDS : logs
  CALENDAR ||--o{ BOOKINGS : limits
  EVENTS ||--o{ BOOKING_RECORDS : references

  USERS {
    int id PK
    string name
    string email
    string password
    string role
  }

  BOOKINGS {
    int id PK
    int userId FK
    string name
    string email
    string service
    string date
    string slot
    json details
  }

  BOOKING_REQUESTS {
    int id PK
    int userId FK
    string name
    string email
    string service
    string date
    string slot
    string status
    json details
  }

  BOOKING_RECORDS {
    int id PK
    int request_id FK
    int booking_id FK
    int userId FK
    string service
    string date
    string slot
    string action
    json details
  }

  CONCERNS {
    int id PK
    int userId FK
    string subject
    string message
    string status
  }

  NOTIFICATIONS {
    int id PK
    int userId FK
    string type
    string text
    boolean read
  }

  CALENDAR {
    date date PK
    int max_slots
    int booked
  }

  EVENTS {
    int id PK
    string title
    string date
    string time
    string description
  }
```

## 5) Class Diagram

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
    +windowWidth
    +sidebarOpen
    +loadData()
    +editAcceptedBooking()
  }

  class AdminDashboard {
    +bookings
    +records
    +users
    +events
    +windowWidth
    +sidebarOpen
    +loadData()
    +editAcceptedBooking()
    +reportData
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
  BookingModal --> api
  Dashboard --> api
  AdminDashboard --> api
  CalendarViewNew --> api
  NotificationCenter --> api
```

## 6) Deployment Diagram

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

## 7) Algorithmic Process

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

### B. Date Color Conditioning Algorithm

1. Read the number of bookings already placed on each date.
2. Read the maximum booking count configured for that date.
3. Assign green if the date has no bookings.
4. Assign yellow if the date is partially occupied.
5. Assign orange if the date is nearing capacity.
6. Assign red if the date is fully booked.
7. Render the calendar cell using the assigned color.
8. Mark closed dates as unavailable.

### C. Date Availability Control Algorithm

1. Admin selects a date in the calendar control panel.
2. Admin sets the maximum booking count for that date.
3. If the maximum count is zero, close the date for bookings.
4. If the maximum count is greater than zero, open the date for bookings.
5. Save the value to the calendar table.
6. Refresh the calendar to show the new availability state.
7. Prevent booking submission when the date is closed or full.

## 8) Pseudocode

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

### B. Date Color Conditioning Algorithm

```text
BEGIN
  FOR each date in the calendar
    READ booked count
    READ max booking count
    IF date is closed THEN
      SET color to gray
    ELSE IF booked count = 0 THEN
      SET color to green
    ELSE IF booked count is near max THEN
      SET color to orange
    ELSE IF booked count is partially filled THEN
      SET color to yellow
    ELSE IF booked count >= max booking count THEN
      SET color to red
    ENDIF
    RENDER date with selected color
  END FOR
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

## 9) Algorithms

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

### B. Date Color Conditioning Algorithm

- Input: booked count and maximum booking count
- Output: calendar cell color

Steps:
1. Read the current number of bookings for the date.
2. Read the maximum booking count set by the admin.
3. Use green for empty dates.
4. Use yellow for partially occupied dates.
5. Use orange for dates nearing capacity.
6. Use red for full dates.
7. Use gray or unavailable styling for closed dates.

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

## 10) Time Validation Algorithm

### A. Time Validation (8am-6pm, Any Minute)

```text
BEGIN
  INPUT: user selected time as HH:MM format
  PARSE hours and minutes from time string
  MINIMUM_HOUR = 8 (8:00 AM)
  MAXIMUM_HOUR = 18 (6:00 PM, exclusive end)
  
  IF hours >= MINIMUM_HOUR AND hours < MAXIMUM_HOUR THEN
    ACCEPT time
    Display: "Time accepted (any minute allowed)"
  ELSE IF hours = 18 AND minutes = 0 THEN
    ACCEPT time (exactly 6:00 PM, boundary case)
  ELSE
    REJECT time
    Display: "Time must be between 8:00 AM and 6:00 PM"
  ENDIF
END
```

### B. Calendar Navigation (6-Month Dynamic Window)

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

### C. Mobile Responsive Layout Algorithm

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

## 11) Mobile Responsive Design Patterns

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

## 12) Booking Modal Multi-Step Flow

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
  User->>Form: Click "Confirm Booking"
  
  Form->>API: POST /api/bookings
  API->>Store: Auto-create booking_record
  API->>Store: Auto-create booking (confirmed)
  API-->>Form: Success response
  Form->>User: Show success notification
  User->>User: Redirect to dashboard
```

## 13) Notes for the Report

- **Time Validation**: Bookings are restricted to 8:00 AM - 6:00 PM with no 30-minute interval restrictions. Any minute value is allowed within this range (e.g., 8:15 AM, 2:47 PM, 6:00 PM are all valid).
- **Calendar Navigation**: Past months are automatically disabled. Users can only view and book within a dynamic 6-month forward-looking window (tomorrow through 6 months ahead). Month navigation buttons disable gracefully at window boundaries.
- **Auto-Booking System**: When a user submits a booking request, the system automatically creates the booking record without waiting for admin approval, improving user experience and reducing booking uncertainty.
- **Mobile Responsiveness**: The system implements a mobile-first responsive design with 7 key breakpoints (390px, 420px, 520px, 600px, 680px, 900px, 1920px+). Sidebar transforms into a full-screen drawer overlay on mobile with backdrop overlay and body scroll-lock.
- **Responsive Modals**: Booking modals are fully responsive with scrollable content areas and fixed action buttons. Service forms handle 2-4 fields without layout overflow using the flexbox `flex: 1, min-height: 0` pattern.
- **Sidebar Features**: Left sidebar is independently scrollable to ensure contact information (email, phone, Facebook) is always accessible. On mobile, hamburger menu opens drawer with fixed positioning and z-index layering. Right column interaction is disabled while drawer is open.
- **Consistent Card Design**: All white container cards use unified design system: semi-transparent white background, 1px outer border, **3px gold top accent border** (visual signature), rounded corners (responsive: 18px base, 16px @600px, 14px @420px, 12px @390px), and subtle shadows that scale down on mobile.
- **Responsive Grid System**: Dashboard uses conditional `gridTemplateColumns` React state. Desktop (900px+): `repeat(2, 1fr)` two columns. Tablet (600-900px): `1fr` single column (sidebar + main). Mobile (<600px): `1fr` single column with drawer sidebar.
- **Data Storage**: The booking `details` field is stored as JSON and includes chapel selection, service-specific data (couple names for weddings, deceased info for funerals), chairs/tables quantities, and setup notes.
- **Notification System**: Real-time notifications via Socket.IO for all booking actions (new bookings, confirmations, cancellations), proposal responses, and concern status updates.
- **Architecture**: React frontend with responsive hooks (useState, useEffect, useCallback, useMemo) and dynamic resize listeners. Node/Express backend with validation layer enforcing business rules. SQLite database with normalized schema. Components: Dashboard, AdminDashboard, BookingModal (scrollable service form), CalendarViewNew, NotificationCenter, PageWrapper, authenticated routing with role-based access control.
