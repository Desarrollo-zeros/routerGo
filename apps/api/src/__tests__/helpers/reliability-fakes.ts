import type { Sleeper, TimerPort } from '../../application/ports/outbound/reliability.js';

export class FakeTimer implements TimerPort {
  callback: (() => void) | undefined;
  delayMs = 0;
  cleared = false;

  set(callback: () => void, delayMs: number): object {
    this.callback = callback;
    this.delayMs = delayMs;
    this.cleared = false;
    return this;
  }

  clear(handle: unknown): void {
    if (handle !== this) return;
    this.cleared = true;
    this.callback = undefined;
  }

  fire(): void {
    this.callback?.();
  }
}

export class RecordingSleeper implements Sleeper {
  readonly delays: number[] = [];

  async sleep(delayMs: number): Promise<void> {
    this.delays.push(delayMs);
  }
}

export function fixedRandom(value = 0.5): () => number {
  return () => value;
}
