import { createHash } from 'node:crypto';

const API = 'https://www.googleapis.com/calendar/v3';
let cachedToken = '';
let tokenUntil = 0;

async function accessToken() {
  if (cachedToken && Date.now() < tokenUntil - 60_000) return cachedToken;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
    grant_type: 'refresh_token'
  });
  if ([...body.values()].some(value => !value)) throw new Error('Calendar credentials are not configured');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body, signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Calendar OAuth refresh failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token || !data.expires_in) throw new Error('Calendar OAuth returned no access token');
  cachedToken = data.access_token;
  tokenUntil = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function calendarRequest(path, method, body) {
  const token = await accessToken();
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Calendar API failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function calendarIds() {
  return (process.env.BUSY_CALENDAR_IDS || process.env.BOOKING_CALENDAR_ID || 'primary')
    .split(',').map(value => value.trim()).filter(Boolean);
}

export async function freeBusy(start, end) {
  const ids = calendarIds();
  const result = await calendarRequest('/freeBusy', 'POST', {
    timeMin: start, timeMax: end, timeZone: 'UTC', items: ids.map(id => ({ id }))
  });
  const busy = [];
  for (const id of ids) {
    const calendar = result.calendars?.[id];
    if (!calendar || calendar.errors?.length) throw new Error(`Calendar availability unavailable for ${id}`);
    busy.push(...(calendar.busy || []));
  }
  return busy;
}

export function eventIdFor(key) {
  return `d${createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
}

export async function createEvent({ id, title, start, end, name, email, notes, bookingKeyHash }) {
  const calendarId = encodeURIComponent(process.env.BOOKING_CALENDAR_ID || 'primary');
  const event = {
    id, summary: `${title}: ${name}`,
    description: `Booked through daytanalytics.com/book/\n\n${notes || ''}`.trim(),
    start: { dateTime: start, timeZone: 'America/Chicago' },
    end: { dateTime: end, timeZone: 'America/Chicago' },
    attendees: [{ email, displayName: name }],
    conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    extendedProperties: { private: { bookingKeyHash } }
  };
  return calendarRequest(`/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`, 'POST', event);
}

export async function getEvent(id) {
  const calendarId = encodeURIComponent(process.env.BOOKING_CALENDAR_ID || 'primary');
  try { return await calendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, 'GET'); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
