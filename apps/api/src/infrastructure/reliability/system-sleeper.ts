import type { Sleeper } from '../../application/ports/outbound/reliability.js';
import { CancellationError } from './errors.js';

export class SystemSleeper implements Sleeper {
  sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
    if (delayMs <= 0) return Promise.resolve();
    if (signal?.aborted) return Promise.reject(new CancellationError('Retry cancelled', signal.reason));
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => signal?.removeEventListener('abort', onAbort);
      const onAbort = () => { clearTimeout(timer); cleanup(); reject(new CancellationError('Retry cancelled', signal?.reason)); };
      timer = setTimeout(() => { cleanup(); resolve(); }, delayMs);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
