import { describe, expect, it } from 'vitest';
import { readProviderStream } from '../infrastructure/adapters/providers/provider-stream-reader.js';
import { ResponsesStrategy } from '../infrastructure/adapters/providers/responses-strategy.js';

describe('provider stream reader', () => {
  it('parses response SSE deltas and completion', async () => {
    const chunks: string[] = [];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"delta":"hel"}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"delta":"lo"}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    const result = await readProviderStream({ body, strategy: new ResponsesStrategy(), requestId: 'resp_1', onChunk: (chunk) => chunks.push(chunk.delta) });
    expect(result).toMatchObject({ id: 'resp_1', content: 'hello' });
    expect(chunks).toEqual(['hel', 'lo', '']);
  });
});
