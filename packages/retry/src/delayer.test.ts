import assert from "node:assert/strict";
import test from "node:test";
import {
  exponentialDelay,
  fixedDelay,
  incrementalDelay,
  randomDelay,
} from "./delayer.js";

test("fixedDelay", () => {
  const delayer = fixedDelay(123);
  assert.strictEqual(delayer.nextDelay(1), 123);
  assert.strictEqual(delayer.nextDelay(2), 123);
  assert.strictEqual(delayer.nextDelay(3), 123);
});

test("incrementalDelay", () => {
  const delayer = incrementalDelay(123);
  assert.strictEqual(delayer.nextDelay(1), 123);
  assert.strictEqual(delayer.nextDelay(2), 246);
  assert.strictEqual(delayer.nextDelay(3), 369);
});

test("exponentialDelay", () => {
  const delayer = exponentialDelay(10);
  assert.strictEqual(delayer.nextDelay(1), 20);
  assert.strictEqual(delayer.nextDelay(2), 40);
  assert.strictEqual(delayer.nextDelay(3), 80);
});

test("randomDelay", () => {
  const delayer = randomDelay(3, 7);
  for (let i = 0; i < 100; i++) {
    const value = delayer.nextDelay(i + 1);
    assert.strictEqual(Number.isInteger(value), true);
    assert.strictEqual(value >= 3, true);
    assert.strictEqual(value <= 7, true);
  }
});
