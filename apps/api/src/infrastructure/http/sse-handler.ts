import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RedisStreamAdapter } from '../adapters/redis/RedisStreamAdapter.js';

export interface SseDeps {
  streams: RedisStreamAdapter;
  heartbeatMs?: number;
}

export async function sseHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
  deps: SseDeps,
): Promise<void> {
  const runId = req.params.id;
  const lastEventId = (req.headers['last-event-id'] as string | undefined) ?? '';
  const heartbeatMs = deps.heartbeatMs ?? 15000;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const history = await deps.streams.readFrom(runId, lastEventId || '0-0', 1000);
  for (const ev of history) writeEvent(reply, ev.id, ev.event, ev.data);

  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n');
  }, heartbeatMs);

  let closed = false;
  req.raw.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
  });

  await waitForCompletion(deps, runId, reply, () => closed);
  clearInterval(heartbeat);
  reply.raw.end();
}

function writeEvent(reply: FastifyReply, id: string, event: string, data: string): void {
  reply.raw.write(`id: ${id}\n`);
  reply.raw.write(`event: ${event}\n`);
  reply.raw.write(`data: ${data}\n\n`);
}

async function waitForCompletion(
  deps: SseDeps,
  runId: string,
  reply: FastifyReply,
  isClosed: () => boolean,
): Promise<void> {
  let lastId = '0-0';
  const seen = new Set<string>();
  // Poll for new events up to 5 minutes or until stream ends with done event
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline && !isClosed()) {
    const events = await deps.streams.readFrom(runId, lastId, 50);
    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      writeEvent(reply, ev.id, ev.event, ev.data);
      lastId = ev.id;
      if (ev.event === 'done' || ev.event === 'error') return;
    }
    if (events.length === 0) await sleep(500);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
