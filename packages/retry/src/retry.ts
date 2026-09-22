import type { Delayer } from "./delayer.js";
import { pause } from "./pause.js";

export interface RetryOptions {
  readonly retryLimit?: number;
  readonly timeLimit?: number;
  readonly delayer: Delayer;
}

export class Retry {
  readonly #retryLimit: number;
  readonly #timeLimit: number;
  readonly #delayer: Delayer;
  readonly #started: number = Retry.now();
  #attempts = 1;

  constructor(options: RetryOptions) {
    const { retryLimit = 0, timeLimit = 0, delayer } = options;
    if (retryLimit < 0) {
      throw new Error(`Invalid retry limit`);
    }
    if (timeLimit < 0) {
      throw new Error(`Invalid time limit`);
    }
    if (retryLimit === 0 && timeLimit === 0) {
      throw new Error(`Unlimited retry`);
    }
    this.#retryLimit = retryLimit;
    this.#timeLimit = timeLimit;
    this.#delayer = delayer;
  }

  get attempts(): number {
    return this.#attempts;
  }

  get elapsed(): number {
    return Retry.now() - this.#started;
  }

  async tryAgain(): Promise<boolean> {
    if (this.#retryLimit > 0 && this.attempts >= this.#retryLimit) {
      return false;
    }
    if (this.#timeLimit > 0 && this.elapsed >= this.#timeLimit) {
      return false;
    }
    await pause(this.#delayer.nextDelay(this.#attempts));
    this.#attempts += 1;
    return true;
  }

  static now(): number {
    return performance.now();
  }
}
