import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpdate, color, newId, phoneDigits } from '../src/lib/util.js';

test('buildUpdate solo incluye campos permitidos presentes', () => {
  const u = buildUpdate('rooms', 'r1', { name: ' Salón ', hacker: 'x', area_m2: '12' }, { name: (v) => v.trim(), area_m2: Number, kind: String });
  assert.equal(u.sql, 'UPDATE rooms SET name = ?, area_m2 = ? WHERE id = ?');
  assert.deepEqual(u.values, ['Salón', 12, 'r1']);
  assert.equal(buildUpdate('rooms', 'r1', {}, { name: String }), null);
});

test('validaciones', () => {
  assert.equal(color('#ABCDEF', '#000000'), '#abcdef');
  assert.equal(color('red', '#000000'), '#000000');
  assert.equal(phoneDigits('+34 600 00 00 00'), '34600000000');
  assert.match(newId(), /^[a-z2-9]{12}$/);
});
