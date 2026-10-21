import test from 'node:test';
import assert from 'node:assert/strict';
import { weddingInstant } from '../server/wedding-time.js';
import { settingsData, publicWedding } from '../server/validation.js';

test('wedding time respects Bahia, fractional offsets and seasonal timezone changes', () => {
  assert.equal(weddingInstant('2027-03-20','18:30','America/Bahia'),'2027-03-20T21:30:00.000Z');
  assert.equal(weddingInstant('2027-03-20','18:30','Asia/Kathmandu'),'2027-03-20T12:45:00.000Z');
  assert.equal(weddingInstant('2027-07-20','18:30','Europe/Lisbon'),'2027-07-20T17:30:00.000Z');
  assert.equal(weddingInstant('2027-01-20','18:30','Europe/Lisbon'),'2027-01-20T18:30:00.000Z');
  assert.throws(() => weddingInstant('2027-03-14','02:30','America/New_York'));
  assert.throws(() => weddingInstant('2027-11-07','01:30','America/New_York'));
  assert.equal(weddingInstant('2027-03-20',null),null);
});

test('settings reject invalid times, zones, dates and executable external URLs', () => {
  const base = {couple_names:'Casal'};
  for (const values of [{ceremony_time:'24:30'},{timezone:'Not/AZone'},{wedding_date:'2027-02-30'},{hero_image_url:'javascript:alert(1)'},{maps_url:'https://user:pass@example.com'}]) assert.throws(() => settingsData({...base,...values}));
  const values = settingsData({...base,wedding_date:'2027-03-20',ceremony_time:'18:30',timezone:'America/Bahia',hero_image_url:'https://example.com/photo.jpg',partner_one_name:'Maria'});
  assert.equal(publicWedding(values).wedding_at,'2027-03-20T21:30:00.000Z');
  assert.equal(publicWedding({...values,guest_limit:'95'}).guest_limit,undefined);
});
