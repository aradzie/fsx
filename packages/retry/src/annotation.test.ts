import test from "ava";
import { retry } from "./annotation.js";
import { fixedDelay } from "./delayer.js";

test("return value from decorated method", async (t) => {
  // Arrange.

  class Example {
    count = 0;

    @retry({
      retryLimit: 3,
      delayer: fixedDelay(1),
    })
    async run(arg: string): Promise<string> {
      this.count++;
      if (this.count < 3) {
        throw new Error(`try again ${this.count}`);
      } else {
        return `${arg} ${this.count}`;
      }
    }
  }

  const example = new Example();

  // Assert.

  t.is(await example.run("xyz"), "xyz 3");
  t.is(example.count, 3);
});

test("rethrow last error from decorated method", async (t) => {
  // Arrange.

  class Example {
    count = 0;

    @retry({
      retryLimit: 3,
      delayer: fixedDelay(1),
    })
    async run(): Promise<void> {
      this.count++;
      if (this.count < 4) {
        throw new Error(`try again ${this.count}`);
      }
    }
  }

  const example = new Example();

  // Assert.

  await t.throwsAsync(() => example.run(), { message: "try again 3" });
  t.is(example.count, 3);
});
