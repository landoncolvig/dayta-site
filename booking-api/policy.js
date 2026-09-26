const TIME_ZONE = 'America/Chicago';
const STEP_MINUTES = 15;
const MIN_NOTICE_HOURS = 2;
const MAX_DAYS = 60;

export const TYPES = Object.freeze({
  'meeting-with-landon': { title: 'Meeting With Landon', description: 'Meeting with Landon', minutes: 30 },
  'kickoff-call': { title: 'Kickoff Call', description: 'Schedule a 60-minute kickoff call.', minutes: 60 },
  '30-minute-meeting-generic': { title: '30-minute meeting', description: 'Generic meeting invite link.', minutes: 30 },
  discovery: { title: 'Discovery Call', description: 'Explore your data and AI goals with Landon.', minutes: 58 }
});

export function publicTypes() {
  const names = (process.env.PUBLIC_TYPES || 'meeting-with-landon').split(',').map(s => s.trim());
  return Object.fromEntries(names.filter(name => TYPES[name]).map(name => [name, TYPES[name]]));
}

export function chicagoDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function offsetMinutes(date) {
  const value = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName').value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error(`Unexpected Chicago offset: ${value}`);
  const magnitude = Number(match[2]) * 60 + Number(match[3] || 0);
  return (match[1] === '+' ? 1 : -1) * magnitude;
}

export function chicagoTime(day, hour, minute) {
  const naive = Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  if (!Number.isFinite(naive)) throw new Error('Invalid day');
  const guess = new Date(naive);
  return new Date(naive - offsetMinutes(guess) * 60_000);
}

export function addDays(day, n) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function validDay(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) &&
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

export function workday(day) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function slotsForDay(day, type, busy, now = new Date()) {
  if (!validDay(day) || !workday(day)) return [];
  const result = [];
  const earliest = now.getTime() + MIN_NOTICE_HOURS * 3_600_000;
  for (let minute = 9 * 60; minute + type.minutes <= 15 * 60; minute += STEP_MINUTES) {
    const start = chicagoTime(day, Math.floor(minute / 60), minute % 60).getTime();
    const end = start + type.minutes * 60_000;
    if (start < earliest) continue;
    if (busy.some(interval => start < Date.parse(interval.end) && end > Date.parse(interval.start))) continue;
    result.push(new Date(start).toISOString());
  }
  return result;
}

export function allowedSlot(startIso, type, busy, now = new Date()) {
  const parsed = new Date(startIso);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== startIso) return false;
  const today = chicagoDate(now);
  const day = chicagoDate(parsed);
  if (day < today || day > addDays(today, MAX_DAYS)) return false;
  return slotsForDay(day, type, busy, now).includes(startIso);
}

export { TIME_ZONE, MAX_DAYS };
