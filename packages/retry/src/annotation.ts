import { Retry, RetryOptions } from "./retry.js";

/**
 * Annotation options.
 */
export interface AnnotationOptions extends RetryOptions {
  /**
   * A callback to be called to check if an error thrown by a wrapped method
   * needs to be retried.
   */
  readonly checkError?: (err: Error) => boolean;
}

/**
 * An annotation which is applied to a function or a class method to intercept
 * its execution and call it multiple times until it succeeds.
 * It returns the return value of the wrapped function on success throws
 * the last error if all retry attempts fail.
 *
 * Example:
 *
 * ```
 * class MyClass {
 *   @retry({
 *     retryLimit: 3,
 *     timeLimit: 3000,
 *     delayer: fixedDelay(100),
 *   })
 *   async updateFile(): Promise<void> {
 *     // ...
 *   }
 * }
 * ```
 * @param options Retry options.
 */
export function retry(options: AnnotationOptions): MethodDecorator {
  return (
    target: Object, // eslint-disable-line @typescript-eslint/ban-types
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void => {
    const { checkError = anyError } = options;
    const value = descriptor.value;
    descriptor.value = async function (...args: any[]): Promise<any> {
      const retry = new Retry(options);
      while (true) {
        try {
          return await value.apply(this, args);
        } catch (err: any) {
          if (!checkError(err)) {
            throw err;
          }
          if (!(await retry.tryAgain())) {
            throw err;
          }
        }
      }
    };
  };
}

function anyError(): boolean {
  return true;
}
