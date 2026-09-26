import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from './server.js';

const NOW = new Date('2026-09-28T13:00:00.000Z');
const START = '2026-09-30T14:00:00.000Z';
const KEY = '52f94446-cc49-4cc8-a230-994c908cb07d';
const ORIGIN = 'https://daytanalytics.com';

function fakeCalendar() {
  const events = new Map();
  return {
    events,
    eventIdFor(key) { return `d${createHash('sha256').update(key).digest('hex').slice(0, 40)}`; },
    async freeBusy() {
      return [...events.values()].map(event => ({ start: event.start.dateTime, end: event.end.dateTime }));
    },
    async getEvent(id) { return events.get(id) || null; },
    async createEvent(input) {
      const event = {
        start: { dateTime: input.start }, end: { dateTime: input.end },
        attendees: [{ email: input.email }],
        extendedProperties: { private: { bookingKeyHash: input.bookingKeyHash } }
      };
      events.set(input.id, event);
      return event;
    }
  };
}

async function withServer(run, enabled = '1') {
  process.env.PUBLIC_TYPES = 'meeting-with-landon';
  process.env.BOOKING_ENABLED = enabled;
  process.env.ALLOWED_ORIGIN = ORIGIN;
  const calendar = fakeCalendar();
  const server = createServer({ calendar, now: () => NOW });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base, calendar); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function booking(overrides = {}) {
  return { type: 'meeting-with-landon', start: START, name: 'Test Booker', email: 'booker@example.com', notes: '', website: '', bookingKey: KEY, ...overrides };
}

async function post(base, body, origin = ORIGIN) {
  const response = await fetch(`${base}/api/book`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

test('slots exclude private calendar details and include an open time', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/slots?type=meeting-with-landon`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert(body.slots.includes(START));
    assert(!JSON.stringify(body).includes('attendees'));
  });
});

test('booking creates one attendee event and an idempotent retry returns success', async () => {
  await withServer(async (base, calendar) => {
    assert.equal((await post(base, booking())).status, 201);
    assert.equal(calendar.events.size, 1);
    assert.equal([...calendar.events.values()][0].attendees[0].email, 'booker@example.com');
    assert.equal((await post(base, booking())).status, 200);
    assert.equal(calendar.events.size, 1);
  });
});

test('a second booking cannot claim an occupied slot', async () => {
  await withServer(async base => {
    assert.equal((await post(base, booking())).status, 201);
    const result = await post(base, booking({ bookingKey: '4c6e4aad-18fa-492a-a65e-4c479a68ef92', email: 'other@example.com' }));
    assert.equal(result.status, 409);
  });
});

test('simultaneous requests for one slot produce one event', async () => {
  await withServer(async (base, calendar) => {
    const original = calendar.freeBusy;
    calendar.freeBusy = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, 15));
      return original(...args);
    };
    const [first, second] = await Promise.all([
      post(base, booking()),
      post(base, booking({ bookingKey: '4c6e4aad-18fa-492a-a65e-4c479a68ef92', email: 'other@example.com' }))
    ]);
    assert.deepEqual([first.status, second.status].sort(), [201, 409]);
    assert.equal(calendar.events.size, 1);
  });
});

test('unlisted type and wrong origin cannot create an event', async () => {
  await withServer(async (base, calendar) => {
    assert.equal((await post(base, booking({ type: 'private-call' }))).status, 400);
    assert.equal((await post(base, booking(), 'https://other.example')).status, 403);
    assert.equal(calendar.events.size, 0);
  });
});

test('public booking remains closed until release is enabled', async () => {
  await withServer(async (base, calendar) => {
    assert.equal((await post(base, booking())).status, 503);
    assert.equal(calendar.events.size, 0);
  }, '0');
});
