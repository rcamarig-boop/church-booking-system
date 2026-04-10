# Church Ministry Appointment Scheduling System
## Official Project Documentation

**University of San Agustin**  
College of Liberal Arts, Sciences, and Education  
Computer Science Department

**Project Title:** Church Appointment & Booking System

**Team Members:**
- Ralph Jean Camarig
- John Benedict Inocencio
- Kent Joshua Mamon
- Krys Ajiel Pariñal

**Course:** Software Engineering 1 (BSCS 3-A)  
**Submitted to:** Ms. Esa Peñafiel

---

## 1. PROJECT OVERVIEW

### Background
Churches are not only centers of worship but also venues for social gatherings, pastoral activities, sacraments, and community events. Ministries such as choirs, catechists, ushers, and parish organizations depend heavily on well-structured schedules to coordinate their duties.

In most parishes, scheduling is managed manually using logbooks, paper records, physical calendars, and bulletin board postings. Announcements are also shared during Mass or via social media platforms like Facebook and group chats. While these traditional practices have served their purpose, they are increasingly inadequate in addressing the growing demands of modern parish life.

**Key Problems:**
- Manual scheduling is prone to errors such as overlapping events and miscommunication
- Resource allocation (rooms, equipment, venues) follows manual processes through verbal coordination
- Churches hold a wide range of events (daily/Sunday Masses, baptisms, weddings, funerals, etc.)
- Effective scheduling becomes essential to avoid confusion and ensure smooth operations

### Problem Statement

Currently, church scheduling and coordination rely heavily on manual methods presenting these challenges:

1. **Overlapping events and double-bookings** due to the absence of a centralized scheduling platform
2. **Miscommunication and lack of updates** - announcements may not reach all members, especially those in distant areas
3. **Time-consuming tracking** of schedules and last-minute changes, burdening administrators and staff
4. **Resource conflicts** - multiple ministries may request the same venue or equipment without a clear reservation system
5. **Limited accessibility** - members must physically check calendars or rely on word-of-mouth for updates

These problems result in confusion, reduced efficiency, and unnecessary conflicts within parish activities. Therefore, there is a need for an automated scheduling system that improves accessibility, coordination, and resource management among church ministries.

---

## 2. OBJECTIVES

### General Objective
To design and develop an Appointment and Event Scheduling System for Church Ministries that enhances accessibility, coordination, and resource management.

### Specific Objectives
- Develop a centralized calendar system for managing church appointments and events
- Implement automated notifications and reminders for timely schedule updates
- Provide a resource booking feature for efficient room and equipment management
- Ensure system accessibility through web or mobile platforms for anytime access
- Design a user-friendly interface suitable for all church members
- Enhance communication and coordination among parish staff and ministry members

---

## 3. SYSTEM FEATURES

### Core Functionalities

#### 3.1 User Authentication & Role-Based Access
- Admin (Church Staff): Full system control, schedule approval, resource management
- Secretary: Booking approval, event scheduling, notification management
- Member: View calendar, request appointments, apply for services

#### 3.2 Appointment & Event Scheduling
- Centralized calendar view with color-coded availability
- First-Come, First-Served (FCFS) scheduling algorithm
- Support for multiple service types (Baptisms, Weddings, Funerals, Counseling, etc.)
- Time slot management with configurable booking capacity
- Date-based opening/closing for availability control

#### 3.3 Booking Conflict Detection
- Real-time conflict detection when approving bookings
- Identifies same date/time conflicts with existing accepted bookings
- Visual warning modal showing conflicting bookings for review
- Option to approve despite conflicts when necessary

#### 3.4 Mass Services (Collective Services)
- Multiple users can apply for the same shared service
- Automatic grouping of 5+ same-day same-service bookings
- Admin analytics showing collective service candidates
- Ability to convert pending requests into collective service events

