/**
 * Delayer computes pauses between attempts when retrying a failed operation.
 */
export interface Delayer {
  /**
   * Computes pause time for the given attempt.
   *
   * If the retried operation succeeds then this method is not called.
   * Otherwise it is called with the increasing retry number starting from one.
   *
   * @param attempt An increasing retry number starting from one.
   */
  nextDelay(attempt: number): number;
}

/**
 * Returns a delayer that waits a fixed amount of time before retrying.
 */
export function fixedDelay(delay: number): Delayer {
  return new (class FixedDelayer implements Delayer {
    nextDelay(attempt: number): number {
      if (attempt < 1) {
        throw new Error();
      }
      return delay;
    }
  })();
}

/**
 * Returns a delayer that waits an incrementally increasing amount of time
 * before retrying.
 */
export function incrementalDelay(step: number, max = 10_000): Delayer {
  return new (class IncrementalDelayer implements Delayer {
    nextDelay(attempt: number): number {
      if (attempt < 1) {
        throw new Error();
      }
      return Math.min(step * attempt, max);
    }
  })();
}

/**
 * Returns a delayer that waits an exponentially increasing amount of time
 * before retrying.
 */
export function exponentialDelay(multiplier: number, max = 10_000): Delayer {
  return new (class ExponentialDelayer implements Delayer {
    nextDelay(attempt: number): number {
      if (attempt < 1) {
        throw new Error();
      }
      return Math.min(Math.round(multiplier * Math.pow(2, attempt)), max);
    }
  })();
}

/**
 * Returns a delayer that waits a random amount of time before retrying.
 */
export function randomDelay(min: number, max: number): Delayer {
  return new (class RandomDelay implements Delayer {
    nextDelay(attempt: number): number {
      if (attempt < 1) {
        throw new Error();
      }
      return min + Math.round(Math.random() * (max - min));
    }
  })();
}

/**
 * Combined multiple delayers into one which sums all the combined delayers.
 * @param delayers Delayers to combine.
 * @return A combined delayer.
 */
export function combine(delayers: readonly Delayer[]): Delayer {
  return new (class CombinedDelayer implements Delayer {
    nextDelay(attempt: number): number {
      if (attempt < 1) {
        throw new Error();
      }
      let delay = 0;
      for (const delayer of delayers) {
        delay += delayer.nextDelay(attempt);
      }
      return delay;
    }
  })();
}
