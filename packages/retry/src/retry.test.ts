import test from "ava";
import { fixedDelay } from "./delayer.js";
import { pause } from "./pause.js";
import { Retry } from "./retry.js";

test("limit attempts", async (t) => {
  {
    const retry = new Retry({
      retryLimit: 1,
      delayer: fixedDelay(0),
    });
    t.is(retry.attempts, 1);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 1);
  }

  {
    const retry = new Retry({
      retryLimit: 2,
      delayer: fixedDelay(0),
    });
    t.is(retry.attempts, 1);
    t.true(await retry.tryAgain());
    t.is(retry.attempts, 2);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 2);
  }

  {
    const retry = new Retry({
      retryLimit: 3,
      delayer: fixedDelay(0),
    });
    t.is(retry.attempts, 1);
    t.true(await retry.tryAgain());
    t.is(retry.attempts, 2);
    t.true(await retry.tryAgain());
    t.is(retry.attempts, 3);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 3);
  }
});

test("limit time", async (t) => {
  {
    const retry = new Retry({
      timeLimit: 10,
      delayer: fixedDelay(0),
    });
    t.true(retry.elapsed >= 0);
    await pause(10);
    t.true(retry.elapsed >= 10);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 1);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    t.true(retry.elapsed >= 0);
    await pause(10);
    t.true(retry.elapsed >= 10);
    t.true(await retry.tryAgain());
    await pause(100);
    t.true(retry.elapsed >= 110);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 2);
  }

  {
    const retry = new Retry({
      timeLimit: 100,
      delayer: fixedDelay(0),
    });
    t.true(retry.elapsed >= 0);
    await pause(10);
    t.true(retry.elapsed >= 10);
    t.true(await retry.tryAgain());
    await pause(10);
    t.true(retry.elapsed >= 20);
    t.true(await retry.tryAgain());
    await pause(100);
    t.true(retry.elapsed >= 120);
    t.false(await retry.tryAgain());
    t.is(retry.attempts, 3);
  }
});

test("pause between attempts", async (t) => {
  const retry = new Retry({
    retryLimit: 10,
    delayer: fixedDelay(10),
  });

  t.true(retry.elapsed >= 0);
  t.true(await retry.tryAgain());
  t.true(retry.elapsed >= 10);
  t.true(await retry.tryAgain());
  t.true(retry.elapsed >= 20);
  t.true(await retry.tryAgain());
});
