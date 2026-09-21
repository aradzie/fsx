import assert from "node:assert/strict";
import test from "node:test";
import { fixedDelay } from "./delayer.js";
import { pause } from "./pause.js";
import { Retry } from "./retry.js";

test("limit attempts", async () => {
  {
    const retry = new Retry({
      retryLimit: 1,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.attempts, 1);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 1);
  }

  {
    const retry = new Retry({
      retryLimit: 2,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.attempts, 1);
    assert.strictEqual(await retry.tryAgain(), true);
    assert.strictEqual(retry.attempts, 2);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 2);
  }

  {
    const retry = new Retry({
      retryLimit: 3,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.attempts, 1);
    assert.strictEqual(await retry.tryAgain(), true);
    assert.strictEqual(retry.attempts, 2);
    assert.strictEqual(await retry.tryAgain(), true);
    assert.strictEqual(retry.attempts, 3);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 3);
  }
});

test("limit time", async () => {
  {
    const retry = new Retry({
      timeLimit: 10,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed >= 0, true);
    await pause(10);
    assert.strictEqual(retry.elapsed >= 10, true);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 1);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed >= 0, true);
    await pause(10);
    assert.strictEqual(retry.elapsed >= 10, true);
    assert.strictEqual(await retry.tryAgain(), true);
    await pause(100);
    assert.strictEqual(retry.elapsed >= 110, true);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 2);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed >= 0, true);
    await pause(10);
    assert.strictEqual(retry.elapsed >= 10, true);
    assert.strictEqual(await retry.tryAgain(), true);
    await pause(10);
    assert.strictEqual(retry.elapsed >= 20, true);
    assert.strictEqual(await retry.tryAgain(), true);
    await pause(100);
    assert.strictEqual(retry.elapsed >= 120, true);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 3);
  }
});

test("pause between attempts", async () => {
  const retry = new Retry({
    retryLimit: 10,
    delayer: fixedDelay(10),
  });

  assert.strictEqual(retry.elapsed >= 0, true);
  assert.strictEqual(await retry.tryAgain(), true);
  assert.strictEqual(retry.elapsed >= 10, true);
  assert.strictEqual(await retry.tryAgain(), true);
  assert.strictEqual(retry.elapsed >= 20, true);
  assert.strictEqual(await retry.tryAgain(), true);
});
