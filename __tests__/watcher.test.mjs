import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFonepayWatcher } from '../src/watcher.ts';

function harness(states, extra = {}) {
  const log = { success: 0, failure: 0, hints: [], errors: 0, closed: 0, intervals: 0, cleared: 0, unsub: 0 };
  const socket = { onmessage: null, close: () => void (log.closed += 1) };
  let tick;
  let foreground;
  let calls = 0;
  const watcher = createFonepayWatcher({
    websocketUrl: 'wss://example',
    verify: async () => {
      const next = states[Math.min(calls, states.length - 1)];
      calls += 1;
      if (next instanceof Error) throw next;
      return next;
    },
    onSuccess: () => void (log.success += 1),
    onFailure: () => void (log.failure += 1),
    onHint: (hint) => log.hints.push(hint),
    onError: () => void (log.errors += 1),
    deps: {
      createSocket: () => socket,
      onForeground: (listener) => {
        foreground = listener;
        return () => void (log.unsub += 1);
      },
      setInterval: (callback) => {
        tick = callback;
        log.intervals += 1;
        return 1;
      },
      clearInterval: () => void (log.cleared += 1),
    },
    ...extra,
  });
  return { watcher, log, socket, tick: () => tick(), foreground: () => foreground(), calls: () => calls };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('a poll tick that reports success settles once and cleans up', async () => {
  const h = harness(['pending', 'success']);
  h.watcher.start();
  h.tick();
  await flush();
  assert.equal(h.log.success, 0);
  h.tick();
  await flush();
  assert.equal(h.log.success, 1);
  assert.equal(h.log.closed, 1);
  assert.equal(h.log.cleared, 1);
  assert.equal(h.log.unsub, 1);
  h.tick?.();
  await flush();
  assert.equal(h.log.success, 1);
});

test('a websocket success message triggers a server check', async () => {
  const h = harness(['success']);
  h.watcher.start();
  h.socket.onmessage({ data: JSON.stringify({ transactionStatus: { paymentSuccess: true } }) });
  await flush();
  assert.deepEqual(h.log.hints, ['success']);
  assert.equal(h.log.success, 1);
});

test('a decline hint is reported but does not settle', async () => {
  const h = harness(['pending']);
  h.watcher.start();
  h.socket.onmessage({ data: { transactionStatus: { paymentSuccess: false } } });
  await flush();
  assert.deepEqual(h.log.hints, ['declined']);
  assert.equal(h.log.failure, 0);
  assert.equal(h.calls(), 0);
});

test('returning to the foreground checks the payment', async () => {
  const h = harness(['success']);
  h.watcher.start();
  h.foreground();
  await flush();
  assert.equal(h.log.success, 1);
});

test('a server "failed" settles as a failure', async () => {
  const h = harness(['failed']);
  h.watcher.start();
  h.tick();
  await flush();
  assert.equal(h.log.failure, 1);
  assert.equal(h.log.success, 0);
});

test('concurrent triggers share one in-flight check', async () => {
  const h = harness(['pending']);
  h.watcher.start();
  const a = h.watcher.check();
  const b = h.watcher.check();
  await Promise.all([a, b]);
  assert.equal(h.calls(), 1);
});

test('a throwing check reports the error and keeps watching', async () => {
  const h = harness([new Error('offline'), 'success']);
  h.watcher.start();
  assert.equal(await h.watcher.check(), 'error');
  assert.equal(h.log.errors, 1);
  h.tick();
  await flush();
  assert.equal(h.log.success, 1);
});

test('stop() closes the socket, the poll and the foreground listener', async () => {
  const h = harness(['pending']);
  h.watcher.start();
  h.watcher.stop();
  assert.equal(h.log.closed, 1);
  assert.equal(h.log.cleared, 1);
  assert.equal(h.log.unsub, 1);
});