#### 3.5 Resource Management
- Room and equipment reservation system
- Chapel availability tracking (Main Chapel, Side Chapel #1)
- Chair/table booking with quantity management
- Resource conflict prevention

#### 3.6 Notifications & Reminders
- Automated email notifications for booking confirmations
- Real-time notifications via Socket.IO for status updates
- Reminder notifications before scheduled events
- Toast notifications for user actions (success/error)

#### 3.7 Activity Logging & Audit Trail
- Comprehensive audit log of all system actions
- Tracks user actions: approve, reject, create, edit, delete, cancel
- Timestamp and user identification for accountability
- Activity filtering by action type

---

## 4. TECHNICAL ARCHITECTURE

### Technology Stack

#### Frontend
- **Framework:** React.js
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Real-time Updates:** Socket.IO
- **Deployment:** Netlify

#### Backend
- **Framework:** Express.js (Node.js)
- **Database:** PostgreSQL/Supabase
- **Authentication:** JWT (JSON Web Tokens)
- **Email Service:** Nodemailer
- **Real-time Communication:** Socket.IO
- **Deployment:** Render

#### Tools & Infrastructure
- **IDE:** Visual Studio Code
- **Version Control:** GitHub
- **Diagramming:** Draw.io, Lucidchart
- **UI Design:** Figma
- **Database Design:** SQLite/PostgreSQL

### System Architecture

#### Client Layer
- Web browsers (Chrome, Edge, Firefox)
- Responsive mobile applications

#### Application Server Layer
- Express.js API handling scheduling logic
- Socket.IO for real-time updates
- JWT middleware for authentication

#### Data Layer
- PostgreSQL database with Supabase cloud storage
- Structured data management for users, bookings, events, resources

---

## 5. DATABASE SCHEMA

### Core Tables

**Users Table**
- User identification and authentication
- Role management (admin, secretary, member)
- Email and contact information

**Booking Requests Table**
- Stores pending appointment requests
- Service type and preferred date/time
- Request status (pending, approved, rejected)
- Detailed information about requested services

**Bookings Table**
- Confirmed appointments and events
- Resource allocation (chapel, equipment)
- Status tracking (confirmed, cancelled)

**Mass Services Tables**
- `mass_services`: Collective service definitions
- `mass_service_applications`: User applications for collective services

**Resources Table**
- Available rooms and equipment
- Resource availability status

**Notifications Table**
- Notification records for audit trail
- Message content and timestamps

**Activity Log Table**
- Complete audit trail of system actions
- User identification and action type

---

## 6. SCHEDULING ALGORITHM

### First-Come, First-Served (FCFS) Algorithm
- Processes appointment requests in the exact order they are received
- First valid request for a specific time slot is approved
- Ensures fair and unbiased scheduling

### Color-Coded Calendar Indicator
- **Green:** No bookings (available)
- **Yellow:** Few bookings
- **Orange:** Mostly booked
- **Red:** Unavailable or fully booked

### Capacity Management
- Admin can set maximum booking slots for selected dates
- Admin can close or open dates for availability
- Dynamic capacity adjustment based on church needs

---

## 7. USER INTERFACE & UX IMPROVEMENTS

### 14 Accessibility Features Implemented

1. **Terminology Standardization** - Consistent user-friendly labels throughout
2. **Color-Coded Status System** - Visual status indicators (pending, approved, rejected)
3. **Icon Legend & Help Tooltips** - Contextual help for all features
4. **To-Do Summary Widget** - Dashboard showing action items
5. **Inline Help Cards** - Information cards with descriptions
6. **Visual Workflow Indicators** - Status timeline showing approval workflows
7. **Bulk Actions** - Approve/reject multiple requests simultaneously
8. **Quick Filters** - Pre-built filter buttons for common views
9. **Confirmation Dialogs** - Warnings before destructive actions
10. **Feature Help Buttons** - Help icons on all dashboard tabs
11. **Loading States** - Visual feedback during data operations
12. **Toast Notifications** - Success/error notifications for user actions
13. **Audit Trail/Activity Log** - Dedicated tab showing system activity
14. **Permission Clarity** - Clear display of user role and capabilities

### Component Library

**systemConstants.js**
- Status colors, terminology mappings, help text
- Workflow definitions, permissions, icon guide

**ToastNotification.js**
- Global toast notification system
- Success, error, warning, and info types
- Auto-dismiss with customizable duration

**HelpSystem.js**
- Tooltips with positioning options
- Help modals for comprehensive guidance
- Info cards for inline help

**StatusComponents.js**
- Status badges with color coding
- Status timelines showing workflows
- Permission display component
- Confirmation dialogs

**FormComponents.js**
- Quick filter buttons
- Bulk action toolbar
- Selection checkboxes
- Loading spinners and skeleton loaders

**ActivityLog.js**
- Activity log entries with color coding
- Filtering by action type
- User-friendly action descriptions

---

## 8. FUNCTIONAL REQUIREMENTS

✓ User authentication and role-based access (Admin, Member, Secretary)  
✓ Appointment and event scheduling  
✓ Resource management and reservation  
✓ Notification and reminder system  
✓ Centralized calendar view  
✓ Booking conflict detection  
✓ Collective service management (Mass Services)  
✓ Bulk actions for administrative efficiency  
✓ Real-time status updates  
✓ Activity logging and audit trail  

---

## 9. NON-FUNCTIONAL REQUIREMENTS

✓ Accessibility on both web and mobile devices  
✓ User-friendly interface for technical and non-technical users  
✓ Secure data management using JWT authentication  
✓ Database integrity and data consistency  
✓ Real-time updates via Socket.IO  
✓ Responsive design for all screen sizes  
✓ Fast performance and minimal latency  
✓ Scalability for growing user base  

---

## 10. DEVELOPMENT METHODOLOGY

### Agile Software Development Life Cycle (SDLC)

The project followed the Agile methodology with these phases:

1. **Planning Phase** - Identified problems, objectives, and project scope
2. **Analysis Phase** - Gathered requirements from church staff and members
3. **Design Phase** - Created system diagrams and database schemas (Use Case, ERD, Class, Sequence, Deployment)
4. **Development Phase** - Implemented core modules (scheduling, notifications, resources)
5. **Testing Phase** - Conducted functionality and usability testing
6. **Deployment Phase** - Deployed to production and collected user feedback

---

## 11. DEPLOYMENT

### Frontend Deployment (Netlify)
- Responsive React application
- Automatic deployment from GitHub
- CDN for fast content delivery

### Backend Deployment (Render)
- Express.js API server
- PostgreSQL database through Supabase
- Environment variables for sensitive data

### Live System
- Fully functional scheduling platform
- Real-time notifications active
- User management complete
- Resource booking operational

---

## 12. SIGNIFICANCE OF THE STUDY

### Benefits to Different Stakeholders

**Church Leaders & Administrators**
- Save time and effort in creating and managing schedules
- Reduce errors and conflicts
- Better visibility of all scheduled activities

**Ministry Members**
- Convenient access to schedules anytime, anywhere
- Receive timely reminders for their responsibilities
- More prepared and accountable participation

**Parish Community**
- Smooth coordination ensures organized liturgical and community activities
- Better communication of event changes
- Increased participation and engagement

**Researchers & System Developers**
- Reference for future works in scheduling and resource management systems
- Best practices for church/community organization systems
- Foundation for similar applications

---

## 13. SYSTEM LIMITATIONS

- Limited to scheduling and resource management functions only
- Does not include financial tracking, payroll, or donation management
- Requires internet or local network access
- Performance depends on users' familiarity with digital tools
- Mobile responsiveness may vary across different devices

---

## 14. FUTURE ENHANCEMENTS

- Integration with Google Calendar and Outlook
- Advanced analytics and reporting features
- SMS notifications in addition to email
- Video conferencing integration for virtual meetings
- Multi-language support
- Offline mode for scheduling
- Mobile native apps (iOS and Android)
- Payment integration for service bookings

---

## 15. REFERENCES

[1] L. Brown, "Manual versus automated scheduling systems in organizations," Journal of Information Management, vol. 14, no. 2, 2018

[2] R. Davis, "Digital transformation in faith-based organizations," Information Systems Review, vol. 18, no. 1, 2021

[3] M. Dela Cruz et al., "Development of an event scheduling and reservation system for parish activities," Philippine Information Technology Journal, vol. 7, no. 3, 2021

[4] K. C. Laudon & J. P. Laudon, Management Information Systems: Managing the Digital Firm, 16th ed. Pearson Education, 2020

[5] E. Tan & G. Reyes, "User-centered design for church scheduling systems," Philippine Journal of ICT, vol. 11, no. 2, 2022

---

**Document Version:** 1.0  
**Last Updated:** April 11, 2026  
**Status:** Complete - Ready for Deployment
