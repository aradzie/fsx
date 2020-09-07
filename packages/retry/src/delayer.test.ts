import test from "ava";
import {
  exponentialDelay,
  fixedDelay,
  incrementalDelay,
  randomDelay,
} from "./delayer.js";

test("fixedDelay", (t) => {
  const delayer = fixedDelay(123);
  t.is(delayer.nextDelay(1), 123);
  t.is(delayer.nextDelay(2), 123);
  t.is(delayer.nextDelay(3), 123);
});

test("incrementalDelay", (t) => {
  const delayer = incrementalDelay(123);
  t.is(delayer.nextDelay(1), 123);
  t.is(delayer.nextDelay(2), 246);
  t.is(delayer.nextDelay(3), 369);
});

test("exponentialDelay", (t) => {
  const delayer = exponentialDelay(10);
  t.is(delayer.nextDelay(1), 20);
  t.is(delayer.nextDelay(2), 40);
  t.is(delayer.nextDelay(3), 80);
});

test("randomDelay", (t) => {
  const delayer = randomDelay(3, 7);
  for (let i = 0; i < 100; i++) {
    const value = delayer.nextDelay(i + 1);
    t.true(Number.isInteger(value));
    t.true(value >= 3);
    t.true(value <= 7);
  }
});
