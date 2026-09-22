import assert from "node:assert/strict";
import test from "node:test";
import { fixedDelay } from "./delayer.js";
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

test("limit time", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"] });
  {
    const retry = new Retry({
      timeLimit: 10,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed, 0);
    t.mock.timers.tick(10);
    assert.strictEqual(retry.elapsed, 10);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 1);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed, 0);
    t.mock.timers.tick(10);
    assert.strictEqual(retry.elapsed, 10);
    {
      const pending = retry.tryAgain();
      t.mock.timers.tick(0);
      assert.strictEqual(await pending, true);
    }
    t.mock.timers.tick(100);
    assert.strictEqual(retry.elapsed, 110);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 2);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    assert.strictEqual(retry.elapsed, 0);
    t.mock.timers.tick(10);
    assert.strictEqual(retry.elapsed, 10);
    {
      const pending = retry.tryAgain();
      t.mock.timers.tick(0);
      assert.strictEqual(await pending, true);
    }
    t.mock.timers.tick(10);
    assert.strictEqual(retry.elapsed, 20);
    {
      const pending = retry.tryAgain();
      t.mock.timers.tick(0);
      assert.strictEqual(await pending, true);
    }
    t.mock.timers.tick(100);
    assert.strictEqual(retry.elapsed, 120);
    assert.strictEqual(await retry.tryAgain(), false);
    assert.strictEqual(retry.attempts, 3);
  }
});

test("pause between attempts", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"] });
  const retry = new Retry({
    retryLimit: 10,
    delayer: fixedDelay(10),
  });

  assert.strictEqual(retry.elapsed, 0);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const pending = retry.tryAgain();

    t.mock.timers.tick(9);
    // Let promise continuations run so an early retry would be observable.
    await Promise.resolve();
    assert.strictEqual(retry.attempts, attempt);
    assert.strictEqual(retry.elapsed, attempt * 10 - 1);

    t.mock.timers.tick(1);
    assert.strictEqual(await pending, true);
    assert.strictEqual(retry.attempts, attempt + 1);
    assert.strictEqual(retry.elapsed, attempt * 10);
  }
});
