import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response } from 'express';
import { createIpThrottle, loginThrottlePolicy, registerThrottlePolicy, contactThrottlePolicy } from '../src/middlewares/requestThrottle';

function call(handler: RequestHandler, ip: string, forwarded = '') {
  let allowed = false;
  let status = 200;
  let body: any;
  const headers: Record<string, string | number> = {};
  const response = {
    setHeader(name: string, value: string | number) { headers[name.toLowerCase()] = value; return this; },
    status(value: number) { status = value; return this; },
    json(value: any) { body = value; return this; }
  } as unknown as Response;
  handler({ ip, headers: { 'x-forwarded-for': forwarded } } as unknown as Request, response, () => { allowed = true; });
  return { allowed, status, body, headers };
}

test('IP limit refuses excess requests with a bounded retry interval and JSON error', () => {
  const throttle = createIpThrottle({ limit: 2, windowMs: 15000, now: () => 0 });
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
  const denied = call(throttle, '127.0.0.1');
  assert.equal(denied.allowed, false);
  assert.equal(denied.status, 429);
  assert.equal(denied.body.code, 'RATE_LIMITED');
  assert.equal(denied.headers['retry-after'], 15);
  assert.equal(denied.headers['cache-control'], 'no-store');
});

test('IP windows are independent and recover after expiry', () => {
  let now = 0;
  const throttle = createIpThrottle({ limit: 1, windowMs: 1000, now: () => now });
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
  assert.equal(call(throttle, '127.0.0.2').allowed, true);
  assert.equal(call(throttle, '127.0.0.1').status, 429);
  now = 1000;
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
});

test('capacity stays bounded without evicting active identities; expired buckets are swept', () => {
  let now = 0;
  const throttle = createIpThrottle({ limit: 2, windowMs: 1000, maxBuckets: 2, now: () => now });
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
  assert.equal(call(throttle, '127.0.0.2').allowed, true);
  for (let i = 3; i < 200; i++) assert.equal(call(throttle, `127.0.0.${i}`).status, 429);
  assert.equal(call(throttle, '127.0.0.1').allowed, true);
  assert.equal(call(throttle, '127.0.0.1').status, 429);
  now = 1000;
  assert.equal(call(throttle, '127.0.0.3').allowed, true);
});

test('changing client forwarded headers cannot change the Express IP identity', () => {
  const throttle = createIpThrottle({ limit: 1, windowMs: 1000, now: () => 0 });
  assert.equal(call(throttle, '127.0.0.1', '198.51.100.1').allowed, true);
  assert.equal(call(throttle, '127.0.0.1', '198.51.100.2').status, 429);
});

test('policies and invalid configurations are explicit', () => {
  assert.deepEqual(loginThrottlePolicy, { limit: 60, windowMs: 900000 });
  assert.deepEqual(registerThrottlePolicy, { limit: 30, windowMs: 900000 });
  assert.deepEqual(contactThrottlePolicy, { limit: 30, windowMs: 900000 });
  assert.throws(() => createIpThrottle({ limit: 0, windowMs: 1000 }));
  assert.throws(() => createIpThrottle({ limit: 1, windowMs: 0 }));
  assert.throws(() => createIpThrottle({ limit: 1, windowMs: 1000, maxBuckets: 0 }));
});
