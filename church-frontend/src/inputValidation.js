export const NAME_MAX_LENGTH = 40;
export const PHONE_MAX_LENGTH = 11;
export const BOOKING_LIMIT = 9;
export const DATE_FIELD_KEYS = new Set(['birthDate', 'deceasedBirthDate', 'dateOfDeath']);
export const BOOKING_TIME_MIN = '08:00';
export const BOOKING_TIME_MAX = '18:00';

const NAME_ALLOWED_CHARS_RE = /[^\p{L}\p{M}\s.'-]/gu;
const NAME_VALID_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,39}$/u;
const PHONE_NON_DIGITS_RE = /\D/g;

export const NAME_FIELD_KEYS = new Set([
  'name',
  'fullName',
  'childName',
  'motherName',
  'fatherName',
  'groomName',
  'brideName',
  'personName',
  'deceasedName',
  'guardianName'
]);

export const PHONE_FIELD_KEYS = new Set([
  'phone',
  'contactNumber',
  'familyContact'
]);

export function sanitizeNameInput(value) {
  return String(value ?? '')
    .replace(NAME_ALLOWED_CHARS_RE, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, NAME_MAX_LENGTH);
}

export function sanitizePhoneInput(value) {
  return String(value ?? '')
    .replace(PHONE_NON_DIGITS_RE, '')
    .slice(0, PHONE_MAX_LENGTH);
}

export function sanitizeFieldValue(key, value) {
  if (NAME_FIELD_KEYS.has(key)) return sanitizeNameInput(value);
  if (PHONE_FIELD_KEYS.has(key)) return sanitizePhoneInput(value);
  return String(value ?? '');
}

export function isValidNameValue(value) {
  const text = String(value ?? '').trim();
  return !!text && text.length <= NAME_MAX_LENGTH && NAME_VALID_RE.test(text);
}

export function isValidPhoneValue(value) {
  return /^\d{11}$/.test(String(value ?? '').trim());
}

export function getTodayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function getTomorrowIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  local.setDate(local.getDate() + 1);
  return local.toISOString().slice(0, 10);
}

export function getSixMonthsAheadIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  local.setMonth(local.getMonth() + 6);
  return local.toISOString().slice(0, 10);
}

export function isFutureIsoDate(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return text > getTodayIsoDate();
}

export function isBookingDateAtLeastTomorrow(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return text >= getTomorrowIsoDate();
}

export function isBookingDateWithinSixMonths(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return text >= getTomorrowIsoDate() && text <= getSixMonthsAheadIsoDate();
}

export function isAllowedBookingTime(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;
  return total >= 8 * 60 && total <= 18 * 60;
}
