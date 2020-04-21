# Retry

A library for retrying failed I/O operations.

Example:

```typescript
import { retry, fixedDelay } from "@aradzie/retry";

class MyService {

  @retry({
    // Fail after three attempts.
    retryLimit: 3,
    // Fail if attempts take more than three seconds.
    timeLimit: 3000,
    // Delay for 100 milliseconds between attempts.
    delayer: fixedDelay(100),
  })
  async makeNetworkRequest(): Promise<void> {
    // The @retry(...) annotation will call this method 
    // as long as it throws exceptions, then returns
    // the last successful result.
  }
}
```
