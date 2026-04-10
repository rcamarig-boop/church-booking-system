# Feature Guide

Comprehensive guide to all features in the Church Ministry Appointment Scheduling System

---

## Table of Contents

1. [Dashboard](#dashboard)
2. [Booking Management](#booking-management)
3. [Request Processing](#request-processing)
4. [Calendar Management](#calendar-management)
5. [Mass Services](#mass-services)
6. [Resource Management](#resource-management)
7. [Notifications](#notifications)
8. [Activity Logging](#activity-logging)
9. [User Interface](#user-interface)

---

## Dashboard

### Admin Dashboard

**Location:** `/admin` (requires admin role)

**Overview:**
- Centralized hub for church staff
- Quick access to all major functions
- Real-time status indicators
- Action summary widget

**Key Components:**

1. **To-Do Summary Widget**
   - Shows pending applications requiring action
   - Displays open concerns to address
   - Lists collective service opportunities
   - Click to navigate to relevant sections

2. **Navigation Tabs**
   - Analytics: View system statistics
   - Records: Manage parish records
   - Bookings: View confirmed bookings
   - Requests: Review pending requests
   - Concerns: Handle parishioner concerns
   - Mass Services: Manage collective services
   - Calendar: Set booking availability
   - Activity Log: View audit trail
   - Settings: System configuration

3. **Quick Actions**
   - Approve/reject requests
   - View conflicting bookings
   - Set booking capacity
   - Create new events

---

## Booking Management

### Member Booking Flow

1. **Create Request**
   - Click "Book Service" on landing page
   - Select service type
   - Choose preferred date and time
   - Fill in service-specific details
   - Submit for approval

2. **View Status**
   - Dashboard shows request status
   - Color-coded indicators:
     - 🟡 Yellow = Pending
     - 🟢 Green = Approved
     - 🔴 Red = Rejected
   - Email notifications sent automatically

3. **Confirmed Booking**
   - Once approved: appears in personal calendar
   - Receive reminder notifications
   - Can view booking details anytime

### Admin Booking Panel

**Location:** `/admin` > Requests Tab

**Features:**

1. **Request Table**
   - All pending booking requests listed
   - Filterable by status, date, service type
   - Sortable columns
   - Bulk selection option

2. **Quick Actions**
   - ✓ Approve: Click green checkmark
   - ✗ Reject: Click red X
   - ✎ Edit: Click pencil to modify details
   - View: Click row for full details

3. **Approval Process**
   - Review request details
   - Check for scheduling conflicts (automatic warning)
   - Add approval notes
   - Send confirmation automatically

4. **Conflict Detection**
   - System warns of same date/time conflicts
   - Shows existing bookings for comparison
   - Option to approve despite conflicts
   - Toast notification on completion

### Edit Booking

**Admin Can Modify:**
- Service time slot
- Chapel/resource location
- Service-specific details

**Cannot Modify:**
- Service type (locked for consistency)
- Requester information
- Original submission date

---

## Request Processing

### Bulk Actions

**Location:** Admin Panel > Requests Tab (when rows selected)

**How to Use:**

1. **Select Requests**
   - Check boxes beside individual requests
   - Or check header box to select all

2. **Bulk Operations**
   - Click "Approve All" to approve selected
   - Click "Reject All" to reject selected
   - Confirmation dialog appears
   - Operations execute in batch

3. **Efficiency Benefits**
   - Handle multiple requests quickly
   - Reduce time spent on repetitive approvals
   - Maintain audit trail of all actions

### Quick Filters

**Pre-built Filters:**
- All Requests: Shows everything
- Pending Only: Only awaiting action
- Today's Requests: Submitted today
- This Week: Within 7 days
- By Service Type: Filter by baptism, wedding, etc.

### Request Details

**View Full Information:**
- Requester name and contact
- Service type requested
- Preferred date and time
- Service-specific details
- Resource requirements
- Special notes or requirements

---

## Calendar Management

### View Calendar

**Location:** `/` (Member) or `/admin` > Calendar (Admin)

**Features:**

1. **Month View**
   - Color-coded dates
   - Click date for details
   - See available time slots

2. **Color Coding**
   - 🟢 Green: Fully available
   - 🟡 Yellow: Limited availability
   - 🟠 Orange: Mostly booked
   - 🔴 Red: Fully booked/closed

3. **Responsive Design**
   - Week view on tablets
   - Month view on desktop
   - Mobile-friendly display

### Admin Calendar Control

**Location:** `/admin` > Calendar Tab

**Capabilities:**

1. **Set Booking Limits**
   - Select date
   - Enter maximum bookings allowed
   - Click "Set" to apply

2. **Open/Close Dates**
   - Toggle date availability
   - Can close specific dates
   - Explain reason if needed
   - Takes effect immediately

3. **Capacity Management**
   - View booked slots per date
   - See percentage full
   - Adjust limits as needed
   - Plan ahead for busy periods

---

## Mass Services

### Overview

"Mass Services" allows for collective booking of services where multiple parishioners participate together (e.g., group baptisms, weddings for multiple couples on same date).

### Collective Service Detection

**How System Identifies:**
- When 5+ pending requests share same date + service type
- System suggests converting to collective service
- Shows on Analytics tab with orange indicator cards
- Listed with count and date

### Apply for Collective Service

**Member Actions:**
1. View service in catalog
2. Click "Apply"
3. Fill service-specific form
4. Submit application
5. Await admin approval

**Status Options:**
- Pending: Awaiting approval
- Approved: Confirmed participation
- Rejected: Application declined

### Admin Management Panel

**Location:** `/admin` > Mass Services Tab

**Admin Capabilities:**

1. **View All Services**
   - List of all collective services
   - Current participant count
   - Application status

2. **Manage Applications**
   - Review individual applications
   - Approve/reject with reason
   - View participant details

3. **Create New Service**
   - Define service type
   - Set date and time
   - Set participant limit
   - Add description
   - Publish to members

4. **Analytics**
   - See participation trends
   - Identify opportunities
   - Plan future collective services

---

## Resource Management

### Chapel Booking

**Available Chapels:**
- Main Chapel: Larger capacity
- Side Chapel #1: Smaller/intimate

**Booking Includes:**
- Chapel selection
- Date and time slot
- Duration (if applicable)
- Equipment needs

### Equipment Management

**Equipment Types:**
- Chairs: Quantity based on needs
- Tables: For receptions/gatherings
- Audio/Visual: Microphones, projectors
- Special Equipment: Specific to service type

**How to Request:**
1. During booking: Specify equipment needed
2. Specify quantities (chairs, tables)
3. Describe special equipment needs
4. Admin approves or counteroffers

### Conflict Prevention

**System Prevents:**
- Double-booking of resources
- Overlapping time slots
- Exceeding capacity limits
- Unavailable resource requests

---

## Notifications

### Email Notifications

**Automatic Emails Sent For:**

1. **Request Submitted**
   - Confirmation of submission
   - Status: "Awaiting Approval"
   - Reference ID included

2. **Request Approved**
   - Booking confirmed
   - Date, time, location
   - What to bring/prepare
   - Administrator contact

3. **Request Rejected**
   - Reason for rejection
   - Alternative suggestions
   - How to resubmit if applicable

4. **Reminder Notifications**
   - 1 day before booking
   - 1 hour before booking
   - Details and directions

### In-App Notifications

**Toast Notifications:**
- Green: Successful actions
- Red: Errors or issues
- Yellow: Warnings
- Blue: Information

**Appears at:** Bottom-right corner, auto-dismisses after 3 seconds

### Real-Time Updates (Socket.IO)

**Live Updates For:**
- Request status changes
- New notifications
- Available appointment slots
- System announcements

---

## Activity Logging

### Audit Trail

**Location:** `/admin` > Activity Log Tab

**What's Tracked:**
- Every user action
- Timestamp of action
- User performing action
- Type of action
- Details about change

**Action Types:**
- 🟢 **Approve**: Request or application approved
- 🔴 **Reject**: Request or application rejected
- 🔵 **Create**: New booking or service created
- 🟣 **Edit**: Existing data modified
- 🟠 **Delete**: Data removed
- ⚫ **Cancel**: Booking or event cancelled

### Filtering Activity Log

**Filter Options:**
- By Action Type: Show only specific actions
- By User: Find actions by specific admin
- By Date Range: Specific time period
- By Resource: Actions related to specific booking

**Export:**
- Download log as CSV
- Print audit trail
- Share with leadership

---

## User Interface

### 14 UX Improvements

#### 1. Terminology Standardization
- Consistent labels throughout
- User-friendly vs technical names
- Clear button labels
- Descriptive headings

#### 2. Color-Coded Status System
- 🟡 Pending: Yellow for awaiting action
- 🟢 Approved: Green for confirmed
- 🔴 Rejected: Red for declined
- ⚫ Cancelled: Gray for inactive

#### 3. Icon Legend & Help Tooltips
- Help icons (?) throughout interface
- Hover for quick tips
- Modal for detailed help
- Keyboard shortcuts explained

#### 4. To-Do Summary Widget
- Dashboard action items
- Clickable cards for navigation
- Shows urgency level
- "All caught up" when done

#### 5. Inline Help Cards
- Info boxes with icons
- Feature descriptions
- Best practices
- Tips for using features

#### 6. Visual Workflow Indicators
- Status timeline showing progression
- Pending → Approved → Complete
- Clear visual flow
- Understand process at a glance

#### 7. Bulk Actions
- Select multiple items
- Perform action on all
- Confirmation before executing
- Success message

#### 8. Quick Filters
- Pre-built filter buttons
- One-click filtering
- Active filter highlighted
- Clear filters option

#### 9. Confirmation Dialogs
- "Are you sure?" warnings
- For important actions
- Cancel/Confirm options
- Dangerous actions highlighted in red

#### 10. Feature Help Buttons
- Help icon on section headers
- Click for detailed help
- Step-by-step instructions
- Video tutorials (if available)

#### 11. Loading States
- Spinning animation while loading
- Skeleton placeholders
- Prevents duplicate clicks
- Shows progress

#### 12. Toast Notifications
- Success: Checkmark + message
- Error: X + message
- Auto-dismiss after 3 seconds
- Can click to dismiss sooner

#### 13. Audit Trail/Activity Log
- Complete action history
- Searchable and filterable
- Export capability
- Compliance-ready

#### 14. Permission Clarity
- User role displayed in header
- Capabilities shown: "Can approve bookings"
- Limitations shown: "Cannot delete records"
- Settings tab shows full permissions

---

## Settings & Administration

### Location
`/admin` > Settings Tab

### System Configuration

1. **General Settings**
   - Church name and contact
   - Operating hours
   - Holiday dates
   - Emergency contact

2. **Permission Management**
   - Role definitions
   - Capability assignments
   - Access control
   - User rights

3. **Feature Status**
   - Enabled/disabled features
   - Booking conflict detection: ✓ Enabled
   - Mass services: ✓ Enabled
   - Real-time notifications: ✓ Enabled
   - Activity logging: ✓ Enabled

4. **Notification Settings**
   - Email reminder timing
   - Notification preferences
   - Escalation rules
   - Contact information

---

## Troubleshooting Features

### Common Issues & Solutions

1. **Can't see latest updates?**
   - Refresh page (F5)
   - Clear browser cache
   - Log out and back in

2. **Not receiving emails?**
   - Check spam folder
   - Verify email in profile
   - Contact administrator

3. **Conflict warning not showing?**
   - Ensure system permissions
   - Try different time slot
   - Contact admins

4. **Bulk action failed?**
   - Verify selections
   - Try individual actions
   - Check user permissions

---

## Best Practices

### For Members
- Submit requests early for better availability
- Check calendar before requesting
- Respond to confirmation emails
- Mark calendar reminders

### For Admins
- Review requests regularly (daily if possible)
- Use bulk actions for efficiency
- Monitor activity log for compliance
- Keep system calendar updated

### For Church Leadership
- Review analytics monthly
- Check activity log for transparency
- Plan ahead using calendar
- Consider collective services for efficiency

---

**Feature Guide Version:** 1.0  
**Last Updated:** April 11, 2026
