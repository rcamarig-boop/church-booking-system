# Church Ministry Appointment Scheduling System

![Status](https://img.shields.io/badge/Status-Active%20Deployment-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A comprehensive full-stack web application for managing church appointments, bookings, and resource allocation. Built with React, Express.js, and PostgreSQL, this system enables seamless scheduling and coordination among church ministries.

## 🎯 Quick Links

- **[Project Documentation](./PROJECT_DOCUMENTATION.md)** - Complete system overview and specifications
- **[API Reference](./API_REFERENCE.md)** - Backend endpoints and usage
- **[Setup Guide](./SETUP_GUIDE.md)** - Installation and configuration
- **[Feature Guide](./FEATURE_GUIDE.md)** - Detailed feature descriptions
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Production deployment steps

---

## 📋 Features

### Core Scheduling
- ✅ Centralized calendar system with real-time updates
- ✅ Appointment and event management
- ✅ Booking conflict detection and warnings
- ✅ Support for multiple service types (Baptisms, Weddings, Funerals, Counseling, etc.)
- ✅ Color-coded availability (Green/Yellow/Orange/Red)

### Resource Management
- ✅ Chapel and equipment booking
- ✅ Room availability tracking
- ✅ Capacity management and modification
- ✅ Conflict prevention system

### Advanced Features
- ✅ Collective service management (Mass Services)
- ✅ Bulk approval/rejection of requests
- ✅ Activity logging and audit trail
- ✅ Real-time notifications
- ✅ Role-based access control (Member, Admin, Super Admin)

### User Experience
- ✅ 14 accessibility improvements implemented
- ✅ Intuitive dashboard with To-Do widgets
- ✅ Help system with tooltips and modals
- ✅ Toast notifications for user feedback
- ✅ Responsive design for mobile and desktop

---

## 🔧 Tech Stack

### Frontend
```
React.js + Tailwind CSS + Axios + Socket.IO
Deployed on Netlify
```

### Backend
```
Express.js + Node.js + JWT + Nodemailer
PostgreSQL + Supabase
Deployed on Render
```

### Tools
```
GitHub | Visual Studio Code | Figma | Draw.io
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL or Supabase account
- Git

### Frontend Setup
```bash
cd church-frontend
npm install
npm start
```
Runs on `http://localhost:3000`

### Backend Setup
```bash
cd church-backend
npm install
# Create .env file with:
# DATABASE_URL=your_database_url
# JWT_SECRET=your_secret_key
# MEMBER_INVITE_CODES=PARISH2026,YOUTHMINISTRY
npm start
```
Runs on `http://localhost:5000`

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## 📊 System Requirements

### Hardware
- Desktop or Laptop (Intel Core i3+, 4GB RAM minimum)
- Mobile device for testing (optional)
- Reliable internet connection

### Software
- Node.js 16+
- npm 7+
- PostgreSQL 12+ or Supabase
- Modern web browser (Chrome, Edge, Firefox)

---

## 📁 Project Structure

```
church-booking-system/
├── church-frontend/          # React application
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── api.js            # API client
│   │   ├── App.js            # Main app
│   │   └── index.js          # Entry point
│   ├── package.json
│   └── README.md
│
├── church-backend/           # Express server
│   ├── server.js             # Main server
│   ├── db.js                 # Database connection
│   ├── schema.sql            # Database schema
│   ├── package.json
│   └── README.md
│
├── PROJECT_DOCUMENTATION.md  # Complete project docs
├── API_REFERENCE.md          # API endpoints
├── SETUP_GUIDE.md            # Installation guide
├── FEATURE_GUIDE.md          # Feature descriptions
├── DEPLOYMENT_GUIDE.md       # Deployment instructions
└── README.md                 # This file
```

---

## 🎓 Key Components

### Admin Dashboard
- Calendar view with event management
- Request approval panel with bulk actions
- Booking conflict detection
- Collective service analytics
- Activity log and audit trail
- Settings and permissions management

### Booking Request Panel
- Review pending requests
- Approve/reject with reasons
- Bulk selection and actions
- Status filtering
- Confirmation dialogs
- Toast notifications

### Calendar View
- Month/week/day views
- Color-coded availability
- Event details on click
- Admin controls for capacity

### Mass Services
- User application modal
- Admin management panel
- Collective grouping (5+ same-day bookings)
- Analytics and suggestions

---

## 🔐 Security

- JWT authentication for all API endpoints
- Role-based access control (RBAC)
- Password hashing with bcrypt
- CORS enabled for trusted origins
- Environment variables for sensitive data
- Database encryption by Supabase
- Activity logging for compliance

---

## 🚢 Deployment

### Frontend (Netlify)
```bash
npm run build
# Deploy the 'build' folder to Netlify
```

### Backend (Render)
```bash
# Connect GitHub repository to Render
# Set environment variables
# Deploy automatically on push
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed steps.

---

## 📞 API Overview

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Bookings
```
GET    /api/bookings
POST   /api/bookings
DELETE /api/bookings/:id
```

### Booking Requests
```
GET    /api/booking-requests
POST   /api/booking-requests
PATCH  /api/booking-requests/:id/approve
PATCH  /api/booking-requests/:id/reject
```

### Mass Services
```
GET    /api/mass-services
POST   /api/mass-services
POST   /api/mass-services/:id/apply
```

See [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation.

---

## 💡 UX Improvements (14 Features)

1. **Terminology Standardization** - Consistent, user-friendly labels
2. **Color-Coded Status** - Visual status indicators
3. **Help Tooltips** - Contextual help throughout
4. **To-Do Widget** - Dashboard summary of actions
5. **Info Cards** - Inline information displays
6. **Workflow Indicators** - Status timelines
7. **Bulk Actions** - Mass approve/reject
8. **Quick Filters** - Pre-built filter buttons
9. **Confirmation Dialogs** - Safety warnings
10. **Help Buttons** - Detailed feature help
11. **Loading States** - Visual feedback
12. **Toast Notifications** - Action confirmations
13. **Activity Log** - Audit trail display
14. **Permission Display** - Role clarity

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL/Supabase is running
# Test connection: psql $DATABASE_URL
```

### Port Already in Use
```bash
# Frontend running on 3000
lsof -i :3000
kill -9 <PID>

# Backend running on 5000
lsof -i :5000
kill -9 <PID>
```

### JWT Token Errors
```bash
# Verify JWT_SECRET in .env matches frontend
# Check token expiration (default: 7 days)
# Clear browser storage and login again
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

---

## 📖 Documentation Files

| Document | Purpose |
|----------|---------|
| [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) | Complete project overview and specifications |
| [API_REFERENCE.md](./API_REFERENCE.md) | All HTTP endpoints and usage examples |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Installation and configuration steps |
| [FEATURE_GUIDE.md](./FEATURE_GUIDE.md) | Detailed feature descriptions and usage |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Production deployment instructions |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions |

---

## 👥 Team

| Name | Role |
|------|------|
| Ralph Jean Camarig | Team Lead / Full Stack Developer |
| John Benedict Inocencio | Backend Developer |
| Kent Joshua Mamon | Frontend Developer |
| Krys Ajiel Pariñal | UI/UX Designer |

---

## 🎓 Course Information

- **University:** University of San Agustin
- **Course:** Software Engineering 1
- **Program:** BS Computer Science (BSCS 3-A)
- **Instructor:** Ms. Esa Peñafiel
- **Year:** 2026

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Repository

**GitHub:** [rcamarig-boop/church-booking-system](https://github.com/rcamarig-boop/church-booking-system)

---

## 📞 Support

For questions or issues:
1. Check the relevant documentation file
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** April 11, 2026  
**Status:** ✅ Production Ready
