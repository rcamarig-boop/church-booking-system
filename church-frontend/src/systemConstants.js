// Status colors used throughout the system
export const STATUS_COLORS = {
  pending: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f', badge: '#f59e0b' },
  approved: { bg: '#dcfce7', border: '#bbf7d0', text: '#15803d', badge: '#22c55e' },
  rejected: { bg: '#fee2e2', border: '#fecaca', text: '#7f1d1d', badge: '#ef4444' },
  cancelled: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', badge: '#6b7280' }
};

// Terminology mapping for easier understanding
export const TERMINOLOGY = {
  bookingRequest: 'Member Application',
  booking: 'Service Booking',
  massService: 'Collective Service',
  event: 'Church Event',
  concern: 'Member Concern',
  record: 'Service Record',
  parishioner: 'Member'
};

// Help text for each feature
export const HELP_TEXT = {
  requests: 'Pending applications from members requesting to book services. Review and approve or reject each application.',
  bookings: 'Confirmed service bookings. View, edit, or view details of all scheduled services.',
  massServices: 'Group services where multiple members can register together (Baptism, Wedding, Funeral, etc.). Set capacity, date, time, and location.',
  events: 'Church events and special services. Create and manage calendar events.',
  analytics: 'System overview and statistics. View booking trends and member participation metrics.',
  calendar: 'Visual calendar view. See all scheduled services and events at a glance.',
  parishioners: 'All system members. View profiles, manage roles, and access member information.',
  concerns: 'Member concerns and feedback. Track and respond to member inquiries.',
  records: 'Completed service records. Keep audit trail of all church activities.',
  reports: 'Generate and view reports on system activity and member engagement.',
  actions: 'Track all system actions. See who did what and when.'
};

// Workflow status sequence
export const WORKFLOW_STATUS = {
  pending: { label: 'Awaiting Review', order: 1, description: 'Application submitted, waiting for approval' },
  approved: { label: 'Approved', order: 2, description: 'Approved and scheduled' },
  rejected: { label: 'Rejected', order: 3, description: 'Application declined' },
  cancelled: { label: 'Cancelled', order: 4, description: 'Service cancelled' }
};

// Permission levels
export const PERMISSIONS = {
  admin: ['view_all', 'approve', 'reject', 'create', 'delete', 'edit', 'export'],
  secretary: ['view_all', 'approve', 'reject', 'create', 'edit', 'export'],
  member: ['view_own', 'create', 'edit_own', 'cancel_own']
};

// Icons with descriptions
export const ICON_GUIDE = {
  '📋': 'Applications - Pending member requests',
  '✅': 'Bookings - Confirmed service bookings',
  '🎫': 'Collective Services - Group service registrations',
  '📅': 'Calendar - Visual schedule view',
  '🕯': 'Church Events - Special services and events',
  '👥': 'Members - Parishioner directory',
  '📣': 'Concerns - Member feedback and concerns',
  '📖': 'Records - Historical service records',
  '📊': 'Analytics - System statistics and trends',
  '🕊': 'Reports - Detailed reports',
  '📊': 'Actions - Activity log',
  '✚': 'Add Event - Create new church event'
};
