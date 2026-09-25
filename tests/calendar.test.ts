import test from 'node:test';
import assert from 'node:assert/strict';
import { monthCells, validDate, dateKey, eventsOnDay, ringStyle } from '../src/modules/calendar/model.ts';

test('every month in the supported range has the correct Monday-first days', () => {
  for (let i = 0; i < 16; i++) {
    const d = new Date(2026, 8 + i, 1, 12);
    const y = d.getFullYear(), m = d.getMonth();
    const cells = monthCells(y, m);
    assert.equal(cells.length, 42);
    const dates = cells.filter(Boolean);
    assert.equal(dates.length, new Date(y, m + 1, 0).getDate());
    assert.equal(dates[0], dateKey(y, m, 1));
    assert.equal(cells.indexOf(dates[0]), (d.getDay() + 6) % 7);
    assert.equal(new Set(dates).size, dates.length);
  }
  assert.equal(monthCells(2026, 8)[1], '2026-09-01');
  assert.equal(monthCells(2027, 1).filter(Boolean).length, 28);
});

test('date validation rejects out-of-range and nonexistent days', () => {
  for (const date of ['2026-09-01', '2027-12-31', '2027-02-28']) assert.ok(validDate(date));
  for (const date of ['2026-08-31', '2028-01-01', '2027-02-29', '2026-09-31', '2026-13-01', 'bad']) assert.equal(validDate(date), false);
});

test('all-day intervals use exclusive ends; timed events span local midnight', () => {
  const event = { id: 'x', title: 'Trip', starts_at: '2026-09-10', ends_at: '2026-09-12', all_day: 1, timezone: 'UTC' };
  assert.equal(eventsOnDay([event], '2026-09-09').length, 0);
  assert.equal(eventsOnDay([event], '2026-09-10').length, 1);
  assert.equal(eventsOnDay([event], '2026-09-11').length, 1);
  assert.equal(eventsOnDay([event], '2026-09-12').length, 0);
  const timed = { ...event, all_day: 0, starts_at: new Date(2026, 8, 10, 23).toISOString(), ends_at: new Date(2026, 8, 11, 1).toISOString() };
  assert.equal(eventsOnDay([timed], '2026-09-10').length, 1);
  assert.equal(eventsOnDay([timed], '2026-09-11').length, 1);
  assert.equal(eventsOnDay([timed], '2026-09-12').length, 0);
});

test('important-event rings retain each distinct color', () => {
  const e = { id: 'x', event_date: '2026-09-17', title: 'Exam', color: 'red' as const };
  assert.equal(ringStyle([]), 'transparent');
  assert.equal(ringStyle([e, e, { ...e, color: 'blue' }]), 'conic-gradient(#ff686e 0% 50%,#70b5ff 50% 100%)');
});
