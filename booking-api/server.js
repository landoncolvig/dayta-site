import http from 'node:http';
import { createHash } from 'node:crypto';
import * as google from './google.js';
import { addDays, allowedSlot, chicagoDate, chicagoTime, publicTypes, slotsForDay, validDay, TIME_ZONE, MAX_DAYS } from './policy.js';

if (process.env.BOOKING_SECRETS) {
  let secrets;
  try { secrets = JSON.parse(process.env.BOOKING_SECRETS); }
  catch { throw new Error('Invalid booking secret configuration'); }
  for (const name of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'RECAPTCHA_SECRET_KEY']) {
    if (typeof secrets[name] !== 'string' || !secrets[name]) throw new Error(`Missing booking secret: ${name}`);
    process.env[name] = secrets[name];
  }
}

const DAY = 86_400_000;
const attempts = new Map();
let bookingQueue = Promise.resolve();

async function serializeBooking(task) {
  const previous = bookingQueue;
  let release;
  bookingQueue = new Promise(resolve => { release = resolve; });
  await previous;
  try { return await task(); }
  finally { release(); }
}

function json(response, status, data, origin = '') {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'access-control-allow-origin': origin,
    'vary': 'Origin'
  });
  response.end(JSON.stringify(data));
}

function allowedOrigin(request) {
  const origin = process.env.ALLOWED_ORIGIN || 'https://daytanalytics.com';
  return request.headers.origin === origin ? origin : '';
}

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Expected JSON'), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function validInput(body, types) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (!types[body.type] || typeof body.start !== 'string') return false;
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) return false;
  if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return false;
  if (typeof body.notes !== 'string' || body.notes.length > 1000) return false;
  if (typeof body.bookingKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(body.bookingKey)) return false;
  if (body.website) return false;
  return true;
}

function rateKey(request, email) {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : request.socket.remoteAddress || '').trim();
  return createHash('sha256').update(`${ip}|${email.toLowerCase()}`).digest('hex');
}

function rateLimited(key, now) {
  for (const [oldKey, value] of attempts) if (now - value.since > DAY) attempts.delete(oldKey);
  const entry = attempts.get(key);
  return Boolean(entry && now - entry.since < DAY && entry.count >= 3);
}

function recordBooking(key, now) {
  const entry = attempts.get(key);
  if (!entry || now - entry.since >= DAY) attempts.set(key, { since: now, count: 1 });
  else entry.count++;
}

function bookingEnabled() {
  return process.env.BOOKING_ENABLED === '1' &&
    (Boolean(process.env.RECAPTCHA_SECRET_KEY && process.env.RECAPTCHA_SITE_KEY) || process.env.NODE_ENV !== 'production');
}

async function verifyHuman(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) return process.env.NODE_ENV !== 'production';
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Verification service failed: ${response.status}`);
  const result = await response.json();
  return result.success === true && ['daytanalytics.com', 'www.daytanalytics.com'].includes(result.hostname);
}

export function createServer({ calendar = google, now = () => new Date() } = {}) {
  return http.createServer(async (request, response) => {
    const origin = allowedOrigin(request);
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'OPTIONS') {
      response.writeHead(origin ? 204 : 403, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type',
        'access-control-max-age': '600', vary: 'Origin'
      });
      response.end();
      return;
    }
    try {
      if (request.method === 'GET' && path === '/health') return json(response, 200, { ok: true }, origin);
      const types = publicTypes();
      if (request.method === 'GET' && path === '/api/config') {
        return json(response, 200, { types, timeZone: TIME_ZONE, enabled: bookingEnabled(), recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' }, origin);
      }
      if (request.method === 'GET' && path === '/api/slots') {
        const url = new URL(request.url, 'http://localhost');
        const type = types[url.searchParams.get('type')];
        if (!type) return json(response, 404, { error: 'Unknown meeting type' }, origin);
        const today = chicagoDate(now());
        const after = url.searchParams.get('after') || today;
        const horizon = addDays(today, MAX_DAYS);
        if (!validDay(after) || after < today || after > horizon) return json(response, 400, { error: 'Invalid date' }, origin);
        const last = addDays(after, 20) > horizon ? horizon : addDays(after, 20);
        const busy = await calendar.freeBusy(chicagoTime(after, 0, 0).toISOString(), chicagoTime(addDays(last, 1), 0, 0).toISOString());
        const slots = [];
        for (let day = after; day <= last; day = addDays(day, 1)) slots.push(...slotsForDay(day, type, busy, now()));
        const nextDate = addDays(last, 1) <= horizon ? addDays(last, 1) : null;
        return json(response, 200, { slots, nextDate }, origin);
      }
      if (request.method === 'POST' && path === '/api/book') return serializeBooking(async () => {
        if (!origin) return json(response, 403, { error: 'Invalid origin' });
        if (!bookingEnabled()) return json(response, 503, { error: 'Booking is not open yet' }, origin);
        const body = await readJson(request);
        if (!validInput(body, types)) return json(response, 400, { error: 'Check the booking details' }, origin);
        const keyHash = createHash('sha256').update(body.bookingKey).digest('hex');
        const id = calendar.eventIdFor(body.bookingKey);
        const existing = await calendar.getEvent(id);
        if (existing) {
          if (existing.extendedProperties?.private?.bookingKeyHash === keyHash &&
              existing.attendees?.some(attendee => attendee.email?.toLowerCase() === body.email.toLowerCase())) {
            return json(response, 200, { booked: true, start: existing.start?.dateTime || body.start }, origin);
          }
          return json(response, 409, { error: 'Booking key already used' }, origin);
        }
        const rate = rateKey(request, body.email);
        if (rateLimited(rate, now().getTime())) return json(response, 429, { error: 'Booking limit reached. Email Landon for help.' }, origin);
        if (!await verifyHuman(body.verificationToken)) return json(response, 400, { error: 'Please complete the verification and try again.' }, origin);
        const type = types[body.type];
        const start = new Date(body.start);
        if (Number.isNaN(start.getTime())) return json(response, 400, { error: 'Invalid time' }, origin);
        const end = new Date(start.getTime() + type.minutes * 60_000);
        const busy = await calendar.freeBusy(start.toISOString(), end.toISOString());
        if (!allowedSlot(body.start, type, busy, now())) return json(response, 409, { error: 'That time is no longer available. Choose another.' }, origin);
        try {
          await calendar.createEvent({
            id, title: type.title, start: start.toISOString(), end: end.toISOString(),
            name: body.name.trim(), email: body.email.trim().toLowerCase(), notes: body.notes.trim(), bookingKeyHash: keyHash
          });
        } catch (error) {
          if (error.status === 409) {
            const found = await calendar.getEvent(id);
            if (found?.extendedProperties?.private?.bookingKeyHash === keyHash) return json(response, 200, { booked: true, start: body.start }, origin);
          }
          throw error;
        }
        recordBooking(rate, now().getTime());
        return json(response, 201, { booked: true, start: body.start }, origin);
      });
      return json(response, 404, { error: 'Not found' }, origin);
    } catch (error) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      if (status === 502) console.error('Booking API upstream error:', error.message);
      return json(response, status, { error: status === 502 ? 'Booking service is temporarily unavailable' : error.message }, origin);
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT || 8080);
  createServer().listen(port, '0.0.0.0', () => console.log(`Booking API listening on ${port}`));
}
