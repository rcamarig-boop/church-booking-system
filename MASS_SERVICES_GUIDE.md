# Mass Services Feature - Quick Reference

## 📋 Feature Overview

The **Mass Services** feature enables admins to create collective services (Baptism, Wedding, Funeral, etc.) and manages user applications through an approval workflow.

---

## 👥 USER EXPERIENCE

### Users See:
- **Events Tab** → Scroll down to "Mass Services Available"
- Each service shows: 
  - Service type & date/time
  - Chapel location
  - Capacity (if limited)
  - **[Apply]** button

### Apply Flow:
1. Click **[Apply]** on service
2. Modal opens with service-specific form
   - Baptism: childName, birthDate, motherName, fatherName, etc.
   - Wedding: groomName, brideName, contactNumber, etc.
   - Funeral: deceasedName, deceasedBirthDate, etc.
3. Fill required fields
4. Click **[Submit Application]**
5. Get notification: "Your application is pending admin review"

### After Application:
- **Pending**: Button shows "Applied (pending)" - user can click to cancel without reason
- **Approved**: Button shows "Applied (approved)" - user can cancel but must provide reason
- **Rejected**: Shows rejection reason if provided

---

## 🔐 ADMIN EXPERIENCE

### Create Service:
1. Go to Admin Dashboard → **Mass Services** tab
2. Fill create form:
   - **Service Type**: Dropdown (Baptism, Wedding, etc.)
   - **Date**: YYYY-MM-DD format
   - **Time**: 08:00 - 18:00 (30-min intervals)
   - **Chapel**: Main Chapel or Side Chapel #1
   - **Capacity** (optional): Max applicants allowed
   - **Description** (optional): Service details
3. Click **[Create Mass Service]**

### Review Applications:
1. Find service in "Upcoming Mass Services" table
2. Click **[View]** to open applications modal
3. For each applicant (pending status):
   - See form data (childName, motherName, fatherName, etc.)
   - Click **[✓ Approve]** → User notified of approval
   - Click **[✕ Reject]** → Enter optional reason → Confirm
   - User notified with reason if provided

### Delete Service:
- Click **[Delete]** button on any service
- Deletes service and all associated applications

---

## 🗄️ DATABASE SCHEMA

### mass_services
```sql
id, service_type, date, time, description, chapel, capacity, created_by, created_at
```

### mass_service_applications
```sql
id, mass_service_id, user_id, service_type, form_data (JSON), 
status (pending|approved|rejected|cancelled), applied_at, reviewed_at, reviewed_by,
rejection_reason, cancellation_reason, cancelled_at, cancelled_by
```

---

## 🔄 WORKFLOW STATES

### Application Lifecycle:
```
pending
  ├─ [Admin Approves] → approved
  │    ├─ [User Cancels] → cancelled (requires reason)
  │    └─ [Stays] → approved (on event date)
  │
  └─ [Admin Rejects] → rejected
       └─ [End state]
  
pending
  └─ [User Cancels] → cancelled (no reason needed)
```

---

## 📱 MOBILE-FRIENDLY

- Events tab displays services in responsive grid
- Apply modal optimized for mobile
- Admin panel uses sortable tables
- All forms fully responsive

---

## ⚠️ VALIDATION

**User Input Validation:**
- Date: Within 6 months, not in past
- Time: 8 AM - 6 PM only
- Phone: 11 digits numeric
- Names: Max 40 characters
- Service-specific fields required per type

**Business Logic:**
- Capacity prevents over-approval
- Duplicate applications blocked (can only have 1 pending/approved per service)
- Cancellation reason required for approved services

---

## 🔔 NOTIFICATIONS

| Event | User | Admin |
|-------|------|-------|
| User applies | Application pending review | New application received |
| Admin approves | ✅ Application APPROVED | Application approved |
| Admin rejects | ❌ Application REJECTED | Application rejected |
| User cancels | Application cancelled | Application cancelled |

---

## 🚀 KEY ENDPOINTS

### User Operations:
```
GET  /api/mass-services                        # List upcoming services
POST /api/mass-services/:id/apply              # Submit application
POST /api/mass-services/applications/:id/cancel # Cancel application
GET  /api/mass-services/my-applications        # Get my applications
```

### Admin Operations:
```
POST   /api/mass-services                       # Create service
PUT    /api/mass-services/:id                   # Update service
DELETE /api/mass-services/:id                   # Delete service
GET    /api/mass-services/:id/applications      # View applications
POST   /api/mass-services/applications/:id/approve  # Approve
POST   /api/mass-services/applications/:id/reject   # Reject
```

---

## 📝 SERVICE TYPES & FORM FIELDS

| Service | Required Fields |
|---------|-----------------|
| **Baptism** | childName, birthDate, motherName, fatherName |
| **Wedding** | groomName, brideName, contactNumber |
| **Funeral** | deceasedName, deceasedBirthDate, dateOfDeath, familyContact |
| **Christening** | childName, guardianName, contactNumber |
| **Blessing** | personName, blessingType, notes |
| **Counseling** | fullName, phone, concern |
| **Confessions** | fullName, phone, frequencyOfConfession, confessionNotes |
| **Pastoral Visits** | fullName, phone, reasonForVisit, specialNeeds |

---

## 💡 USAGE TIPS

1. **Set Capacity**: If you want to limit applicants (e.g., Baptism: 5 families max)
2. **Use Descriptions**: Help users understand the service
3. **Review Regularly**: Check new applications in the Mass Services tab
4. **Delete Old Services**: Remove past services to keep list clean
5. **Monitor Approvals**: Use the applications modal to track all applicants

---

## 🔐 SECURITY

- Only admins can create/delete/manage services
- Only users own their applications (can't modify others')
- Form data validated server-side
- All actions logged with timestamps and user IDs

---

## 📦 FILES MODIFIED/CREATED

**Backend:**
- `server.js` - Added 9 new endpoints + 2 new normalize functions

**Frontend:**
- `api.js` - Added massServices API methods
- `Dashboard.js` - Added mass services display + modal state
- `AdminDashboard.js` - Added mass_services tab
- `MassServiceApplyModal.js` - New component for user applications
- `AdminMassServicesPanel.js` - New component for admin management
