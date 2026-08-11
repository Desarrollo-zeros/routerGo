import { Queue, Worker, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';

export type JobHandler = (name: string, data: unknown) => Promise<void>;

export interface BullMqDeps {
  connection: Redis;
  queueName?: string;
  concurrency?: number;
}

const DEFAULT_QUEUE = 'routergo-jobs';

export class BullMqAdapter {
  private readonly queue: Queue;
  private worker?: Worker;
  private readonly handlers = new Map<string, JobHandler>();

  constructor(private readonly deps: BullMqDeps) {
    const name = deps.queueName ?? DEFAULT_QUEUE;
    this.queue = new Queue(name, { connection: deps.connection as never });
  }

  register(jobName: string, handler: JobHandler): void {
    this.handlers.set(jobName, handler);
  }

  async add(jobName: string, data: unknown, opts?: JobsOptions): Promise<string | undefined> {
    const job = await this.queue.add(jobName, data as never, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
      ...opts,
    });
    return job.id;
  }

  start(): Worker {
    if (this.worker) return this.worker;
    const name = this.deps.queueName ?? DEFAULT_QUEUE;
    this.worker = new Worker(
      name,
      async (job) => {
        const h = this.handlers.get(job.name);
        if (!h) throw new Error(`No handler for job: ${job.name}`);
        await h(job.name, job.data);
      },
      { connection: this.deps.connection as never, concurrency: this.deps.concurrency ?? 5 },
    );
    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }

  getQueue(): Queue {
    return this.queue;
  }
}
