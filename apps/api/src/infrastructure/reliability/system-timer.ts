import type { TimerPort } from '../../application/ports/outbound/reliability.js';

export class SystemTimer implements TimerPort {
  set(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    return setTimeout(callback, delayMs);
  }

  clear(handle: unknown): void {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
}
