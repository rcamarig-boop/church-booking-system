export const SIDEBAR_CONTACT_STORAGE_KEY = 'church_sidebar_contact';

export const DEFAULT_SIDEBAR_CONTACT = {
  title: 'Contact & Facebook',
  contactNote: 'Need help? Reach out to the parish office.',
  emailLabel: 'Email the parish office',
  email: 'admin@church.com',
  phoneLabel: 'Call the parish office',
  phone: '',
  facebookLabel: 'Visit our Facebook page',
  facebookUrl: 'https://www.facebook.com/',
};

export function loadSidebarContact() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_CONTACT;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_CONTACT_STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_CONTACT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SIDEBAR_CONTACT, ...parsed };
  } catch {
    return DEFAULT_SIDEBAR_CONTACT;
  }
}

export function saveSidebarContact(nextValue) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    SIDEBAR_CONTACT_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_SIDEBAR_CONTACT, ...nextValue })
  );
}
