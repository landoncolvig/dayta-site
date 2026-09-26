import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSlot, chicagoTime, slotsForDay, TYPES } from './policy.js';

test('Chicago opening time stays at 9 AM across daylight saving changes', () => {
  assert.equal(chicagoTime('2026-10-30', 9, 0).toISOString(), '2026-10-30T14:00:00.000Z');
  assert.equal(chicagoTime('2026-11-02', 9, 0).toISOString(), '2026-11-02T15:00:00.000Z');
});

test('busy events remove overlapping 30-minute starts', () => {
  const busy = [{ start: '2026-09-30T14:30:00.000Z', end: '2026-09-30T15:00:00.000Z' }];
  const slots = slotsForDay('2026-09-30', TYPES['meeting-with-landon'], busy, new Date('2026-09-28T13:00:00.000Z'));
  assert(slots.includes('2026-09-30T14:00:00.000Z'));
  assert(!slots.includes('2026-09-30T14:15:00.000Z'));
  assert(!slots.includes('2026-09-30T14:30:00.000Z'));
  assert(slots.includes('2026-09-30T15:00:00.000Z'));
});

test('past, weekend, off-hours and off-grid submissions are rejected', () => {
  const now = new Date('2026-09-28T13:00:00.000Z');
  const type = TYPES['meeting-with-landon'];
  assert.equal(allowedSlot('2026-09-30T14:00:00.000Z', type, [], now), true);
  assert.equal(allowedSlot('2026-09-28T14:00:00.000Z', type, [], now), false);
  assert.equal(allowedSlot('2026-10-03T14:00:00.000Z', type, [], now), false);
  assert.equal(allowedSlot('2026-09-30T23:00:00.000Z', type, [], now), false);
  assert.equal(allowedSlot('2026-09-30T14:07:00.000Z', type, [], now), false);
});
