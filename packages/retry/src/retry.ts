import type { Delayer } from "./delayer";
import { pause } from "./pause";

export interface RetryOptions {
  readonly retryLimit?: number;
  readonly timeLimit?: number;
  readonly delayer: Delayer;
}

export class Retry {
  private readonly _retryLimit: number;
  private readonly _timeLimit: number;
  private readonly _delayer: Delayer;
  private readonly _started: number = Retry.now();
  private _attempts = 1;

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
    this._retryLimit = retryLimit;
    this._timeLimit = timeLimit;
    this._delayer = delayer;
  }

  get attempts(): number {
    return this._attempts;
  }

  get elapsed(): number {
    return Retry.now() - this._started;
  }

  async tryAgain(): Promise<boolean> {
    if (this._retryLimit > 0 && this.attempts >= this._retryLimit) {
      return false;
    }
    if (this._timeLimit > 0 && this.elapsed >= this._timeLimit) {
      return false;
    }
    await pause(this._delayer.nextDelay(this._attempts));
    this._attempts += 1;
    return true;
  }

  static now(): number {
    return Date.now();
  }
}
