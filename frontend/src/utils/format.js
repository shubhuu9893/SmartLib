export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || '';
}

export function initials(name, email) {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function parseDate(value) {
  if (!value) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString(undefined, options) : '';
}

export function timeAgo(value) {
  const date = parseDate(value);
  if (!date) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit);
  }
  return 'just now';
}

const LANGUAGES = {
  eng: 'English', spa: 'Spanish', fre: 'French', ger: 'German', ita: 'Italian', por: 'Portuguese',
  rus: 'Russian', jpn: 'Japanese', chi: 'Chinese', hin: 'Hindi', ara: 'Arabic', dut: 'Dutch',
  kor: 'Korean', tur: 'Turkish', pol: 'Polish', swe: 'Swedish', mar: 'Marathi',
};

export function languageName(code) {
  if (!code) return null;
  return LANGUAGES[code] || code.toUpperCase();
}
