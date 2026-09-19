import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSocketMessage } from '../src/socket.ts';

test('reads success from a nested JSON string', () => {
  const raw = JSON.stringify({ transactionStatus: JSON.stringify({ paymentSuccess: true }) });
  assert.equal(parseSocketMessage(raw), 'success');
});

test('reads success from an object and the `success` flag', () => {
  assert.equal(parseSocketMessage({ transactionStatus: { paymentSuccess: true } }), 'success');
  assert.equal(parseSocketMessage({ transactionStatus: { success: true } }), 'success');
});

test('reads a decline', () => {
  assert.equal(parseSocketMessage({ transactionStatus: { paymentSuccess: false } }), 'declined');
});

test('everything else is unknown', () => {
  for (const value of ['not json', '{}', null, 5, { transactionStatus: 'nope' }, { transactionStatus: {} }]) {
    assert.equal(parseSocketMessage(value), 'unknown');
  }
});
