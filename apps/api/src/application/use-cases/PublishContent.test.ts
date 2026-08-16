import { describe, expect, it } from 'vitest';
import { PublishContent } from './PublishContent.js';
import type { ContentPublisher } from '../ports/outbound/ContentPublisher.js';

describe('PublishContent', () => {
  it('publishes a trimmed CMS entry through its port', async () => {
    const calls: unknown[] = [];
    const publisher: ContentPublisher = { publish: async (input) => { calls.push(input); return { slug: input.slug, title: input.title, body: input.body }; } };
    const result = await new PublishContent(publisher).execute({ slug: ' routergo-guide ', title: ' Guía ', body: ' Contenido ' }, 'operator-1');
    expect(result).toEqual({ slug: 'routergo-guide', title: 'Guía', body: 'Contenido' });
    expect(calls).toEqual([{ slug: 'routergo-guide', title: 'Guía', body: 'Contenido', actorId: 'operator-1' }]);
  });

  it('rejects malformed content before persistence', async () => {
    const publisher: ContentPublisher = { publish: async () => { throw new Error('must not persist'); } };
    await expect(new PublishContent(publisher).execute({ slug: 'bad slug', title: '', body: 'x' }, 'operator-1')).rejects.toThrow('CONTENT_INPUT_INVALID');
  });
});
