import { setTimeout } from 'node:timers/promises';

export function pause(millis: number): Promise<void> {
  return setTimeout(millis);
}
